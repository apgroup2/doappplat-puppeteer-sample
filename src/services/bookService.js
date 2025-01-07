const puppeteer = require('puppeteer');

// Rate limiting utility
const rateLimiter = {
    lastRequest: 0,
    minDelay: 1000, // 1 second between requests
    async wait() {
        const now = Date.now();
        const timeToWait = Math.max(0, this.lastRequest + this.minDelay - now);
        if (timeToWait > 0) {
            await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
        this.lastRequest = Date.now();
    }
};

class BookService {
    constructor() {
        this.baseUrl = 'https://www.gutenberg.org';
        this.browser = null;
    }

    async initialize() {
        if (!this.browser) {
            // Add environment info logging
            console.log('Environment details:');
            console.log('- Current user:', require('os').userInfo().username);
            console.log('- Current directory:', process.cwd());
            console.log('- Chrome path exists:', require('fs').existsSync('/usr/bin/chromium-browser'));
            console.log('- Process memory:', process.memoryUsage());
            console.log('- Environment variables:', {
                PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
                CHROME_PATH: process.env.CHROME_PATH,
                NODE_ENV: process.env.NODE_ENV
            });

            const options = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-software-rasterizer',
                    '--window-size=1280,800',
                    '--user-agent=GutenbergScraper/1.0 (+https://github.com/wadewegner/doappplat-puppeteer-sample) Chromium/120.0.0.0'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
                defaultViewport: {
                    width: 1280,
                    height: 800
                }
            };

            console.log('Launching browser with options:', JSON.stringify(options, null, 2));
            this.browser = await puppeteer.launch(options);
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async searchBooks(query, page = 1) {
        await this.initialize();
        await rateLimiter.wait();

        const itemsPerPage = 24;
        const searchUrl = `${this.baseUrl}/ebooks/search/?query=${encodeURIComponent(query)}&submit_search=Go!&start_index=${(page - 1) * itemsPerPage}`;
        
        const browserPage = await this.browser.newPage();
        try {
            // Set headers to mimic a real browser and identify our bot
            await browserPage.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'X-Bot-Info': 'GutenbergScraper - A tool for searching Project Gutenberg. Contact/Issues: https://github.com/wadewegner/doappplat-puppeteer-sample'
            });

            await browserPage.setUserAgent('GutenbergScraper/1.0 (+https://github.com/wadewegner/doappplat-puppeteer-sample) Chromium/120.0.0.0');
            
            console.log(`Navigating to ${searchUrl}`);
            const response = await browserPage.goto(searchUrl, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            if (!response || !response.ok()) {
                throw new Error(`Failed to load page: ${response ? response.status() : 'no response'}`);
            }

            console.log('Page loaded successfully, starting evaluation');
            const books = await browserPage.evaluate((baseUrl) => {
                const results = [];
                const bookElements = document.querySelectorAll('.booklink');

                Array.from(bookElements).slice(0, 24).forEach(book => {
                    const titleElement = book.querySelector('.title');
                    const authorElement = book.querySelector('.subtitle');
                    const downloadCountElement = book.querySelector('.extra');

                    if (titleElement) {
                        const bookUrl = titleElement.closest('a')?.href || '';
                        const bookData = {
                            title: titleElement.textContent.trim(),
                            author: authorElement ? authorElement.textContent.trim() : 'Unknown',
                            downloads: downloadCountElement ? 
                                parseInt(downloadCountElement.textContent.match(/(\d+)/)?.[1] || '0') : 0,
                            url: bookUrl.replace(location.origin, baseUrl)
                        };
                        results.push(bookData);
                    }
                });

                return results;
            }, this.baseUrl);

            return books;

        } catch (error) {
            console.error('Error scraping books:', error);
            throw new Error('Failed to search books');
        } finally {
            await browserPage.close();
        }
    }

    async getBookDetails(bookUrl) {
        await this.initialize();
        await rateLimiter.wait();

        const browserPage = await this.browser.newPage();
        try {
            await browserPage.setUserAgent('GutenbergScraper/1.0 (Educational Project)');
            await browserPage.goto(bookUrl, { waitUntil: 'networkidle0' });

            const bookDetails = await browserPage.evaluate(() => {
                // Helper function to get text content safely
                const getTextContent = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : null;
                };

                // Helper function to extract downloads count
                const getDownloads = () => {
                    // Try the specific downloads element first
                    const downloadsElement = document.querySelector('#downloads');
                    if (downloadsElement) {
                        const match = downloadsElement.textContent.match(/(\d+)/);
                        if (match) return parseInt(match[1]);
                    }

                    // Try the more generic stats section
                    const statsElement = document.querySelector('#stats');
                    if (statsElement) {
                        const match = statsElement.textContent.match(/(\d+)\s+downloads/);
                        if (match) return parseInt(match[1]);
                    }

                    // Try looking for any text containing downloads
                    const downloadText = Array.from(document.querySelectorAll('*'))
                        .find(el => el.textContent.match(/\d+\s+downloads/));
                    if (downloadText) {
                        const match = downloadText.textContent.match(/(\d+)\s+downloads/);
                        if (match) return parseInt(match[1]);
                    }

                    return 0;
                };

                // Try multiple selectors for author
                const getAuthor = () => {
                    // First try the marcrel:aut property
                    const authorElement = document.querySelector('[property="marcrel:aut"]');
                    if (authorElement) return authorElement.textContent.trim();

                    // Then try the dcterms:creator property
                    const creatorElement = document.querySelector('[property="dcterms:creator"]');
                    if (creatorElement) return creatorElement.textContent.trim();

                    // Try to extract from title if it contains "by"
                    const title = document.querySelector('h1').textContent.trim();
                    const byMatch = title.match(/by\s+([^,]+(?:,\s+[^,]+)*)/i);
                    if (byMatch) return byMatch[1].trim();

                    // Finally, look for any element with class 'author'
                    const authorClassElement = document.querySelector('.author');
                    if (authorClassElement) return authorClassElement.textContent.trim();

                    return 'Unknown';
                };

                // Get the clean title (remove "by Author" part if present)
                const getRawTitle = () => {
                    const fullTitle = getTextContent('h1');
                    if (!fullTitle) return 'Unknown Title';
                    // Remove "by Author" part if present
                    return fullTitle.replace(/\s+by\s+[^,]+(,\s+[^,]+)*\s*$/, '').trim();
                };

                // Try to get cover image from various possible selectors
                const getCoverImage = () => {
                    // Common selectors for cover images
                    const selectors = [
                        '#cover-image img',
                        '.cover-image img',
                        'img[property="cover"]',
                        'img[alt*="cover" i]',
                        'img[src*="cover" i]'
                    ];

                    for (const selector of selectors) {
                        const img = document.querySelector(selector);
                        if (img?.src) {
                            console.log('Found cover image:', img.src);
                            return img.src;
                        }
                    }
                    
                    console.log('No cover image found');
                    return null;
                };

                return {
                    title: getRawTitle(),
                    author: getAuthor(),
                    language: getTextContent('[property="dcterms:language"]'),
                    publishDate: getTextContent('[property="dcterms:issued"]'),
                    downloads: getDownloads(),
                    coverImage: getCoverImage(),
                    subjects: Array.from(document.querySelectorAll('[property="dcterms:subject"]'))
                        .map(subject => subject.textContent.trim()),
                    formats: Array.from(document.querySelectorAll('.files .unpadded a'))
                        .map(format => ({
                            type: format.textContent.trim(),
                            url: format.href
                        }))
                };
            });

            return bookDetails;

        } catch (error) {
            console.error('Error getting book details:', error);
            throw new Error('Failed to get book details');
        } finally {
            await browserPage.close();
        }
    }
}

module.exports = new BookService(); 