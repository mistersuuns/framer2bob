import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const siteDir = path.join(__dirname, '../site');

// Helper to parse Frontmatter
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { attributes: {}, body: content };

    const attributes = {};
    const frontLines = match[1].split('\n');
    frontLines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            attributes[key] = value;
        }
    });

    return { attributes, body: match[2].trim() };
}

// Helper to convert simple Markdown to HTML
function markdownToHtml(markdown) {
    if (!markdown) return '';

    // Paragraphs
    let html = markdown.split('\n\n').map(p => {
        if (!p.trim()) return '';
        return `<p>${p.trim()}</p>`;
    }).join('\n');

    return html;
}

function processCollection(collectionName, htmlSubDir) {
    const collectionDir = path.join(dataDir, collectionName);
    if (!fs.existsSync(collectionDir)) return;

    const files = fs.readdirSync(collectionDir).filter(f => f.endsWith('.md'));

    console.log(`Processing ${files.length} items from ${collectionName}...`);

    files.forEach(file => {
        const markdownContent = fs.readFileSync(path.join(collectionDir, file), 'utf8');
        const { attributes, body } = parseFrontmatter(markdownContent);
        const slug = attributes.slug || path.basename(file, '.md');

        // Find HTML file
        // Handle nested paths (e.g. pubs-news-ppl)
        const htmlPath = path.join(siteDir, htmlSubDir, `${slug}.html`);

        if (fs.existsSync(htmlPath)) {
            console.log(`  Wire-up: ${slug}`);
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            const $ = cheerio.load(htmlContent);

            // 1. Update Metadata (SEO)
            if (attributes.title || attributes.name) {
                const title = attributes.title || attributes.name;
                $('title').text(`${title} - Banded Mongoose`);
                $('meta[property="og:title"]').attr('content', title);
                $('meta[name="twitter:title"]').attr('content', title);
            }

            if (attributes.description) {
                const desc = attributes.description;
                $('meta[name="description"]').attr('content', desc);
                $('meta[property="og:description"]').attr('content', desc);
            }

            // 2. Inject Content (The "De-Framerizer")
            // We strip the Framer script tags that would overwrite our DOM
            $('script').each((i, el) => {
                const src = $(el).attr('src') || '';
                const txt = $(el).text() || '';
                // Remove framer hydration scripts
                if (src.includes('framer') || txt.includes('__framer') || txt.includes('Identifier')) {
                    $(el).remove();
                }
            });

            // Create a clean content container
            // We append it to body, assuming Framer's root was destroyed or we overwrite it.
            // A safer bet is to create a new main container if we removed the scripts.

            // Generate HTML body
            const bodyHtml = markdownToHtml(body);
            const title = attributes.title || attributes.name;
            const subtitle = attributes.title ? '' : (attributes.title_role || ''); // For people, role might be in a different field, usually 'title' in data

            // Simple semantic template
            const mainContent = `
            <div id="cms-content-root" style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: 'Inter', sans-serif; line-height: 1.6; color: #333;">
                <header style="margin-bottom: 40px;">
                    <nav style="margin-bottom: 20px;"><a href="/" style="text-decoration: none; color: #666;">← Back to Home</a></nav>
                    <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 10px;">${title}</h1>
                    ${attributes.year ? `<div style="color: #666; font-size: 1.1rem;">${attributes.year}</div>` : ''}
                    ${attributes.authors ? `<div style="color: #666; font-style: italic; margin-top: 5px;">${JSON.parse(attributes.authors).join(', ')}</div>` : ''}
                </header>
                <div class="prose">
                    ${bodyHtml}
                </div>
            </div>
            `;

            // Replace body content (brute force for now to ensure visibility)
            // We keep the <head> but wipe the body to ensure no Framer ghosts
            $('body').html(mainContent);

            fs.writeFileSync(htmlPath, $.html());
        }
    });
}

// Run
console.log('🏗️  Building Static Site from CMS Data...');
processCollection('people', 'pubs-news-ppl');
processCollection('publications', 'pubs-news-ppl');
processCollection('news', 'pubs-news-ppl');
console.log('✅ Build complete.');
