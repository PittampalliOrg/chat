#!/bin/sh
set +e  # Continue on errors

export NODE_ENV=development
export FLAGS_SECRET=${FLAGS_SECRET:-"dev-flags-secret-change-in-production"}

# Always add local bin to PATH in case it was installed previously
export PATH="$HOME/.local/bin:$PATH"

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found, installing locally..."
    # Install pnpm in user's home directory
    npm install --prefix="$HOME/.local" -g pnpm@latest
    # Make it available for future shells
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc 2>/dev/null || true
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile 2>/dev/null || true
fi

echo "DevSpace development environment ready"
echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version 2>/dev/null || echo 'not installed')"

# Navigate to workspace directory
cd /home/nextjs/app || exit 1

# Install dependencies
if [ -f "yarn.lock" ]; then
   echo "Installing Yarn Dependencies"
   yarn
elif [ -f "pnpm-lock.yaml" ]; then
   echo "Installing PNPM Dependencies"
   pnpm install
elif [ -f "package-lock.json" ]; then
   echo "Installing NPM Dependencies"
   npm install
fi

# Start Next.js in development mode with Turbopack
# echo "Starting Next.js development server..."
# pnpm run dev

COLOR_BLUE="\033[0;94m"
COLOR_GREEN="\033[0;92m"
COLOR_RESET="\033[0m"

# Print useful output for user
echo -e "${COLOR_BLUE}
     %########%      
     %###########%       ____                 _____                      
         %#########%    |  _ \   ___ __   __ / ___/  ____    ____   ____ ___ 
         %#########%    | | | | / _ \\\\\ \ / / \___ \ |  _ \  / _  | / __// _ \\
     %#############%    | |_| |(  __/ \ V /  ____) )| |_) )( (_| |( (__(  __/
     %#############%    |____/  \___|  \_/   \____/ |  __/  \__,_| \___\\\\\___|
 %###############%                                  |_|
 %###########%${COLOR_RESET}


Welcome to your development container!

This is how you can work with it:
- Files will be synchronized between your local machine and this container
- Some ports will be forwarded, so you can access this container via localhost
- Next.js dev server is starting automatically
- The application will be available at http://chat.localtest.me
- Hot reloading is enabled - your changes will reflect immediately
"

# Set terminal prompt
export PS1="\[${COLOR_BLUE}\]devspace\[${COLOR_RESET}\] ./\W \[${COLOR_BLUE}\]\\$\[${COLOR_RESET}\] "
if [ -z "$BASH" ]; then export PS1="$ "; fi

# Include project's bin/ folder in PATH
export PATH="./bin:$PATH"

# Final message about pnpm
echo ""
echo "To use pnpm in this shell, run:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "Or start a new shell session where pnpm will be available automatically."

# Keep the container running by starting an interactive shell
# Export PATH for the new shell
export PATH="$HOME/.local/bin:$PATH"

echo ""
echo "Development environment is ready!"
echo "To start the Next.js dev server, run: pnpm run dev"
echo ""

# Start interactive shell
exec sh -i