#!/bin/bash

# Script to download/scrape a Framer site for self-hosting
# Usage: ./download-site.sh <framer-site-url>

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Framer site URL"
    echo "Usage: ./download-site.sh <framer-site-url>"
    echo "Example: ./download-site.sh https://yoursite.framer.website"
    exit 1
fi

SITE_URL="$1"
OUTPUT_DIR="site"

echo "🚀 Downloading Framer site from: $SITE_URL"
echo ""

# Check if wget is available
if command -v wget &> /dev/null; then
    echo "📦 Using wget to download site..."
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Download with wget (mirror mode)
    # Use --timestamping to check for updates, but allow overwriting
    wget \
        --recursive \
        --level=inf \
        --timestamping \
        --page-requisites \
        --html-extension \
        --convert-links \
        --restrict-file-names=windows \
        --domains "$(echo $SITE_URL | sed -E 's|https?://([^/]+).*|\1|')" \
        --no-parent \
        --directory-prefix="$OUTPUT_DIR" \
        "$SITE_URL" || {
        echo "⚠️  wget download completed with some warnings (this is normal)"
    }
    
    # Move files to site root if they're in a subdirectory
    # Handle both / and domain-based subdirectories
    DOMAIN=$(echo $SITE_URL | sed -E 's|https?://([^/]+).*|\1|')
    if [ -d "$OUTPUT_DIR/$DOMAIN" ]; then
        echo "📁 Moving files from subdirectory to root..."
        mv "$OUTPUT_DIR/$DOMAIN"/* "$OUTPUT_DIR/" 2>/dev/null || true
        rmdir "$OUTPUT_DIR/$DOMAIN" 2>/dev/null || true
    fi
    # Also check for path-based subdirectories
    URL_PATH=$(echo $SITE_URL | sed -E 's|https?://[^/]+(.*)|\1|' | sed 's|^/||' | sed 's|/$||')
    if [ -n "$URL_PATH" ] && [ -d "$OUTPUT_DIR/$URL_PATH" ]; then
        echo "📁 Moving files from path subdirectory to root..."
        mv "$OUTPUT_DIR/$URL_PATH"/* "$OUTPUT_DIR/" 2>/dev/null || true
        rmdir "$OUTPUT_DIR/$URL_PATH" 2>/dev/null || true
    fi
    
elif command -v curl &> /dev/null; then
    echo "📦 Using curl (basic download - may need manual processing)..."
    echo "⚠️  For better results, install wget or use a tool like HTTrack"
    mkdir -p "$OUTPUT_DIR"
    curl -L -o "$OUTPUT_DIR/index.html" "$SITE_URL"
    
else
    echo "❌ Error: Neither wget nor curl found. Please install one:"
    echo "   macOS: brew install wget"
    echo "   Or use: brew install httrack"
    exit 1
fi

# Check if index.html exists
if [ -f "$OUTPUT_DIR/index.html" ]; then
    echo ""
    echo "✅ Site downloaded successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Review the files in the site/ directory"
    echo "2. Test locally: open site/index.html in a browser"
    echo "3. Fix any broken links or missing assets"
    echo "4. Commit and push:"
    echo "   git add site/"
    echo "   git commit -m 'Add downloaded Framer site'"
    echo "   git push origin main"
else
    echo ""
    echo "⚠️  Warning: index.html not found. The download may have failed."
    echo "   Try using a different tool or check the URL."
fi
