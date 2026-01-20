# What "Registration" Means in Netlify Identity

## Registration Settings Explained

**Location:** Netlify Dashboard → Site Settings → Identity → Registration

### "Open" Registration (Current Setting)

**What it means:**
- Anyone can visit `https://your-site.netlify.app/admin/`
- They can click "Sign up" and create an account
- They can use email/password OR GitHub to sign up
- **No approval needed** - instant access

**Security risk:**
- ⚠️ Random people could create accounts
- ⚠️ They could access your CMS
- ⚠️ They could edit/delete content

**Use case:** Public CMS where you want anyone to contribute

---

### "Invite Only" Registration (Recommended)

**What it means:**
- Only people you **manually invite** can create accounts
- You send invitations via Netlify dashboard
- They receive an email invitation
- **You control** who has access

**Security benefit:**
- ✅ Prevents unauthorized signups
- ✅ You know exactly who has access
- ✅ Better for private/internal CMS

**How to invite:**
1. Netlify Dashboard → Site Settings → Identity → Users
2. Click "Invite users"
3. Enter email addresses
4. They receive invitation email

---

### "Closed" Registration

**What it means:**
- No one can create new accounts
- Only existing users can log in
- **Cannot invite new users**

**Use case:** Locked down CMS with fixed user list

---

## Recommendation

**For your site:** Use **"Invite only"**

**Why:**
- You control who can edit content
- Prevents random people from accessing CMS
- More secure for research project site

**How to change:**
1. Go to Netlify Dashboard
2. Site Settings → Identity → Registration
3. Change from "Open" to "Invite only"
4. Save
