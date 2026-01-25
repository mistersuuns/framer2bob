#!/usr/bin/env node

/**
 * Extract CMS data from Framer - downloads searchIndex JSON and extracts all data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');
const siteDir = path.join(__dirname, '../site');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Download JSON file
 */
function downloadJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Extract publications from searchIndex
 * Excludes people and news items
 */
function extractPublications(searchIndex, peopleSlugs, newsSlugs) {
    const publications = [];

    for (const [url, data] of Object.entries(searchIndex)) {
        // Publications are in /pubs-news-ppl/ and have h1 (title) and h2 (authors)
        if (url.includes('/pubs-news-ppl/') && data.h1 && data.h1.length > 0) {
            const title = data.h1[0];
            const slug = url.replace('/pubs-news-ppl/', '').replace('.html', '');

            // Skip if it's a known person
            if (peopleSlugs.includes(slug)) {
                continue;
            }

            // Skip if it's a known news item
            if (newsSlugs.includes(slug)) {
                continue;
            }

            // Skip if it's a person (short name, no year, no authors)
            const hasYear = data.p && data.p.some(p => /\b(19|20)\d{2}\b/.test(p));
            const hasAuthors = data.h2 && data.h2.some(h2 => h2.includes('‹') && h2.length > 5);
            const isShortName = title.length < 50 && !hasYear;

            if (isShortName && !hasAuthors) {
                continue; // Likely a person
            }

            // Skip news items (check title and content)
            if (title.toLowerCase().includes('grant') ||
                title.toLowerCase().includes('funding') ||
                title.toLowerCase().includes('tracking') ||
                title.toLowerCase().includes('new funding') ||
                title.toLowerCase().includes('new grant')) {
                continue;
            }

            // Must have authors to be a publication
            if (!hasAuthors) {
                continue;
            }

            const authors = data.h2[0];

            // Extract year from p tags
            let year = null;
            if (data.p) {
                for (const p of data.p) {
                    const yearMatch = p.match(/\b(19|20)\d{2}\b/);
                    if (yearMatch) {
                        year = parseInt(yearMatch[0]);
                        break;
                    }
                }
            }

            // Clean up authors
            let validAuthors = [];
            if (authors) {
                // Remove chevrons (U+2039, U+203A) and trimming
                const cleaned = authors.replace(/[\u2039\u203A]/g, '').trim();
                if (cleaned.length > 0) validAuthors = [cleaned];
            }

            publications.push({
                id: slug,
                title: title,
                slug: slug,
                description: data.description || '',
                year: year ? String(year) : null,
                authors: validAuthors,
                url: url,
                date: year ? `${year}-01-01` : null,
                category: 'publication',
                body: ''
            });
        }
    }

    return publications;
}

/**
 * Extract title/role and bio from HTML file
 * HTML is minified, so we need to search for patterns in the raw text
 */
function extractPersonDetails(htmlPath, name) {
    let title = null;
    let bio = '';

    if (!fs.existsSync(htmlPath)) {
        return { title, bio };
    }

    try {
        const html = fs.readFileSync(htmlPath, 'utf8');

        // Strategy 1: Extract from h1 tag (most reliable - this is the actual page title)
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match) {
            const h1Title = h1Match[1].trim();
            // Clean up: remove " - Banded Mongoose" or similar suffixes
            const cleaned = h1Title
                .replace(/\s*-\s*Banded Mongoose.*$/i, '')
                .replace(/\s*-\s*Mongooseproject.*$/i, '')
                .trim();
            
            // Only accept if it looks like a title (not just a name)
            // Check if it's different from the person's name and contains title-like words
            const isJustName = cleaned === name || cleaned.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/);
            const hasTitleKeywords = /professor|doctor|dr\.|phd|researcher|manager|investigator|postdoc|assistant/i.test(cleaned);
            
            if (cleaned.length > 5 && cleaned.length < 100 && 
                (!isJustName || hasTitleKeywords)) {
                title = cleaned;
            }
        }

        // Strategy 2: If no h1, try to find title near the name using keywords
        if (!title) {
            const titleKeywords = [
                'Professor of',
                'Assistant Professor',
                'Postdoc',
                'Field Manager',
                'Principal Investigator',
                'Dr.',
                'PhD',
                'Researcher'
            ];

            const nameIndex = html.indexOf(name);
            if (nameIndex !== -1) {
                // Look for text between name and bio start phrases
                const searchWindow = html.substring(nameIndex + name.length, nameIndex + name.length + 3000);

                // Try to find title keywords
                for (const keyword of titleKeywords) {
                    const keywordIndex = searchWindow.indexOf(keyword);
                    if (keywordIndex !== -1 && keywordIndex < 1000) {
                        // Extract text starting from keyword, stop at HTML tag, brace, or bio phrase
                        let titleEnd = keywordIndex + 150;

                        // Stop at specific HTML tags that usually end a title
                        const tagStop = searchWindow.substring(keywordIndex).search(/<(\/h[1-6]|div|p|span|br)/i);
                        if (tagStop !== -1) titleEnd = keywordIndex + tagStop;

                        // Stop at bio start phrases
                        for (const phrase of ['my research', 'i study', 'the project', 'our research']) {
                            const phraseIdx = searchWindow.toLowerCase().indexOf(phrase, keywordIndex);
                            if (phraseIdx !== -1 && phraseIdx < titleEnd) titleEnd = phraseIdx;
                        }

                        const extracted = searchWindow.substring(keywordIndex, titleEnd);
                        // rigorous cleaning
                        const cleaned = extracted.replace(/[<>{}[\]&;]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .replace(/class="[^"]*"/g, '')
                            .trim();

                        // Only accept if it looks like a real title
                        // Reject if it contains common description phrases (not a title)
                        const isDescription = /working in|based at|consists of|directed by|research project/i.test(cleaned);
                        const isValidTitle = cleaned.length > 5 &&
                            cleaned.length < 100 &&
                            !isDescription &&
                            !cleaned.match(/\.(woff|woff2|ttf|css|js|png|jpg|gif)/i) &&
                            !cleaned.match(/url\(|font-|display:|swap|style:|content:|meta/i) &&
                            !cleaned.includes('var(') &&
                            cleaned.match(/[A-Za-z]/);

                        if (isValidTitle) {
                            title = cleaned;
                            break;
                        }
                    }
                }
            }
        }

        // Strategy 3: Fallback - search entire HTML for title patterns but be stricter
        if (!title) {
            const titleKeywords = [
                'Professor of',
                'Assistant Professor',
                'Postdoc',
                'Field Manager',
                'Principal Investigator',
                'Dr.',
                'PhD',
                'Researcher'
            ];
            
            for (const keyword of titleKeywords) {
                const pattern = new RegExp(`\\b${keyword}[^<>{}\\[\\]]{0,60}`, 'i');
                const matches = html.match(pattern);
                if (matches && matches.length > 0) {
                    for (const match of matches) {
                        const cleaned = match.replace(/[<>{}[\]&;]/g, ' ').replace(/\s+/g, ' ').trim();
                        // Only accept if it looks like a real title
                        // Reject if it contains common description phrases (not a title)
                        const isDescription = /working in|based at|consists of|directed by|research project/i.test(cleaned);
                        const isValidTitle = cleaned.length > 10 &&
                            cleaned.length < 100 &&
                            !isDescription &&
                            !cleaned.match(/\.(woff|woff2|ttf|css|js|png|jpg|gif)/i) &&
                            !cleaned.match(/url\(|font-|display:|swap|style:/i) &&
                            cleaned.match(/^[A-Za-z\s,\.\-'()]+$/);
                        if (isValidTitle) {
                            title = cleaned;
                            break;
                        }
                    }
                    if (title) break;
                }
            }
        }

        // Extract bio - look for long text blocks after the name/title
        // Bio usually starts with phrases like "My research", "I study", "The project", etc.
        const bioStartPhrases = ['my research', 'i study', 'the project', 'our research', 'we study', 'i aim', 'my work'];

        // Find name position and search after it
        const nameIndex = html.indexOf(name);
        if (nameIndex !== -1) {
            const afterName = html.substring(nameIndex + name.length, nameIndex + 5000);

            // Look for bio start phrases
            for (const phrase of bioStartPhrases) {
                const phraseIndex = afterName.toLowerCase().indexOf(phrase);
                if (phraseIndex !== -1) {
                    // Extract text from phrase to end of paragraph or next section
                    const bioStart = phraseIndex;
                    let bioEnd = bioStart + 2000; // Default length

                    // Try to find end markers
                    const endMarkers = ['</p>', '</div>', '<h', 'Mongoose videos', '2025 BMPR'];
                    for (const marker of endMarkers) {
                        const markerIndex = afterName.indexOf(marker, bioStart);
                        if (markerIndex !== -1 && markerIndex < bioEnd) {
                            bioEnd = markerIndex;
                        }
                    }

                    const bioText = afterName.substring(bioStart, bioEnd)
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&[^;]+;/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (bioText.length > 200 && bioText.length < 2000) {
                        bio = bioText;
                        break;
                    }
                }
            }
        }

        // Fallback: find longest paragraph that contains research keywords
        if (!bio) {
            const bioKeywords = ['research', 'study', 'project', 'investigate', 'examine', 'aims', 'focus', 'behavior', 'animals'];
            const textBlocks = html.match(/>[^<>]{200,3000}</g) || [];

            const candidates = [];
            for (const block of textBlocks) {
                const text = block.replace(/[<>]/g, ' ')
                    .replace(/&[^;]+;/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (text.length > 200 &&
                    bioKeywords.some(kw => text.toLowerCase().includes(kw)) &&
                    !text.toLowerCase().includes('banded mongoose research project') &&
                    !text.toLowerCase().includes('copyright') &&
                    !text.toLowerCase().includes('all rights reserved') &&
                    !text.toLowerCase().match(/^(about|people|research themes|news|publications|contact)$/i) &&
                    text.includes('.')) {
                    candidates.push(text);
                }
            }

            if (candidates.length > 0) {
                bio = candidates.sort((a, b) => b.length - a.length)[0];
            }
        }

    } catch (e) {
        console.warn(`⚠️  Could not parse HTML for ${htmlPath}: ${e.message}`);
    }

    return { title, bio };
}

/**
 * Extract titles from People listing page
 * Titles are shown on /people page, not individual person pages
 */
function extractTitlesFromPeoplePage() {
    const titlesMap = {};
    
    try {
        // Download the People listing page
        const peoplePageUrl = 'https://mongooseproject.org/people';
        const tempFile = path.join(dataDir, 'people-page-temp.html');
        
        try {
            execSync(`curl -sL "${peoplePageUrl}" -o "${tempFile}"`, { stdio: 'pipe', encoding: 'utf8' });
        } catch (e) {
            throw new Error(`Failed to download People page: ${e.message}`);
        }
        
        if (fs.existsSync(tempFile)) {
            const html = fs.readFileSync(tempFile, 'utf8');
            
            // Strategy 1: Find h1/h4 pairs (main People section), then find closest link before each h1
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
                    // Find closest link before this h1 (within 3000 chars)
                    const before = html.substring(Math.max(0, h1Idx - 3000), h1Idx);
                    const links = Array.from(before.matchAll(/href="\.\/pubs-news-ppl\/([^"]+)"/g));
                    
                    if (links.length > 0 && title && title.length > 2 && title !== name) {
                        // Use the last (closest) link
                        const slug = links[links.length - 1][1];
                        titlesMap[slug] = title;
                    }
                }
            }
            
            // Also try h6 pattern for Alumni section - but be more careful
            // Structure: link ... h6 (name) ... h6 (separator or empty) ... h6 (title)
            const linkMatches2 = Array.from(html.matchAll(/href="\.\/pubs-news-ppl\/([^"]+)"/g));
            for (const linkMatch of linkMatches2) {
                const slug = linkMatch[1];
                if (titlesMap[slug]) continue; // Don't overwrite
                
                const linkIdx = linkMatch.index;
                const window = html.substring(linkIdx, linkIdx + 2000);
                
                // Find all h6 tags in this window
                const h6Matches = Array.from(window.matchAll(/<h6[^>]*>([^<]+)<\/h6>/g));
                const h6Texts = h6Matches.map(m => m[1].trim());
                
                if (h6Texts.length >= 3) {
                    const firstH6 = h6Texts[0]; // Name
                    const secondH6 = h6Texts[1];
                    let title = h6Texts[2]; // Usually the title
                    
                    // If second is separator, we already have title in third
                    // If second looks like a title (not a name), use it
                    if (secondH6 !== '–' && secondH6 !== '-' && secondH6.length > 2 &&
                        !secondH6.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/) && // Not just a name
                        !secondH6.includes('@')) {
                        title = secondH6;
                    }
                    
                    // Validate title - must not be a person name
                    if (title && 
                        title !== '–' && 
                        title !== '-' &&
                        title.length > 2 && 
                        title !== firstH6 &&
                        !title.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/) && // Not just "First Last"
                        !title.includes('@') &&
                        !title.includes('mailto') &&
                        (title.toLowerCase().includes('student') || 
                         title.toLowerCase().includes('professor') ||
                         title.toLowerCase().includes('researcher') ||
                         title.toLowerCase().includes('fellow') ||
                         title.toLowerCase().includes('manager') ||
                         title.toLowerCase().includes('director') ||
                         title.toLowerCase().includes('associate') ||
                         title.toLowerCase().includes('phd') ||
                         title.toLowerCase().includes('mres') ||
                         title.toLowerCase().includes('mbyres'))) {
                        titlesMap[slug] = title;
                    }
                }
            }
            
            // Clean up temp file
            fs.unlinkSync(tempFile);
        }
    } catch (e) {
        console.warn(`⚠️  Could not extract titles from People page: ${e.message}`);
    }
    
    return titlesMap;
}

/**
 * Convert slug to title if slug represents a title
 */
function slugToTitle(slug) {
    const titleSlugs = {
        'assistant-professor': 'Assistant Professor',
        'professor': 'Professor',
        'field-manager': 'Field Manager',
        'chair-of-evolutionary-population-genetics': 'Chair of Evolutionary Population Genetics'
    };
    return titleSlugs[slug] || null;
}

/**
 * Extract people from searchIndex and HTML files
 */
function extractPeople(searchIndex, siteDir) {
    const people = [];
    
    // First, extract titles from People listing page (where they actually are)
    console.log('🔍 Extracting titles from People listing page...\n');
    const titlesMap = extractTitlesFromPeoplePage();
    console.log(`✅ Found ${Object.keys(titlesMap).length} titles from People page\n`);
    
    const knownPeopleSlugs = [
        'neil-jordan', 'emma-inzani', 'graham-birch', 'nikita-bedov-panasyuk',
        'monil-khera', 'dave-seager', 'dr-michelle-hares', 'dr-harry-marshall',
        'beth-preston', 'catherine-sheppard', 'jennifer-sanderson', 'mike-cant',
        'field-manager', 'hazel-nichols', 'faye-thompson', 'professor',
        'assistant-professor', 'chair-of-evolutionary-population-genetics',
        'emma-vitikainen', 'laura-labarge', 'leela-channer'
    ];

    for (const [url, data] of Object.entries(searchIndex)) {
        // People are in /pubs-news-ppl/ and have short h1 (name) without year
        if (url.includes('/pubs-news-ppl/') && data.h1 && data.h1.length > 0) {
            const name = data.h1[0];
            const slug = url.replace('/pubs-news-ppl/', '').replace('.html', '');

            // Check if it's a person:
            // 1. Known person slug
            // 2. OR short name (< 50 chars), no year in p tags, not a long publication title
            const hasYear = data.p && data.p.some(p => /\b(19|20)\d{2}\b/.test(p));
            const isLongTitle = name.length > 80;
            const isNews = name.toLowerCase().includes('grant') ||
                name.toLowerCase().includes('funding') ||
                name.toLowerCase().includes('tracking') ||
                name.toLowerCase().includes('new funding') ||
                name.toLowerCase().includes('new grant');
            const hasAuthors = data.h2 && data.h2.some(h2 => h2.includes('‹') || h2.includes('›'));

            const isKnownPerson = knownPeopleSlugs.includes(slug);
            const looksLikePerson = !hasYear && !isLongTitle && !isNews && name.length < 50 && !hasAuthors;

            if (isKnownPerson || looksLikePerson) {
                // Try to extract title and bio from HTML file
                const htmlPath = path.join(siteDir, 'pubs-news-ppl', `${slug}.html`);
                const { title: htmlTitle, bio } = extractPersonDetails(htmlPath, name);
                
                // Prioritize title from People listing page (most accurate)
                // Fall back to slug-to-title mapping, then HTML extraction
                const slugTitle = slugToTitle(slug);
                const title = titlesMap[slug] || slugTitle || htmlTitle;


                people.push({
                    id: slug,
                    name: name,
                    slug: slug,
                    title: title || null, // Only set title if found, don't use fallback
                    description: data.description || '',
                    content: bio,
                    url: url,
                    email: null
                });
            }
        }
    }

    return people;
}

/**
 * Extract news from searchIndex
 */
function extractNews(searchIndex) {
    const news = [];

    for (const [url, data] of Object.entries(searchIndex)) {
        // News items are in /pubs-news-ppl/ and have news-like titles
        if (url.includes('/pubs-news-ppl/') && data.h1 && data.h1.length > 0) {
            const title = data.h1[0];
            const slug = url.replace('/pubs-news-ppl/', '').replace('.html', '');

            // Check if it's news
            const isNews = title.toLowerCase().includes('grant') ||
                title.toLowerCase().includes('funding') ||
                title.toLowerCase().includes('tracking') ||
                title.toLowerCase().includes('new funding') ||
                title.toLowerCase().includes('new grant');

            if (isNews) {
                // Extract date from p tags
                let date = null;
                if (data.p) {
                    for (const p of data.p) {
                        const dateMatch = p.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
                        if (dateMatch) {
                            date = dateMatch[1].replace(/\//g, '-');
                            break;
                        }
                    }
                }

                news.push({
                    id: slug,
                    title: title,
                    slug: slug,
                    description: data.description || '',
                    content: '',
                    url: url,
                    date: date
                });
            }
        }
    }

    return news;
}

// Main extraction
console.log('🔍 Downloading Framer searchIndex...\n');

const searchIndexUrl = 'https://framerusercontent.com/sites/4nPRg3hC3Keb52fPYFU5qT/searchIndex-bqgNGwXnRph4.json';
const localSearchIndexPath = path.join(dataDir, 'searchIndex.json');

let searchIndex;

// Try to download using curl (more reliable than Node https on macOS)
try {
    execSync(`curl -s "${searchIndexUrl}" -o "${localSearchIndexPath}"`, { stdio: 'pipe' });
    if (fs.existsSync(localSearchIndexPath) && fs.statSync(localSearchIndexPath).size > 0) {
        searchIndex = JSON.parse(fs.readFileSync(localSearchIndexPath, 'utf8'));
        console.log(`✅ Downloaded searchIndex (${Object.keys(searchIndex).length} entries)\n`);
    } else {
        throw new Error('Downloaded file is empty');
    }
} catch (error) {
    // Fallback: try local file if download fails
    if (fs.existsSync(localSearchIndexPath)) {
        console.log('⚠️  Download failed, using local searchIndex.json...\n');
        searchIndex = JSON.parse(fs.readFileSync(localSearchIndexPath, 'utf8'));
        console.log(`✅ Loaded local searchIndex (${Object.keys(searchIndex).length} entries)\n`);
    } else {
        console.error(`❌ Error: Could not download or find searchIndex.json`);
        console.error(`   Download error: ${error.message}`);
        console.error(`   Local path: ${localSearchIndexPath}`);
        process.exit(1);
    }
}

try {

    // Extract in order: people first, then news, then publications (excluding the others)
    const people = extractPeople(searchIndex, siteDir);
    const news = extractNews(searchIndex);
    const peopleSlugs = people.map(p => p.slug);
    const newsSlugs = news.map(n => n.slug);
    const publications = extractPublications(searchIndex, peopleSlugs, newsSlugs);

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
} catch (error) {
    console.error('❌ Error processing local searchIndex:', error.message);
    process.exit(1);
}
