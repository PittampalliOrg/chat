# 'iac/setup-eso.sh'  – v2, cluster‑scoped SecretStore & namespace fix
#!/usr/bin/env bash
set -euo pipefail

################################## CONFIG #####################################
SUB_ID="fa5b32b6-1d6d-4110-bea2-8ac0e3126a38"           # Azure subscription
RG="rg1"                                                # resource group
CLUSTER="cluster2"                                      # AKS cluster name
VAULT="qs-ygl2zollxkbc6"                                # Key Vault name
ESO_NS="external-secrets"                               # ESO controller ns
SA_NAME="eso-azure-wi-sa"                               # workload‑id SA
APP_NAME="eso-${CLUSTER}"                               # AAD app display name
EXT_SECRET_FILE="${1:-}"                                # optional ES yaml
###############################################################################

echo -e "\n👉  Using subscription $SUB_ID"
az account set --subscription "$SUB_ID"

######################## 1. Prereq binaries ###################################
for tool in az kubectl helm; do
  command -v "$tool" >/dev/null || { echo "❌ $tool missing"; exit 1; }
done

######################## 2. azwi CLI ##########################################
if ! command -v azwi &>/dev/null; then
  echo "ℹ️  Installing azwi…"
  curl -sL https://raw.githubusercontent.com/Azure/azure-workload-identity/main/scripts/azure-workload-identity-release.sh | bash
  export PATH="$HOME/.azure-workload-identity/bin:$PATH"
fi

######################## 3. Enable OIDC / fetch creds #########################
az aks update -g "$RG" -n "$CLUSTER" --enable-oidc-issuer --enable-workload-identity
az aks get-credentials -g "$RG" -n "$CLUSTER" --overwrite-existing
OIDC_ISSUER=$(az aks show -g "$RG" -n "$CLUSTER" --query oidcIssuerProfile.issuerUrl -o tsv)
echo "   OIDC issuer: $OIDC_ISSUER"

###############################################################################
# 3b. Grant kubelet identity AcrPull on ACR                                   #
###############################################################################
ACR_NAME="vpittamp"                                  # <- adjust if needed
ACR_ID=$(az acr show -n "$ACR_NAME" --query id -o tsv)
KUBE_OID=$(az aks show -g "$RG" -n "$CLUSTER" \
           --query 'identityProfile.kubeletidentity.objectId' -o tsv)

echo "ℹ️  Granting AcrPull on $ACR_NAME to kubelet identity $KUBE_OID…"
az role assignment create \
  --assignee-object-id "$KUBE_OID" \
  --role AcrPull \
  --scope "$ACR_ID" \
  --only-show-errors || true     # ignore if already assigned


######################## 4. Namespace & ServiceAccount ########################
kubectl create namespace "$ESO_NS" --dry-run=client -o yaml | kubectl apply -f -
VAULT_ID=$(az keyvault show -g "$RG" -n "$VAULT" --query id -o tsv)

azwi serviceaccount create \
  --aad-application-name "$APP_NAME" \
  --service-account-namespace "$ESO_NS" \
  --service-account-name "$SA_NAME" \
  --service-account-issuer-url "$OIDC_ISSUER" \
  --azure-scope "$VAULT_ID" \
  --azure-role "Key Vault Secrets User"       # :contentReference[oaicite:2]{index=2}

AZURE_CLIENT_ID=$(kubectl -n "$ESO_NS" get sa "$SA_NAME" -o jsonpath='{.metadata.annotations.azure\.workload\.identity/client-id}')
echo "   SA client‑id: $AZURE_CLIENT_ID"

######################## 5. Install ESO via Helm ##############################
if ! helm status external-secrets -n "$ESO_NS" &>/dev/null; then
  helm repo add external-secrets https://charts.external-secrets.io
  helm repo update
  helm upgrade --install external-secrets external-secrets/external-secrets \
       --namespace "$ESO_NS" --create-namespace --set installCRDs=true   # :contentReference[oaicite:3]{index=3}
fi
kubectl -n "$ESO_NS" rollout status deploy/external-secrets

######################## 6. ClusterSecretStore (cluster‑scoped) ###############
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-keyvault-store
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: https://${VAULT}.vault.azure.net
      serviceAccountRef:
        name: $SA_NAME
        namespace: $ESO_NS          # << REQUIRED for ClusterSecretStore  :contentReference[oaicite:4]{index=4}
EOF

echo "ℹ️  Waiting for ClusterSecretStore readiness…"
kubectl wait --for=condition=Ready \
  clustersecretstore/azure-keyvault-store --timeout=120s     # :contentReference[oaicite:5]{index=5}

######################## 7. Apply user ExternalSecret (optional) ##############
if [[ -n "$EXT_SECRET_FILE" && -f "$EXT_SECRET_FILE" ]]; then
  echo "ℹ️  Applying user ExternalSecret: $EXT_SECRET_FILE"
  kubectl apply -f "$EXT_SECRET_FILE"
fi

######################## 8. Summary ###########################################
echo -e "\n✅  External Secrets set‑up complete."
echo "   ClusterSecretStore Ready: $(kubectl get clustersecretstore azure-keyvault-store -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')"
echo "   SA annotation:           $AZURE_CLIENT_ID"

###############################################################################
# 9. Optional test: read one secret
###############################################################################
read -r -p $'👉  Enter a Key Vault secret name to test (or Enter to skip): ' KV
if [[ -n "$KV" ]]; then
  cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test-secret
spec:
  refreshInterval: 2m
  secretStoreRef:
    kind: ClusterSecretStore
    name: azure-keyvault-store
  target:
    name: test-secret
    creationPolicy: Owner
  data:
  - secretKey: ${KV//-/_}         # map hyphens→underscores for env‑var style
    remoteRef:
      key: $KV
EOF
  echo "ℹ️  Waiting up to 60s for sync…"
  for i in {1..12}; do
    if kubectl get secret test-secret &>/dev/null; then
      VAL=$(kubectl get secret test-secret -o jsonpath="{.data.${KV//-/_}}" | base64 -d)
      echo "✅  Synced! value: $VAL"
      exit 0
    fi
    sleep 5
  done
  echo "⚠️  Timed out waiting for sync."
fi
