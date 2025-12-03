"use client";

import SideSwap from "@/app/components/SideSwap";

export default function SideSwapDevPage() {
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
        <h3 style={{ marginBottom: '0.5rem' }}>Side Swap Overlay</h3>
        <p style={{ fontSize: '0.9rem', color: '#999' }}>
          Shows after odd games (1, 3, 5, 7...) and every 6 points in tiebreak
        </p>
      </div>

      {/* Component */}
      <SideSwap onComplete={() => console.log('Side swap complete')} />
    </div>
  );
}