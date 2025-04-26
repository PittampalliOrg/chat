#!/usr/bin/env bash
# gen-dapr-secret-yaml.sh
set -e

SECRETS_JSON="${1:-./dapr/secrets/secrets.json}"
NAMESPACE="${2:-default-recipes}"
SECRET_NAME="${3:-dapr-app-secrets}"

if ! command -v jq &>/dev/null; then
    echo "You need 'jq' installed!" >&2
    exit 1
fi

cat <<EOF
apiVersion: v1
kind: Secret
metadata:
    name: $SECRET_NAME
    namespace: $NAMESPACE
type: Opaque
data:
EOF

# Loop through each key/value and base64 encode the value
jq -r "to_entries[] | \"\(.key)\"" "$SECRETS_JSON" | while read -r key; do
    raw_value=$(jq -r --arg k "$key" '.[$k]' "$SECRETS_JSON")
    encoded_value=$(echo -n "$raw_value" | base64 -w 0)
    echo "  $key: $encoded_value"
done
