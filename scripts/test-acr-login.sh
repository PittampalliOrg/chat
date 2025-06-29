#!/bin/bash

# Test ACR login script
# Usage: ./test-acr-login.sh <username> <password>

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <username> <password>"
    echo "Example: $0 vpittamp <password>"
    exit 1
fi

USERNAME=$1
PASSWORD=$2

# Try different username formats
echo "Testing ACR login with different username formats..."
echo "=================================================="

# Test 1: Just the registry name
REGISTRY="${USERNAME}.azurecr.io"
echo "Test 1: Using username: $USERNAME"
echo "Registry: $REGISTRY"
docker login $REGISTRY -u $USERNAME -p $PASSWORD 2>&1 | grep -E "(Succeeded|denied|unauthorized)" || echo "Failed"
echo ""

# Test 2: Full registry URL as username
FULL_USERNAME="${USERNAME}.azurecr.io"
echo "Test 2: Using username: $FULL_USERNAME"
echo "Registry: $REGISTRY"
docker login $REGISTRY -u $FULL_USERNAME -p $PASSWORD 2>&1 | grep -E "(Succeeded|denied|unauthorized)" || echo "Failed"
echo ""

# Test 3: Service principal format (if applicable)
SP_USERNAME="00000000-0000-0000-0000-000000000000"
echo "Test 3: Using service principal format: $SP_USERNAME"
echo "Registry: $REGISTRY"
docker login $REGISTRY -u $SP_USERNAME -p $PASSWORD 2>&1 | grep -E "(Succeeded|denied|unauthorized)" || echo "Failed"
echo ""

echo "=================================================="
echo "Note: One of these should succeed. Use the successful format in your GitHub secrets."