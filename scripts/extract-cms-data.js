#!/usr/bin/env node

/**
 * Extract CMS data from Framer HTML files
 * Converts static HTML into structured JSON for CMS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteDir = path.join(__dirname, '../site');
const dataDir = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Extract publications from HTML files
 */
function extractPublications() {
    const pubsDir = path.join(siteDir, 'pubs-news-ppl');
    const publications = [];
    
    // Get all HTML files in pubs-news-ppl directory
    const files = fs.readdirSync(pubsDir).filter(f => f.endsWith('.html'));
    
    for (const file of files) {
        const filePath = path.join(pubsDir, file);
        const html = fs.readFileSync(filePath, 'utf-8');
        const $ = cheerio.load(html);
        
        // Extract title
        const title = $('title').text().replace(' - Banded Mongoose Research Project', '').trim();
        
        // Extract meta description
        const description = $('meta[name="description"]').attr('content') || '';
        
        // Extract content - try to find main content area
        const content = $('#main').html() || $('body').html() || '';
        
        // Extract year from filename or content (if possible)
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0]) : null;
        
        // Extract authors (if in title or content)
        const authors = [];
        // Try to find author patterns in content
        const authorPattern = /(?:by|author[s]?|written by)[:\s]+([^\.]+)/i;
        const authorMatch = content.match(authorPattern);
        if (authorMatch) {
            authors.push(...authorMatch[1].split(/[,&]/).map(a => a.trim()));
        }
        
        // Determine if it's a publication, news, or person page
        const isPerson = file.includes('professor') || file.includes('dr-') || 
                        file.includes('assistant-') || file.includes('chair-') ||
                        file.includes('field-manager') || file.match(/^[a-z-]+\.html$/);
        const isNews = file.includes('new-') || file.includes('grant') || file.includes('funding');
        
        if (!isPerson && !isNews) {
            publications.push({
                id: file.replace('.html', ''),
                title: title,
                slug: file.replace('.html', ''),
                description: description,
                content: content.substring(0, 5000), // Limit content size
                year: year,
                authors: authors.length > 0 ? authors : [],
                url: `/pubs-news-ppl/${file}`,
                date: null, // Will need to be added manually or extracted better
                category: 'publication'
            });
        }
    }
    
    return publications;
}

/**
 * Extract people from HTML files
 */
function extractPeople() {
    const people = [];
    const peopleFile = path.join(siteDir, 'people.html');
    
    if (!fs.existsSync(peopleFile)) {
        return people;
    }
    
    const html = fs.readFileSync(peopleFile, 'utf-8');
    const $ = cheerio.load(html);
    
    // Find all people links/entries
    $('a[href*="pubs-news-ppl"]').each((i, el) => {
        const href = $(el).attr('href');
        const name = $(el).text().trim();
        
        if (name && href && href.includes('pubs-news-ppl')) {
            const slug = href.replace('/pubs-news-ppl/', '').replace('.html', '');
            const personFile = path.join(siteDir, 'pubs-news-ppl', `${slug}.html`);
            
            if (fs.existsSync(personFile)) {
                const personHtml = fs.readFileSync(personFile, 'utf-8');
                const $person = cheerio.load(personHtml);
                const title = $person('title').text().replace(' - Banded Mongoose Research Project', '').trim();
                const description = $person('meta[name="description"]').attr('content') || '';
                const content = $person('#main').html() || $person('body').html() || '';
                
                people.push({
                    id: slug,
                    name: name,
                    slug: slug,
                    title: title,
                    description: description,
                    content: content.substring(0, 5000),
                    url: href,
                    role: null, // Will need to extract from content
                    email: null
                });
            }
        }
    });
    
    return people;
}

/**
 * Extract news items
 */
function extractNews() {
    const news = [];
    const newsFile = path.join(siteDir, 'news.html');
    
    if (!fs.existsSync(newsFile)) {
        return news;
    }
    
    const html = fs.readFileSync(newsFile, 'utf-8');
    const $ = cheerio.load(html);
    
    // Find news items (similar to publications but marked as news)
    $('a[href*="pubs-news-ppl"]').each((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        
        if (title && href && href.includes('pubs-news-ppl')) {
            const slug = href.replace('/pubs-news-ppl/', '').replace('.html', '');
            const newsItemFile = path.join(siteDir, 'pubs-news-ppl', `${slug}.html`);
            
            if (fs.existsSync(newsItemFile)) {
                const newsHtml = fs.readFileSync(newsItemFile, 'utf-8');
                const $news = cheerio.load(newsHtml);
                const description = $news('meta[name="description"]').attr('content') || '';
                const content = $news('#main').html() || $news('body').html() || '';
                
                news.push({
                    id: slug,
                    title: title,
                    slug: slug,
                    description: description,
                    content: content.substring(0, 5000),
                    url: href,
                    date: null
                });
            }
        }
    });
    
    return news;
}

// Main extraction
console.log('🔍 Extracting CMS data from HTML files...\n');

const publications = extractPublications();
const people = extractPeople();
const news = extractNews();

console.log(`📚 Found ${publications.length} publications`);
console.log(`👥 Found ${people.length} people`);
console.log(`📰 Found ${news.length} news items\n`);

// Save to JSON files
fs.writeFileSync(
    path.join(dataDir, 'publications.json'),
    JSON.stringify(publications, null, 2)
);

fs.writeFileSync(
    path.join(dataDir, 'people.json'),
    JSON.stringify(people, null, 2)
);

fs.writeFileSync(
    path.join(dataDir, 'news.json'),
    JSON.stringify(news, null, 2)
);

console.log('✅ CMS data extracted and saved to:');
console.log(`   - data/publications.json (${publications.length} items)`);
console.log(`   - data/people.json (${people.length} items)`);
console.log(`   - data/news.json (${news.length} items)`);
