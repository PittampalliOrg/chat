#!/usr/bin/env bash
# ------------------------------------------------------------------
#  render-deployments.sh – turn *.yaml.tpl → rendered YAML files
# ------------------------------------------------------------------
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DEPLOY_DIR="${DEPLOY_DIR:-${PROJECT_ROOT}/deployments}"
OUT_DIR="${OUT_DIR:-${PROJECT_ROOT}/resources/infra-secrets/base}"
mkdir -p "$OUT_DIR"

# Shell-exported vars expected from caller (wi-kind-lib)
export APP_ID TENANT_ID ESO_NS REGISTRY_NAME REGISTRY_NS VAULT_URL VAULT_ID SA_NAME

shopt -s nullglob
for tpl in "${DEPLOY_DIR}"/*.yaml.tpl "${DEPLOY_DIR}"/*.yml.tpl; do
  dest="${OUT_DIR}/$(basename "${tpl%.tpl}")"
  envsubst <"$tpl" >"$dest"
done
shopt -u nullglob

# write (or overwrite) an Application CR so Argo CD picks it up
APP_FILE="${PROJECT_ROOT}/apps/infra-secrets/application.yaml"
REPO_URL="$(git config --get remote.origin.url || true)"
if [[ -n "$REPO_URL" ]]; then
  GITHUB_REPOSITORY="${REPO_URL##*:}"
  GITHUB_REPOSITORY="${GITHUB_REPOSITORY%.git}"
else
  GITHUB_REPOSITORY="UNKNOWN/REPO"
fi

cat >"$APP_FILE" <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: infra-secrets
  namespace: argocd
  finalizers: ["resources-finalizer.argocd.argoproj.io"]
spec:
  project: default
  source:
    repoURL: https://github.com/${GITHUB_REPOSITORY}
    targetRevision: HEAD
    path: resources/infra-secrets/base
  destination:
    name: in-cluster
    namespace: external-secrets
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: ["CreateNamespace=true"]
EOF
