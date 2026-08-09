import { useState, useEffect } from 'react';
import Map, { type Location } from './components/Map';
import CalendarView from './components/CalendarView';
import { Store, ShoppingBag, Heart, Calendar, Filter, X } from 'lucide-react';
import { auth, signInWithGoogle, logout } from './firebase';
import opening_hours from 'opening_hours';
import './index.css';

// Haversine formula for distance in miles
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

function isOpenNow(hours: string | undefined) {
  if (!hours) return true; // If no hours data, assume open or don't filter out
  try {
    const oh = new opening_hours(hours);
    return oh.getState();
  } catch (e) {
    return true; // Fallback to showing it if we can't parse it
  }
}

// 36 Broxfield Road, London SE4 2AN (Approximate coords for Brockley)
const HOME_CENTER: [number, number] = [51.4601, -0.0335];

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filters, setFilters] = useState({
    vintage: true,
    antique: true,
    charity: true,
    fair: true
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // in miles, null = Any
  const [viewMode, setViewMode] = useState<'map'|'calendar'>('map');
  
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch both datasets concurrently
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}shops.json`).then(res => res.ok ? res.json() : []),
      fetch(`${import.meta.env.BASE_URL}fairs.json`).then(res => res.ok ? res.json() : [])
    ]).then(([shops, fairs]) => {
      // Normalize to Location[]
      const normalizedShops: Location[] = shops.map((s: any) => ({
        id: s.id,
        name: s.name || 'Unknown Shop',
        lat: s.lat,
        lng: s.lon, // Overpass uses lon instead of lng
        type: s.type,
        address: s.address,
        hours: s.hours,
        url: s.url,
        gmapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((s.name || 'Shop') + ' London')}`
      }));
      
      const normalizedFairs: Location[] = fairs.map((f: any) => ({
        id: f.id || Math.random().toString(),
        name: f.name,
        lat: f.lat,
        lng: f.lng,
        type: 'fair',
        date: f.date,
        next_dates: f.next_dates || [],
        url: f.url,
        gmapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ' London')}`
      }));
      
      setLocations([...normalizedShops, ...normalizedFairs]);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load map data:", err);
      setLoading(false);
    });
  }, []);

  const toggleFilter = (type: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const visibleLocations = locations.filter(loc => {
    if (!filters[loc.type as keyof typeof filters]) return false;
    
    if (searchQuery.trim() !== '') {
      if (!loc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }

    if (openNowOnly && loc.hours) {
      if (!isOpenNow(loc.hours)) return false;
    }

    if (maxDistance !== null && userPos) {
      const dist = getDistance(userPos[0], userPos[1], loc.lat, loc.lng);
      if (dist > maxDistance) return false;
    }

    return true;
  });

  if (authLoading) {
    return <div className="login-screen">Loading...</div>;
  }

  const allowedEmails = ['smith.anna0711@gmail.com', 'keithgrose@gmail.com'];

  if (!user) {
    return (
      <div className="login-screen">
        <div className="login-card glass-panel">
          <h1>London Vintage Map</h1>
          <p>Sign in with your approved Google account to access the map.</p>
          <button className="auth-button" onClick={signInWithGoogle}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  if (user && !allowedEmails.includes(user.email)) {
    return (
      <div className="login-screen">
        <div className="login-card glass-panel">
          <h1>Access Denied</h1>
          <p>Your email ({user.email}) is not authorized to view this map.</p>
          <button className="auth-button" onClick={logout}>Sign Out</button>
        </div>
      </div>
    );
  }

  let topClosest: {loc: Location, dist: number}[] = [];
  if (userPos) {
    const distances = visibleLocations.map(loc => ({
      loc,
      dist: getDistance(userPos[0], userPos[1], loc.lat, loc.lng)
    }));
    distances.sort((a, b) => a.dist - b.dist);
    topClosest = distances.slice(0, 10);
  }

  const getPlaceholderImage = (type: string) => {
    const base = import.meta.env.BASE_URL || '/';
    switch(type) {
      case 'vintage': return `${base}images/vintage.jpg`; 
      case 'antique': return `${base}images/antique.jpg`; 
      case 'charity': return `${base}images/charity.jpg`; 
      case 'fair': return `${base}images/fair.jpg`; 
      default: return `${base}images/vintage.jpg`;
    }
  };

  return (
    <div className="app-container">
      <div className="top-bar">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search for a shop..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button 
          className="icon-button"
          onClick={() => setViewMode(viewMode === 'map' ? 'calendar' : 'map')}
          title="Toggle Calendar"
        >
          <Calendar size={20} />
        </button>
        <button 
          className={`icon-button ${isFilterOpen ? 'active' : ''}`}
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          {isFilterOpen ? <X size={20} /> : <Filter size={20} />}
        </button>
      </div>

      {isFilterOpen && (
        <div className="filter-popover glass-panel">
          <div className="filter-section">
            <h3>Shop Types</h3>
            <div className="filters">
              <button 
                className={`filter-button ${filters.vintage ? 'active' : ''}`}
                onClick={() => toggleFilter('vintage')}
              >
                <div className="indicator vintage"></div>
                <Store size={18} />
                Vintage Shops
              </button>
              
              <button 
                className={`filter-button ${filters.antique ? 'active' : ''}`}
                onClick={() => toggleFilter('antique')}
              >
                <div className="indicator antique"></div>
                <ShoppingBag size={18} />
                Antique Stores
              </button>
              
              <button 
                className={`filter-button ${filters.charity ? 'active' : ''}`}
                onClick={() => toggleFilter('charity')}
              >
                <div className="indicator charity"></div>
                <Heart size={18} />
                Charity Shops
              </button>
              
              <button 
                className={`filter-button ${filters.fair ? 'active' : ''}`}
                onClick={() => toggleFilter('fair')}
              >
                <div className="indicator fair"></div>
                <Calendar size={18} />
                Weekly Fairs & Markets
              </button>
            </div>
          </div>
          
          <div className="filter-section">
            <h3>Status & Distance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={openNowOnly} 
                  onChange={(e) => setOpenNowOnly(e.target.checked)} 
                  style={{ width: '16px', height: '16px' }} 
                />
                Open Now
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem' }}>Max Distance:</label>
                <select 
                  value={maxDistance === null ? 'any' : maxDistance.toString()} 
                  onChange={(e) => setMaxDistance(e.target.value === 'any' ? null : Number(e.target.value))}
                  style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  disabled={!userPos}
                >
                  <option value="any" style={{ color: 'black' }}>Any Distance</option>
                  <option value="1" style={{ color: 'black' }}>1 Mile</option>
                  <option value="3" style={{ color: 'black' }}>3 Miles</option>
                  <option value="5" style={{ color: 'black' }}>5 Miles</option>
                </select>
                {!userPos && <span style={{ fontSize: '0.8rem', color: '#EF4444' }}>Location access required for distance</span>}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {loading ? 'Loading locations...' : `Showing ${visibleLocations.length} locations.`}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 'var(--border-glass)', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user.email}</span>
              <button onClick={logout} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.8rem', padding: '4px' }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'map' ? (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
          <Map locations={visibleLocations} center={HOME_CENTER} userLocation={userPos} />
          
          {topClosest.length > 0 && (
            <div className="bottom-carousel">
              {topClosest.map(({ loc, dist }) => (
                <div key={loc.id} className="glass-panel carousel-card">
                  <img 
                    src={getPlaceholderImage(loc.type)} 
                    alt={loc.name} 
                    className="carousel-img"
                  />
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.name}</h4>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {dist.toFixed(2)} miles away
                    </p>
                    {loc.gmapsUrl && (
                      <a href={loc.gmapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>
                        Get Directions
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <CalendarView fairs={locations} />
      )}
    </div>
  );
}

export default App;
