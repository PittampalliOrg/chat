#!/bin/bash
# Script to install LastPass CLI from release tarball

# Exit on error, print commands as they're executed
set -ex

# Define LastPass version
LP_VERSION="1.6.1"
LP_TARBALL="lastpass-cli-${LP_VERSION}.tar.gz"
LP_URL="https://github.com/lastpass/lastpass-cli/releases/download/v${LP_VERSION}/${LP_TARBALL}"

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