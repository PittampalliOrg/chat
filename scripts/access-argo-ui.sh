#!/bin/bash
# Purpose: Setup easy access to Argo Workflows UI with port-forwarding
# Usage: ./access-argo-ui.sh

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the library
source "$SCRIPT_DIR/wi-kind-lib.sh"

# Call the function
setup_argo_workflows_ui_access

# Keep the script running to maintain the port-forward
echo ""
echo "Port-forward is running in the background. Press Ctrl+C to stop."
echo ""

# Sleep indefinitely, handle Ctrl+C gracefully
trap 'echo "Stopping port-forward..."; pkill -f "kubectl port-forward -n argo svc/argo-workflows-server"; exit 0' INT
while true; do
  sleep 1
done
