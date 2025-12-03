"use client";

import { useState } from "react";
import SetWin from "@/app/components/SetWin";
import type { Team } from "@/lib/engine/engine";

type SetWinState = {
  winningTeam: Team;
  setNumber: number;
  gamesScore: string;
};

const PRESET_STATES: Record<string, SetWinState> = {
  'team-a-6-4': { winningTeam: 'A', setNumber: 1, gamesScore: '6-4' },
  'team-b-6-3': { winningTeam: 'B', setNumber: 1, gamesScore: '6-3' },
  'team-a-7-5': { winningTeam: 'A', setNumber: 2, gamesScore: '7-5' },
  'team-b-tiebreak': { winningTeam: 'B', setNumber: 1, gamesScore: '6-7 (4-7)' },
  'team-a-tiebreak': { winningTeam: 'A', setNumber: 2, gamesScore: '7-6 (7-5)' },
};

export default function SetWinDevPage() {
  const [state, setState] = useState<SetWinState>(PRESET_STATES['team-a-6-4']);

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
        color: 'white',
        maxWidth: '300px'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Set Win States</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.keys(PRESET_STATES).map((key) => (
            <button 
              key={key} 
              onClick={() => setState(PRESET_STATES[key])} 
              style={buttonStyle}
            >
              {key.replace(/-/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Component */}
      <SetWin 
        winningTeam={state.winningTeam}
        setNumber={state.setNumber}
        gamesScore={state.gamesScore}
        onComplete={() => console.log('Set win complete')}
      />
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
  width: '100%',
  textAlign: 'left' as const,
};