#!/bin/bash

# Script to remove secrets using git-filter-repo
# This is the modern, recommended approach

echo "🔍 Checking for git-filter-repo..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "Installing git-filter-repo..."
    pip install git-filter-repo
fi

echo "⚠️  WARNING: This script will rewrite git history!"
echo "Make sure you have:"
echo "1. Committed all current changes"
echo "2. Informed all collaborators"
echo "3. Made a backup of your repository"
echo ""
read -p "Do you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Create expressions file for git-filter-repo
cat > /tmp/expressions.txt << 'EOF'
***REMOVED***
regex:[REDACTED_POSTGRES_URL]

***REMOVED***
literal:[REDACTED_AUTH_SECRET]==>[REDACTED_AUTH_SECRET]

***REMOVED***
regex:xai-[A-Za-z0-9]+==>[REDACTED_XAI_KEY]

***REMOVED***
literal:[REDACTED_TZDB_KEY]==>[REDACTED_TZDB_KEY]

***REMOVED***
regex:napi_[A-Za-z0-9]+==>[REDACTED_NEON_API_KEY]

***REMOVED***
literal:[REDACTED_NEON_PROJECT_ID]==>[REDACTED_NEON_PROJECT_ID]

***REMOVED***
regex:[REDACTED_REDIS_URL]
EOF

echo "📁 Creating a backup..."
cp -r .git .git.backup

echo "🧹 Removing secrets from history..."
git filter-repo --replace-text /tmp/expressions.txt --force

echo "✅ Secrets removed from history!"
echo ""
echo "Next steps:"
echo "1. Review the changes: git log --oneline -p | grep REDACTED"
echo "2. Add the remote back: git remote add origin https://github.com/PittampalliOrg/chat.git"
echo "3. Force push all branches:"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "⚠️  IMPORTANT:"
echo "- All collaborators MUST delete their local repos and re-clone"
echo "- Update any open PRs as they will be invalidated"
echo "- The old commits with secrets may still be accessible via direct SHA access on GitHub"
echo "- Contact GitHub support to fully purge the data from their servers"
echo ""
echo "📋 Also remember to:"
echo "1. Rotate all the exposed secrets immediately"
echo "2. Update your GitHub secrets with the new values"
echo "3. Add .dagger/src/index.ts to .gitignore if needed"