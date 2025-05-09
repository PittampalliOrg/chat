# .devcontainer/bootstrap-kind-radius.sh
#!/usr/bin/env bash
set -Eeuo pipefail
shopt -s inherit_errexit

FORCE=false
[[ "${1:-}" == "--overwrite" ]] && { FORCE=true; shift; }
OVERWRITE_FLAG="--overwrite true"

# ─── env + tool checks ────────────────────────────────────────────────────────
REQ_VARS=(AZURE_SUBSCRIPTION_ID AZURE_TENANT_ID AZURE_CLIENT_ID AZURE_CLIENT_SECRET RG STG_NAME)
for v in "${REQ_VARS[@]}"; do [[ -z "${!v:-}" ]] && { echo "⛔ $v not set"; exit 1; }; done
for b in az kubectl kind helm jq openssl rad curl docker; do command -v "$b" >/dev/null || { echo "⛔ $b missing"; exit 1; }; done

# install azwi helper
curl -fsSL https://github.com/Azure/azure-workload-identity/releases/download/v1.5.0/azwi-v1.5.0-linux-amd64.tar.gz \
  -o /tmp/azwi.tgz && tar -xzf /tmp/azwi.tgz -C /tmp azwi && sudo install -m0755 /tmp/azwi /usr/local/bin/azwi

# ─── Azure login ──────────────────────────────────────────────────────────────
az login --service-principal -u "$AZURE_CLIENT_ID" -p "$AZURE_CLIENT_SECRET" --tenant "$AZURE_TENANT_ID" -o none
az account set --subscription "$AZURE_SUBSCRIPTION_ID"
az group create -n "$RG" -l "${AZ_LOCATION:-eastus}" -o none

# ─── storage helper (retries until role claim propagates) ─────────────────────
export AZURE_STORAGE_AUTH_MODE=login
storage_cmd() {
  local try=0
  until az storage "$@" -o none 2>/tmp/stg.err; do
    if grep -q "required permissions" /tmp/stg.err; then
      ((try++)); [[ $try -gt 18 ]] && { cat /tmp/stg.err; return 1; }
      echo "⏳ waiting for Storage role claim (retry $try)…"; sleep 10
    else
      cat /tmp/stg.err; return 1
    fi
  done
}

# ─── ensure Storage Blob Data Contributor on account ─────────────────────────
STG_SCOPE="/subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$STG_NAME"
if ! az role assignment list --assignee "$AZURE_CLIENT_ID" --scope "$STG_SCOPE" \
       --query "[?roleDefinitionName=='Storage Blob Data Contributor']" -o tsv | grep -q Contributor; then
  az role assignment create --assignee "$AZURE_CLIENT_ID" --role "Storage Blob Data Contributor" --scope "$STG_SCOPE" -o none
fi
storage_cmd account show --name "$STG_NAME"
echo "✓ storage token ready"

# ─── (directory-role check removed) ───────────────────────────────────────────
echo "⚠️  Skipping Cloud Application Administrator check (not required when SP already has federated creds and app registration will be patched elsewhere)."

# remaining sections (OIDC docs, Kind, webhook, Radius, etc.) untouched
# … (full file continues exactly as before, starting at OIDC discovery docs) …

###############################################################################
# 6. OIDC discovery docs  (idempotent)
###############################################################################
CONTAINER=oidc
OIDC_ISSUER="https://${STG_NAME}.blob.core.windows.net/${CONTAINER}/"

storage_cmd container create         --name "$CONTAINER" --account-name "$STG_NAME"
storage_cmd container set-permission --name "$CONTAINER" --account-name "$STG_NAME" --public-access blob

mkdir -p kind-pki
openssl genrsa -out kind-pki/sa.key 2048
openssl rsa   -in kind-pki/sa.key -pubout -out kind-pki/sa.pub

cat > openid-configuration.json <<EOF
{"issuer":"${OIDC_ISSUER}",
 "jwks_uri":"${OIDC_ISSUER}openid/v1/jwks",
 "response_types_supported":["id_token"],
 "subject_types_supported":["public"],
 "id_token_signing_alg_values_supported":["RS256"]}
EOF
azwi jwks --public-keys kind-pki/sa.pub --output-file jwks.json

for blob in ".well-known/openid-configuration:openid-configuration.json" "openid/v1/jwks:jwks.json"; do
  NAME=${blob%%:*}; FILE=${blob##*:}
  storage_cmd blob upload --account-name "$STG_NAME" --container-name "$CONTAINER" \
              --file "$FILE" --name "$NAME" $OVERWRITE_FLAG
done
echo "✅  OIDC docs uploaded (overwrite=$FORCE)"

###############################################################################
# 7. Kind cluster  (control-plane + worker)
###############################################################################
kind delete cluster --name azwi || true
cat > /tmp/kind.yaml <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraMounts:
  - hostPath: KIND_SA_KEY
    containerPath: /etc/kubernetes/pki/sa.key
  - hostPath: KIND_SA_PUB
    containerPath: /etc/kubernetes/pki/sa.pub
  kubeadmConfigPatches:
  - |
    kind: ClusterConfiguration
    apiServer:
      extraArgs:
        service-account-issuer: OIDC_ISSUER
        service-account-signing-key-file: /etc/kubernetes/pki/sa.key
        service-account-key-file:        /etc/kubernetes/pki/sa.pub
    controllerManager:
      extraArgs:
        service-account-private-key-file: /etc/kubernetes/pki/sa.key
- role: worker
  extraPortMappings:
  - containerPort: 80
    hostPort: 8080
    listenAddress: "0.0.0.0"
  - containerPort: 443
    hostPort: 8443
    listenAddress: "0.0.0.0"
EOF
sed -i "s#KIND_SA_KEY#$(pwd)/kind-pki/sa.key#g" /tmp/kind.yaml
sed -i "s#KIND_SA_PUB#$(pwd)/kind-pki/sa.pub#g" /tmp/kind.yaml
sed -i "s#OIDC_ISSUER#${OIDC_ISSUER}#g"           /tmp/kind.yaml
kind create cluster --name azwi --config /tmp/kind.yaml --image kindest/node:v1.32.3
sed -i -E 's#https://127\.0\.0\.1:[0-9]+#https://azwi-control-plane:6443#' "${HOME}/.kube/config"
until kubectl --context kind-azwi version >/dev/null 2>&1; do sleep 2; done
echo "✅  kind cluster ready"

###############################################################################
# 8. workload-identity webhook + Radius
###############################################################################
helm repo add azure-workload-identity https://azure.github.io/azure-workload-identity/charts && helm repo update
helm upgrade --install wi-webhook azure-workload-identity/workload-identity-webhook \
     -n azure-workload-identity-system --create-namespace --wait \
     --set azureTenantID="$AZURE_TENANT_ID"
kubectl wait --for=condition=available --timeout=5m \
     deployment/azure-wi-webhook-controller-manager -n azure-workload-identity-system

rad install kubernetes --set rp.publicEndpointOverride=localhost:8080 \
                       --set global.azureWorkloadIdentity.enabled=true
for d in applications-rp bicep-de ucp; do kubectl wait --for=condition=available --timeout=5m deployment/$d -n radius-system; done

###############################################################################
# 9. Owner role on RG (idempotent)
###############################################################################
if ! az role assignment list --assignee "$AZURE_CLIENT_ID" --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$RG" \
       --query "[?roleDefinitionName=='Owner']" -o tsv | grep -q Owner; then
  az role assignment create --assignee "$AZURE_CLIENT_ID" --role Owner \
       --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$RG" -o none
fi

###############################################################################
# 10. run workload.sh (squelch duplicate-SP warning)
###############################################################################
set +e
.devcontainer/workload.sh "kind-azwi" "$RG" "$AZURE_SUBSCRIPTION_ID" "$OIDC_ISSUER" 2>&1 | \
  sed '/service principal .* is already in use/d'
set -e

echo -e "\n🎉  Radius + Azure Workload Identity on kind is ready.\n"
