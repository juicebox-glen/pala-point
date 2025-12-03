import Link from "next/link";

export default function DevIndex() {
  const screens = [
    { name: 'Setup', path: '/dev/setup', description: 'Game type selection screen' },
    { name: 'Server Announcement', path: '/dev/server', description: 'Server selection with coin toss' },
    { name: 'Game Scoreboard', path: '/dev/game', description: 'Main game screen with various states' },
    { name: 'Side Swap', path: '/dev/side-swap', description: 'Side swap overlay' },
    { name: 'Set Win', path: '/dev/set-win', description: 'Set win celebration' },
    { name: 'Match Win', path: '/dev/match-win', description: 'Match win with stats slideshow' },
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