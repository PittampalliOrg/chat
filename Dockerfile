# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install Git to get commit hash
RUN apk add --no-cache git

# Extract Git commit hash for deployment ID
# This will work if building from a Git repository
# If .git directory is not available, it will use "unknown" as the commit hash
RUN if [ -d ".git" ]; then \
      echo "NEXT_PUBLIC_DEPLOYMENT_ID=$(git rev-parse --short HEAD)" > .env.production.local; \
      echo "DEPLOYMENT_ID=$(git rev-parse --short HEAD)" >> .env.production.local; \
    else \
      echo "NEXT_PUBLIC_DEPLOYMENT_ID=unknown" > .env.production.local; \
      echo "DEPLOYMENT_ID=unknown" >> .env.production.local; \
    fi

# Declare ARGs in the builder stage
ARG POSTGRES_URL
ARG AUTH_SECRET
ARG XAI_API_KEY
ARG BLOB_READ_WRITE_TOKEN
ARG REDIS_URL
ARG REDIS_AVAILABLE
ARG TIMEZONE_DB_API_KEY

# Set ENV variables for the builder stage
ENV POSTGRES_URL=$POSTGRES_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV XAI_API_KEY=$XAI_API_KEY
ENV BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN
ENV REDIS_URL=$REDIS_URL
ENV TIMEZONE_DB_API_KEY=$TIMEZONE_DB_API_KEY
ENV REDIS_AVAILABLE=true

RUN echo POSTGRES_URL=$POSTGRES_URL \
  echo AUTH_SECRET=$AUTH_SECRET \
  echo XAI_API_KEY=$XAI_API_KEY \
  echo BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN \
  echo REDIS_URL=$REDIS_URL \
  echo TIMEZONE_DB_API_KEY=$TIMEZONE_DB_API_KEY \
  echo REDIS_AVAILABLE=$REDIS_AVAILABLE

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ARG POSTGRES_URL
ARG AUTH_SECRET
ARG XAI_API_KEY
ARG BLOB_READ_WRITE_TOKEN
ARG REDIS_URL
ARG REDIS_AVAILABLE
ARG TIMEZONE_DB_API_KEY

# Set ENV variables for the runner stage
ENV POSTGRES_URL=$POSTGRES_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV XAI_API_KEY=$XAI_API_KEY
ENV BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN
ENV REDIS_URL=$REDIS_URL
ENV TIMEZONE_DB_API_KEY=$TIMEZONE_DB_API_KEY
ENV REDIS_AVAILABLE=true

# Copy deployment ID from builder stage
COPY --from=builder /app/.env.production.local ./.env.production.local

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create workspace directory for DevSpace with appropriate permissions
RUN mkdir -p /workspace && chown -R nextjs:nodejs /workspace && chmod 775 /workspace

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]