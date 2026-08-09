import fs from 'fs';
import path from 'path';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const query = `
  [out:json][timeout:60];
  area["name"="Greater London"]->.searchArea;
  (
    node["shop"~"vintage|antiques|charity"](area.searchArea);
  );
  out body;
  >;
  out skel qt;
`;

async function fetchShops() {
  console.log('Fetching shops from Overpass API...');
  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'VintageMapBot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Process and normalize the data
    const shops = data.elements.filter(el => el.type === 'node' && el.tags).map(el => {
      let type = 'vintage';
      if (el.tags.shop === 'charity') type = 'charity';
      if (el.tags.shop === 'antiques') type = 'antique';

      return {
        id: `node_${el.id}`,
        name: el.tags.name || 'Unnamed Shop',
        lat: el.lat,
        lon: el.lon,
        type: type,
        address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' ') || undefined,
        hours: el.tags.opening_hours || undefined,
        url: el.tags.website || el.tags['contact:website'] || undefined,
        gmapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${el.lat},${el.lon}`
      };
    }).filter(shop => shop.name !== 'Unnamed Shop'); // Filter out ones without names

    console.log(`Found ${shops.length} shops.`);

    // Write to public folder
    const outputPath = path.join(process.cwd(), 'public', 'shops.json');
    fs.writeFileSync(outputPath, JSON.stringify(shops, null, 2));
    console.log(`Wrote shops data to ${outputPath}`);
  } catch (error) {
    console.error('Error fetching shops:', error);
    process.exit(1);
  }
}

fetchShops();
