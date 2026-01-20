# Fix: Decap CMS Still Shows Login

## Check These in Netlify:

### 1. Enable Git Gateway (Required!)

**This is separate from Identity:**
1. Go to: Site settings → Identity
2. Scroll down to **"Services"** section
3. Find **"Git Gateway"**
4. Click **"Enable Git Gateway"**
5. This creates the bridge between Identity and GitHub

### 2. Verify Identity is Enabled

- Site settings → Identity
- Should show "Identity: Enabled"
- External providers should show "GitHub" enabled

### 3. Check Registration Settings

- Site settings → Identity → Registration
- Set to: **"Invite only"** or **"Open"** (not "Closed")
- This controls who can access the CMS

### 4. Try Hard Refresh

- Clear browser cache
- Or use incognito window
- Visit: https://earnest-quokka-5963b7.netlify.app/admin/

## Most Common Issue

**Git Gateway not enabled** - This is the most common problem. Identity and Git Gateway are two separate things:
- **Identity** = Authentication (login)
- **Git Gateway** = Bridge to GitHub (allows CMS to commit)

Both need to be enabled!

## After Enabling Git Gateway

1. Wait 1-2 minutes for it to initialize
2. Visit `/admin/` again
3. Should see "Login with GitHub" button
4. Click it → Authorize → Should work!
