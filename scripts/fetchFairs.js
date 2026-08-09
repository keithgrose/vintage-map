import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
// Load environment variables for local runs
dotenv.config({ path: path.join(process.cwd(), '.env') });

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Baseline fallback in case the API call fails or no events are found
const baselineFairs = [
  {
    id: 'frock-me-1',
    name: 'Frock Me! Vintage Fashion Fair',
    lat: 51.498,
    lng: -0.165,
    type: 'fair',
    date: 'Monthly (Check Website)',
    url: 'https://www.frockmevintagefashion.com/'
  },
  {
    id: 'pop-up-vintage-1',
    name: 'Pop Up Vintage Fairs London',
    lat: 51.520, 
    lng: -0.111,
    type: 'fair',
    date: 'Monthly',
    url: 'https://popupvintagefairs.co.uk/'
  },
  {
    id: 'so-last-century-1',
    name: 'So Last Century Vintage Market',
    lat: 51.439,
    lng: -0.021,
    type: 'fair',
    date: 'Check Website',
    url: 'https://solastcenturyfair.co.uk/'
  }
];

async function fetchFairs() {
  console.log('Fetching weekly fairs using Firecrawl...');
  const fairs = [...baselineFairs];

  if (!FIRECRAWL_API_KEY) {
    console.warn('No FIRECRAWL_API_KEY provided. Returning baseline fairs only.');
    saveFairs(fairs);
    return;
  }

  try {
    // Target a TimeOut London article listing the best vintage markets/fairs
    const targetUrl = 'https://www.timeout.com/london/shopping/best-vintage-shops-and-markets-in-london';
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['extract'],
        extract: {
          prompt: "Find all the vintage fairs, flea markets, car boot sales, antique markets, and vintage pop-ups mentioned on this page. Do not include permanent vintage shops, only markets, sales, and fairs.",
          schema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Name of the fair or market" },
                    date: { type: "string", description: "When it happens, e.g., 'Every Sunday', 'Monthly', 'Weekends'" },
                    lat: { type: "number", description: "Approximate latitude of the market location in London (e.g. around 51.5)" },
                    lng: { type: "number", description: "Approximate longitude of the market location in London (e.g. around -0.1)" },
                    url: { type: "string", description: "URL to the market's website if available" }
                  },
                  required: ["name", "date", "lat", "lng"]
                }
              }
            },
            required: ["events"]
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success && result.data && result.data.extract && result.data.extract.events) {
      const extractedEvents = result.data.extract.events;
      console.log(`Firecrawl successfully extracted ${extractedEvents.length} events!`);
      
      extractedEvents.forEach((event, idx) => {
        fairs.push({
          id: `fc_${idx}_${Date.now()}`,
          name: event.name,
          lat: event.lat,
          lng: event.lng,
          type: 'fair',
          date: event.date,
          url: event.url
        });
      });
    } else {
      console.log('Firecrawl request succeeded but no events were extracted. Result:', result);
    }
  } catch (error) {
    console.error('Error extracting data via Firecrawl:', error.message);
  }

  saveFairs(fairs);
}

function saveFairs(fairsData) {
  const outputPath = path.join(process.cwd(), 'public', 'fairs.json');
  fs.writeFileSync(outputPath, JSON.stringify(fairsData, null, 2));
  console.log(`Wrote ${fairsData.length} fairs data to ${outputPath}`);
}

fetchFairs();
