#!/bin/bash

# Script to remove secrets from git history
# This script uses BFG Repo-Cleaner to remove sensitive data

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

# Create a file with patterns to remove
cat > /tmp/secrets-to-remove.txt << 'EOF'
[REDACTED_POSTGRES_URL]
[REDACTED_AUTH_SECRET]
[REDACTED_XAI_KEY]
[REDACTED_TZDB_KEY]
[REDACTED_NEON_API_KEY]
[REDACTED_NEON_PROJECT_ID]
EOF

echo "📦 Downloading BFG Repo-Cleaner..."
if [ ! -f bfg.jar ]; then
    wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -O bfg.jar
fi

echo "🔄 Creating a fresh clone of the repository..."
cd /tmp
rm -rf chat-clean
git clone --mirror https://github.com/PittampalliOrg/chat.git chat-clean
cd chat-clean

echo "🧹 Removing secrets from history..."
java -jar /home/vpittamp/chat/bfg.jar --replace-text /tmp/secrets-to-remove.txt

echo "🔨 Running git garbage collection..."
git reflog expire --expire=now --all && git gc --prune=now --aggressive

echo "✅ Secrets removed from history!"
echo ""
echo "Next steps:"
echo "1. Review the changes: cd /tmp/chat-clean && git log --oneline"
echo "2. If everything looks good, force push:"
echo "   git push --force"
echo ""
echo "⚠️  IMPORTANT: All collaborators will need to re-clone the repository!"
echo ""
echo "Alternative safer approach:"
echo "1. Push to a new branch first:"
echo "   git push origin --force --all"
echo "2. Test everything works"
echo "3. Then update the default branch"