# Deploy Your Own OAuth Proxy

The public proxy doesn't work for arbitrary repos. You need to deploy your own.

## Quick Deploy to Vercel (5 minutes)

### Option 1: One-Click Deploy

1. Go to: https://github.com/netlify/netlify-cms-oauth-provider-node
2. Click "Deploy to Vercel" button
3. Authorize Vercel
4. Configure:
   - **GITHUB_CLIENT_ID**: (get from GitHub OAuth App)
   - **GITHUB_CLIENT_SECRET**: (get from GitHub OAuth App)
5. Deploy
6. Get your proxy URL (e.g., `https://your-proxy.vercel.app`)
7. Update `config.yml`:
   ```yaml
   backend:
     name: github
     repo: mistersuuns/mongooseproject
     branch: main
     base_url: https://mistersuuns.github.io
     proxy_url: https://your-proxy.vercel.app
   ```

### Option 2: Manual Deploy

1. Fork: https://github.com/netlify/netlify-cms-oauth-provider-node
2. Deploy to Vercel/Railway/Render
3. Set environment variables
4. Get proxy URL
5. Update config

## Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Mongooseproject CMS
   - **Homepage URL**: `https://mistersuuns.github.io/mongooseproject`
   - **Authorization callback URL**: `https://your-proxy.vercel.app/callback`
4. Get **Client ID** and **Client Secret**
5. Add to proxy environment variables

## Update Config

After deploying proxy, update `site/admin/config.yml`:

```yaml
backend:
  name: github
  repo: mistersuuns/mongooseproject
  branch: main
  base_url: https://mistersuuns.github.io
  proxy_url: https://your-proxy.vercel.app
```

## Test

1. Visit: `https://mistersuuns.github.io/mongooseproject/admin/`
2. Click "Login with GitHub"
3. Should redirect through your proxy

---

## Easier Alternative: Deploy to Netlify

**Much simpler - OAuth works automatically:**

1. Go to https://app.netlify.com
2. Import your GitHub repo
3. Publish directory: `site`
4. Enable Identity → Add GitHub provider
5. Update config to use `git-gateway`
6. Done! No proxy needed.

See `GITHUB_OAUTH_SETUP.md` for details.
