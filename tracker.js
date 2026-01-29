/**
 * tracker.js
 * Scrapes event data from the page and sends it to a Google Sheet.
 */

// CONFIGURATION
// REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
const GOOGLE_SCRIPT_URL = 'REPLACE_WITH_YOUR_WEB_APP_URL'; 

document.addEventListener('DOMContentLoaded', function() {
    console.log('Tracker initialized...');
    
    if (GOOGLE_SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') {
        console.warn('Please update the GOOGLE_SCRIPT_URL in tracker.js with your actual Web App URL.');
        // Don't return yet, let the code run so we can see what it WOULD extract
    }

    setTimeout(checkForUpdates, 3000); // Wait a bit for dynamic content if any
});

function checkForUpdates() {
    const region = getActiveRegion();
    const events = extractEvents(region);
    const newEvents = filterNewEvents(events);

    console.log(`Found ${events.length} events. ${newEvents.length} are new.`);

    if (newEvents.length > 0) {
        sendDataToSheet(newEvents);
    }
}

function getActiveRegion() {
    // Basic selector based on the provided HTML
    const activeBtn = document.querySelector('.button-container button.active');
    return activeBtn ? activeBtn.innerText.trim() : 'Unknown';
}

function extractEvents(region) {
    const eventCards = document.querySelectorAll('.event-card');
    const events = [];

    eventCards.forEach(card => {
        try {
            const titleEl = card.querySelector('.title');
            const hiddenDetails = card.querySelector('.event-details');
            
            if (!titleEl || !hiddenDetails) return;

            const title = titleEl.innerText.trim();
            const bannerImg = card.querySelector('img');
            const bannerUrl = bannerImg ? bannerImg.src : '';

            // Extract details from hidden div
            const ps = hiddenDetails.querySelectorAll('p');
            let start = '';
            let end = '';
            let details = '';

            ps.forEach(p => {
                const text = p.innerText;
                if (text.includes('Start:')) start = text.replace('Start:', '').trim();
                if (text.includes('End:')) end = text.replace('End:', '').trim();
                // simple details extraction (excluding the URL p tag usually at the end)
                if (!text.includes('Start:') && !text.includes('End:') && !text.includes('Banner URL:')) {
                    details += text + '\n';
                }
            });

            // Unique ID for the event to prevent duplicates
            // Using a combination of Region + Title + StartDate should be unique enough
            const id = `${region}_${title}_${start}`;

            events.push({
                id: id,
                region: region,
                title: title,
                start: start,
                end: end,
                bannerUrl: bannerUrl,
                details: details.trim()
            });

        } catch (e) {
            console.error('Error parsing card:', e);
        }
    });

    return events;
}

function filterNewEvents(events) {
    const sentEvents = JSON.parse(localStorage.getItem('sentEvents') || '[]');
    return events.filter(event => !sentEvents.includes(event.id));
}

function sendDataToSheet(events) {
    if (GOOGLE_SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') {
        alert('Data extracted but not sent. Please set the GOOGLE_SCRIPT_URL in tracker.js');
        console.log('Data to send:', events);
        return;
    }

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Important for Google Apps Script Web Apps
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(events)
    })
    .then(() => {
        console.log('Data sent successfully!');
        // Update local storage so we don't send these again
        const sentEvents = JSON.parse(localStorage.getItem('sentEvents') || '[]');
        events.forEach(e => sentEvents.push(e.id));
        localStorage.setItem('sentEvents', JSON.stringify(sentEvents));
        alert(`Sent ${events.length} new events to Google Sheet!`);
    })
    .catch(error => {
        console.error('Error sending data:', error);
    });
}
