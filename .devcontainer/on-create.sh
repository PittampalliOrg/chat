#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# 0) copy the host kube-config if it exists
# -----------------------------------------------------------------------------
mkdir -p "${HOME}/.kube"
if [[ -f /usr/local/share/kube-localhost/config ]]; then
  cp /usr/local/share/kube-localhost/config "${HOME}/.kube/host-config"
elif [[ -f /mnt/c/Users/${USER}/.kube/config ]]; then          # WSL users only
  cp "/mnt/c/Users/${USER}/.kube/config" "${HOME}/.kube/host-config"
fi

[[ -f ${HOME}/.kube/host-config ]] || {
  echo "⚠ No kube-config found on the host – skipping cluster setup."
  exit 0
}

cp "${HOME}/.kube/host-config" "${HOME}/.kube/config"

CTX=docker-desktop

# -----------------------------------------------------------------------------
# 1) detect which address answers on 6443 and patch the config
# -----------------------------------------------------------------------------
for addr in 127.0.0.1 host.docker.internal kubernetes.docker.internal \
            "$(getent hosts host-gateway 2>/dev/null | awk '{print $1}')" ; do
  [[ -z ${addr} ]] && continue
  if timeout 2 bash -c ":</dev/tcp/${addr}/6443" 2>/dev/null; then
    sed -i "s#https://.*:6443#https://${addr}:6443#" "${HOME}/.kube/config"
    echo "✅ API reachable at https://${addr}:6443"
    break
  fi
done

# -----------------------------------------------------------------------------
# 2) switch context – *no* version probe, so no outdated flags
# -----------------------------------------------------------------------------
kubectl config use-context "${CTX}" || {
  echo "❌ Context '${CTX}' not found in kube-config."
  exit 1
}

echo "🎉 Dev-container is ready – run any tooling you need manually."
