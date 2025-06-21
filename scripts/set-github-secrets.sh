#!/bin/bash

# Script to set GitHub secrets for the repository
# Usage: ./set-github-secrets.sh

REPO="PittampalliOrg/chat"

echo "Setting GitHub secrets for repository: $REPO"

# Set ACR credentials
gh secret set ACR_USERNAME --body "vpittamp" --repo "$REPO"
echo "✓ Set ACR_USERNAME"

# Note: You'll need to provide the ACR password
echo "Please enter your ACR password:"
read -s ACR_PASSWORD_VALUE
gh secret set ACR_PASSWORD --body "$ACR_PASSWORD_VALUE" --repo "$REPO"
echo "✓ Set ACR_PASSWORD"

# Set database and service secrets
gh secret set POSTGRES_URL --body "[REDACTED_POSTGRES_URL] --repo "$REPO"
echo "✓ Set POSTGRES_URL"

gh secret set AUTH_SECRET --body "[REDACTED_AUTH_SECRET]" --repo "$REPO"
echo "✓ Set AUTH_SECRET"

gh secret set XAI_API_KEY --body "[REDACTED_XAI_KEY]" --repo "$REPO"
echo "✓ Set XAI_API_KEY"

# Note: You'll need to provide the BLOB token
echo "Please enter your BLOB_READ_WRITE_TOKEN (or press Enter to skip):"
read -s BLOB_TOKEN_VALUE
if [ -n "$BLOB_TOKEN_VALUE" ]; then
    gh secret set BLOB_READ_WRITE_TOKEN --body "$BLOB_TOKEN_VALUE" --repo "$REPO"
    echo "✓ Set BLOB_READ_WRITE_TOKEN"
else
    echo "⚠ Skipped BLOB_READ_WRITE_TOKEN"
fi

gh secret set REDIS_URL --body "redis://redis-service.nextjs:6379" --repo "$REPO"
echo "✓ Set REDIS_URL"

gh secret set TIMEZONE_DB_API_KEY --body "[REDACTED_TZDB_KEY]" --repo "$REPO"
echo "✓ Set TIMEZONE_DB_API_KEY"

gh secret set NEON_API_KEY --body "[REDACTED_NEON_API_KEY]" --repo "$REPO"
echo "✓ Set NEON_API_KEY"

gh secret set NEON_PROJECT_ID --body "[REDACTED_NEON_PROJECT_ID]" --repo "$REPO"
echo "✓ Set NEON_PROJECT_ID"

echo ""
echo "All secrets have been set successfully!"
echo ""
echo "To verify, run: gh secret list --repo $REPO"