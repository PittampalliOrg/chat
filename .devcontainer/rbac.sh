#!/usr/bin/env bash
set -Eeuo pipefail

# ─── env/CLI context (values come from devcontainer.env) ──────────────────────
: "${AZURE_SUBSCRIPTION_ID:?} ${AZURE_TENANT_ID:?} ${AZURE_CLIENT_ID:?} ${AZURE_CLIENT_SECRET:?}"
: "${RG:?} ${STG_NAME:?}"
LOCATION="${LOCATION:-eastus}"        # override with --location
SP_NAME="${SP_NAME:-radius-sp}"

# ─── login as the service-principal ───────────────────────────────────────────
az login --service-principal -u "$AZURE_CLIENT_ID" -p "$AZURE_CLIENT_SECRET" \
         --tenant "$AZURE_TENANT_ID" -o none
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# ─── resource-group (idempotent) ──────────────────────────────────────────────
az group create -n "$RG" -l "$LOCATION" -o none
RG_SCOPE="/subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/$RG"

# ─── service-principal exists?  (create app + sp if missing) ─────────────────
if ! az ad sp show --id "$AZURE_CLIENT_ID" &>/dev/null; then
  echo "Creating service-principal $SP_NAME (appId=$AZURE_CLIENT_ID) …"
  az ad sp create --id "$AZURE_CLIENT_ID" -o none
fi
SP_OBJ_ID=$(az ad sp show --id "$AZURE_CLIENT_ID" --query id -o tsv)

# ─── ensure Owner on resource-group ───────────────────────────────────────────
if ! az role assignment list --assignee "$AZURE_CLIENT_ID" --scope "$RG_SCOPE" \
       --query "[?roleDefinitionName=='Owner']" -o tsv | grep -q Owner; then
  az role assignment create --assignee "$AZURE_CLIENT_ID" --role Owner \
       --scope "$RG_SCOPE" -o none
fi

# ─── storage account (idempotent) ────────────────────────────────────────────
if ! az storage account show --name "$STG_NAME" --resource-group "$RG" &>/dev/null; then
  az storage account create -n "$STG_NAME" -g "$RG" -l "$LOCATION" \
      --sku Standard_LRS --kind StorageV2 --allow-blob-public-access true -o none
fi
STG_SCOPE="$RG_SCOPE/providers/Microsoft.Storage/storageAccounts/$STG_NAME"

# ─── Storage-Blob-Data-Contributor on storage account ────────────────────────
if ! az role assignment list --assignee "$AZURE_CLIENT_ID" --scope "$STG_SCOPE" \
       --query "[?roleDefinitionName=='Storage Blob Data Contributor']" -o tsv \
       | grep -q Contributor; then
  az role assignment create --assignee "$AZURE_CLIENT_ID" \
       --role "Storage Blob Data Contributor" --scope "$STG_SCOPE" -o none
fi

# ─── summary ─────────────────────────────────────────────────────────────────
echo -e "\n===== READY CHECK ====="
echo "SP objectId      : $SP_OBJ_ID"
echo "SP clientId      : $AZURE_CLIENT_ID"
echo "Resource group   : $RG"
echo "Storage account  : $STG_NAME"
az role assignment list --assignee "$AZURE_CLIENT_ID" --all \
     --query "[].{Role:roleDefinitionName,Scope:scope}" -o table
echo "======================"
