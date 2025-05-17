#!/bin/bash
set -e

# =======================================================================
# Headlamp Dashboard Auto-Login Setup for Kind Cluster in WSL2
# =======================================================================
#
# This script configures automatic login for the Headlamp dashboard
# using a plugin-based approach. It also handles the complex networking
# required to expose the dashboard to your Windows host browser.
#
# Networking path created:
# Windows Host → WSL2 → Docker → kind-api-proxy → kind node → Kubernetes pod
#
# How it works:
# 1. Creates a plugin that automatically authenticates with the Kubernetes API
# 2. Updates the Headlamp deployment to use this plugin
# 3. Configures iptables rules to expose the service through the proxy
# 4. Generates a fallback token for manual login if needed
# =======================================================================

# Create a static token Kubernetes secret
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
kubectl -n kube-system patch deployment headlamp -p '{"spec":{"template":{"spec":{"volumes":[{"name":"plugins","configMap":{"name":"headlamp-config"}}],"containers":[{"name":"headlamp","volumeMounts":[{"name":"plugins","mountPath":"/headlamp/plugins/static-token"}]}]}}}}'

# Create proper permissions
kubectl -n kube-system create clusterrolebinding headlamp-static-binding --clusterrole=cluster-admin --serviceaccount=kube-system:headlamp-admin || true

# Restart the pods to load the plugin
kubectl -n kube-system get pod -l k8s-app=headlamp -o name | xargs kubectl -n kube-system delete || true

# Wait for the pod to restart
echo "Waiting for Headlamp pod to restart..."
sleep 5
kubectl -n kube-system wait --for=condition=ready pod -l k8s-app=headlamp --timeout=60s || true

# Get the new pod IP
POD_IP=$(kubectl -n kube-system get pod -l k8s-app=headlamp -o jsonpath='{.items[0].status.podIP}')
echo "New Pod IP: $POD_IP"

# Update iptables rule
if [ -n "$POD_IP" ]; then
  echo "Updating port forwarding..."
  # Clean up any old rules
  for i in {40..50}; do
    docker exec rg4-control-plane sh -c "iptables -t nat -D PREROUTING -p tcp --dport 32000 -j DNAT --to-destination 10.244.0.$i:4466" 2>/dev/null || true
  done
  # Add new rule
  docker exec rg4-control-plane sh -c "iptables -t nat -A PREROUTING -p tcp --dport 32000 -j DNAT --to-destination $POD_IP:4466"
fi

# Generate a 1-year token as fallback
TOKEN=$(kubectl -n kube-system create token headlamp-admin --duration=8760h)

# Store token in a file for future reference
echo "$TOKEN" > /workspace/headlamp-token.txt

echo ""
echo "=============================================================="
echo "Headlamp setup with auto-login is complete!"
echo ""
echo "Access Headlamp at: http://localhost:32000"
echo "You should now be automatically logged in without needing a token"
echo ""
echo "If auto-login fails, you can use this fallback token:"
echo "$TOKEN"
echo ""
echo "This token is valid for 1 year and has been saved to:"
echo "/workspace/headlamp-token.txt"
echo "=============================================================="