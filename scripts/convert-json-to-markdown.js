#!/usr/bin/env node

/**
 * Convert JSON CMS data to Markdown files for Decap CMS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');
const outputDir = path.join(__dirname, '../data');

function convertPublicationToMarkdown(pub) {
  // Match Framer CMS structure EXACTLY: Title, Slug, Authors, Journal, URL, Date, Files & Media, Description, Content
  const fields = [];
  fields.push(`title: "${(pub.title || '').replace(/"/g, '\\"')}"`);
  fields.push(`slug: "${pub.slug}"`);
  fields.push(`authors: ${JSON.stringify(pub.authors || [])}`);
  
  // Extract year from date if available
  let year = null;
  if (pub.date) {
    const yearMatch = pub.date.match(/(\d{4})/);
    if (yearMatch) year = yearMatch[1];
  } else if (pub.year) {
    year = pub.year;
  }
  
  // Clean journal - remove embedded years (e.g., "Ecology Letters 2021" -> "Ecology Letters")
  let journal = pub.journal || null;
  if (journal) {
    // Remove year at end (e.g., "Journal Name 2021" -> "Journal Name")
    journal = journal.replace(/\s+(19|20)\d{2}\s*$/, '').trim();
    // Also remove year at start
    journal = journal.replace(/^(19|20)\d{2}\s+/, '').trim();
    if (journal.length > 0) {
      fields.push(`journal: "${journal.replace(/"/g, '\\"')}"`);
    }
  }
  
  if (pub.url) {
    fields.push(`url: "${pub.url}"`);
  }
  if (pub.date || year) {
    const date = pub.date || (year ? `${year}-01-01T00:00:00.000Z` : null);
    if (date) fields.push(`date: "${date}"`);
  }
  
  // Add year field for summary display
  if (year) {
    fields.push(`year: "${year}"`);
  }
  if (pub.files && pub.files.length > 0) {
    fields.push(`files: ${JSON.stringify(pub.files)}`);
  } else if (pub.pdf) {
    // Convert PDF to files array format
    fields.push(`files: ${JSON.stringify([{file: pub.pdf}])}`);
  }
  if (pub.description) {
    fields.push(`description: "${pub.description.replace(/"/g, '\\"')}"`);
  }
  
  const frontmatter = `---
${fields.join('\n')}
---

`;

  // Convert HTML content to markdown (basic conversion)
  let body = pub.content || '';
  // Remove HTML tags (basic cleanup)
  body = body.replace(/<[^>]+>/g, '');
  body = body.replace(/&nbsp;/g, ' ');
  body = body.replace(/&amp;/g, '&');
  body = body.replace(/&lt;/g, '<');
  body = body.replace(/&gt;/g, '>');

  return frontmatter + body;
}

function convertNewsToMarkdown(news) {
  // Extract year from date for display
  let year = null;
  if (news.date) {
    const yearMatch = news.date.match(/(\d{4})/);
    if (yearMatch) year = yearMatch[1];
  }
  
  const fields = [];
  fields.push(`title: "${news.title.replace(/"/g, '\\"')}"`);
  fields.push(`slug: "${news.slug}"`);
  fields.push(`description: "${(news.description || '').replace(/"/g, '\\"')}"`);
  if (news.date) {
    fields.push(`date: "${news.date}"`);
  }
  if (year) {
    fields.push(`year: "${year}"`);
  }
  if (news.image) {
    fields.push(`image: "${news.image}"`);
  }
  fields.push(`url: "${news.url}"`);
  
  const frontmatter = `---
${fields.join('\n')}
---

`;

  let body = news.body || news.content || '';
  body = body.replace(/<[^>]+>/g, '');
  body = body.replace(/&nbsp;/g, ' ');
  body = body.trim();

  return frontmatter + body;
}

function convertPersonToMarkdown(person) {
  // Match Framer CMS structure EXACTLY: Title (name), Slug, Link, Position, Category, Description, Image, URL
  // In Framer CMS: Title = person's name, Position = their role
  const fields = [];
  
  // Title is the person's NAME (Framer CMS structure)
  const name = person.title || person.name || '';
  fields.push(`title: "${name.replace(/"/g, '\\"')}"`);
  fields.push(`slug: "${person.slug}"`);
  
  if (person.link) {
    fields.push(`link: "${person.link}"`);
  }
  if (person.position) {
    fields.push(`position: "${person.position.replace(/"/g, '\\"')}"`);
  }
  if (person.category) {
    fields.push(`category: "${person.category.replace(/"/g, '\\"')}"`);
  }
  
  // CLEAN description: remove image URLs, artifacts, encoded data
  let description = person.description || '';
  if (description) {
    // Remove image URLs (with query params)
    description = description.replace(/https?:\/\/framerusercontent\.com\/images\/[^\s"']*/gi, '');
    // Remove ",," and quote artifacts
    description = description.replace(/",,/g, '');
    description = description.replace(/,,/g, '');
    description = description.replace(/\\"/g, '');
    // Remove encoded Framer data patterns
    description = description.replace(/[a-z]+-[a-z]+[A-Za-z0-9]{8,}/gi, ''); // slug + encoded
    description = description.replace(/\b[A-Za-z0-9]{10,}\b/g, (match) => {
      // Remove if it's all caps/nums or very long (encoded data)
      if (match.length > 12 && !match.match(/[aeiouAEIOU]{2,}/i)) return '';
      return match;
    });
    // Remove position/name duplicates (but be careful not to remove from sentences)
    if (name && name.length > 3) {
      // Only remove if it appears as standalone (not in a sentence)
      const nameWords = name.split(/\s+/);
      if (nameWords.length === 2) {
        // Remove if both words appear together
        description = description.replace(new RegExp(`\\b${nameWords[0]}\\s+${nameWords[1]}\\b`, 'gi'), '');
      }
    }
    if (person.position && person.position.length > 5) {
      // Only remove if it's a standalone mention, not part of a sentence
      description = description.replace(new RegExp(`\\b${person.position.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '');
    }
    // Remove query params
    description = description.replace(/\?[^\s"']*/gi, '');
    // Remove backslash artifacts
    description = description.replace(/\\\s+/g, ' ');
    // Remove broken words and artifacts
    description = description.replace(/\b\w+--\s*/g, ''); // "chair--"
    description = description.replace(/\b\w+\s*--/g, ''); // "word--"
    description = description.replace(/\b(am|an|the|a)\s+(am|an|the|a)\b/gi, '$1'); // "am an"
    description = description.replace(/\b([A-Z][a-z]+)\s+([a-z]+)\s+([A-Z][a-z]+)\b/g, (match, p1, p2, p3) => {
      // Remove patterns like "chair-- Green am an" -> keep only if it makes sense
      if (p2 === 'am' || p2 === 'an' || p2 === 'the') return `${p1} ${p3}`;
      return match;
    });
    // Remove orphaned words that don't make sense
    description = description.replace(/\b(am|an|the|a|in|on|at)\s+(am|an|the|a|in|on|at)\b/gi, '');
    // Clean up multiple spaces and trim
    description = description.replace(/\s+/g, ' ').trim();
    // Remove leading/trailing punctuation
    description = description.replace(/^[,\s\.\"']+|[,\s\.\"']+$/g, '');
    // Remove standalone quotes
    description = description.replace(/^["']|["']$/g, '');
    // Final cleanup - remove any remaining artifacts at start
    description = description.replace(/^[^A-Za-z]*/, '');
  }
  
  if (description && description.length > 10) {
    fields.push(`description: "${description.replace(/"/g, '\\"')}"`);
  }
  
  if (person.image) {
    fields.push(`image: "${person.image}"`);
  }
  if (person.url) {
    fields.push(`url: "${person.url}"`);
  }
  
  const frontmatter = `---
${fields.join('\n')}
---

`;

  // Use description as body, or fallback to content
  let body = description || person.body || person.content || '';
  // Minimal cleanup for body (remove HTML, basic entities)
  body = body.replace(/<[^>]+>/g, '');
  body = body.replace(/&nbsp;/g, ' ');
  body = body.trim();

  return frontmatter + body;
}

// Main conversion
console.log('🔄 Converting JSON to Markdown files...\n');

// Convert publications - try publications-all-fields.json first, then fallback to publications.json
let pubsFile = path.join(dataDir, 'publications-all-fields.json');
if (!fs.existsSync(pubsFile)) {
  pubsFile = path.join(dataDir, 'publications.json');
}

if (fs.existsSync(pubsFile)) {
  const publications = JSON.parse(fs.readFileSync(pubsFile, 'utf-8'));
  const pubsDir = path.join(outputDir, 'publications');

  if (!fs.existsSync(pubsDir)) {
    fs.mkdirSync(pubsDir, { recursive: true });
  }

  publications.forEach(pub => {
    const md = convertPublicationToMarkdown(pub);
    const filename = `${pub.slug}.md`;
    fs.writeFileSync(path.join(pubsDir, filename), md);
  });

  console.log(`✅ Converted ${publications.length} publications to Markdown`);
}

// Convert news - try news-all-fields.json first, then fallback to news.json
let newsFile = path.join(dataDir, 'news-all-fields.json');
if (!fs.existsSync(newsFile)) {
  newsFile = path.join(dataDir, 'news.json');
}

if (fs.existsSync(newsFile)) {
  const news = JSON.parse(fs.readFileSync(newsFile, 'utf-8'));
  const newsDir = path.join(outputDir, 'news');

  if (!fs.existsSync(newsDir)) {
    fs.mkdirSync(newsDir, { recursive: true });
  }

  news.forEach(item => {
    const md = convertNewsToMarkdown(item);
    const filename = `${item.slug}.md`;
    fs.writeFileSync(path.join(newsDir, filename), md);
  });

  console.log(`✅ Converted ${news.length} news items to Markdown`);
}

// Convert people - try people-all-fields.json first, then fallback to people.json
let peopleFile = path.join(dataDir, 'people-all-fields.json');
if (!fs.existsSync(peopleFile)) {
  peopleFile = path.join(dataDir, 'people.json');
}

if (fs.existsSync(peopleFile)) {
  const people = JSON.parse(fs.readFileSync(peopleFile, 'utf-8'));
  const peopleDir = path.join(outputDir, 'people');

  if (!fs.existsSync(peopleDir)) {
    fs.mkdirSync(peopleDir, { recursive: true });
  }

  people.forEach(person => {
    const md = convertPersonToMarkdown(person);
    const filename = `${person.slug}.md`;
    fs.writeFileSync(path.join(peopleDir, filename), md);
  });

  console.log(`✅ Converted ${people.length} people to Markdown`);
}

console.log('\n✅ Conversion complete!');
