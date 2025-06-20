#!/bin/bash

# Build script for Docker image with Neon configuration

# Set default values for local development
POSTGRES_URL="${POSTGRES_URL:-postgres://neon:npg@db:5432/neondb}"
AUTH_SECRET="${AUTH_SECRET:-your-auth-secret}"
XAI_API_KEY="${XAI_API_KEY:-your-[REDACTED_XAI_KEY]}"
BLOB_READ_WRITE_TOKEN="${BLOB_READ_WRITE_TOKEN:-your-blob-token}"
REDIS_URL="${REDIS_URL:-redis://redis:6379}"
TIMEZONE_DB_API_KEY="${TIMEZONE_DB_API_KEY:-your-timezone-key}"
NEON_API_KEY="${NEON_API_KEY:-your-neon-api-key}"
NEON_PROJECT_ID="${NEON_PROJECT_ID:-your-neon-project-id}"

# Build the Docker image
docker build \
  --build-arg POSTGRES_URL="$POSTGRES_URL" \
  --build-arg AUTH_SECRET="$AUTH_SECRET" \
  --build-arg XAI_API_KEY="$XAI_API_KEY" \
  --build-arg BLOB_READ_WRITE_TOKEN="$BLOB_READ_WRITE_TOKEN" \
  --build-arg REDIS_URL="$REDIS_URL" \
  --build-arg TIMEZONE_DB_API_KEY="$TIMEZONE_DB_API_KEY" \
  --build-arg NEON_API_KEY="$NEON_API_KEY" \
  --build-arg NEON_PROJECT_ID="$NEON_PROJECT_ID" \
  --pull --rm -f Dockerfile \
  -t "vpittamp.azurecr.io/chat-frontend:${VERSION:-latest}" \
  .