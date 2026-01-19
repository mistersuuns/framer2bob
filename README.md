# Framer Site - GitHub Pages Hosting

This repository hosts a Framer site on GitHub Pages with automatic deployment.

## Quick Start

**Note:** Framer Sites doesn't have a built-in export feature. We'll download your published site instead.

### 1. Download Your Framer Site

1. Get your published Framer site URL (e.g., `https://yoursite.framer.website`)
2. Run the download script:
   ```bash
   ./download-site.sh https://yoursite.framer.website
   ```
   
   Or manually download using `wget`:
   ```bash
   wget --recursive --page-requisites --html-extension --convert-links --domains yoursite.framer.website --no-parent -P site/ https://yoursite.framer.website
   ```

### 2. Review and Commit

1. Check the downloaded files in the `site/` directory
2. Make sure `index.html` exists in the root of the `site/` directory
3. Test locally by opening `site/index.html` in a browser
4. Commit and push to GitHub:

```bash
git add site/
git commit -m "Add Framer site export"
git push origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings → Pages**
3. Under **Source**, select **"GitHub Actions"**
4. The site will automatically deploy on every push to `main`

## Project Structure

```
framer-site/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── site/                       # Put your Framer export here
│   ├── index.html
│   ├── assets/
│   └── ...
└── README.md
```

## Alternative: Using Export Tools

If the download script doesn't work well, try these tools:
- **ToStatic** (https://tostatic.framer.ai) - Browser extension for exporting
- **HTTrack** - Desktop tool for mirroring websites
- **NoCodeExport** - Service for exporting no-code sites

## Updating Content

Since CMS content is now static HTML, you have two options:

### Option 1: Update in Framer, then Re-download (Recommended)

1. Make your changes in Framer (update CMS content, pages, etc.)
2. Publish your changes in Framer
3. Run the update script:
   ```bash
   ./update-content.sh https://mongooseproject.org/
   ```
4. Review changes: `git diff site/`
5. Commit and push:
   ```bash
   git add site/
   git commit -m "Update site content"
   git push origin main
   ```

### Option 2: Edit HTML Files Directly

For small text changes, you can edit HTML files directly:

1. Find the file in `site/` directory (e.g., `site/index.html`, `site/about-the-project.html`)
2. Edit the HTML content directly
3. Test locally by opening the file in a browser
4. Commit and push:
   ```bash
   git add site/
   git commit -m "Update content: [description]"
   git push origin main
   ```

**Note:** HTML files from Framer can be complex. For major changes, it's easier to update in Framer and re-download.

## Manual Deployment

GitHub Actions will automatically build and deploy your site on every push to `main`.

## Custom Domain

To use a custom domain:

1. Add a `CNAME` file in the `site/` directory with your domain name
2. Configure DNS settings as per GitHub Pages documentation
3. Update your domain settings in GitHub repository Settings → Pages

## Troubleshooting

- **404 errors**: Make sure `index.html` is in the `site/` directory root
- **Assets not loading**: Check that all asset paths are relative (not absolute). You may need to manually fix broken links after download
- **Download fails**: Install wget: `brew install wget` (macOS) or use HTTrack
- **Dynamic features broken**: Framer's CMS, forms, and server-side features won't work in static export. Only static content will be preserved
- **Deployment fails**: Check the Actions tab in GitHub for error details

## Notes

- The site is deployed from the `site/` directory
- GitHub Pages supports static HTML, CSS, and JavaScript
- **Limitations**: Dynamic Framer features (CMS, forms, animations) may not work after static export
- Download tools may not capture all interactive elements perfectly
- You may need to manually fix broken links or missing assets after download
