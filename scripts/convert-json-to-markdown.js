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
  
  if (pub.journal) {
    fields.push(`journal: "${pub.journal.replace(/"/g, '\\"')}"`);
  }
  if (pub.url) {
    fields.push(`url: "${pub.url}"`);
  }
  if (pub.date || pub.year) {
    const date = pub.date || (pub.year ? `${pub.year}-01-01T00:00:00.000Z` : null);
    if (date) fields.push(`date: "${date}"`);
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
  const frontmatter = `---
title: "${news.title.replace(/"/g, '\\"')}"
slug: "${news.slug}"
description: "${(news.description || '').replace(/"/g, '\\"')}"
date: "${news.date || new Date().toISOString()}"
url: "${news.url}"
---

`;

  let body = news.content || '';
  body = body.replace(/<[^>]+>/g, '');
  body = body.replace(/&nbsp;/g, ' ');

  return frontmatter + body;
}

function convertPersonToMarkdown(person) {
  // Match Framer CMS structure EXACTLY: Title, Slug, Link, Position, Category, Description, Image, URL
  const fields = [];
  fields.push(`title: "${(person.title || person.name || '').replace(/"/g, '\\"')}"`);
  fields.push(`slug: "${person.slug}"`);
  
  if (person.link) {
    fields.push(`link: "${person.link}"`);
  }
  if (person.position || person.title) {
    fields.push(`position: "${(person.position || person.title || '').replace(/"/g, '\\"')}"`);
  }
  if (person.category) {
    fields.push(`category: "${person.category.replace(/"/g, '\\"')}"`);
  }
  if (person.description) {
    fields.push(`description: "${person.description.replace(/"/g, '\\"')}"`);
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

  let body = person.content || '';
  body = body.replace(/<[^>]+>/g, '');
  body = body.replace(/&nbsp;/g, ' ');

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

// Convert news
const newsFile = path.join(dataDir, 'news.json');
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

// Convert people
const peopleFile = path.join(dataDir, 'people.json');
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
