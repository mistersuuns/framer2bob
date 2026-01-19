# Decap CMS Setup Guide

## What We've Done

1. ✅ Extracted CMS data from HTML files → `data/publications.json`
2. ✅ Converted JSON to Markdown files → `data/publications/*.md`
3. ✅ Set up Decap CMS admin interface → `/admin/`
4. ✅ Configured for GitHub backend

## Accessing the CMS

1. **Go to:** `https://mistersuuns.github.io/framer2bob/admin/`
2. **Click "Login with GitHub"**
3. **Authorize the app**
4. **Start editing!**

## Current Collections

- **Publications** (`data/publications/`) - 16 items extracted
- **News** (`data/news/`) - Ready for new items
- **People** (`data/people/`) - Ready for new items

## How It Works

1. **Edit content** in the Decap CMS interface
2. **Save changes** → Commits to GitHub automatically
3. **GitHub Actions** rebuilds the site
4. **Site updates** automatically

## File Structure

```
data/
├── publications/     # Markdown files for publications
│   └── *.md
├── news/            # Markdown files for news
│   └── *.md
└── people/          # Markdown files for people
    └── *.md

site/
└── admin/
    ├── index.html   # CMS interface
    └── config.yml   # CMS configuration
```

## Next Steps

1. **Test the CMS:**
   - Visit `/admin/` on your site
   - Login with GitHub
   - Try editing a publication

2. **Improve extraction:**
   - The extraction script found 16 publications
   - People and news extraction needs refinement
   - Run `node scripts/extract-cms-data.js` again after improvements

3. **Build integration:**
   - Create a build script that reads markdown files
   - Generates HTML pages from markdown + Framer templates
   - Updates the static site

## Troubleshooting

**Can't login?**
- Make sure GitHub OAuth is set up (see below)

**Changes not appearing?**
- Check GitHub Actions workflow
- Verify files are committed to `data/` directory

**Config not loading?**
- Ensure `config.yml` is in `site/admin/` directory
- Check file paths in config match your structure

## GitHub OAuth Setup (Required)

For Decap CMS to work with GitHub, you need to set up OAuth:

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App:
   - **Application name:** Framer CMS
   - **Homepage URL:** `https://mistersuuns.github.io/framer2bob`
   - **Authorization callback URL:** `https://mistersuuns.github.io/framer2bob/admin/`
3. Copy the Client ID
4. Update `config.yml` with the Client ID (or use environment variables)

**Note:** For GitHub Pages, you may need to use a proxy for OAuth. See Decap CMS docs for GitHub Pages setup.

## Alternative: Use Netlify Identity

If GitHub OAuth is complex, consider:
- Deploy to Netlify (free tier)
- Use Netlify Identity (built-in)
- Simpler setup, same functionality
