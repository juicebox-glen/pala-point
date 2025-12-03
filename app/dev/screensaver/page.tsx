"use client";

import Screensaver from "@/app/components/Screensaver";

export default function ScreensaverDevPage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: '1rem',
        borderRadius: '8px',
        color: 'white'
      }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Screensaver</h3>
        <p style={{ fontSize: '0.9rem', color: '#999', margin: 0 }}>
          Rotates through ad images every 5 seconds
        </p>
      </div>

      {/* Component */}
      <Screensaver onDismiss={() => console.log('Screensaver dismissed')} />
    </div>
  );
}