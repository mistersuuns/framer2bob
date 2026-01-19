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

## Manual Deployment

To update your site:

1. Re-download from your Framer site URL
2. Files will be in the `site/` directory
3. Commit and push:

```bash
git add site/
git commit -m "Update site"
git push origin main
```

GitHub Actions will automatically build and deploy your site.

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
