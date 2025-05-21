# 'scripts/kind-proxy.sh'
#!/usr/bin/env bash
# Purpose: expose the Kind API and selected NodePorts to the host
#          via a lightweight NGINX stream proxy.
# This script assumes variables like KIND_CLUSTER_NAME, K8S_API_PROXY_HOST_PORT,
# ARGO_HTTP_PORT, ARGO_HTTPS_PORT, etc., are set by the calling environment (e.g., wi-kind-lib.sh).

set -Eeuo pipefail

if ! command -v log &> /dev/null; then
  log() { printf "[%s] %s\n" "$(date +'%H:%M:%S')" "$*"; }
fi

: "${SCRIPT_PATH:?SCRIPT_PATH must be set by the caller (wi-kind-lib.sh)}"

launch_kind_api_proxy() {
  log "🚀 Launching Kind NGINX stream-proxy..."
  : "${KIND_CLUSTER_NAME:?KIND_CLUSTER_NAME must be set}"
  : "${K8S_API_PROXY_HOST_PORT:?K8S_API_PROXY_HOST_PORT must be set}"
  : "${ARGO_HTTP_PORT:?ARGO_HTTP_PORT must be set}"
  : "${ARGO_HTTPS_PORT:?ARGO_HTTPS_PORT must be set}"
  : "${GRAFANA_UI_PORT:?GRAFANA_UI_PORT must be set}"
  : "${PROM_UI_PORT:?PROM_UI_PORT must be set}"
  : "${LOKI_HTTP_PORT:?LOKI_HTTP_PORT must be set}"
  : "${TEMPO_HTTP_PORT:?TEMPO_HTTP_PORT must be set}"
  : "${NEXTJS_DEV_HOST_PORT:?NEXTJS_DEV_HOST_PORT must be set}"
  : "${ARGO_WF_NODE_PORT:?ARGO_WF_NODE_PORT must be set}"
  local nextjs_internal_nodeport=3000

  local CP_NAME CP_IP
  CP_NAME=$(docker ps --filter "label=io.x-k8s.kind.cluster=${KIND_CLUSTER_NAME}" \
                      --filter "label=io.x-k8s.kind.role=control-plane" \
                      --format '{{.Names}}' | head -n 1)
  if [[ -z "$CP_NAME" ]]; then
    log "❌ ERROR: Could not locate Kind control-plane container for cluster '${KIND_CLUSTER_NAME}'."
    return 1
  fi
  CP_IP=$(docker inspect -f "{{.NetworkSettings.Networks.kind.IPAddress}}" "${CP_NAME}" 2>/dev/null)
  if [[ -z "$CP_IP" ]]; then
    log "❌ ERROR: Could not get IP address for Kind control-plane node '${CP_NAME}'."
    return 1
  fi
  log "ℹ️ Kind control-plane: Name='${CP_NAME}', IP='${CP_IP}' (on 'kind' Docker network)."

  local WORK_DIR proxy_image_tag proxy_container_name
  WORK_DIR=$(mktemp -d)
  proxy_image_tag="kind-nginx-proxy-img:${KIND_CLUSTER_NAME}"
  proxy_container_name="kind-nginx-proxy-${KIND_CLUSTER_NAME}"

  log "📝 Generating NGINX configuration in ${WORK_DIR}/nginx-kind.conf"
  cat >"${WORK_DIR}/nginx-kind.conf" <<EOF
events {}
# TCP stream proxy for Kubernetes APIs and non-HTTP services
stream {
  upstream k8s_api_upstream       { server ${CP_IP}:6443; }
  upstream argocd_http_upstream   { server ${CP_IP}:${ARGO_HTTP_PORT}; }
  upstream argocd_https_upstream  { server ${CP_IP}:${ARGO_HTTPS_PORT}; }
  upstream grafana_ui_upstream    { server ${CP_IP}:${GRAFANA_UI_PORT}; }
  upstream prom_ui_upstream       { server ${CP_IP}:${PROM_UI_PORT}; }
  upstream loki_http_upstream     { server ${CP_IP}:${LOKI_HTTP_PORT}; }
  upstream tempo_http_upstream    { server ${CP_IP}:${TEMPO_HTTP_PORT}; }
  upstream nextjs_dev_upstream    { server ${CP_IP}:${nextjs_internal_nodeport}; }
  upstream argo_wf_upstream       { server ${CP_IP}:${ARGO_WF_NODE_PORT}; }

  server { listen ${K8S_API_PROXY_HOST_PORT}; proxy_pass k8s_api_upstream; }
  server { listen ${ARGO_HTTP_PORT};          proxy_pass argocd_http_upstream; }
  server { listen ${ARGO_HTTPS_PORT};         proxy_pass argocd_https_upstream; }
  server { listen ${GRAFANA_UI_PORT};         proxy_pass grafana_ui_upstream; }
  server { listen ${PROM_UI_PORT};            proxy_pass prom_ui_upstream; }
  server { listen ${LOKI_HTTP_PORT};          proxy_pass loki_http_upstream; }
  server { listen ${TEMPO_HTTP_PORT};         proxy_pass tempo_http_upstream; }
  server { listen ${NEXTJS_DEV_HOST_PORT};    proxy_pass nextjs_dev_upstream; }
  server { listen ${ARGO_WF_NODE_PORT};       proxy_pass argo_wf_upstream; }
}

# HTTP proxy with host-based routing
http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  
  log_format  main  '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
  
  access_log  /var/log/nginx/access.log  main;
  sendfile        on;
  keepalive_timeout  65;

  # Argo Workflows UI via HTTP host-based routing
  server {
    listen 80;
    server_name argo.localtest.me;
    
    location / {
      proxy_pass http://${CP_IP}:${ARGO_WF_NODE_PORT};
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
  }

  # Default server for unmatched hostnames
  server {
    listen 80 default_server;
    server_name _;
    return 404 "Host not configured. Check your URL and DNS settings.";
  }
}
EOF

  log "🏗️ Building NGINX proxy Docker image '${proxy_image_tag}'..."
  cat >"${WORK_DIR}/Dockerfile" <<'DF_EOF'
FROM nginx:1.25-alpine
COPY nginx-kind.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g", "daemon off;"]
DF_EOF
  if ! docker build --quiet -t "${proxy_image_tag}" "${WORK_DIR}"; then
    log "❌ ERROR: Failed to build NGINX proxy image '${proxy_image_tag}'."
    rm -rf "${WORK_DIR}"; return 1
  fi
  rm -rf "${WORK_DIR}"

  if docker inspect "$proxy_container_name" &>/dev/null; then
    log "🔌 Removing existing NGINX proxy container '$proxy_container_name'..."
    docker rm -f "$proxy_container_name" &>/dev/null || true
  fi

  log "🏃 Running NGINX proxy container '${proxy_container_name}' with port mappings..."
  if ! docker run -d --name "$proxy_container_name" --network kind --restart always \
    -p "0.0.0.0:${K8S_API_PROXY_HOST_PORT}:${K8S_API_PROXY_HOST_PORT}" \
    -p "0.0.0.0:${ARGO_HTTP_PORT}:${ARGO_HTTP_PORT}" \
    -p "0.0.0.0:${ARGO_HTTPS_PORT}:${ARGO_HTTPS_PORT}" \
    -p "0.0.0.0:${GRAFANA_UI_PORT}:${GRAFANA_UI_PORT}" \
    -p "0.0.0.0:${PROM_UI_PORT}:${PROM_UI_PORT}" \
    -p "0.0.0.0:${LOKI_HTTP_PORT}:${LOKI_HTTP_PORT}" \
    -p "0.0.0.0:${TEMPO_HTTP_PORT}:${TEMPO_HTTP_PORT}" \
    -p "0.0.0.0:${NEXTJS_DEV_HOST_PORT}:${NEXTJS_DEV_HOST_PORT}" \
    -p "0.0.0.0:${ARGO_WF_NODE_PORT}:${ARGO_WF_NODE_PORT}" \
    -p "0.0.0.0:80:80" \
    "${proxy_image_tag}"; then
      log "❌ ERROR: Failed to start NGINX proxy container '$proxy_container_name'."; docker logs "$proxy_container_name" 2>/dev/null || true; return 1
  fi

  log "ℹ️ Verifying K8s API accessibility via NGINX proxy (https://host.docker.internal:${K8S_API_PROXY_HOST_PORT})..."
  local try_count=0; local max_tries=15
  until curl -kfsSL --max-time 2 "https://host.docker.internal:${K8S_API_PROXY_HOST_PORT}/livez" >/dev/null 2>&1; do
    try_count=$((try_count + 1))
    if [[ $try_count -ge $max_tries ]]; then
      log "❌ ERROR: Kind API did not become reachable via NGINX proxy at https://host.docker.internal:${K8S_API_PROXY_HOST_PORT} after ${max_tries} attempts."
      log "Proxy container '$proxy_container_name' logs:"; docker logs "$proxy_container_name" 2>/dev/null || true; return 1
    fi
    log "⏳ K8s API via proxy not ready yet (attempt ${try_count}/${max_tries})... sleeping 2s"; sleep 2
  done
  log "✅ Kind API reachable via NGINX proxy at https://host.docker.internal:${K8S_API_PROXY_HOST_PORT}"
  return 0
}

patch_kubeconfigs() {
  log "✏️  Patching kubeconfig to use NGINX proxy: https://host.docker.internal:${K8S_API_PROXY_HOST_PORT}"
  local KCONF="$HOME/.kube/config"
  : "${KIND_CLUSTER_NAME:?KIND_CLUSTER_NAME must be set for patch_kubeconfigs}"
  : "${K8S_API_PROXY_HOST_PORT:?K8S_API_PROXY_HOST_PORT must be set for patch_kubeconfigs}"
  : "${SCRIPT_PATH:?SCRIPT_PATH must be set for patch_kubeconfigs for Headlamp config}"

  log "ℹ️ Getting kubeconfig from Kind for cluster '${KIND_CLUSTER_NAME}' into '${KCONF}'..."
  if ! kind get kubeconfig --name "${KIND_CLUSTER_NAME}" > "$KCONF"; then
    log "❌ ERROR: Failed to get kubeconfig for cluster '${KIND_CLUSTER_NAME}'."
    return 1
  fi
  log "📄 Kubeconfig content from 'kind get kubeconfig':"
  cat "$KCONF" # Log initial content

  local context_name="kind-${KIND_CLUSTER_NAME}"
  local server_address_docker="https://host.docker.internal:${K8S_API_PROXY_HOST_PORT}"

  # Verify the context and cluster name exist in the kubeconfig
  if ! grep -q "name: ${context_name}" "$KCONF"; then
    log "❌ ERROR: Context or Cluster named '${context_name}' not found in the kubeconfig generated by 'kind get kubeconfig'."
    log "File: $KCONF. Cannot proceed with patching."
    return 1
  fi

  log "ℹ️ Modifying server address in '${KCONF}' for cluster '${context_name}' to '${server_address_docker}'."
  if command -v yq &> /dev/null; then
    yq e "(.clusters[] | select(.name == \"${context_name}\").cluster.server) = \"${server_address_docker}\"" -i "$KCONF"
    # Ensure current-context is set correctly by yq if it changes it
    yq e ".current-context = \"${context_name}\"" -i "$KCONF"
  else
    log "⚠️ yq not found, using sed for kubeconfig patching (less robust)."
    local sed_cmd="sed -i"
    if [[ "$(uname)" == "Darwin" ]]; then sed_cmd="sed -i ''"; fi
    # Attempt a more targeted sed: find the cluster block and change its server.
    # This is still complex with plain sed. This example changes the first server line found after the cluster name.
    # It assumes 'server:' is on its own line under the cluster definition.
    # A truly robust sed solution for YAML is very hard.
    # This simplified sed targets any server line, relying on `kind get kubeconfig` producing a simple file.
    ${sed_cmd} -E "s|server: https://.*|server: ${server_address_docker}|" "$KCONF"
  fi
  log "📄 Patched kubeconfig content:"
  cat "$KCONF"

  export KUBECONFIG="$KCONF"

  log "ℹ️ Setting current kubectl context to '${context_name}'..."
  if ! kubectl config use-context "${context_name}"; then
     log "❌ ERROR: Failed to set kubectl context to '${context_name}' using the patched kubeconfig."
     log "Current KUBECONFIG=${KUBECONFIG}"
     log "kubectl config view:"
     kubectl config view --raw
     return 1
  fi
  log "✅ kubectl context is now '${context_name}'."
  log "Testing connection with 'kubectl cluster-info':"
  if ! kubectl cluster-info; then
    log "❌ ERROR: 'kubectl cluster-info' failed after patching kubeconfig and setting context."
    return 1
  fi
  log "✅ 'kubectl cluster-info' successful."


  # Headlamp kubeconfig
  local DL_KCONF="${SCRIPT_PATH}/kind-headlamp.yaml"
  local server_address_localhost="https://localhost:${K8S_API_PROXY_HOST_PORT}"
  cp "$KCONF" "$DL_KCONF"
  if command -v yq &> /dev/null; then
      yq e "(.clusters[] | select(.name == \"${context_name}\").cluster.server) = \"${server_address_localhost}\"" -i "$DL_KCONF"
      yq e ".current-context = \"${context_name}\"" -i "$DL_KCONF"
  else
      local sed_cmd_dl="sed -i"; if [[ "$(uname)" == "Darwin" ]]; then sed_cmd_dl="sed -i ''"; fi
      ${sed_cmd_dl} -E "s|server: https://.*|server: ${server_address_localhost}|" "$DL_KCONF"
  fi
  chmod 0644 "$DL_KCONF"
  log "📄  Headlamp-compatible kubeconfig (using ${server_address_localhost}) written to $DL_KCONF"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  log "Running kind-proxy.sh directly (for testing/standalone)..."
  : "${KIND_CLUSTER_NAME:=kind}"; : "${K8S_API_PROXY_HOST_PORT:=6445}"; : "${ARGO_HTTP_PORT:=30080}"; : "${ARGO_HTTPS_PORT:=30443}"; : "${GRAFANA_UI_PORT:=30001}"; : "${PROM_UI_PORT:=30002}"; : "${LOKI_HTTP_PORT:=31000}"; : "${TEMPO_HTTP_PORT:=32000}"; : "${NEXTJS_DEV_HOST_PORT:=30100}"; : "${SCRIPT_PATH:=./scripts}"
  if launch_kind_api_proxy && patch_kubeconfigs; then
    log "✅ kind-proxy.sh standalone execution successful."; else log "❌ kind-proxy.sh standalone execution failed."; exit 1;
  fi
fi