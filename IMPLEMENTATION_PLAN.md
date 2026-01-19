# Implementation Plan: Custom CMS for Filtered Items

## Your Questions Answered

### 1. Cost-Saving Strategy

**Yes, you can:**
- ✅ Host statically on GitHub Pages (free)
- ✅ Continue using Framer for design (free plan or occasional subscription)
- ✅ Build custom CMS for filtered items (free)
- ❌ Framer free plan likely **doesn't include CMS** - so you'd lose CMS functionality

**Better approach:** Use Framer for design only, build custom CMS for content.

### 2. Alternatives

See `CMS_STRATEGY.md` for full comparison. Best options:
- **Decap CMS** (Git-based, free, easiest)
- **Custom CMS** (full control, free, more work)
- **Headless CMS** (Contentful/Strapi free tiers)

### 3. Building Custom CMS for Filtered Items

This is the recommended approach! Here's how:

---

## Step-by-Step Implementation

### Phase 1: Extract Current CMS Structure

1. **Identify CMS Collections:**
   - Publications (filtered by: year, author, topic)
   - News items
   - People profiles
   - Research themes

2. **Extract Data:**
   - Parse HTML files to extract CMS content
   - Create JSON data files
   - Map relationships (publications → authors, etc.)

### Phase 2: Create Data Structure

Store content as JSON files in `data/` directory:

```
data/
├── publications.json
├── news.json
├── people.json
└── research-themes.json
```

### Phase 3: Build Simple Admin Interface

Create a React/Vue app at `/admin` that:
- Lists all items in each collection
- Allows CRUD operations
- Commits changes to GitHub via API
- Triggers site rebuild

### Phase 4: Build Process

Create a build script that:
- Reads JSON data files
- Injects into Framer HTML templates
- Generates static pages
- Deploys to GitHub Pages

---

## Quick Start: Minimal Custom CMS

I can help you build:

1. **JSON data files** for your CMS collections
2. **Simple admin interface** (React app)
3. **Build script** to inject data into Framer HTML
4. **GitHub integration** for auto-deploy

**Time:** 4-8 hours
**Cost:** $0/month
**Result:** Full CMS control, works with your Framer design

---

## Recommended: Hybrid Approach

**Keep:**
- Framer for design/layout changes
- Static hosting on GitHub Pages

**Replace:**
- Framer CMS → Custom CMS for filtered items
- Framer hosting → GitHub Pages

**Workflow:**
1. Design changes → Update in Framer → Re-download
2. Content changes → Use custom CMS → Auto-deploy

**Savings:** $30-100/month (Framer Pro/Scale) → $0/month

---

## Next Steps

Would you like me to:

1. **Extract your current CMS data** from the HTML files?
2. **Set up Decap CMS** (quickest, 2-4 hours)?
3. **Build custom CMS** (more control, 8-16 hours)?
4. **Create hybrid system** (best of both, 6-10 hours)?

Let me know which approach you prefer and I'll start building!
