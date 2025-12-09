import Link from "next/link";

export default function DevIndex() {
  const screens = [
    { name: 'Setup', path: '/dev/setup', description: 'Game type selection screen' },
    { name: 'Server Selection', path: '/dev/server-selection', description: 'Phase 1: Selecting server with bouncing ball' },
    { name: 'Server Announcement', path: '/dev/server-announcement', description: 'Phase 2: Team serves first announcement' },
    { name: 'Game Scoreboard', path: '/dev/game', description: 'Main game screen with various states' },
    { name: 'Side Swap', path: '/dev/side-swap', description: 'Side swap overlay' },
    { name: 'Set Win', path: '/dev/set-win', description: 'Set win celebration' },
    { name: 'Match Result', path: '/dev/match-result', description: 'Match win screen (Slide 0)' },
    { name: 'Game Statistics', path: '/dev/game-stats', description: 'Game stats analytics (Slide 1)' },
    { name: 'Match Momentum', path: '/dev/match-momentum', description: 'Match momentum visualization (Slide 2)' },
    { name: 'Service Stats', path: '/dev/service-stats', description: 'Service statistics (Slide 3)' },
    { name: 'Screensaver', path: '/dev/screensaver', description: 'Advertising screensaver' },
  ];

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: '#121212',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ marginBottom: '2rem' }}>V3 Screen Development</h1>
      <p style={{ marginBottom: '2rem', color: '#999' }}>
        Isolated screens for design iteration and testing
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {screens.map((screen) => (
          <Link 
            key={screen.path}
            href={screen.path}
            style={{
              padding: '1.5rem',
              backgroundColor: '#1E1E1E',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'white',
              border: '1px solid #333',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              {screen.name}
            </div>
            <div style={{ color: '#999', fontSize: '0.9rem' }}>
              {screen.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}