# scripts/kind-proxy.sh
#!/usr/bin/env bash
# Purpose: expose the Kind API (6445) and selected NodePorts
#          to the host & dev‑container via a lightweight NGINX stream proxy.

set -Eeuo pipefail
: "${SCRIPT_PATH:=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

log() { printf "[%s] %s\n" "$(date +'%H:%M:%S')" "$*"; }

launch_kind_api_proxy() {
  log "🔌  Launching Kind stream‑proxy (API + NodePorts)"

  # Find the control‑plane container for this cluster
  local CP
  CP=$(docker ps --filter "label=io.x-k8s.kind.cluster=${KIND_CLUSTER_NAME}" \
                 --filter "label=io.x-k8s.kind.role=control-plane" \
                 --format '{{.Names}}')
  [[ -n "$CP" ]] || { log "❌  Could not locate Kind control‑plane container"; return 1; }

  local WORK_DIR; WORK_DIR=$(mktemp -d)

  #######################################################################
  # 1. Generate nginx.conf (stream block = TCP passthrough).
  #######################################################################
  cat >"${WORK_DIR}/nginx-kind.conf" <<EOF
events {}
stream {
  upstream apiserver     { server ${CP}:6443; }      # K8s API
  upstream argocd_http   { server ${CP}:30080; }
  upstream argocd_https  { server ${CP}:30443; }
  upstream grafana_ui    { server ${CP}:30001; }
  upstream prom_ui       { server ${CP}:30002; }
  upstream loki_http     { server ${CP}:31000; }
  upstream tempo_http    { server ${CP}:32000; }
  upstream nextjs_dev    { server ${CP}:3000;  }

  server { listen 6443;   proxy_pass apiserver; }    # API
  server { listen 30080;  proxy_pass argocd_http; }  # Argo CD http
  server { listen 30443;  proxy_pass argocd_https; } # Argo CD https
  server { listen 30001;  proxy_pass grafana_ui; }   # Grafana
  server { listen 30002;  proxy_pass prom_ui; }      # Prometheus
  server { listen 31000;  proxy_pass loki_http; }    # Loki
  server { listen 32000;  proxy_pass tempo_http; }   # Tempo
  server { listen 30100;  proxy_pass nextjs_dev; }   # Next.js (optional)
}
EOF

  #######################################################################
  # 2. Build a minimal NGINX image with that config
  #######################################################################
  cat >"${WORK_DIR}/Dockerfile" <<'EOF'
FROM nginx:1.25-alpine
COPY nginx-kind.conf /etc/nginx/nginx.conf
CMD ["nginx", "-g", "daemon off;"]
EOF

  docker build -q -t kind-api-proxy-img "${WORK_DIR}"
  docker rm -f kind-api-proxy >/dev/null 2>&1 || true

  #######################################################################
  # 3. Run the proxy, publishing ports to the host
  #######################################################################
  docker run -d --name kind-api-proxy --network kind \
    -p 6445:6443 \
    -p 30080:30080 \
    -p 30443:30443 \
    -p 30001:30001 \
    -p 30002:30002 \
    -p 31000:31000 \
    -p 32000:32000 \
    -p 30100:3000 \
    kind-api-proxy-img

  # Wait for the API to respond
  until curl -ks https://host.docker.internal:6445/livez >/dev/null 2>&1; do
    sleep 2
  done
  log "✅  Kind API reachable at https://host.docker.internal:6445"
}

patch_kubeconfigs() {
  log "✏️  Patching kubeconfig to use host.docker.internal:6445"

  local KCONF="$HOME/.kube/config"
  kind get kubeconfig --name "${KIND_CLUSTER_NAME}" > "$KCONF"
  sed -i -E 's#(^[[:space:]]*server:).*#\1 https://host.docker.internal:6445#' "$KCONF"
  export KUBECONFIG="$KCONF"
  kubectl config use-context "kind-${KIND_CLUSTER_NAME}"

  # Convenience copy for external GUI tools
  local DL_KCONF="${SCRIPT_PATH}/kind-headlamp.yaml"
  kind export kubeconfig --name "${KIND_CLUSTER_NAME}" --kubeconfig "$DL_KCONF"
  sed -i -E 's#(^[[:space:]]*server:).*#\1 https://localhost:6445#' "$DL_KCONF"
  chmod 0644 "$DL_KCONF"
  log "📄  Headlamp‑compatible kubeconfig written to $DL_KCONF"
}
