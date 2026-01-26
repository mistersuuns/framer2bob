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
        
        // Extract paragraphs first (needed for both content and journal extraction)
        const pMatches = Array.from(html.matchAll(/<p[^>]*>([^<]+)<\/p>/g));
        const paragraphs = pMatches.map(m => m[1].trim()).filter(t => 
            t.length > 20 && 
            !t.includes('The Banded Mongoose Research Project consists') &&
            !t.match(/^(About|People|Research|News|Publications|Contact)$/i) &&
            !t.includes('Mongoose videos by') &&
            !t.includes('BMPR. All rights reserved')
        );
        
        // Extract content - get ALL text content, not just paragraphs
        // Framer uses complex HTML structure, so extract from body text
        const bodyMatch = html.match(/<body[^>]*>([\s\S]+?)<\/body>/);
        if (bodyMatch) {
            let body = bodyMatch[1];
            // Remove scripts and styles
            body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            // Remove navigation/footer patterns
            body = body.replace(/←\s*Back to Home/gi, '');
            body = body.replace(/Mongoose videos by[^\n]+/gi, '');
            body = body.replace(/\d{4} BMPR\. All rights reserved\./gi, '');
            body = body.replace(/\b(About|People|Research|News|Publications|Contact)\b/gi, '');
            
            // Extract all text (remove HTML tags)
            let text = body.replace(/<[^>]+>/g, ' ');
            text = text.replace(/\s+/g, ' ').trim();
            
            // Extract meaningful sentences (50+ chars) - this gets person bios
            const sentences = text.match(/[^.!?]{50,}[.!?]/g) || [];
            if (sentences.length > 0) {
                let content = sentences.join(' ').trim();
                // Remove position if it appears at the start (common in person pages)
                const positionPattern = /^(Professor|Assistant Professor|Lecturer|Field Manager|PhD Student|MRes Student|MbyRes Student|Chair of|Postdoctoral|Associate|Director|Manager)[^.!?]{0,50}[.!?]\s*/i;
                content = content.replace(positionPattern, '');
                allFields.content = content.trim();
            }
        }
        
        // Fallback: use paragraph extraction if body extraction didn't work
        if (!allFields.content && paragraphs.length > 0) {
            allFields.content = paragraphs.join('\n\n');
        }
        
        // Extract journal from paragraphs - journal is often a short paragraph (50-200 chars) with journal names
        const journalPatterns = [
            /Nature\s+(Ecology\s+&)?\s*Evolution/i,
            /Philosophical\s+Transactions/i,
            /Proceedings\s+of\s+the\s+Royal\s+Society/i,
            /Royal\s+Society/i,
            /Journal\s+of\s+[A-Z][a-z]+/i,
            /[A-Z][a-z]+\s+[A-Z][a-z]+\s+Journal/i,
            /[A-Z][a-z]+\s+Ecology/i,
            /[A-Z][a-z]+\s+Evolution/i,
            /Science\s+Advances/i,
            /Current\s+Biology/i,
            /Behavioral\s+Ecology/i,
            /Animal\s+Behaviour/i
        ];
        
        // Check paragraphs for journal names - journal is usually a short standalone paragraph
        if (paragraphs.length > 0) {
            for (const para of paragraphs) {
                if (para.length > 30 && para.length < 200) {
                    for (const pattern of journalPatterns) {
                        if (pattern.test(para)) {
                            // Found journal - clean it up
                            let journal = para.trim();
                            // Remove common prefixes/suffixes
                            journal = journal.replace(/^(Published in|In|Journal:?)\s*/i, '');
                            journal = journal.replace(/\s*\.$/, '');
                            if (journal.length > 5 && journal.length < 150) {
                                allFields.journal = journal;
                                break;
                            }
                        }
                    }
                    if (allFields.journal) break;
                }
            }
        }
        
        // Also check if journal is in the body field we extracted (sometimes it's there)
        if (!allFields.journal && allFields.content) {
            for (const pattern of journalPatterns) {
                const match = allFields.content.match(pattern);
                if (match) {
                    // Extract the sentence or phrase containing the journal
                    const context = allFields.content.substring(
                        Math.max(0, allFields.content.indexOf(match[0]) - 50),
                        Math.min(allFields.content.length, allFields.content.indexOf(match[0]) + 100)
                    );
                    // Clean up
                    let journal = context.trim();
                    journal = journal.replace(/^[^A-Z]*/, '');
                    journal = journal.replace(/[^A-Za-z0-9\s&,\.\-:;].*$/, '');
                    journal = journal.trim();
                    if (journal.length > 5 && journal.length < 150) {
                        allFields.journal = journal;
                        break;
                    }
                }
            }
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
        
        // Extract journal from allFields (now extracted in extractAllFieldsFromHTML)
        const journal = allFields.journal || null;
        
        const pub = {
            id: slug,
            slug: slug,
            title: allFields.title || title,
            authors: allFields.authors || [authors],
            journal: journal,
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
 * Extract titles AND descriptions from People listing page
 */
function extractTitlesFromPeoplePage() {
    const titlesMap = {};
    const descriptionsMap = {};
    
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
            return { titles: titlesMap, descriptions: descriptionsMap };
        }
        
        // Extract descriptions from People page
        // Descriptions are near person names, not necessarily in the link itself
        // Pattern: Look for person name/slug followed by "I am" description text
        
        // First, get all person slugs from links (try multiple link patterns)
        const linkPatterns = [
            /href="\.\/pubs-news-ppl\/([^"]+)"/g,
            /href="\/pubs-news-ppl\/([^"]+)"/g
        ];
        
        const allSlugs = new Set();
        linkPatterns.forEach(pattern => {
            const matches = Array.from(html.matchAll(pattern));
            matches.forEach(m => allSlugs.add(m[1]));
        });
        
        // For each slug, find description nearby in HTML
        // Descriptions appear BEFORE the slug in the JSON structure
        for (const slug of allSlugs) {
            // Find the slug in HTML
            const slugIdx = html.indexOf(`"${slug}"`) || html.indexOf(`'${slug}'`) || html.indexOf(slug);
            if (slugIdx > 0) {
                // Look for "I am" text within 5000 chars BEFORE the slug (description comes first)
                const beforeWindow = html.substring(Math.max(0, slugIdx - 5000), slugIdx);
                const descMatch = beforeWindow.match(/(I am[^<]{50,2000})/i);
                if (descMatch) {
                    let desc = descMatch[1];
                    // Clean up HTML entities and tags
                    desc = desc.replace(/&nbsp;/g, ' ');
                    desc = desc.replace(/<[^>]+>/g, ' ');
                    desc = desc.replace(/\s+/g, ' ').trim();
                    // Remove any JSON artifacts that might be included
                    desc = desc.replace(/\{[^}]*\}/g, '');
                    desc = desc.replace(/\[[^\]]*\]/g, '');
                    desc = desc.replace(/"[^"]*"/g, '');
                    desc = desc.replace(/\s+/g, ' ').trim();
                    if (desc.length > 50 && !desc.match(/^[^a-z]*$/)) {
                        descriptionsMap[slug] = desc;
                    }
                }
            }
        }
        
        // Strategy 0: Extract from embedded JSON data (most reliable)
        try {
            const jsonMatch = html.match(/<script type="framer\/handover"[^>]*>([\s\S]+?)<\/script>/);
            if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[1]);
                
                // Resolve references - if value is a number, look it up in jsonData
                function resolveRef(ref) {
                    if (typeof ref === 'number' && jsonData[ref] !== undefined) {
                        const obj = jsonData[ref];
                        if (obj && typeof obj === 'object' && obj.value !== undefined) {
                            return resolveRef(obj.value);
                        }
                        return typeof obj === 'string' ? obj : ref;
                    }
                    return typeof ref === 'string' ? ref : null;
                }
                
                // Recursively search for people objects (has TAIvpALDu=slug, Hohw1kgab=name, MY38jWI86=position)
                function findPeople(obj, depth = 0) {
                    if (depth > 15) return; // Prevent infinite recursion
                    if (Array.isArray(obj)) {
                        obj.forEach(item => findPeople(item, depth + 1));
                    } else if (typeof obj === 'object' && obj !== null) {
                        if (obj.TAIvpALDu && obj.Hohw1kgab) {
                            const slugRef = obj.TAIvpALDu;
                            const nameRef = obj.Hohw1kgab;
                            const positionRef = obj.MY38jWI86;
                            
                            // Resolve references
                            const slug = resolveRef(slugRef);
                            const name = resolveRef(nameRef);
                            const position = positionRef ? resolveRef(positionRef) : null;
                            
                            // Only add if we have valid slug and name
                            if (slug && typeof slug === 'string' && slug.includes('-') && 
                                name && typeof name === 'string' && name.length > 2) {
                                
                                // If we have a position, validate it
                                if (position && typeof position === 'string' && position.length > 2 && 
                                    position !== name && position.length < 100) {
                                    // Validate it's a position (not just another name)
                                    const hasPositionKeyword = position.toLowerCase().includes('student') || 
                                        position.toLowerCase().includes('professor') ||
                                        position.toLowerCase().includes('researcher') ||
                                        position.toLowerCase().includes('fellow') ||
                                        position.toLowerCase().includes('manager') ||
                                        position.toLowerCase().includes('director') ||
                                        position.toLowerCase().includes('associate') ||
                                        position.toLowerCase().includes('phd') ||
                                        position.toLowerCase().includes('mres') ||
                                        position.toLowerCase().includes('mbyres') ||
                                        position.toLowerCase().includes('chair') ||
                                        position.toLowerCase().includes('lecturer');
                                    
                                    if (hasPositionKeyword) {
                                        titlesMap[slug] = position;
                                    }
                                }
                            }
                        }
                        Object.values(obj).forEach(val => findPeople(val, depth + 1));
                    }
                }
                findPeople(jsonData);
            }
        } catch (e) {
            console.warn(`  ⚠️  JSON extraction error: ${e.message}`);
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
        console.warn(`⚠️  Error extracting from People page: ${e.message}`);
    }
    
    return { titles: titlesMap, descriptions: descriptionsMap };
}

/**
 * Extract ALL people with ALL fields
 */
function extractAllPeople() {
    console.log('🔍 Extracting ALL people data from Framer CMS...\n');
    
    // Get titles and descriptions from People listing page
    console.log('📄 Extracting titles and descriptions from People listing page...');
    const { titles: titlesMap, descriptions: descriptionsMap } = extractTitlesFromPeoplePage();
    console.log(`✅ Found ${Object.keys(titlesMap).length} titles and ${Object.keys(descriptionsMap).length} descriptions from People page\n`);
    
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
        
        // Clean content - this is the person's bio/description
        let content = allFields.content || '';
        content = content.replace(/Mongoose videos by[^\n]+/g, '');
        content = content.replace(/\d{4} BMPR\. All rights reserved\./g, '');
        content = content.replace(/\n{3,}/g, '\n\n');
        content = content.trim();
        
        // Use content as description for people (their bio)
        if (content) {
            description = content;
        }
        
        // Get position - prioritize People page, then HTML extraction
        const position = titlesMap[slug] || allFields.position || null;
        
        // Get description from People page (most reliable source)
        const peoplePageDescription = descriptionsMap[slug] || null;
        if (peoplePageDescription) {
            description = peoplePageDescription;
        } else if (content) {
            description = content;
        }
        
        // Build person matching Framer CMS structure EXACTLY: Title, Slug, Link, Position, Category, Description, Image, URL
        const person = {
            id: slug,
            slug: slug,
            title: name, // Framer uses "Title" for person name
            link: allFields.link || null,
            position: position,
            category: allFields.category || null,
            description: description || '',
            image: allFields.image || null,
            url: url,
            body: description || content // Use description as body
        };
        
        people.push(person);
    }
    
    console.log(`✅ Extracted ${people.length} people with ALL fields\n`);
    return people;
}

/**
 * Extract ALL news items with ALL fields
 */
function extractAllNews() {
    console.log('🔍 Extracting ALL news data from Framer CMS...\n');
    
    const knownNews = ['new-grant', 'new-funding-from-germany', 'pioneering-next-generation-animal-tracking'];
    
    // Known people slugs - EXCLUDE these from news
    const knownPeopleSlugs = [
        'neil-jordan', 'emma-inzani', 'graham-birch', 'nikita-bedov-panasyuk',
        'monil-khera', 'dave-seager', 'dr-michelle-hares', 'dr-harry-marshall',
        'beth-preston', 'catherine-sheppard', 'jennifer-sanderson', 'mike-cant',
        'field-manager', 'hazel-nichols', 'faye-thompson', 'professor',
        'assistant-professor', 'chair-of-evolutionary-population-genetics',
        'emma-vitikainen', 'laura-labarge', 'leela-channer', 'patrick-green',
        'joe-hoffman', 'dan-franks', 'francis-mwanguhya', 'rufus-johnstone',
        'zoe-turner', 'olivier-carter', 'rahul-jaitly', 'megan-nicholl',
        'erica-sininärhi', 'variable-ecological-conditions-promote-male-helping-by-changing-banded-mongoose-group-composition'
    ];
    
    const news = [];
    const searchIndex = getSearchIndex();
    
    for (const [url, data] of Object.entries(searchIndex)) {
        if (!url.includes('/pubs-news-ppl/')) continue;
        
        const slug = url.replace('/pubs-news-ppl/', '').replace('.html', '');
        
        // ONLY include known news slugs - be very strict
        if (!knownNews.includes(slug)) {
            continue; // Skip everything that's not explicitly known news
        }
        
        const title = data.h1 && data.h1[0];
        if (!title) continue;
        
        // Extract ALL fields from HTML
        const htmlPath = path.join(siteDir, 'pubs-news-ppl', `${slug}.html`);
        let allFields = {};
        
        if (fs.existsSync(htmlPath)) {
            const extracted = extractAllFieldsFromHTML(htmlPath, slug);
            allFields = extracted.fields;
        }
        
        // Extract date
        let date = null;
        if (data.p) {
            for (const p of data.p) {
                const yearMatch = p.match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                    date = `${yearMatch[0]}-01-01T00:00:00.000Z`;
                    break;
                }
            }
        }
        if (!date && allFields.year) {
            date = `${allFields.year}-01-01T00:00:00.000Z`;
        }
        
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
        
        // Build news item matching Framer CMS structure: Title, Slug, Date, Description, Content, URL, Image
        const newsItem = {
            id: slug,
            slug: slug,
            title: title,
            date: date,
            description: description,
            body: content,
            url: url,
            image: allFields.image || null
        };
        
        news.push(newsItem);
    }
    
    console.log(`✅ Extracted ${news.length} news items with ALL fields\n`);
    return news;
}

/**
 * Extract ALL media items with ALL fields
 */
function extractAllMedia() {
    console.log('🔍 Extracting ALL media data from Framer CMS...\n');
    
    // Media items are typically images/videos referenced in the site
    // For now, we'll extract from any pages that have media references
    // This is a placeholder - actual media extraction would need to scan for images/videos
    const media = [];
    
    // TODO: Implement proper media extraction by scanning HTML for images/videos
    // For now, return empty array - user can add media manually or we can enhance this later
    
    console.log(`✅ Extracted ${media.length} media items with ALL fields\n`);
    return media;
}

// Main
const allPublications = extractAllPublications();
const allPeople = extractAllPeople();
const allNews = extractAllNews();
const allMedia = extractAllMedia();

fs.writeFileSync(
    path.join(dataDir, 'publications-all-fields.json'),
    JSON.stringify(allPublications, null, 2)
);

fs.writeFileSync(
    path.join(dataDir, 'people-all-fields.json'),
    JSON.stringify(allPeople, null, 2)
);

fs.writeFileSync(
    path.join(dataDir, 'news-all-fields.json'),
    JSON.stringify(allNews, null, 2)
);

fs.writeFileSync(
    path.join(dataDir, 'media-all-fields.json'),
    JSON.stringify(allMedia, null, 2)
);

console.log('✅ Saved to data/publications-all-fields.json');
console.log('✅ Saved to data/people-all-fields.json');
console.log('✅ Saved to data/news-all-fields.json');
console.log('✅ Saved to data/media-all-fields.json');