import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { type Location } from './Map';

interface CalendarViewProps {
  fairs: Location[];
}

export default function CalendarView({ fairs }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Function to format JS Date to YYYY-MM-DD (local)
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-CA'); // en-CA outputs YYYY-MM-DD
  };

  // Fairs with explicit dates
  const events = fairs.filter(f => f.type === 'fair' && f.next_dates && f.next_dates.length > 0);

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return events.filter(e => e.next_dates?.includes(dateStr));
  };

  const selectedEvents = getEventsForDate(selectedDate);

  return (
    <div style={{ padding: '24px', paddingTop: '80px', height: '100%', overflowY: 'auto', background: 'var(--color-bg)' }}>
      <h2 style={{ marginBottom: '16px' }}>Upcoming Fairs & Markets</h2>
      
      <div className="calendar-container glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <Calendar 
          onChange={(val) => setSelectedDate(val as Date)} 
          value={selectedDate}
          tileContent={({ date, view }) => {
            if (view === 'month') {
              const dayEvents = getEventsForDate(date);
              if (dayEvents.length > 0) {
                return (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
                    {dayEvents.map((_, i) => (
                      <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-accent-fair)' }}></div>
                    ))}
                  </div>
                );
              }
            }
            return null;
          }}
        />
      </div>

      <div className="events-list">
        <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>
          {selectedEvents.length > 0 ? `Events on ${selectedDate.toLocaleDateString()}` : 'All Upcoming Events'}
        </h3>
        
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Event</th>
                <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Date</th>
                <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(selectedEvents.length > 0 ? selectedEvents : events).length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No pop-ups or fairs scheduled.
                  </td>
                </tr>
              ) : (
                (selectedEvents.length > 0 ? selectedEvents : events).map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-accent-fair)' }}>{e.name}</td>
                    <td style={{ padding: '12px', fontSize: '0.9rem' }}>{e.next_dates?.[0] || e.date}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      {e.url && <a href={e.url} target="_blank" rel="noreferrer" style={{ color: '#3B82F6', fontSize: '0.9rem' }}>Website</a>}
                      {e.gmapsUrl && <a href={e.gmapsUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-text)', fontSize: '0.9rem', textDecoration: 'underline' }}>Directions</a>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
