# ------------------------------------------------------------------
#   Dev-cluster bootstrap – GNU Make
# ------------------------------------------------------------------
SHELL        := /usr/bin/env bash
PROJECT_ROOT := $(CURDIR)
SCRIPT_DIR   := $(PROJECT_ROOT)/scripts
PHASE_RUNNER := $(SCRIPT_DIR)/wi-kind.sh

export          # propagate all user-set vars into recipes

# ------------------------------------------------------------------
#  Target DAG
# ------------------------------------------------------------------
.PHONY: all storage kind oidc wi-webhook radius infra argocd \
        deploy bootstrap clean

all : bootstrap                         ## full end-to-end build (default)

storage   :                             ## 01 – Azure storage account + RBAC
	@$(PHASE_RUNNER) storage

kind      : storage                     ## 02 – Kind cluster + OIDC issuer
	@$(PHASE_RUNNER) kind

oidc      : kind                        ## 03 – Upload OIDC discovery docs
	@$(PHASE_RUNNER) oidc

wi-webhook: oidc                        ## 04 – Install workload-identity webhook
	@$(PHASE_RUNNER) wi_webhook

radius    : wi-webhook                  ## 05 – Radius app-registration + SP
	@$(PHASE_RUNNER) radius

infra     : radius                      ## 06 – KeyVault, ESO, SA + RBAC
	@$(PHASE_RUNNER) infra

argocd    : infra                       ## 07 – Install Argo CD & expose NodePorts
	@$(PHASE_RUNNER) argocd

deploy    : argocd                      ## 08 – Render & apply deployments/
	@$(PHASE_RUNNER) deploy

bootstrap : deploy                      ## 09 – Apply app-of-apps manifest
	@$(PHASE_RUNNER) bootstrap

# ------------------------------------------------------------------
#  Utility
# ------------------------------------------------------------------
clean:                                   ## Delete Kind cluster & proxy
	-@kind delete cluster --name "$${KIND_CLUSTER_NAME:-$${RESOURCE_GROUP:-kind}}"
	-@docker rm -f kind-nginx-proxy-$${KIND_CLUSTER_NAME:-$${RESOURCE_GROUP:-kind}} 2>/dev/null || true
	
argo-ui:                                 ## Setup easy access to Argo Workflows UI
	@source $(SCRIPT_DIR)/wi-kind-lib.sh && setup_argo_workflows_ui_access
