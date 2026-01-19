# Content Management Guide

## Current Setup

Your Framer site has been converted to static HTML files. All CMS content is now baked into HTML files in the `site/` directory.

## Workflow Options

### 🎨 Option 1: Framer → Re-download (Best for Design Changes)

**Use when:** You want to change design, layout, or make many content updates in Framer.

1. Edit your site in Framer
2. Publish changes
3. Run: `./update-content.sh https://mongooseproject.org/`
4. Review: `git diff site/`
5. Commit: `git add site/ && git commit -m "Update content" && git push`

**Pros:** Easy, preserves all Framer styling and interactions  
**Cons:** Requires Framer access, full site re-download

### ✏️ Option 2: Direct HTML Editing (Best for Quick Text Fixes)

**Use when:** You need to fix a typo or update a small piece of text.

1. Find the HTML file (e.g., `site/about-the-project.html`)
2. Search for the text you want to change
3. Edit directly in a text editor
4. Test locally: `open site/about-the-project.html`
5. Commit: `git add site/ && git commit -m "Fix typo" && git push`

**Pros:** Fast for small changes, no Framer needed  
**Cons:** Can break styling if you edit the wrong part, HTML can be complex

### 🔄 Option 3: Hybrid Approach

**Use when:** You want to maintain content separately from design.

1. Keep content in simple markdown/text files
2. Use a simple script to inject content into HTML templates
3. Or use a static site generator (Jekyll, Hugo, etc.) for easier content management

**Pros:** Better content management, version control friendly  
**Cons:** More setup, requires learning a new tool

## File Structure

```
site/
├── index.html              # Homepage
├── about-the-project.html  # About page
├── people.html            # People page
├── publications.html      # Publications
├── pubs-news-ppl/         # Individual publication pages
│   └── [article-name].html
└── [other-pages].html
```

## Tips

- **Backup before updates:** The `update-content.sh` script creates automatic backups
- **Test locally:** Always open HTML files in a browser before pushing
- **Use git diff:** Review changes before committing
- **Small changes:** Edit HTML directly
- **Big changes:** Update in Framer and re-download

## Future Considerations

If you find yourself updating content frequently, consider:

1. **Static Site Generator:** Migrate to Jekyll/Hugo for easier content management
2. **Headless CMS:** Use a headless CMS (Contentful, Strapi) with a static site generator
3. **Git-based CMS:** Use Netlify CMS or Forestry for markdown-based content editing
4. **Keep Framer:** Continue using Framer as your design tool, download when needed
