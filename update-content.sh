#!/bin/bash

# Script to update Framer site content
# Usage: ./update-content.sh [framer-site-url]

set -e

SITE_URL="${1:-https://mongooseproject.org/}"

echo "🔄 Updating site content from Framer..."
echo ""

# Backup current site
if [ -d "site" ] && [ "$(ls -A site)" ]; then
    echo "📦 Creating backup..."
    BACKUP_DIR="site-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r site "$BACKUP_DIR"
    echo "   Backup created: $BACKUP_DIR"
fi

# Remove old site files (except admin/ and .gitkeep) to force fresh download
echo "🧹 Cleaning old site files (keeping admin/ and .gitkeep)..."
if [ -d "site" ]; then
    find site -mindepth 1 -maxdepth 1 ! -name "admin" ! -name ".gitkeep" ! -name ".nojekyll" -exec rm -rf {} +
fi

# Download fresh content
echo ""
./download-site.sh "$SITE_URL"

echo ""
echo "✅ Update complete!"
echo ""
echo "📝 Review changes:"
echo "   git diff site/"
echo ""
echo "📤 Commit and push:"
echo "   git add site/"
echo "   git commit -m 'Update site content'"
echo "   git push origin main"
