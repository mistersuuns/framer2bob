# Deploy to Netlify - Step by Step

## Why Netlify?

- ✅ OAuth works automatically (no proxy needed)
- ✅ Free tier
- ✅ Auto-deploys from GitHub
- ✅ Custom domains supported
- ✅ 5-minute setup

## Step-by-Step Setup

### 1. Create Netlify Account (if needed)

Go to: https://app.netlify.com
- Sign up with GitHub (easiest)
- Or use email

### 2. Import Your Repository

1. In Netlify dashboard, click **"Add new site"**
2. Select **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify to access GitHub
5. Select repository: **`mongooseproject`**

### 3. Configure Build Settings

**Important settings:**
- **Base directory:** (leave empty)
- **Build command:** (leave empty - it's a static site)
- **Publish directory:** `site` ← **This is critical!**

Click **"Deploy site"**

### 4. Wait for First Deploy

- Netlify will clone your repo
- Build will complete quickly (static site)
- Site will be live at: `https://random-name-12345.netlify.app`

### 5. Enable Identity (OAuth)

1. Go to **Site settings** (click site name → Settings)
2. Click **"Identity"** in left sidebar
3. Click **"Enable Identity"**
4. Scroll down to **"External providers"**
5. Click **"Add provider"** → Select **"GitHub"**
6. Click **"Install GitHub provider"**
7. Authorize Netlify to access GitHub
8. **Save**

### 6. Update Config for Netlify

Update `site/admin/config.yml`:

```yaml
backend:
  name: git-gateway  # Changed from "github"
  branch: main
  # Remove proxy_url and base_url - not needed with Netlify
```

### 7. Commit and Push Config Change

```bash
cd /Users/robertturner/local-only/framer-site
git add site/admin/config.yml
git commit -m "Switch to Netlify git-gateway backend"
git push
```

### 8. Test CMS

1. Wait for Netlify to auto-deploy (1-2 minutes)
2. Visit: `https://your-site.netlify.app/admin/`
3. Click **"Login with GitHub"**
4. Should work! 🎉

## Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `mongooseproject.org` (or your domain)
4. Follow DNS instructions
5. Netlify will handle SSL automatically

## Benefits

- ✅ CMS works immediately
- ✅ Auto-deploys on every GitHub push
- ✅ Free SSL certificate
- ✅ Form handling (if needed)
- ✅ Analytics (optional)
- ✅ No proxy setup needed

## What Happens to GitHub Pages?

- **GitHub repo:** Still used for version control
- **GitHub Pages:** Can be disabled (or keep both)
- **Netlify:** Handles hosting + OAuth

No conflicts - they work together!

## Quick Commands

After setup, to update site:
```bash
# Make changes
git add .
git commit -m "Update content"
git push
# Netlify auto-deploys!
```
