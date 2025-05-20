#!/bin/sh
curl -sSL \
  https://github.com/mikefarah/yq/releases/download/v4.44.1/yq_linux_amd64 \
  -o /usr/local/bin/yq && chmod +x /usr/local/bin/yq 

npm install -g @openai/codex 
npm install -g @anthropic-ai/claude-code
npm install -g devspace

# sudo apt-get update && sudo apt-get install -y --no-install-recommends curl vim gpg ca-certificates
# curl -fsSL https://packages.smallstep.com/keys/apt/repo-signing-key.gpg -o /etc/apt/trusted.gpg.d/smallstep.asc && \
#     echo 'deb [signed-by=/etc/apt/trusted.gpg.d/smallstep.asc] https://packages.smallstep.com/stable/debian debs main' \
#     | tee /etc/apt/sources.list.d/smallstep.list
# sudo apt-get update && sudo apt-get -y install step-cli

curl -fsSL https://github.com/Azure/azure-workload-identity/releases/download/v1.5.0/azwi-v1.5.0-linux-amd64.tar.gz \
 | tar -xz -C /tmp
sudo install -m0755 /tmp/azwi /usr/local/bin/azwi
az extension add --name aks-preview --only-show-errors >/dev/null 2>&1 || true

curl -fsSL https://github.com/ducaale/xh/releases/download/v0.17.0/xh-v0.17.0-x86_64-unknown-linux-musl.tar.gz \
    | tar -xz -C /usr/local/bin --strip-components=1

# Install LastPass CLI
# Use the current non-root user or detect the non-root user in the container
if [ "$(id -u)" -ne 0 ]; then
    # We're already running as a non-root user
    CURRENT_USER=$(whoami)
    USER_HOME=$HOME
else
    # We're running as root, try to find the non-root user
    # First check for devcontainer env vars
    if [ -n "$USERNAME" ]; then
        CURRENT_USER=$USERNAME
    elif [ -d "/home" ] && [ "$(ls -A /home | wc -l)" -gt 0 ]; then
        # If we have a single user in /home, use that
        CURRENT_USER=$(ls -A /home | head -1)
    else
        # Fallback to creating a directory for a default non-root user
        CURRENT_USER="developer"
    fi
    USER_HOME="/home/$CURRENT_USER"
fi

# Install LastPass CLI

  # Define LastPass version
  LP_VERSION="1.6.1"
  LP_TARBALL="lastpass-cli-${LP_VERSION}.tar.gz"
  LP_URL="https://github.com/lastpass/lastpass-cli/releases/download/v${LP_VERSION}/${LP_TARBALL}"
# https://github.com/lastpass/lastpass-cli/releases/download/v1.6.1/lastpass-cli-1.6.1.tar.gz
  # Create a temporary directory
  TEMP_DIR=$(mktemp -d)
  cd "$TEMP_DIR"

  # Download LastPass CLI tarball
  echo "Downloading LastPass CLI v${LP_VERSION}..."
  curl -L "$LP_URL" -o "$LP_TARBALL"

  # Extract tarball
  echo "Extracting tarball..."
  mkdir -p lastpass-cli
  tar -xzf "$LP_TARBALL" -C lastpass-cli --strip-components=1
  cd lastpass-cli

  # Install dependencies
  echo "Installing dependencies..."
  apt-get update
  apt-get install -y cmake pkg-config libcurl4-openssl-dev libssl-dev libxml2-dev xclip libbsd-dev

  # Build and install
  echo "Building and installing LastPass CLI..."
  cmake .
  make
  make install

  # Verify installation
  echo "Verifying installation..."
  lpass --version

  # Clean up
  echo "Cleaning up..."
  cd /
  rm -rf "$TEMP_DIR"

  # Clean up any files in the workspace (if run from there)
  if [ -d "/workspace/lastpass-cli" ]; then
      rm -rf /workspace/lastpass-cli
  fi

  if [ -f "/workspace/lastpass-cli.tar.gz" ]; then
      rm -f /workspace/lastpass-cli.tar.gz
  fi

  echo "LastPass CLI v${LP_VERSION} installed successfully!"


# kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
# kubectl port-forward svc/argocd-server -n argocd 8080:443

## Install rad CLI
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "edge" ]; then
    RADIUS_VERSION=edge
else
    ## If CURRENT_BRANCH matches a regex of the form "v0.20", set RADIUS_VERSION to the matching string minus the "v"
    if [[ "$CURRENT_BRANCH" =~ ^v[0-9]+\.[0-9]+$ ]]; then
        RADIUS_VERSION=${CURRENT_BRANCH:1}
    else
        ## Otherwise, set RADIUS_VERSION to "edge"
        RADIUS_VERSION=edge
    fi
fi

wget -q "https://raw.githubusercontent.com/radius-project/radius/main/deploy/install.sh" -O - | /bin/bash

curl -L -o vcluster "https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-linux-amd64" && sudo install -c -m 0755 vcluster /usr/local/bin && rm -f vcluster


# # Install Headlamp Kubernetes Dashboard (silently)
# echo "Installing Headlamp Kubernetes Dashboard..."
# kubectl apply -f https://raw.githubusercontent.com/kinvolk/headlamp/main/kubernetes-headlamp.yaml > /dev/null 2>&1

# # Create service account with cluster-admin permissions
# echo "Creating service account for Headlamp access..."
# cat <<EOF | kubectl apply -f - > /dev/null 2>&1
# apiVersion: v1
# kind: ServiceAccount
# metadata:
#   name: headlamp-admin
#   namespace: kube-system
# ---
# apiVersion: rbac.authorization.k8s.io/v1
# kind: ClusterRoleBinding
# metadata:
#   name: headlamp-admin
# roleRef:
#   apiGroup: rbac.authorization.k8s.io
#   kind: ClusterRole
#   name: cluster-admin
# subjects:
# - kind: ServiceAccount
#   name: headlamp-admin
#   namespace: kube-system
# EOF

# # Wait for headlamp pod to be ready
# echo "Waiting for Headlamp pod to be ready..."
# kubectl -n kube-system wait --for=condition=ready pod -l k8s-app=headlamp --timeout=60s > /dev/null 2>&1 || true

# # Get pod IP
# POD_IP=$(kubectl -n kube-system get pod -l k8s-app=headlamp -o jsonpath='{.items[0].status.podIP}')
# if [ -n "$POD_IP" ]; then
#   # Set up port forwarding within the kind node (port 32000)
#   echo "Setting up port forwarding in the kind node container..."
#   docker exec rg4-control-plane sh -c "iptables -t nat -D PREROUTING -p tcp --dport 32000 -j DNAT --to-destination $POD_IP:4466" 2>/dev/null || true
#   docker exec rg4-control-plane sh -c "iptables -t nat -A PREROUTING -p tcp --dport 32000 -j DNAT --to-destination $POD_IP:4466" > /dev/null 2>&1
  
#   # Setup auto-login with static token
#   # Create static token and plugin
#   cat <<EOF | kubectl apply -f - > /dev/null 2>&1
# apiVersion: v1
# kind: Secret
# metadata:
#   name: headlamp-static-token
#   namespace: kube-system
# type: Opaque
# stringData:
#   token: "headlamp-admin-static-token"
# ---
# apiVersion: v1
# kind: ConfigMap
# metadata:
#   name: headlamp-config
#   namespace: kube-system
# data:
#   plugin.js: |
#     /** 
#      * Headlamp plugin which provides auto-login with static token
#      */

#     import { registerAuthenticator } from "@kinvolk/headlamp-plugin/lib";

#     class StaticTokenAuthenticator {
#       name = "Auto Login";
#       isAuthenticationSuccessful = false;
#       bearerToken = null;

#       constructor() {
#         this.fetchStaticToken();
#       }

#       async fetchStaticToken() {
#         try {
#           const response = await fetch('/api/v1/namespaces/kube-system/secrets/headlamp-static-token');
#           const secretData = await response.json();
#           this.bearerToken = atob(secretData.data.token); 
#           console.log('Static token loaded');
#         } catch (error) {
#           console.error('Error fetching static token:', error);
#         }
#       }

#       async authenticate() {
#         if (this.bearerToken) {
#           this.isAuthenticationSuccessful = true;
#           return { token: this.bearerToken };
#         }
        
#         return null;
#       }

#       requiresCredentials() {
#         return false;
#       }

#       close() {
#         this.isAuthenticationSuccessful = false;
#       }
#     }

#     export default function() {
#       registerAuthenticator(new StaticTokenAuthenticator());
#     }
# EOF

#   # Update Headlamp deployment to use the plugin
#   kubectl -n kube-system patch deployment headlamp -p '{"spec":{"template":{"spec":{"volumes":[{"name":"plugins","configMap":{"name":"headlamp-config"}}],"containers":[{"name":"headlamp","volumeMounts":[{"name":"plugins","mountPath":"/headlamp/plugins/static-token"}]}]}}}}' > /dev/null 2>&1

#   # Create proper permissions
#   kubectl -n kube-system create clusterrolebinding headlamp-static-binding --clusterrole=cluster-admin --serviceaccount=kube-system:headlamp-admin > /dev/null 2>&1 || true

#   # Restart the pods to load the plugin
#   kubectl -n kube-system get pod -l k8s-app=headlamp -o name | xargs kubectl -n kube-system delete > /dev/null 2>&1 || true

#   # Wait for the pod to restart
#   echo "Waiting for Headlamp pod to restart..."
#   sleep 5
#   kubectl -n kube-system wait --for=condition=ready pod -l k8s-app=headlamp --timeout=30s > /dev/null 2>&1 || true

#   # Generate a 1-year token as fallback
#   TOKEN=$(kubectl -n kube-system create token headlamp-admin --duration=8760h)
  
#   # Store token in a file for future reference
#   echo "$TOKEN" > /workspace/headlamp-token.txt
  
#   echo "=================================================================="
#   echo "HEADLAMP DASHBOARD INSTALLED"
#   echo "URL: http://localhost:32000"
#   echo ""
#   echo "LOGIN METHOD: Bearer Token"
#   echo "TOKEN: $TOKEN"
#   echo ""
#   echo "To retrieve this token again later, run:"
#   echo "kubectl -n kube-system get secret headlamp-token -o jsonpath='{.data.token}' | base64 --decode"
#   echo "=================================================================="
# else
#   echo "Headlamp installed in the kube-system namespace"
#   echo "To access Headlamp, run: kubectl -n kube-system port-forward svc/headlamp 8000:80"
# fi
