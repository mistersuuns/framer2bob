# Decap CMS Troubleshooting Checklist

## Current Status
- ✅ Config is correct (`git-gateway`)
- ✅ Config is deployed
- ✅ HTML is loading
- ✅ Identity endpoint exists (401 response is normal)

## What to Check in Netlify

### 1. Identity Settings
**Go to: Site settings → Identity**

- [ ] **Identity is enabled** (should show "Enabled" status)
- [ ] **Registration settings:**
  - Should be **"Open"** or **"Invite only"** (NOT "Closed")
  - If "Closed", no one can register/login

### 2. Git Gateway
**Go to: Site settings → Identity → Scroll to "Services"**

- [ ] **Git Gateway is enabled** (should show "Enabled" status)
- [ ] If not enabled, click **"Enable Git Gateway"**
- [ ] Wait 2-3 minutes after enabling (it needs to initialize)

### 3. External Providers
**Go to: Site settings → Identity → External providers**

- [ ] **GitHub provider is added**
- [ ] Should show "GitHub" in the list
- [ ] If missing, click "Add provider" → "GitHub" → "Install"

### 4. Build Settings
**Go to: Site settings → Build & deploy → Continuous deployment**

- [ ] **Publish directory:** Should be `site`
- [ ] **Build command:** Should be empty (or blank)

### 5. Test the CMS

1. **Clear browser cache** or use incognito
2. Visit: `https://earnest-quokka-5963b7.netlify.app/admin/`
3. **What do you see?**
   - Login button? → Click it
   - Error message? → What does it say?
   - Blank page? → Check browser console (F12)

## Common Issues

### Issue: "No backend found"
**Fix:** Git Gateway not enabled → Enable it in Identity settings

### Issue: "Authentication failed"
**Fix:** 
- Check Registration is not "Closed"
- Verify GitHub provider is added
- Wait 2-3 minutes after enabling Git Gateway

### Issue: "Config file not found"
**Fix:** 
- Verify `site/admin/config.yml` exists
- Check Publish directory is `site`
- Rebuild in Netlify

### Issue: Login button doesn't work
**Fix:**
- Check browser console for errors (F12)
- Verify Identity is enabled
- Try different browser/incognito

## Debug Steps

1. **Check browser console:**
   - Press F12
   - Go to Console tab
   - Visit `/admin/`
   - Look for red errors
   - Share any error messages

2. **Check Network tab:**
   - Press F12 → Network tab
   - Visit `/admin/`
   - Look for failed requests (red)
   - Check what's failing

3. **Verify files are deployed:**
   ```bash
   curl https://earnest-quokka-5963b7.netlify.app/admin/config.yml
   ```
   Should return the YAML config

## Next Steps

**Share with me:**
1. What you see when visiting `/admin/`
2. Any error messages (browser console)
3. Status of Identity, Git Gateway, and GitHub provider in Netlify
4. Registration setting (Open/Invite only/Closed)
