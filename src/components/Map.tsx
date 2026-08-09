import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Custom icons using standard Leaflet SVG but colorized for our theme
const createCustomIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

export const icons = {
  vintage: createCustomIcon('var(--color-accent-vintage)'),
  antique: createCustomIcon('var(--color-accent-antique)'),
  charity: createCustomIcon('var(--color-accent-charity)'),
  fair: createCustomIcon('var(--color-accent-fair)')
};

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'vintage' | 'antique' | 'charity' | 'fair';
  address?: string;
  date?: string; // For fairs
  hours?: string; // For shops
  url?: string;
  gmapsUrl?: string; // For directions
}

interface MapProps {
  locations: Location[];
  center: [number, number];
}

// Component to recenter map when center changes
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate({ watch: true, enableHighAccuracy: true });
    
    map.on('locationfound', (e) => {
      setPosition(e.latlng);
    });

    return () => {
      map.stopLocate();
      map.off('locationfound');
    };
  }, [map]);

  const userIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #3B82F6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #3B82F6; position: relative;">
             <div style="position: absolute; width: 100%; height: 100%; background-color: #3B82F6; border-radius: 50%; opacity: 0.5; animation: pulse 2s infinite;"></div>
           </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

export default function Map({ locations, center }: MapProps) {
  return (
    <MapContainer 
      center={center} 
      zoom={14} 
      zoomControl={false} // We will use default zoom control but styled via CSS
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Light, readable premium tiles
      />
      <Recenter center={center} />
      <LocationMarker />
      
      {locations.map(loc => (
        <Marker 
          key={loc.id} 
          position={[loc.lat, loc.lng]} 
          icon={icons[loc.type]}
        >
          <Popup>
            <h3>{loc.name}</h3>
            {loc.type === 'fair' && loc.date && <p style={{ color: 'var(--color-accent-fair)' }}>{loc.date}</p>}
            {loc.address && <p>{loc.address}</p>}
            {loc.hours && <p style={{ color: 'var(--color-text-muted)' }}>⏱ {loc.hours}</p>}
            <p style={{ textTransform: 'capitalize', fontSize: '0.8rem', marginTop: '4px' }}>{loc.type} {loc.type === 'fair' ? '' : 'Store'}</p>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {loc.gmapsUrl && (
                <a href={loc.gmapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 'bold' }}>
                  Directions
                </a>
              )}
              {loc.url && (
                <a href={loc.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text)', textDecoration: 'underline' }}>
                  Website
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
