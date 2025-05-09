#!/usr/bin/env bash
# install-envsubst-and-webhook.sh
set -euo pipefail

###############################################################################
# 0.  Sanity-check required env-vars                                           #
###############################################################################
: "${AZURE_TENANT_ID:?export your tenant ID (GUID)}"

###############################################################################
# 1.  Install envsubst (latest release, OS/arch-aware)                         #
###############################################################################
OS="$(uname -s)"; ARCH="$(uname -m)"
ASSET="envsubst-${OS}-${ARCH}"
TAG="$(curl -fsSL https://api.github.com/repos/a8m/envsubst/releases/latest \
       | grep -Po '"tag_name":\s*"\K[^"]+')"

curl -fsSL -o envsubst \
  "https://github.com/a8m/envsubst/releases/download/${TAG}/${ASSET}"
chmod +x envsubst
sudo mv envsubst /usr/local/bin/
echo "✔ $(envsubst -help | head -n1)"

###############################################################################
# 2.  Deploy the Azure Workload-Identity webhook via YAML + envsubst           #
###############################################################################
# 👉 Only substitute the value we care about, not every $VAR in your shell
export _subst="\$AZURE_TENANT_ID"

curl -sL "https://github.com/Azure/azure-workload-identity/releases/download/v1.5.0/azure-wi-webhook.yaml" \
  | envsubst "$_subst" \
  | kubectl apply -f -

echo "🎉  Webhook deployed. Verify with: kubectl -n azure-workload-identity-system get pods"
