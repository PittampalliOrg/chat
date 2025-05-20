#!/usr/bin/env bash
# ------------------------------------------------------------------
#  wi-kind.sh – run exactly one phase from wi-kind-lib.sh
# ------------------------------------------------------------------
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/wi-kind-lib.sh"

# Hard requirements for *every* phase
require_dns
require_az_login

phase="${1:-}"
case "$phase" in
  storage)   create_azure_blob_storage_account ;;
  kind)      create_kind_cluster && retry_proxy && patch_kubeconfigs ;;
  oidc)      upload_openid_docs ;;
  wi_webhook) install_workload_identity_webhook ;;
  radius)    ensure_radius_app_registration && run_rad_identity \
               && refresh_app_id && ensure_cluster_oidc_matches_storage ;;
  infra)     resolve_keyvault && install_external_secrets_operator \
               && create_eso_service_account && ensure_acr_pull_role ;;
  deploy)    render_infra_secrets && apply_deployments ;;
  argocd)    install_argocd && enable_admin_api_key \
               && patch_argocd_service_nodeport && wait_for_argocd \
               && login_argocd_cli && print_argocd_admin_password ;;
  bootstrap) apply_app_of_apps ;;
  

    *) echo "Usage: $0 {storage|kind|oidc|wi_webhook|radius|infra|workflows|deploy|argocd|bootstrap}" >&2 ; exit 2 ;;
esac
