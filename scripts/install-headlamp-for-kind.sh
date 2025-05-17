#!/bin/bash
set -e

# =======================================================================
# Headlamp Dashboard Installation for Kind Cluster in WSL2/Docker Desktop
# =======================================================================
#
# This script installs the Headlamp Kubernetes dashboard and makes it accessible
# from your Windows host browser through a multi-layer networking setup:
#
# Windows Host → WSL2 → Docker → kind-api-proxy → kind node → Kubernetes pod
#
# The key to making this work is:
# 1. Identifying ports that are already mapped from host to Docker via the proxy container
# 2. Creating iptables rules inside the kind node to forward traffic to the Headlamp pod
# 3. Setting up auto-login or generating long-lived tokens for authentication
#
# For reuse in other environments, you might need to adjust:
# - The port number based on which ports are available/mapped in your setup
# - The node name depending on your kind cluster configuration
# - The proxy container name if your environment uses a different proxy
# =======================================================================

HEADLAMP_PORT=32000  # This port must be mapped in your kind-api-proxy container
KIND_NODE="rg4-control-plane"
PROXY_CONTAINER="kind-api-proxy"

echo "Installing Headlamp Kubernetes Dashboard..."
kubectl apply -f https://raw.githubusercontent.com/kinvolk/headlamp/main/kubernetes-headlamp.yaml

# Create service account with cluster-admin permissions
echo "Creating service account for Headlamp access..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: headlamp-admin
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: headlamp-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: headlamp-admin
  namespace: kube-system
EOF

# Setup auto-login with improved plugin
echo "Setting up auto-login plugin..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: headlamp-static-token
  namespace: kube-system
type: Opaque
stringData:
  token: "headlamp-admin-static-token"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: headlamp-config
  namespace: kube-system
data:
  plugin.js: |
    /** 
     * Auto-login plugin for Headlamp with direct token authentication
     */
    import { registerAuthenticator } from "@kinvolk/headlamp-plugin/lib";

    class AutoLoginAuthenticator {
      name = "Auto Login";
      isAuthenticationSuccessful = false;
      bearerToken = "headlamp-admin-static-token";  // Hardcoded token for simplicity
      
      constructor() {
        // Auto-login when plugin is loaded
        setTimeout(() => this.autoLogin(), 500);
      }
      
      async autoLogin() {
        try {
          // Create a service account token for the headlamp-admin account
          const response = await fetch('/api/v1/namespaces/kube-system/serviceaccounts/headlamp-admin/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiVersion: "authentication.k8s.io/v1",
              kind: "TokenRequest"
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            this.bearerToken = data.status.token;
            console.log("Successfully generated token");
            
            // Force login on page load
            const loginEvent = new CustomEvent('headlamp-login', { 
              detail: { token: this.bearerToken } 
            });
            window.dispatchEvent(loginEvent);
          }
        } catch (error) {
          console.error('Failed to auto-login:', error);
        }
      }

      async authenticate(token) {
        // If a token is provided by the user, use that
        if (token) {
          this.bearerToken = token;
          this.isAuthenticationSuccessful = true;
          return { token };
        }
        
        // Otherwise use our auto-generated token
        if (this.bearerToken) {
          this.isAuthenticationSuccessful = true;
          return { token: this.bearerToken };
        }
        
        return null;
      }

      requiresCredentials() {
        return false;  // No credentials needed from the user
      }

      close() {
        this.isAuthenticationSuccessful = false;
      }
    }

    export default function() {
      registerAuthenticator(new AutoLoginAuthenticator());
    }
EOF

# Update Headlamp deployment to use the plugin
echo "Configuring Headlamp to use the auto-login plugin..."
kubectl -n kube-system patch deployment headlamp -p '{"spec":{"template":{"spec":{"volumes":[{"name":"plugins","configMap":{"name":"headlamp-config"}}],"containers":[{"name":"headlamp","volumeMounts":[{"name":"plugins","mountPath":"/headlamp/plugins/static-token"}]}]}}}}'

# Create proper permissions
kubectl -n kube-system create clusterrolebinding headlamp-static-binding --clusterrole=cluster-admin --serviceaccount=kube-system:headlamp-admin || true

# Restart the pods to load the plugin
echo "Restarting Headlamp pods to apply changes..."
kubectl -n kube-system get pod -l k8s-app=headlamp -o name | xargs kubectl -n kube-system delete || true

# Wait for headlamp pod to be ready
echo "Waiting for Headlamp pod to be ready..."
sleep 5
kubectl -n kube-system wait --for=condition=ready pod -l k8s-app=headlamp --timeout=60s || true

# Get pod IP
POD_IP=$(kubectl -n kube-system get pod -l k8s-app=headlamp -o jsonpath='{.items[0].status.podIP}')
echo "Headlamp pod IP: $POD_IP"

# =====================================================================
# CRITICAL STEP: Set up port forwarding within the kind node
# This is the key to making the dashboard accessible from Windows host
# =====================================================================
echo "Setting up port forwarding in the kind node container..."

# Clean up any old rules to avoid duplicates
for i in {40..50}; do
  docker exec $KIND_NODE sh -c "iptables -t nat -D PREROUTING -p tcp --dport $HEADLAMP_PORT -j DNAT --to-destination 10.244.0.$i:4466" 2>/dev/null || true
done

# Add new iptables rule to forward traffic from the mapped port to the Headlamp pod
# This creates the path: proxy container mapped port → kind node → Headlamp pod
docker exec $KIND_NODE sh -c "iptables -t nat -A PREROUTING -p tcp --dport $HEADLAMP_PORT -j DNAT --to-destination $POD_IP:4466"

# Verify the rule was created
RULE=$(docker exec $KIND_NODE sh -c "iptables -t nat -L PREROUTING -n --line-numbers | grep $HEADLAMP_PORT")
echo "iptables rule created: $RULE"

# Verify the proxy container has the port mapping to the host
# This creates the path: Windows host → proxy container
PORT_MAPPING=$(docker port $PROXY_CONTAINER | grep $HEADLAMP_PORT)
if [ -n "$PORT_MAPPING" ]; then
  echo "Confirmed port mapping in proxy container: $PORT_MAPPING"
else
  echo "WARNING: Port $HEADLAMP_PORT does not appear to be mapped in the proxy container!"
  echo "The dashboard will not be accessible from Windows host without a port mapping."
  echo "Consider using one of these mapped ports instead:"
  docker port $PROXY_CONTAINER | grep -v 'no ports' | sort
fi

# Generate a 1-year token as fallback
TOKEN=$(kubectl -n kube-system create token headlamp-admin --duration=8760h)

# Store token in a file for future reference
echo "$TOKEN" > /workspace/headlamp-token.txt

echo ""
echo "=================================================================="
echo "Headlamp Dashboard has been installed and configured."
echo ""
echo "ACCESS INFORMATION:"
echo "URL: http://localhost:$HEADLAMP_PORT"
echo ""
echo "AUTO-LOGIN: Enabled - you should be automatically logged in"
echo ""
echo "FALLBACK TOKEN (if auto-login fails):"
echo "$TOKEN"
echo ""
echo "This token is valid for 1 year and has been saved to:"
echo "/workspace/headlamp-token.txt"
echo ""
echo "You can retrieve it anytime with:"
echo "cat /workspace/headlamp-token.txt"
echo "=================================================================="