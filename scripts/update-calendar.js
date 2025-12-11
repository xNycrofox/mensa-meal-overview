const fs = require('fs');
const path = require('path');
const https = require('https');

const CANTEEN_ID = 32; // Mensa Johanna
const OUTPUT_FILE = path.join(__dirname, '../mensa.ics');

// Helper to make HTTPS requests promise-based
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
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

// ICS formatting helpers
function formatICSDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function createICSEvent(dateStr, meals) {
    const date = new Date(dateStr);

    // Set time to 12:00 - 13:00 UTC
    const start = new Date(date);
    start.setUTCHours(11, 0, 0, 0); // 12:00 CET approx
    const end = new Date(date);
    end.setUTCHours(12, 0, 0, 0); // 13:00 CET approx

    const description = meals.map(m => {
        const prices = [];
        if (m.prices.Studierende) prices.push(`Stud: ${m.prices.Studierende.toFixed(2)}€`);
        if (m.prices.Bedienstete) prices.push(`Ma: ${m.prices.Bedienstete.toFixed(2)}€`);

        let notes = [];
        if (m.notes.some(n => n.includes('vegan'))) notes.push('🌱 Vegan');
        else if (m.notes.some(n => n.includes('vegetarisch'))) notes.push('🧀 Veg.');

        return `• ${m.name.replace(/\s*\([A-Z0-9,\s]+\)/g, '').trim()}\n  (${prices.join(', ')}${notes.length ? ' | ' + notes.join(', ') : ''})`;
    }).join('\\n\\n');

    return [
        'BEGIN:VEVENT',
        `DTSTART:${formatICSDate(start)}`,
        `DTEND:${formatICSDate(end)}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `UID:${dateStr}-mensa-johanna@mensa-meal-overview`,
        `SUMMARY:🍽️ Mensa Johanna`,
        `DESCRIPTION:${description}`,
        'LOCATION:Mensa Johanna, Dresden',
        'END:VEVENT'
    ].join('\r\n');
}

async function main() {
    console.log('Starting ICS generation...');

    const events = [];
    const today = new Date();

    // Fetch next 14 days
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split('T')[0];
        const url = `https://api.studentenwerk-dresden.de/openmensa/v2/canteens/${CANTEEN_ID}/days/${dateStr}/meals`;

        try {
            console.log(`Fetching ${dateStr}...`);
            const meals = await fetchJson(url);
            if (Array.isArray(meals) && meals.length > 0) {
                events.push(createICSEvent(dateStr, meals));
            }
        } catch (e) {
            console.warn(`No meals found for ${dateStr} or API error.`);
        }
    }

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Mensa Meal Overview//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Mensa Johanna Speiseplan',
        'X-WR-TIMEZONE:Europe/Berlin',
        ...events,
        'END:VCALENDAR'
    ].join('\r\n');

    fs.writeFileSync(OUTPUT_FILE, icsContent);
    console.log(`ICS file generated at ${OUTPUT_FILE}`);
}

main().catch(console.error);
