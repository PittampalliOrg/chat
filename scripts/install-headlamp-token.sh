#!/bin/bash
set -e

# =======================================================================
# Headlamp Dashboard Token Generator
# =======================================================================
#
# This script generates a long-lived token (1 year) for authenticating
# with the Headlamp Kubernetes dashboard. Use this if the auto-login
# approach isn't working or if you need a token for any other reason.
#
# The token is saved to a file for easy access and displayed in the console.
# =======================================================================

# Generate a 1-year token
HEADLAMP_TOKEN=$(kubectl -n kube-system create token headlamp-admin --duration=8760h)

# Store it in a file
echo "$HEADLAMP_TOKEN" > /workspace/headlamp-token.txt

echo ""
echo "==================================================================="
echo "Headlamp Dashboard Token"
echo ""
echo "A one-year token has been generated and saved to /workspace/headlamp-token.txt"
echo ""
echo "Access URL: http://localhost:32000"
echo ""
echo "Login method: Bearer Token"
echo "Token (copy and paste this into the Headlamp login page):"
echo ""
echo "$HEADLAMP_TOKEN"
echo ""
echo "==================================================================="
echo ""
echo "To retrieve this token again in the future, run:"
echo "cat /workspace/headlamp-token.txt"
echo ""