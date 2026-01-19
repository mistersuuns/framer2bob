#!/bin/bash

# Helper script to update Framer site export
# Usage: ./update-site.sh [path-to-framer-export]

set -e

EXPORT_PATH="${1:-.}"

echo "🚀 Updating Framer site..."

# Check if export path exists
if [ ! -d "$EXPORT_PATH" ]; then
    echo "❌ Error: Export path '$EXPORT_PATH' does not exist"
    echo "Usage: ./update-site.sh [path-to-framer-export]"
    exit 1
fi

# Clear existing site directory (except .gitkeep)
echo "📁 Cleaning site directory..."
find site -type f ! -name '.gitkeep' -delete
find site -type d ! -name 'site' ! -name '.' -empty -delete

# Copy files from export
echo "📦 Copying files from export..."
cp -r "$EXPORT_PATH"/* site/ 2>/dev/null || {
    echo "⚠️  Warning: Some files may not have copied. Checking for index.html..."
}

# Check if index.html exists
if [ ! -f "site/index.html" ]; then
    echo "⚠️  Warning: index.html not found in site directory"
    echo "Please ensure your Framer export includes index.html"
fi

echo "✅ Site updated successfully!"
echo ""
echo "Next steps:"
echo "1. Review the files in the site/ directory"
echo "2. Commit and push:"
echo "   git add site/"
echo "   git commit -m 'Update Framer site'"
echo "   git push origin main"
