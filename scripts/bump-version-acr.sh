#!/bin/bash

# Script to bump version numbers based on current version from ACR
# Usage: ./bump-version-acr.sh <current-version> [major|minor|patch]
# Example: ./bump-version-acr.sh 1.2.3 patch
# Output: 1.2.4

CURRENT_VERSION=$1
BUMP_TYPE=${2:-patch}

# Validate inputs
if [ -z "$CURRENT_VERSION" ]; then
    echo "Error: Current version is required"
    echo "Usage: $0 <current-version> [major|minor|patch]"
    exit 1
fi

# Parse current version
if ! [[ "$CURRENT_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "Error: Invalid version format. Expected: X.Y.Z"
    exit 1
fi

MAJOR="${BASH_REMATCH[1]}"
MINOR="${BASH_REMATCH[2]}"
PATCH="${BASH_REMATCH[3]}"

# Increment version based on type
case $BUMP_TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "Error: Invalid bump type. Use: major, minor, or patch"
        exit 1
        ;;
esac

# Output new version
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "$NEW_VERSION"