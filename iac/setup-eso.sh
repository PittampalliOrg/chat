#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# CONFIGURE ME – fill in or export these before running                       #
###############################################################################
SUB_ID="fa5b32b6-1d6d-4110-bea2-8ac0e3126a38"   # Azure subscription ID
RG="rg1"                                        # Resource group with AKS & KV
CLUSTER="cluster2"                              # AKS cluster name
VAULT="qs-ygl2zollxkbc6"                        # Key Vault name
NAMESPACE="external-secrets"                    # k8s namespace for ESO
SA_NAME="eso-azure-wi-sa"                       # ServiceAccount name
APP_NAME="eso-${CLUSTER}"                       # AAD app display name
EXTERNAL_SECRET_FILE="${1:-}"                   # Optional: path to your ExternalSecret yaml
###############################################################################

echo -e "\n👉  Using subscription $SUB_ID"
az account set --subscription "$SUB_ID"

###############################################################################
# 1. Ensure CLI tools exist                                                   #
###############################################################################
for tool in az kubectl helm; do
  command -v "$tool" >/dev/null 2>&1 || { echo "❌ $tool not found in \$PATH"; exit 1; }
done

###############################################################################
# 2. Install azwi CLI if missing                                              #
###############################################################################
if ! command -v azwi &>/dev/null; then
  echo "ℹ️  Installing azwi CLI..."
  curl -sL https://raw.githubusercontent.com/Azure/azure-workload-identity/main/scripts/azure-workload-identity-release.sh | bash
  export PATH="$HOME/.azure-workload-identity/bin:$PATH"
fi

###############################################################################
# 3. Enable OIDC & Workload Identity on the cluster                           #
###############################################################################
echo "ℹ️  Enabling OIDC issuer + Workload Identity on AKS (no‑op if already on)…"
az aks update -g "$RG" -n "$CLUSTER" \
  --enable-oidc-issuer \
  --enable-workload-identity

echo "ℹ️  Fetching cluster credentials…"
az aks get-credentials -g "$RG" -n "$CLUSTER" --overwrite-existing

OIDC_ISSUER="$(az aks show -g "$RG" -n "$CLUSTER" \
  --query oidcIssuerProfile.issuerUrl -o tsv)"
echo "   OIDC issuer: $OIDC_ISSUER"

###############################################################################
# 4. Namespace and ServiceAccount                                             #
###############################################################################
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
echo "ℹ️  Creating/patching ServiceAccount $SA_NAME in $NAMESPACE…"

# Run the full azwi workflow (app + SA + federated identity + RBAC in one go)
VAULT_ID="$(az keyvault show -g "$RG" -n "$VAULT" --query id -o tsv)"
azwi serviceaccount create \
  --aad-application-name "$APP_NAME" \
  --service-account-namespace "$NAMESPACE" \
  --service-account-name "$SA_NAME" \
  --service-account-issuer-url "$OIDC_ISSUER" \
  --azure-scope "$VAULT_ID" \
  --azure-role "Key Vault Secrets User"

# Grab client‑id for later confirmation
AZURE_CLIENT_ID="$(kubectl get sa "$SA_NAME" -n "$NAMESPACE" \
  -o jsonpath='{.metadata.annotations.azure\.workload\.identity\/client-id}')"
echo "   ServiceAccount annotated with client‑id: $AZURE_CLIENT_ID"

###############################################################################
# 5. Install External Secrets Operator via Helm                               #
###############################################################################
if ! helm status external-secrets -n "$NAMESPACE" &>/dev/null; then
  echo "ℹ️  Installing External Secrets Operator Helm chart…"
  helm repo add external-secrets https://charts.external-secrets.io
  helm repo update
  helm upgrade --install external-secrets external-secrets/external-secrets \
    --namespace "$NAMESPACE" \
    --create-namespace \
    --set installCRDs=true
else
  echo "ℹ️  External Secrets Operator already installed."
fi

kubectl rollout status deploy/external-secrets -n "$NAMESPACE"

###############################################################################
# 6. Create SecretStore tied to Key Vault                                     #
###############################################################################
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-kv
  namespace: $NAMESPACE
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: https://${VAULT}.vault.azure.net
      serviceAccountRef:
        name: $SA_NAME
EOF

# Wait until SecretStore is Ready (max 2 min)
echo "ℹ️  Waiting for SecretStore readiness…"
kubectl wait --for=condition=Ready \
  secretstore/azure-kv -n "$NAMESPACE" --timeout=120s

###############################################################################
# 7. Apply ExternalSecret(s) if a file was supplied                           #
###############################################################################
if [[ -n "$EXTERNAL_SECRET_FILE" && -f "$EXTERNAL_SECRET_FILE" ]]; then
  echo "ℹ️  Applying user‑supplied ExternalSecret file: $EXTERNAL_SECRET_FILE"
  kubectl apply -f "$EXTERNAL_SECRET_FILE" -n "$NAMESPACE"
else
  echo "ℹ️  No ExternalSecret file supplied – skipping."
fi

###############################################################################
# 8. Summary & test read                                                      #
###############################################################################
echo -e "\n✅  Setup complete."
echo "   SecretStore:  $(kubectl get secretstore azure-kv -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')" 
echo "   ServiceAccount annotation: $(kubectl get sa "$SA_NAME" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.azure\.workload\.identity\/client-id}')"

read -r -p $'👉  Enter a Key Vault secret name to test (or press Enter to skip): ' KV_SECRET
if [[ -n "$KV_SECRET" ]]; then
  cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test-secret
  namespace: $NAMESPACE
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: azure-kv
    kind: SecretStore
  target:
    name: test-secret
    creationPolicy: Owner
  data:
  - secretKey: $KV_SECRET
    remoteRef:
      key: $KV_SECRET
EOF
  echo "ℹ️  Waiting up to 60 s for test secret to sync…"
  for i in {1..12}; do
    if kubectl get secret test-secret -n "$NAMESPACE" &>/dev/null; then
      VALUE=$(kubectl get secret test-secret -n "$NAMESPACE" -o jsonpath="{.data.$KV_SECRET}" | base64 -d)
      echo "✅  Synced!  '$KV_SECRET' value: $VALUE"
      exit 0
    fi
    sleep 5
  done
  echo "⚠️  Timed out waiting for test secret to sync."
fi
