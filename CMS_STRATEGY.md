# CMS Strategy for Static Framer Site

## The Problem

- Framer CMS content is now static HTML (no dynamic updates)
- Framer free plan likely doesn't include CMS features
- You need to update filtered CMS items (publications, news, people) regularly
- Want to save money by moving off Framer subscription

## Solution Options

### Option 1: Headless CMS + Static Site Generator (Recommended)

**Architecture:**
```
Headless CMS (Contentful/Strapi/Sanity) 
  ↓
  Content API
  ↓
Static Site Generator (Next.js/11ty/Hugo)
  ↓
GitHub Pages (Free)
```

**Pros:**
- ✅ Free tiers available (Contentful: 25k API calls/month, Strapi: self-hosted free)
- ✅ Real CMS interface for content editors
- ✅ Version control via Git
- ✅ Automatic rebuilds on content changes
- ✅ Can keep Framer design, replace CMS parts

**Cons:**
- ⚠️ Requires migration of CMS content
- ⚠️ Need to rebuild site when content changes
- ⚠️ Some setup required

**Cost:** $0-20/month (depending on CMS choice)

---

### Option 2: Git-Based CMS (Decap CMS / Netlify CMS)

**Architecture:**
```
GitHub Repository
  ↓
  Markdown/JSON files
  ↓
Decap CMS (Browser-based editor)
  ↓
GitHub Actions (Auto-deploy)
  ↓
GitHub Pages
```

**Pros:**
- ✅ Completely free
- ✅ Content stored in Git (version controlled)
- ✅ No database needed
- ✅ Simple markdown editing
- ✅ Works with static site generators

**Cons:**
- ⚠️ Requires static site generator setup
- ⚠️ Less flexible than headless CMS
- ⚠️ Content in markdown/JSON format

**Cost:** $0/month

---

### Option 3: Custom Simple CMS (Build Your Own)

**Architecture:**
```
Simple Admin Interface (React/Vue)
  ↓
  Edit JSON/Markdown files
  ↓
GitHub API (commit changes)
  ↓
GitHub Actions (rebuild site)
  ↓
GitHub Pages
```

**Pros:**
- ✅ Complete control
- ✅ Free (uses GitHub)
- ✅ Customized to your needs
- ✅ Can integrate with existing Framer HTML

**Cons:**
- ⚠️ Requires development time
- ⚠️ Need to maintain the CMS
- ⚠️ Security considerations

**Cost:** $0/month (hosting), development time

---

### Option 4: Hybrid Approach (Recommended for Your Case)

**Keep Framer for:**
- Design/layout changes
- Visual updates
- Complex pages

**Use Custom CMS for:**
- Publications list
- News items
- People profiles
- Any filtered CMS collections

**Workflow:**
1. Design in Framer (free plan or occasional subscription)
2. Export design as HTML templates
3. Inject CMS content into templates
4. Deploy to GitHub Pages

**Cost:** $0-10/month (Framer free or occasional Pro)

---

## Recommended Implementation: Custom CMS for Filtered Items

Since you specifically mentioned "filtered CMS items", here's a practical approach:

### Step 1: Extract CMS Data Structure

Identify what CMS collections you have:
- Publications (with filters: year, author, topic)
- News items
- People profiles
- Research themes

### Step 2: Create JSON Data Files

Store content in structured JSON files:
```json
// data/publications.json
[
  {
    "id": "pub-001",
    "title": "Helping effort and future fitness...",
    "authors": ["Author 1", "Author 2"],
    "year": 2024,
    "topic": "cooperation",
    "url": "/pubs-news-ppl/helping-effort-and-future-fitness.html"
  }
]
```

### Step 3: Build Simple Admin Interface

Create a React/Vue app that:
- Lists all publications/news/people
- Allows editing JSON files
- Commits changes to GitHub via API
- Triggers site rebuild

### Step 4: Integrate with Framer HTML

Use a build script that:
- Takes Framer HTML templates
- Injects CMS data from JSON
- Generates static pages
- Deploys to GitHub Pages

---

## Quick Start: Decap CMS (Easiest)

1. **Add Decap CMS to your site:**
   - Add `admin/index.html` with Decap CMS
   - Configure collections for publications, news, people
   - Store content as markdown files

2. **Update build process:**
   - Use a static site generator (11ty, Jekyll) or custom script
   - Read markdown files
   - Generate HTML pages

3. **Deploy:**
   - GitHub Actions rebuilds on content changes
   - Auto-deploys to GitHub Pages

**Time to implement:** 2-4 hours
**Cost:** $0/month

---

## Cost Comparison

| Approach | Monthly Cost | Setup Time | Maintenance |
|----------|-------------|------------|-------------|
| Framer Pro | $30 | 0 hours | Low |
| Headless CMS | $0-20 | 4-8 hours | Medium |
| Git-Based CMS | $0 | 2-4 hours | Low |
| Custom CMS | $0 | 8-16 hours | Medium |
| Hybrid (Recommended) | $0-10 | 4-6 hours | Low |

---

## Next Steps

1. **Audit your CMS usage:** What collections do you have? How often do you update?
2. **Choose approach:** Based on update frequency and technical comfort
3. **Prototype:** Start with one collection (e.g., publications)
4. **Migrate gradually:** Move collections one at a time

Would you like me to:
- Set up Decap CMS for your site?
- Create a custom CMS solution?
- Build a hybrid system that works with your Framer HTML?
