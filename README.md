# Framer Site - GitHub Pages Hosting

This repository hosts a Framer site on GitHub Pages with automatic deployment.

## Quick Start

### 1. Export from Framer

1. Open your Framer project
2. Go to **File → Export → Export Site**
3. Choose **"Export as HTML"** or **"Export as ZIP"**
4. Extract the exported files if you downloaded a ZIP

### 2. Add Your Framer Site Files

1. Copy all exported files from Framer into the `site/` directory
2. Make sure `index.html` is in the root of the `site/` directory
3. Commit and push to GitHub:

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

## Manual Deployment

If you prefer to deploy manually:

1. Export your site from Framer
2. Copy files to the `site/` directory
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
- **Assets not loading**: Check that all asset paths are relative (not absolute)
- **Deployment fails**: Check the Actions tab in GitHub for error details

## Notes

- The site is deployed from the `site/` directory
- GitHub Pages supports static HTML, CSS, and JavaScript
- Make sure all paths in your Framer export are relative paths
