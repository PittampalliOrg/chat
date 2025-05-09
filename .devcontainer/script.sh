#!/usr/bin/env bash
set -Eeuo pipefail
trap 'echo "❌  Error on line $LINENO while running: $BASH_COMMAND" >&2' ERR

# ------------------ Configuration ------------------
CLUSTER_NAME=${CLUSTER_NAME:-wi-local}
RESOURCE_GROUP=${RESOURCE_GROUP:-rg-wi-local}
LOCATION=${LOCATION:-eastus2}
STORAGE_ACCT=${STORAGE_ACCT:-"oidcissuer$(openssl rand -hex 4)"}
CONTAINER=oidc
KEY_PRIV=${KEY_PRIV:-"${PWD}/sa.key"}
KEY_PUB=${KEY_PUB:-"${PWD}/sa.pub"}
TENANT_ID=$(az account show --query tenantId -o tsv)
SUB_ID=$(az account show --query id -o tsv)

# ------------------ Dependency checks --------------
for cmd in az azwi kind kubectl helm jq radius openssl; do
  command -v "$cmd" >/dev/null ||
    { echo "❌  $cmd not on PATH"; exit 1; }
done

# ------------------ Key-pair -----------------------
if [[ ! -f "$KEY_PRIV" || ! -f "$KEY_PUB" ]]; then
  echo "🔑  Generating RSA key-pair…"
  openssl genrsa -out "$KEY_PRIV" 2048
  openssl rsa    -in  "$KEY_PRIV" -pubout -out "$KEY_PUB"
fi

# ------------------ OIDC blobs ---------------------
ISSUER_URL="https://${STORAGE_ACCT}.blob.core.windows.net/${CONTAINER}/"
az group create -n "$RESOURCE_GROUP" -l "$LOCATION"
az storage account create -g "$RESOURCE_GROUP" -n "$STORAGE_ACCT" --allow-blob-public-access true
az storage container create --account-name "$STORAGE_ACCT" -n "$CONTAINER" --public-access blob

cat >openid-configuration.json <<EOF
{ "issuer":"${ISSUER_URL}",
  "jwks_uri":"${ISSUER_URL}openid/v1/jwks",
  "response_types_supported":["id_token"],
  "subject_types_supported":["public"],
  "id_token_signing_alg_values_supported":["RS256"] }
EOF

azwi jwks --public-keys "$KEY_PUB" --output-file jwks.json
az storage blob upload --account-name "$STORAGE_ACCT" -c "$CONTAINER" -n ".well-known/openid-configuration" --file openid-configuration.json --overwrite
az storage blob upload --account-name "$STORAGE_ACCT" -c "$CONTAINER" -n "openid/v1/jwks" --file jwks.json --overwrite
curl -fsSL "${ISSUER_URL}.well-known/openid-configuration" | jq .issuer

# ------------------ Kind cluster -------------------
if kind get clusters | grep -q "^${CLUSTER_NAME}\$"; then
  echo "♻️  Deleting existing kind cluster $CLUSTER_NAME"
  kind delete cluster --name "$CLUSTER_NAME" || true
fi

cat <<KIND | kind create cluster --name "$CLUSTER_NAME" --image kindest/node:v1.29.2 --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraMounts:
  - hostPath: ${KEY_PUB}
    containerPath: /etc/kubernetes/pki/sa.pub
  - hostPath: ${KEY_PRIV}
    containerPath: /etc/kubernetes/pki/sa.key
  kubeadmConfigPatches:
  - |
    kind: ClusterConfiguration
    apiServer:
      extraArgs:
        service-account-issuer: ${ISSUER_URL}
        service-account-key-file: /etc/kubernetes/pki/sa.pub
        service-account-signing-key-file: /etc/kubernetes/pki/sa.key
    controllerManager:
      extraArgs:
        service-account-private-key-file: /etc/kubernetes/pki/sa.key
KIND

# ----------- Fix kubeconfig for dev-container -------
if grep -qE 'https://(host\.docker\.internal|127\.0\.0\.1):[0-9]+' "$HOME/.kube/config"; then
  CNAME=$(docker ps --filter 'name=-control-plane' --format '{{.Names}}' | head -n1)
  sed -i -E "s#https://(host\.docker\.internal|127\.0\.0\.1):[0-9]+#https://${CNAME}:6443#g" "$HOME/.kube/config"
fi

# ------------------ Webhook install ----------------
echo "🪝  Installing Mutating Admission Webhook"
helm repo add azure-workload-identity https://azure.github.io/azure-workload-identity/charts
helm repo update
helm install wi-webhook azure-workload-identity/workload-identity-webhook \
  --namespace azure-workload-identity-system --create-namespace \
  --set azureTenantID="$TENANT_ID"

kubectl rollout status deploy/wi-webhook-controller-manager -n azure-workload-identity-system \
  --timeout=120s

# ------------------ Radius wiring ------------------
echo "🛡  Registering Radius workload-identity credential"
radius credential register azure wi --client-id "<YOUR_APP_ID>" --tenant-id "$TENANT_ID" --yes

echo "✅  AZWI + Radius on kind ($CLUSTER_NAME) ready."
