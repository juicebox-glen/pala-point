"use client";

import { useState } from "react";
import ServerAnnouncement from "@/app/components/ServerAnnouncement";

type Team = 'A' | 'B';

export default function ServerDevPage() {
  const [server, setServer] = useState<Team>('A');

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
        <h3 style={{ marginBottom: '1rem' }}>Server Announcement</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setServer('A')} style={buttonStyle}>Team A Serves</button>
          <button onClick={() => setServer('B')} style={buttonStyle}>Team B Serves</button>
        </div>
      </div>

      {/* Component */}
      <ServerAnnouncement servingTeam={server} onComplete={() => console.log('Complete')} />
    </div>
  );
}

const buttonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: '#1E1E1E',
  color: 'white',
  border: '1px solid #333',
  borderRadius: '4px',
  cursor: 'pointer',
};