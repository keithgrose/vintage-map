import { useState, useEffect } from 'react';
import Map, { type Location } from './components/Map';
import { Store, ShoppingBag, Heart, Calendar } from 'lucide-react';
import { auth, signInWithGoogle, logout } from './firebase';
import './index.css';

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
  
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
      fetch('/shops.json').then(res => res.ok ? res.json() : []),
      fetch('/fairs.json').then(res => res.ok ? res.json() : [])
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
        gmapsUrl: s.gmapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`
      }));
      
      const normalizedFairs: Location[] = fairs.map((f: any) => ({
        id: f.id || Math.random().toString(),
        name: f.name,
        lat: f.lat,
        lng: f.lng,
        type: 'fair',
        date: f.date,
        url: f.url,
        gmapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`
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

  const visibleLocations = locations.filter(loc => filters[loc.type]);

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

  return (
    <div className="app-container">
      <div className="sidebar glass-panel">
        <div className="sidebar-header">
          <h1>London Vintage Map</h1>
          <p>Find the best vintage, antique, and charity shops around Brockley.</p>
        </div>
        
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
        
        <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {loading ? 'Loading locations...' : `Showing ${visibleLocations.length} locations.`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: 'var(--border-glass)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user.email}</span>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.8rem', padding: '4px' }}>Sign Out</button>
          </div>
        </div>
      </div>
      
      <Map locations={visibleLocations} center={HOME_CENTER} />
    </div>
  );
}

export default App;
