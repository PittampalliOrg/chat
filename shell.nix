{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # OS packages from Dockerfile
    cacert
    cmake
    curl
    file
    gnupg
    gosu
    libbsd
    curl
    openssl
    libxml2
    gnumake
    pkg-config
    xclip

    # Node.js v22
    nodejs_22

    # yq v4.44.1
    yq-go

    # kubectl
    kubectl

    # k3d for creating k3s clusters in Docker
    k3d

    # LastPass CLI v1.6.1
    lastpass-cli

    # xh v0.17.0
    xh
  ];

  shellHook = ''
    # Create local bin directory
    mkdir -p ~/.local/bin
    export PATH="$HOME/.local/bin:$PATH"

    # Source .env files from .devcontainer if they exist
    for env_file in .devcontainer/*.env; do
      if [ -f "$env_file" ]; then
        echo "Loading environment variables from $env_file..."
        set -a  # Mark variables for export
        source "$env_file"
        set +a  # Unmark variables for export
      fi
    done

    # Set NPM prefix to user directory
    export NPM_CONFIG_PREFIX="$HOME/.npm-global"
    mkdir -p "$NPM_CONFIG_PREFIX"
    export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

    # Install global Node packages that aren't available in nixpkgs
    if ! command -v claude-code &> /dev/null; then
      echo "Installing Node.js global packages..."
      npm install -g \
        @anthropic-ai/claude-code@latest \
        devspace@latest \
        cdk8s-cli
    fi

    # Install tools not available in nixpkgs
    # Dagger CLI
    if ! command -v dagger &> /dev/null; then
      echo "Installing Dagger CLI..."
      curl -fsSL https://dl.dagger.io/dagger/install.sh | BIN_DIR=~/.local/bin sh
    fi

    # Arkade
    if ! command -v arkade &> /dev/null; then
      echo "Installing arkade..."
      curl -fsSL https://get.arkade.dev | sh
      if [ -f arkade ]; then
        mv arkade ~/.local/bin/
      elif [ -f ~/.arkade/bin/arkade ]; then
        cp ~/.arkade/bin/arkade ~/.local/bin/
      fi
    fi

    # Argo Workflows CLI
    if ! command -v argo &> /dev/null; then
      echo "Installing Argo CLI..."
      cd /tmp
      curl -sLO "https://github.com/argoproj/argo-workflows/releases/download/v3.6.7/argo-linux-amd64.gz"
      gunzip -f argo-linux-amd64.gz
      chmod +x argo-linux-amd64
      mv argo-linux-amd64 ~/.local/bin/argo
      cd - > /dev/null
    fi

    # vcluster
    if ! command -v vcluster &> /dev/null; then
      echo "Installing vcluster..."
      curl -L "https://github.com/loft-sh/vcluster/releases/latest/download/vcluster-linux-amd64" -o ~/.local/bin/vcluster
      chmod +x ~/.local/bin/vcluster
    fi

    # Azure Workload Identity (azwi)
    if ! command -v azwi &> /dev/null; then
      echo "Installing azwi..."
      cd /tmp
      curl -fsSL "https://github.com/Azure/azure-workload-identity/releases/download/v1.5.0/azwi-v1.5.0-linux-amd64.tar.gz" | tar -xz
      mv azwi ~/.local/bin/
      chmod +x ~/.local/bin/azwi
      cd - > /dev/null
    fi

    # Radius CLI (not available in nixpkgs)
    if ! command -v rad &> /dev/null; then
      echo "Installing Radius CLI..."
      curl -fsSL "https://raw.githubusercontent.com/radius-project/radius/main/deploy/install.sh" | bash -s -- -d ~/.local/bin
    fi

    # Install kubectl-ai plugin (not available in nixpkgs)
    if ! kubectl ai --help &> /dev/null 2>&1; then
      echo "Installing kubectl-ai..."
      mkdir -p ~/.local/bin
      cd /tmp
      curl -sSL https://raw.githubusercontent.com/GoogleCloudPlatform/kubectl-ai/main/install.sh | bash -s -- -d ~/.local/bin
      cd - > /dev/null
    fi

    # Set environment variables from Dockerfile
    export container=docker
    export OPENFAAS_URL=http://localhost:8080

    echo "Development environment ready!"
    echo "Tools available: cmake, curl, gnupg, gosu, kubectl, lastpass-cli, xh, yq, node $(node --version), npm $(npm --version)"
    echo "Additional tools will be installed on first use: dagger, arkade, argo, vcluster, azwi, rad, kubectl-ai"
  '';
}