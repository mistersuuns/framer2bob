#!/usr/bin/env node

/**
 * Extract ALL data directly from Framer CMS
 * Gets all fields, all content, all file attachments
 * No back-calculation - just read the CMS data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');
const siteDir = path.join(__dirname, '../site');

// Ensure directories exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const baseUrl = 'https://mongooseproject.org';

/**
 * Download file from URL
 */
function downloadFile(url, outputPath) {
    try {
        execSync(`curl -sL "${url}" -o "${outputPath}"`, { stdio: 'pipe' });
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            return true;
        }
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return false;
    } catch (e) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return false;
    }
}

/**
 * Extract ALL fields from HTML - comprehensive extraction
 */
function extractAllFieldsFromHTML(htmlPath, slug) {
    const allFields = {};
    const files = [];
    
    if (!fs.existsSync(htmlPath)) {
        return { fields: allFields, files };
    }
    
    try {
        const html = fs.readFileSync(htmlPath, 'utf8');
        
        // Extract title (h1)
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        if (h1Match) allFields.title = h1Match[1].trim();
        
        // Extract authors (h2)
        const h2Matches = Array.from(html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g));
        const authors = h2Matches.map(m => m[1].trim()).filter(t => t.length > 0 && !t.match(/^[‹›]$/));
        if (authors.length > 0) allFields.authors = authors;
        
        // Extract year from content
        const yearMatch = html.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) allFields.year = yearMatch[0];
        
        // Extract description from meta
        const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (metaDesc) {
            const desc = metaDesc[1].trim();
            // Filter generic boilerplate
            if (!desc.includes('The Banded Mongoose Research Project consists')) {
                allFields.description = desc;
            }
        }
        
        // Extract ALL links - check for PDFs and files
        const allLinks = Array.from(html.matchAll(/href="([^"]+)"/g));
        for (const match of allLinks) {
            const url = match[1];
            const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
            
            // Check for file extensions (PDF, DOC, etc.)
            if (url.match(/\.(pdf|doc|docx|zip|txt)$/i)) {
                files.push({
                    url: absoluteUrl,
                    type: path.extname(url).toLowerCase().replace('.', ''),
                    originalUrl: url
                });
            }
            
            // Check for Framer asset PDFs
            if (url.includes('framerusercontent.com/assets/') && url.includes('.pdf')) {
                files.push({
                    url: absoluteUrl,
                    type: 'pdf',
                    originalUrl: url
                });
            }
            
            // Check for DOI
            if (url.includes('doi.org') && !allFields.doi) {
                allFields.doi = absoluteUrl;
            }
        }
        
        // Also check for PDFs in src attributes or data attributes
        const srcLinks = Array.from(html.matchAll(/src="([^"]+)"/g));
        for (const match of srcLinks) {
            const url = match[1];
            if (url.includes('.pdf') || (url.includes('framerusercontent.com/assets/') && url.includes('.pdf'))) {
                const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
                files.push({
                    url: absoluteUrl,
                    type: 'pdf',
                    originalUrl: url
                });
            }
        }
        
        // Extract content - get all paragraph text
        const pMatches = Array.from(html.matchAll(/<p[^>]*>([^<]+)<\/p>/g));
        const paragraphs = pMatches.map(m => m[1].trim()).filter(t => 
            t.length > 20 && 
            !t.includes('The Banded Mongoose Research Project consists') &&
            !t.match(/^(About|People|Research|News|Publications|Contact)$/i) &&
            !t.includes('Mongoose videos by') &&
            !t.includes('BMPR. All rights reserved')
        );
        if (paragraphs.length > 0) {
            allFields.content = paragraphs.join('\n\n');
        }
        
    } catch (e) {
        console.warn(`⚠️  Error extracting from ${htmlPath}: ${e.message}`);
    }
    
    return { fields: allFields, files };
}

/**
 * Get PDF links from publications listing page by matching titles
 * Uses local file if available to avoid Netlify credit usage
 */
function getPDFLinksFromPublicationsPage(publicationTitles) {
    const pdfMap = {};
    
    try {
        // Try local file first
        const localFile = path.join(siteDir, 'publications.html');
        const tempFile = path.join(dataDir, 'publications-page-temp.html');
        
        if (fs.existsSync(localFile)) {
            fs.copyFileSync(localFile, tempFile);
        } else {
            // Fallback to downloading (but warn about credit usage)
            console.warn('  ⚠️  Downloading publications page (using Netlify credits)');
            execSync(`curl -sL "${baseUrl}/publications" -o "${tempFile}"`, { stdio: 'pipe' });
        }
        
        if (fs.existsSync(tempFile)) {
            const html = fs.readFileSync(tempFile, 'utf8');
            
            // Extract ALL PDF links with their positions
            const allPDFs = Array.from(html.matchAll(/href="(https:\/\/framerusercontent.com\/assets\/[^"]+\.pdf)"/g));
            console.log(`  Found ${allPDFs.length} PDF links on page`);
            
            // For each publication title, find the closest PDF
            for (const [slug, title] of Object.entries(publicationTitles)) {
                // Find title in HTML (case-insensitive, partial match)
                const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                if (titleWords.length === 0) continue;
                
                // Find first significant word from title
                const searchWord = titleWords[0];
                const titleIdx = html.toLowerCase().indexOf(searchWord);
                
                if (titleIdx > 0) {
                    // Look for PDF in window around title (2000 chars before and after)
                    const windowStart = Math.max(0, titleIdx - 2000);
                    const windowEnd = titleIdx + 2000;
                    const window = html.substring(windowStart, windowEnd);
                    
                    // Find all PDFs in this window
                    const pdfMatches = Array.from(window.matchAll(/href="(https:\/\/framerusercontent.com\/assets\/[^"]+\.pdf)"/g));
                    
                    if (pdfMatches.length > 0) {
                        // Use the closest PDF
                        let closestPDF = null;
                        let closestDist = Infinity;
                        
                        for (const pdfMatch of pdfMatches) {
                            const pdfIdx = windowStart + window.indexOf(pdfMatch[0]);
                            const dist = Math.abs(pdfIdx - titleIdx);
                            if (dist < closestDist) {
                                closestDist = dist;
                                closestPDF = pdfMatch[1];
                            }
                        }
                        
                        if (closestPDF && closestDist < 1500) {
                            pdfMap[slug] = closestPDF;
                        }
                    }
                }
            }
            
            fs.unlinkSync(tempFile);
        }
    } catch (e) {
        console.warn(`⚠️  Could not get PDF links: ${e.message}`);
    }
    
    return pdfMap;
}

/**
 * Download searchIndex to get all publications
 * Uses local file first to avoid Netlify credit usage
 */
function getSearchIndex() {
    // Try local file first
    const localFile = path.join(dataDir, 'searchIndex.json');
    if (fs.existsSync(localFile)) {
        return JSON.parse(fs.readFileSync(localFile, 'utf8'));
    }
    
    // Fallback to downloading (but warn about credit usage)
    try {
        console.warn('⚠️  Downloading searchIndex (using Netlify credits)');
        const searchIndexUrl = 'https://framerusercontent.com/sites/4nPRg3hC3Keb52fPYFU5qT/searchIndex-bqgNGwXnRph4.json';
        const tempFile = path.join(dataDir, 'searchIndex-temp.json');
        execSync(`curl -sL "${searchIndexUrl}" -o "${tempFile}"`, { stdio: 'pipe' });
        
        if (fs.existsSync(tempFile)) {
            const data = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
            fs.unlinkSync(tempFile);
            return data;
        }
    } catch (e) {
        console.warn(`⚠️  Could not download searchIndex: ${e.message}`);
    }
    
    return {};
}

/**
 * Extract ALL publications with ALL fields and files
 */
function extractAllPublications() {
    console.log('🔍 Extracting ALL publication data from Framer CMS...\n');
    
    // Known exclusions
    const knownPeople = ['neil-jordan', 'emma-inzani', 'graham-birch', 'nikita-bedov-panasyuk',
        'monil-khera', 'dave-seager', 'dr-michelle-hares', 'dr-harry-marshall',
        'beth-preston', 'catherine-sheppard', 'jennifer-sanderson', 'mike-cant',
        'field-manager', 'hazel-nichols', 'faye-thompson', 'professor',
        'assistant-professor', 'chair-of-evolutionary-population-genetics',
        'emma-vitikainen', 'laura-labarge', 'leela-channer'];
    
    const knownNews = ['new-grant', 'new-funding-from-germany', 'pioneering-next-generation-animal-tracking'];
    
    // Get searchIndex to find all publications
    console.log('📥 Downloading searchIndex...');
    const searchIndex = getSearchIndex();
    console.log(`✅ Loaded ${Object.keys(searchIndex).length} items from searchIndex\n`);
    
    // Build title map for PDF matching
    const publicationTitles = {};
    for (const [url, data] of Object.entries(searchIndex)) {
        if (!url.includes('/pubs-news-ppl/')) continue;
        const slug = url.replace('/pubs-news-ppl/', '').replace('.html', '');
        if (knownPeople.includes(slug) || knownNews.includes(slug)) continue;
        if (data.h1 && data.h1.length > 0) {
            const hasAuthors = data.h2 && data.h2.some(h2 => h2.includes('‹') && h2.length > 5);
            if (hasAuthors) {
                publicationTitles[slug] = data.h1[0];
            }
        }
    }
    
    // Get PDF links from publications page by matching titles
    console.log('📄 Getting PDF links from publications listing page...');
    const pdfLinks = getPDFLinksFromPublicationsPage(publicationTitles);
    console.log(`✅ Found ${Object.keys(pdfLinks).length} PDF links\n`);
    
    const publications = [];
    const pdfsDir = path.join(dataDir, 'publications', 'pdfs');
    if (!fs.existsSync(pdfsDir)) {
        fs.mkdirSync(pdfsDir, { recursive: true });
    }
    
    // Process each item from searchIndex
    for (const [url, data] of Object.entries(searchIndex)) {
        if (!url.includes('/pubs-news-ppl/')) continue;
        
        const slug = url.replace('/pubs-news-ppl/', '').replace('.html', '');
        
        // Skip people and news
        if (knownPeople.includes(slug) || knownNews.includes(slug)) continue;
        
        // Check if it's a publication (has h1 title and h2 authors)
        if (!data.h1 || data.h1.length === 0) continue;
        const hasAuthors = data.h2 && data.h2.some(h2 => h2.includes('‹') && h2.length > 5);
        if (!hasAuthors) continue;
        
        const title = data.h1[0];
        const authors = data.h2[0].replace(/[\u2039\u203A]/g, '').trim();
        
        // Extract year
        let year = null;
        if (data.p) {
            for (const p of data.p) {
                const yearMatch = p.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                    year = yearMatch[0];
                    break;
                }
            }
        }
        
        // Use local HTML files (don't download from live site to avoid Netlify credit usage)
        const htmlPath = path.join(siteDir, 'pubs-news-ppl', `${slug}.html`);
        let allFields = {};
        let files = [];
        
        // Only use local files - don't download from live site
        if (!fs.existsSync(htmlPath)) {
            console.warn(`  ⚠️  Local HTML not found for ${slug}, skipping`);
            continue;
        }
        
        if (fs.existsSync(htmlPath)) {
            const extracted = extractAllFieldsFromHTML(htmlPath, slug);
            allFields = extracted.fields;
            files = extracted.files;
        }
        
        // Download PDF
        let pdfLocalPath = null;
        if (pdfLinks[slug]) {
            const pdfFilename = `${slug}.pdf`;
            const pdfPath = path.join(pdfsDir, pdfFilename);
            
            if (downloadFile(pdfLinks[slug], pdfPath)) {
                pdfLocalPath = `publications/pdfs/${pdfFilename}`;
                console.log(`  ✅ Downloaded PDF: ${pdfFilename}`);
            }
        }
        
        // Also check files extracted from HTML
        for (const file of files) {
            if (file.type === 'pdf' && !pdfLocalPath) {
                const pdfFilename = `${slug}.pdf`;
                const pdfPath = path.join(pdfsDir, pdfFilename);
                
                if (downloadFile(file.url, pdfPath)) {
                    pdfLocalPath = `publications/pdfs/${pdfFilename}`;
                    console.log(`  ✅ Downloaded PDF from HTML: ${pdfFilename}`);
                }
            }
        }
        
        // Filter boilerplate description
        let description = allFields.description || data.description || '';
        const genericText = 'The Banded Mongoose Research Project consists of a team of researchers working in Uganda, Exeter and Liverpool in the UK. The main project is based at the University of Exeter (Penryn Campus) and is directed by Professor Michael Cant.';
        if (description === genericText || description.trim() === genericText.trim() || description.includes('The Banded Mongoose Research Project consists')) {
            description = ''; // Remove generic boilerplate
        }
        
        // Clean content - remove footer text
        let content = allFields.content || '';
        // Remove footer patterns
        content = content.replace(/Mongoose videos by[^\n]+/g, '');
        content = content.replace(/\d{4} BMPR\. All rights reserved\./g, '');
        // Clean up multiple newlines
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.trim();
        
        // Build publication matching Framer CMS structure EXACTLY: Title, Slug, Authors, Journal, URL, Date, Files & Media, Description, Content
        const publicationFiles = [];
        if (pdfLocalPath) {
            publicationFiles.push({file: pdfLocalPath});
        }
        if (allFields.doi) {
            publicationFiles.push({file: allFields.doi, type: 'doi'});
        }
        if (allFields.externalLinks && allFields.externalLinks.length > 0) {
            allFields.externalLinks.forEach(link => {
                publicationFiles.push({file: link, type: 'link'});
            });
        }
        
        const pub = {
            id: slug,
            slug: slug,
            title: allFields.title || title,
            authors: allFields.authors || [authors],
            journal: allFields.journal || null,
            url: url,
            date: allFields.date || (year ? `${year}-01-01T00:00:00.000Z` : null),
            files: publicationFiles.length > 0 ? publicationFiles : null,
            description: description,
            body: content
        };
        
        publications.push(pub);
    }
    
    console.log(`\n✅ Extracted ${publications.length} publications with ALL fields\n`);
    return publications;
}

/**
 * Extract titles from People listing page (using same logic as extract-cms-data-v2.js)
 */
function extractTitlesFromPeoplePage() {
    const titlesMap = {};
    
    try {
        // Try local file first
        let html = null;
        const peoplePagePath = path.join(siteDir, 'people.html');
        
        if (fs.existsSync(peoplePagePath)) {
            html = fs.readFileSync(peoplePagePath, 'utf8');
        } else {
            // Fallback to downloading (but warn about credit usage)
            console.warn('  ⚠️  Downloading People page (using Netlify credits)');
            const tempFile = path.join(dataDir, 'people-page-temp.html');
            execSync(`curl -sL "${baseUrl}/people" -o "${tempFile}"`, { stdio: 'pipe' });
            if (fs.existsSync(tempFile)) {
                html = fs.readFileSync(tempFile, 'utf8');
                fs.unlinkSync(tempFile);
            }
        }
        
        if (!html) {
            console.warn('  ⚠️  Could not get People page');
            return titlesMap;
        }
        
        // Strategy 0: Extract from embedded JSON data (most reliable)
        try {
            const jsonMatch = html.match(/<script type="framer\/handover"[^>]*>([\s\S]+?)<\/script>/);
            if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[1]);
                // Recursively search for people objects (has TAIvpALDu=slug, Hohw1kgab=name, MY38jWI86=title)
                function findPeople(obj) {
                    if (Array.isArray(obj)) {
                        obj.forEach(item => findPeople(item));
                    } else if (typeof obj === 'object' && obj !== null) {
                        if (obj.TAIvpALDu && obj.Hohw1kgab && obj.MY38jWI86) {
                            const slug = obj.TAIvpALDu;
                            const title = obj.MY38jWI86;
                            if (slug && title && title.length > 2 && title.length < 100 && title !== obj.Hohw1kgab) {
                                titlesMap[slug] = title;
                            }
                        }
                        Object.values(obj).forEach(val => findPeople(val));
                    }
                }
                findPeople(jsonData);
            }
        } catch (e) {
            // Fall through to HTML parsing
        }
        
        // Strategy 1: Find h1/h4 pairs (main People section) - fallback
        // Look for h1 (name) followed by h4 (title), then find the link that corresponds
        const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/g));
        for (const h1Match of h1Matches) {
            const name = h1Match[1].trim();
            // Only process if it looks like a person name
            if (name.length < 3 || name.length > 50 || !/^[A-Z]/.test(name)) continue;
            
            const h1Idx = h1Match.index;
            // Find h4 after h1 (title)
            const after = html.substring(h1Idx, h1Idx + 1000);
            const h4Match = after.match(/<h4[^>]*>([^<]+)<\/h4>/);
            
            if (h4Match) {
                const title = h4Match[1].trim();
                // Find closest link before this h1 (within 5000 chars to be safe)
                const before = html.substring(Math.max(0, h1Idx - 5000), h1Idx);
                const links = Array.from(before.matchAll(/href="\.\/pubs-news-ppl\/([^"]+)"/g));
                
                if (links.length > 0 && title && title.length > 2 && title !== name) {
                    // Use the last (closest) link before the h1
                    const slug = links[links.length - 1][1];
                    // Only add if title looks valid (not just a name)
                    if (!title.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/) && title.length < 100) {
                        titlesMap[slug] = title;
                    }
                }
            }
        }
        
        // Strategy 2: h6 pattern for Alumni section
        const linkMatches = Array.from(html.matchAll(/href="\.\/pubs-news-ppl\/([^"]+)">([\s\S]{0,1500}?)<\/a>/g));
        for (const linkMatch of linkMatches) {
            const slug = linkMatch[1];
            if (titlesMap[slug]) continue;
            
            const linkBlock = linkMatch[2];
            const h6Matches = Array.from(linkBlock.matchAll(/<h6[^>]*>([^<]+)<\/h6>/g));
            const h6Texts = h6Matches.map(m => m[1].trim());
            
            if (h6Texts.length >= 2) {
                let title = null;
                
                if (h6Texts.length === 2) {
                    if (h6Texts[1] !== '–' && h6Texts[1] !== '-' && h6Texts[1].length > 2 &&
                        !h6Texts[1].match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/) && !h6Texts[1].includes('@')) {
                        title = h6Texts[1];
                    }
                } else if (h6Texts.length >= 3) {
                    if (h6Texts[1] === '–' || h6Texts[1] === '-') {
                        title = h6Texts[2];
                    } else if (h6Texts[1] !== '–' && h6Texts[1] !== '-' && h6Texts[1].length > 2 &&
                        !h6Texts[1].match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/) && !h6Texts[1].includes('@')) {
                        title = h6Texts[1];
                    } else {
                        title = h6Texts[2];
                    }
                }
                
                const hasTitleKeyword = title && (title.toLowerCase().includes('student') || 
                     title.toLowerCase().includes('professor') ||
                     title.toLowerCase().includes('researcher') ||
                     title.toLowerCase().includes('fellow') ||
                     title.toLowerCase().includes('manager') ||
                     title.toLowerCase().includes('director') ||
                     title.toLowerCase().includes('associate') ||
                     title.toLowerCase().includes('phd') ||
                     title.toLowerCase().includes('mres') ||
                     title.toLowerCase().includes('mbyres') ||
                     title.toLowerCase().includes('chair'));
                
                if (title && hasTitleKeyword && title.length > 2 && title.length < 100) {
                    titlesMap[slug] = title;
                }
            }
        }
    } catch (e) {
        console.warn(`⚠️  Error extracting titles from People page: ${e.message}`);
    }
    
    return titlesMap;
}

/**
 * Extract ALL people with ALL fields
 */
function extractAllPeople() {
    console.log('🔍 Extracting ALL people data from Framer CMS...\n');
    
    // Get titles from People listing page
    console.log('📄 Extracting titles from People listing page...');
    const titlesMap = extractTitlesFromPeoplePage();
    console.log(`✅ Found ${Object.keys(titlesMap).length} titles from People page\n`);
    
    const people = [];
    const searchIndex = getSearchIndex();
    
    const knownPeopleSlugs = [
        'neil-jordan', 'emma-inzani', 'graham-birch', 'nikita-bedov-panasyuk',
        'monil-khera', 'dave-seager', 'dr-michelle-hares', 'dr-harry-marshall',
        'beth-preston', 'catherine-sheppard', 'jennifer-sanderson', 'mike-cant',
        'field-manager', 'hazel-nichols', 'faye-thompson', 'professor',
        'assistant-professor', 'chair-of-evolutionary-population-genetics',
        'emma-vitikainen', 'laura-labarge', 'leela-channer', 'patrick-green',
        'joe-hoffman', 'dan-franks', 'francis-mwanguhya'
    ];
    
    for (const [url, data] of Object.entries(searchIndex)) {
        if (!url.includes('/pubs-news-ppl/')) continue;
        
        const slug = url.replace('/pubs-news-ppl/', '').replace('.html', '');
        
        // Check if it's a person
        if (!knownPeopleSlugs.includes(slug)) {
            // Check if it looks like a person (short name, no year, no authors)
            const name = data.h1 && data.h1[0];
            if (!name || name.length > 50) continue;
            const hasYear = data.p && data.p.some(p => /\b(19|20)\d{2}\b/.test(p));
            const hasAuthors = data.h2 && data.h2.some(h2 => h2.includes('‹') && h2.length > 5);
            if (hasYear || hasAuthors) continue;
        }
        
        const name = data.h1 && data.h1[0];
        if (!name) continue;
        
        // Extract ALL fields from HTML
        const htmlPath = path.join(siteDir, 'pubs-news-ppl', `${slug}.html`);
        let allFields = {};
        
        if (fs.existsSync(htmlPath)) {
            const extracted = extractAllFieldsFromHTML(htmlPath, slug);
            allFields = extracted.fields;
        }
        
        // Get title - prioritize People page, then HTML extraction
        const title = titlesMap[slug] || allFields.title || null;
        
        // Filter boilerplate description
        let description = allFields.description || data.description || '';
        const genericText = 'The Banded Mongoose Research Project consists of a team of researchers working in Uganda, Exeter and Liverpool in the UK. The main project is based at the University of Exeter (Penryn Campus) and is directed by Professor Michael Cant.';
        if (description === genericText || description.trim() === genericText.trim() || description.includes('The Banded Mongoose Research Project consists')) {
            description = '';
        }
        
        // Clean content
        let content = allFields.content || '';
        content = content.replace(/Mongoose videos by[^\n]+/g, '');
        content = content.replace(/\d{4} BMPR\. All rights reserved\./g, '');
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.trim();
        
        // Get position - prioritize People page, then HTML extraction
        const position = titlesMap[slug] || allFields.position || null;
        
        // Build person matching Framer CMS structure EXACTLY: Title, Slug, Link, Position, Category, Description, Image, URL
        const person = {
            id: slug,
            slug: slug,
            title: name, // Framer uses "Title" for person name
            link: allFields.link || null,
            position: position,
            category: allFields.category || null,
            description: description,
            image: allFields.image || null,
            url: url
        };
        
        people.push(person);
    }
    
    console.log(`✅ Extracted ${people.length} people with ALL fields\n`);
    return people;
}

// Main
const allPublications = extractAllPublications();
const allPeople = extractAllPeople();

fs.writeFileSync(
    path.join(dataDir, 'publications-all-fields.json'),
    JSON.stringify(allPublications, null, 2)
);

fs.writeFileSync(
    path.join(dataDir, 'people-all-fields.json'),
    JSON.stringify(allPeople, null, 2)
);

console.log('✅ Saved to data/publications-all-fields.json');
console.log('✅ Saved to data/people-all-fields.json');
