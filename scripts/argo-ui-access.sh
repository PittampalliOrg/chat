#!/bin/bash
# This script sets up access to the Argo Workflows UI

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo $0"
  exit 1
fi

# Set up port-forward for Argo Workflows
echo "Setting up port-forward for Argo Workflows UI..."
kubectl port-forward -n argo svc/argo-workflows-server 8080:2746 &

# Wait for port-forward to start
sleep 2

# Add/update hosts entry
grep -q "argo.localtest.me" /etc/hosts || echo "127.0.0.1 argo.localtest.me" >> /etc/hosts

echo "✅ Argo Workflows UI is now accessible at:"
echo "• http://localhost:8080 (direct access)"
echo "• http://argo.localtest.me:8080 (name-based access)"
echo ""
echo "Use Ctrl+C to stop the port-forward when done."
