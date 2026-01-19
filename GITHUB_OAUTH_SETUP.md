# GitHub OAuth Setup for Decap CMS

## The Problem

GitHub Pages is static hosting and can't handle OAuth callbacks directly. Decap CMS needs an OAuth proxy to authenticate with GitHub.

## Solution Options

### Option 1: Use Netlify (Easiest)

**Deploy to Netlify instead of GitHub Pages:**
- Netlify has built-in OAuth support
- Free tier available
- Automatic deployments from GitHub
- No proxy needed

**Steps:**
1. Push your repo to GitHub
2. Connect to Netlify
3. Deploy automatically
4. Enable Identity in Netlify settings
5. Add GitHub provider
6. Done!

### Option 2: Use OAuth Proxy Service

**Use a free OAuth proxy:**
- https://netlify-cms-oauth-provider-node.vercel.app/ (free Vercel deployment)
- Or deploy your own proxy

**Steps:**
1. Deploy the proxy (see link above)
2. Update `config.yml`:
   ```yaml
   backend:
     name: github
     repo: mistersuuns/mongooseproject
     branch: main
     proxy_url: https://your-proxy-url.vercel.app
   ```

### Option 3: Use GitHub Personal Access Token (Not Recommended)

**For development only:**
- Less secure
- Requires manual token management
- Not suitable for production

## Recommended: Switch to Netlify

Since you're already using GitHub, the easiest solution is to deploy to Netlify:

1. **Keep GitHub repo** (for version control)
2. **Deploy to Netlify** (for hosting + OAuth)
3. **Netlify auto-deploys** from GitHub
4. **OAuth works** out of the box

**Benefits:**
- ✅ Free tier
- ✅ Automatic deployments
- ✅ Built-in OAuth
- ✅ Custom domains
- ✅ Form handling
- ✅ Serverless functions (if needed)

## Quick Netlify Setup

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub
4. Select your `mongooseproject` repo
5. Build settings:
   - Build command: (leave empty - static site)
   - Publish directory: `site`
6. Deploy!
7. Enable Identity:
   - Site settings → Identity
   - Enable Identity
   - Add GitHub provider
8. Update `config.yml`:
   ```yaml
   backend:
     name: git-gateway
   ```
9. Done! CMS will work at `https://your-site.netlify.app/admin/`

## Current Status

Your site is configured for GitHub backend but needs OAuth proxy. Choose one:
- **Easiest:** Deploy to Netlify (recommended)
- **Keep GitHub Pages:** Set up OAuth proxy
- **Development:** Use personal access token (not for production)
