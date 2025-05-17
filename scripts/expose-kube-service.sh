#!/bin/bash
set -e

# ====================================================================
# WSL2/Docker Desktop Kubernetes Service Exposer for Windows Browser
# ====================================================================
#
# This script exposes a Kubernetes service from a kind cluster to be
# accessible from your Windows host browser, handling the multiple
# networking layers in a WSL2/Docker Desktop environment.
#
# Usage:
#   ./expose-kube-service.sh <namespace> <service-name> <service-port> [host-port]
#
# If host-port is not specified, the script will try to find an available
# mapped port in the proxy container.
#
# Example:
#   ./expose-kube-service.sh kube-system headlamp 80
#   ./expose-kube-service.sh default myapp 8080 32001
#
# Networking path created:
# Windows Host → WSL2 → Docker → kind-api-proxy → kind node → Kubernetes pod
# ====================================================================

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <namespace> <service-name> <service-port> [host-port]"
  exit 1
fi

NAMESPACE=$1
SERVICE_NAME=$2
SERVICE_PORT=$3
HOST_PORT=$4
KIND_NODE="rg4-control-plane"  # Update this if your kind node has a different name
PROXY_CONTAINER="kind-api-proxy"  # Update this if your proxy has a different name

# Get service details
echo "Looking up service $SERVICE_NAME in namespace $NAMESPACE..."
SVC_DETAILS=$(kubectl -n $NAMESPACE get svc $SERVICE_NAME -o jsonpath='{.spec.selector}')
if [ -z "$SVC_DETAILS" ]; then
  echo "Service $SERVICE_NAME not found in namespace $NAMESPACE"
  exit 1
fi

# Extract selector to find the corresponding pods
SELECTOR=""
echo $SVC_DETAILS | sed 's/{//g' | sed 's/}//g' | sed 's/:/=/g' | tr ',' '\n' | while read -r pair; do
  if [ -n "$SELECTOR" ]; then
    SELECTOR="$SELECTOR,"
  fi
  SELECTOR="$SELECTOR$pair"
done

# Looks like the loop above has issues with variable scope - let's try a direct approach
SELECTOR_KEY=$(echo $SVC_DETAILS | sed 's/{//g' | sed 's/}//g' | sed 's/[:,].*//g')
SELECTOR_VALUE=$(echo $SVC_DETAILS | sed 's/{[^:]*://g' | sed 's/}//g' | sed 's/"//g')
SELECTOR="$SELECTOR_KEY=$SELECTOR_VALUE"

# Get pod IP
echo "Finding pods with selector $SELECTOR..."
POD_IP=$(kubectl -n $NAMESPACE get pod -l $SELECTOR -o jsonpath='{.items[0].status.podIP}')
if [ -z "$POD_IP" ]; then
  echo "No pods found for service $SERVICE_NAME"
  exit 1
fi
echo "Found pod with IP: $POD_IP"

# Get target port
TARGET_PORT=$(kubectl -n $NAMESPACE get svc $SERVICE_NAME -o jsonpath="{.spec.ports[?(@.port==$SERVICE_PORT)].targetPort}")
if [ -z "$TARGET_PORT" ]; then
  echo "Port $SERVICE_PORT not found in service $SERVICE_NAME"
  exit 1
fi
echo "Service port $SERVICE_PORT maps to target port $TARGET_PORT"

# If host port wasn't specified, try to find an available one
if [ -z "$HOST_PORT" ]; then
  echo "No host port specified, checking available mapped ports in proxy container..."
  AVAILABLE_PORTS=$(docker port $PROXY_CONTAINER | grep -v 'no ports' | awk '{split($0,a,"->"); print a[1]}' | awk '{split($0,a,":"); print a[2]}')
  
  # Prefer port 32000 if available (common in kind setups)
  if echo "$AVAILABLE_PORTS" | grep -q "32000"; then
    HOST_PORT=32000
  else
    # Take the first available port
    HOST_PORT=$(echo "$AVAILABLE_PORTS" | head -1)
  fi
  
  if [ -z "$HOST_PORT" ]; then
    echo "No mapped ports found in proxy container"
    exit 1
  fi
  echo "Using available host port: $HOST_PORT"
fi

# Clean up any old rules for this port
echo "Cleaning up any old iptables rules for port $HOST_PORT..."
docker exec $KIND_NODE sh -c "iptables -t nat -D PREROUTING -p tcp --dport $HOST_PORT -j DNAT --to-destination $POD_IP:$TARGET_PORT" 2>/dev/null || true

# Add new iptables rule
echo "Creating iptables rule to forward traffic from port $HOST_PORT to $POD_IP:$TARGET_PORT..."
docker exec $KIND_NODE sh -c "iptables -t nat -A PREROUTING -p tcp --dport $HOST_PORT -j DNAT --to-destination $POD_IP:$TARGET_PORT"

# Verify the rule was created
RULE=$(docker exec $KIND_NODE sh -c "iptables -t nat -L PREROUTING -n --line-numbers | grep $HOST_PORT")
echo "iptables rule created: $RULE"

# Verify the proxy container has the port mapping
PORT_MAPPING=$(docker port $PROXY_CONTAINER | grep $HOST_PORT)
if [ -n "$PORT_MAPPING" ]; then
  echo "Confirmed port mapping in proxy container: $PORT_MAPPING"
else
  echo "WARNING: Port $HOST_PORT does not appear to be mapped in the proxy container!"
  echo "The service will not be accessible from Windows host without this mapping."
  echo "Available mapped ports:"
  docker port $PROXY_CONTAINER | grep -v 'no ports' | sort
  exit 1
fi

echo ""
echo "=================================================================="
echo "Service $SERVICE_NAME in namespace $NAMESPACE is now accessible at:"
echo "http://localhost:$HOST_PORT"
echo ""
echo "Connection path:"
echo "Windows Host → WSL2 → Docker → kind-api-proxy → kind node → Kubernetes pod"
echo "=================================================================="