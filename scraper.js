const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// 1. Enter your Google Apps Script Web App URL here OR use Environment Variable
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'REPLACE_WITH_YOUR_WEB_APP_URL';

// 2. List of Regions and their URLs
const REGIONS = [
    { name: 'Pakistan', url: 'https://xv.ct.ws/event/?q=cGt8Y0d0OE1UYzJPVFkzTWpnd01ud3haamhrWXpBM1ltUmhZVGMwTkRBMk56WTNOelJsWXpRM1kyUTRNRFF4TURnM00yUXhNREprWmpCbFpXUTFPVE15WVRKbE9ERTBOVEZtTkRNeE5qQTV8S0VZMQ' },
    { name: 'India', url: 'https://xv.ct.ws/event/?q=aW5kfGFXNWtmREUzTmprMk56STRNemg4TW1NM05HVmhObUUyTmpBd01qTTJNR0UzWm1Fek9UVXdOMkpoWlRBMU9ERTBNRFF4WW1RMU5EQTNZV1JrWkRVeU1EZzRZMkV3TVRneVpEQTVOREl3WVE9PXxLRVkx' },
    { name: 'Brazil', url: 'https://xv.ct.ws/event/?q=YnJ8WW5KOE1UYzJPVFkzTWpnMk5IdzBZVGt4WlRZMk16aGtaR014WkRRM1pXVTVZalF5TTJFNU9XUXhOREJpTW1FeU5HSmlZVFEwTVROaVptRTNabUkxTnpNME5qSTBZV1UyWkdGaVlqZzN8S0VZMQ' },
    { name: 'Vietnam', url: 'https://xv.ct.ws/event/?q=dm58ZG01OE1UYzJPVFkzTWpnM01Id3haamhqT0RWbU56ZGhOelJtWkdOa1lXWm1ObUl3Wm1ReU1tSXdPREl6TlRjeVpHSmlObU5tWmpKak16STJaVFV3TmpsbFptTXpPR0kwTVdNMFpHVmh8S0VZMQ' },
    { name: 'Indonesia', url: 'https://xv.ct.ws/event/?q=aWR8YVdSOE1UYzJPVFkzTWpnNE5IeGhZVFZpTURZNU9EUm1OelExTmpZNU5HUmlNR1ZsWVRBell6azFORGt3T0RCak9XSTNNV0kwT0RSbU5qRm1NalE0WlRrME9UQmhOMkU0TVRjMlpERTV8S0VZMQ' },
    { name: 'Singapore', url: 'https://xv.ct.ws/event/?q=c2d8YzJkOE1UYzJPVFkzTWpnNU5ud3laVGcwTkRZd1pETmxZV1l3TVdNNVpHSTNOalUzWmpNMk9UQTBObVZrWkRsallXWm1OVGhtTURjM1ptTTVNalZsWWpGa01HWXlNemcxTW1FNFl6Tmt8S0VZMQ' },
    { name: 'Taiwan', url: 'https://xv.ct.ws/event/?q=dHd8ZEhkOE1UYzJPVFkzTWprd09Yd3pabVE0TUdKaE56QXhNV00yWmpWak16QTJOMlV6TkRRM1pqUmpPR1UzT0dVMk9HRmxNemc1WlRKaE9ERmlabVUxWlRoak9EQXlaakExWXpCall6UTF8S0VZMQ' },
    { name: 'Thailand', url: 'https://xv.ct.ws/event/?q=dGh8ZEdoOE1UYzJPVFkzTWpreU1YeGpNMkkzWXpBNE5qUTJaV1ZoTUdVeFpUazRPV05rWXpNMVl6Y3hZV0pqT1dKaFpUazNaRGs1WTJVeFpqVTJZbU0xTldKbVl6Z3dOV1V5TkdaaFpHUXp8S0VZMQ' }
];

// 3. How often to check for LOCAL runs (in minutes)
const CHECK_INTERVAL_MINUTES = 30;

const HISTORY_FILE = path.join(__dirname, 'history.json');

async function runScraper() {
    console.log(`\n[${new Date().toISOString()}] === STARTING SCRAPE JOB ===`);

    // Check if configuration is set
    if (GOOGLE_SCRIPT_URL.includes('REPLACE_WITH')) {
        console.error('ERROR: You must set the GOOGLE_SCRIPT_URL in scraper.js or use a GitHub Secret.');
        return;
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Loop through each region
        for (const region of REGIONS) {
            console.log(`\nChecking Region: ${region.name}...`);
            try {
                // Navigate with increased timeout
                await page.goto(region.url, { waitUntil: 'networkidle2', timeout: 60000 });

                // Extract Data
                const events = await page.evaluate((regionName) => {
                    const extracted = [];
                    const cards = document.querySelectorAll('.event-card');
                    const pageRegion = document.querySelector('.button-container .active')?.innerText || regionName;

                    cards.forEach(card => {
                        const titleEl = card.querySelector('.title');
                        const imgEl = card.querySelector('img');
                        const detailsDiv = card.querySelector('.event-details');

                        if (titleEl && detailsDiv) {
                            const title = titleEl.innerText.trim();
                            const bannerUrl = imgEl ? imgEl.src : '';

                            let start = '';
                            let end = '';
                            let detailsText = '';

                            detailsDiv.querySelectorAll('p').forEach(p => {
                                const txt = p.innerText;
                                if (txt.includes('Start:')) start = txt.replace('Start:', '').trim();
                                else if (txt.includes('End:')) end = txt.replace('End:', '').trim();
                                else if (!txt.includes('Banner URL:')) detailsText += txt + '\n';
                            });

                            const id = `${pageRegion}_${title}_${start}`.replace(/[^a-zA-Z0-9]/g, '_');

                            extracted.push({
                                id,
                                region: pageRegion,
                                title,
                                start,
                                end,
                                bannerUrl,
                                details: detailsText.trim()
                            });
                        }
                    });
                    return extracted;
                }, region.name);

                console.log(`  > Found ${events.length} events.`);

                // Filter New Events
                const history = getHistory();
                const newEvents = events.filter(e => !history.includes(e.id));

                if (newEvents.length > 0) {
                    console.log(`  > Sending ${newEvents.length} NEW events to Google Sheets...`);
                    await sendToSheet(newEvents);
                    updateHistory(newEvents);
                } else {
                    console.log('  > No new events.');
                }

                if (!process.env.CI) {
                    // Random delay between 5 to 15 seconds to be safe (local only)
                    const delay = Math.floor(Math.random() * 10000) + 5000;
                    console.log(`  > Waiting ${delay / 1000}s before next region...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    // Shorter delay for CI
                    await new Promise(r => setTimeout(r, 2000));
                }

            } catch (regionError) {
                console.error(`  > Failed to scrape ${region.name}:`, regionError.message);
            }
        }

    } catch (error) {
        console.error('Fatal Scraper Error:', error);
    } finally {
        if (browser) await browser.close();
        console.log(`[${new Date().toISOString()}] === JOB FINISHED ===`);
    }
}

// --- HELPER FUNCTIONS ---

function getHistory() {
    if (!fs.existsSync(HISTORY_FILE)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
}

function updateHistory(newEvents) {
    const history = getHistory();
    newEvents.forEach(e => {
        if (!history.includes(e.id)) {
            history.push(e.id);
        }
    });
    if (history.length > 2000) {
        history.splice(0, history.length - 2000);
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function sendToSheet(data) {
    try {
        await axios.post(GOOGLE_SCRIPT_URL, data);
    } catch (error) {
        console.error('  > Error sending to Google Sheet:', error.message);
    }
}

// --- RUNNER ---
if (process.env.SINGLE_RUN === 'true') {
    // Run ONCE and exit (for GitHub Actions)
    console.log('Running in SINGLE_RUN mode (GitHub Actions).');
    runScraper().then(() => process.exit(0));
} else {
    // Run Loop (for Local)
    console.log(`Initializing 24/7 Scraper Loop for ${REGIONS.length} regions...`);
    runScraper();
    setInterval(runScraper, CHECK_INTERVAL_MINUTES * 60 * 1000);
}
