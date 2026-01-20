# GDPR & UK Hosting Clarification

## GDPR Still Applies

**Even if hosted in UK:**
- ✅ UK has GDPR-equivalent (UK GDPR)
- ✅ If you have **any EU visitors**, GDPR applies
- ✅ If you process **any EU personal data**, GDPR applies
- ✅ Netlify Identity processes editor emails (personal data)

**Conclusion**: You still need GDPR compliance.

**However:**
- Cookie consent: **NOT required** (strictly necessary cookies)
- Privacy policy: **Still recommended** (best practice, may be required)

---

## What "Registration" Means

**In Netlify Identity settings:**

**"Open" registration:**
- Anyone can visit `/admin/` and create an account
- They can sign up with email/password or GitHub
- **Security risk**: Random people could create accounts

**"Invite only" registration:**
- Only people you manually invite can create accounts
- You send invitations via Netlify dashboard
- **More secure**: Prevents unauthorized signups

**Recommendation**: Use "Invite only" for CMS access control.

---

## Current Status

**Your site:**
- Hosted on Netlify (US-based, but GDPR-compliant)
- Uses Netlify Identity (processes editor emails)
- Registration: Currently "Open" (should be "Invite only")

**GDPR requirements:**
- Cookie storage: ✅ Compliant (strictly necessary)
- Privacy policy: ⚠️ Recommended (not strictly required if UK-only, but best practice)
- Data processing disclosure: ⚠️ Recommended
