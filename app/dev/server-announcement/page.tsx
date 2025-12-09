"use client";

import { useState } from "react";

type Team = 'A' | 'B';

export default function ServerAnnouncementDevPage() {
  const [server, setServer] = useState<Team>('A');

  const teamColor = server === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';
  const isTeamA = server === 'A';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#121212' }}>
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 1000,
        backgroundColor: 'rgba(18, 18, 18, 0.9)',
        padding: '1rem',
        borderRadius: '8px',
        color: 'white'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Server Announcement</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setServer('A')} style={buttonStyle}>Team A Serves</button>
          <button onClick={() => setServer('B')} style={buttonStyle}>Team B Serves</button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          Phase 2: Team announcement
        </p>
      </div>

      {/* Component */}
      <div className="screen-wrapper">
        <div className="screen-content screen-bordered">
          {/* Serving border (left or right half) */}
          <div
            className={`screen-border-serving-${isTeamA ? 'left' : 'right'}`}
            style={{ borderColor: teamColor }}
          />

          {/* Player circles */}
          <div className="server-announcement-player-positions">
            {isTeamA ? (
              <>
                <div
                  className="server-announcement-player-circle server-announcement-player-team-a-top"
                  style={{ backgroundColor: teamColor }}
                />
                <div
                  className="server-announcement-player-circle server-announcement-player-team-a-bottom"
                  style={{ backgroundColor: teamColor }}
                />
              </>
            ) : (
              <>
                <div
                  className="server-announcement-player-circle server-announcement-player-team-b-top"
                  style={{ backgroundColor: teamColor }}
                />
                <div
                  className="server-announcement-player-circle server-announcement-player-team-b-bottom"
                  style={{ backgroundColor: teamColor }}
                />
              </>
            )}
          </div>

          {/* Tennis ball */}
          <div
            className={`server-announcement-ball ${
              isTeamA ? 'server-announcement-ball-team-a' : 'server-announcement-ball-team-b'
            }`}
          />

          {/* Text */}
          <div className="content-centered">
            <div className="server-announcement-text-overlay">
              <h1 className="server-announcement-title">TEAM {server} TO SERVE</h1>
            </div>
            <p className="server-announcement-instruction">Game on. Press button to begin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: '#1E1E1F',
  color: 'white',
  border: '1px solid #333',
  borderRadius: '4px',
  cursor: 'pointer',
};

