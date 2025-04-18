#!/bin/ash
set -eu

echo "[entrypoint] Alpine shell is $(readlink -f /bin/ash)"

ENV_FILE="/var/secrets/.env"
: > "$ENV_FILE"

for f in /var/secrets/*; do
  [ -f "$f" ] || continue
  key=$(basename "$f")
  val=$(cat "$f")
  printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
done

echo "[entrypoint] Built $ENV_FILE with $(wc -l < "$ENV_FILE") variables"
cat "$ENV_FILE" | sed 's/=.*/=[REDACTED]/'

exec "$@"
