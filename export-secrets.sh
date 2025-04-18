#!/bin/bash
# export-secrets.sh
# Reads secrets from /var/secrets and exports them as environment variables

set -e

SECRETS_DIR="/var/secrets"

# List of secret files and their corresponding env var names
declare -A secrets=(
  ["OPENAI_API_KEY"]="openai-api-key"
  ["AZURE_API_KEY"]="azure-api-key"
  ["ANTHROPIC_API_KEY"]="anthropic-api-key"
  ["NEXTAUTH_SECRET"]="nextauth-secret"
  ["POSTGRES_PASSWORD"]="postgres-password"
  ["POSTGRES_URL"]="postgres-url"
  ["mysecret"]="my-secret"
)

for env_var in "${!secrets[@]}"; do
  file_path="$SECRETS_DIR/${secrets[$env_var]}"
  if [ -f "$file_path" ]; then
    export "$env_var"="$(cat "$file_path" | tr -d '\r\n')"
  fi
done

# Optionally, start your Next.js app here
exec npm start