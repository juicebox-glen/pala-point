"use client";

import { useState } from "react";
import MatchWin from "@/app/components/MatchWin";
import type { EngineState, Team } from "@/lib/engine/engine";

// Mock match state with stats
const createMockMatchState = (winner: Team, sets: Array<[number, number]>): EngineState => {
  const completedSets = sets.map((score, index) => ({
    gamesA: score[0],
    gamesB: score[1],
    completed: true,
    winner: (score[0] > score[1] ? 'A' : 'B') as Team,
  }));

  return {
    sets: completedSets,
    currentGame: { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 },
    server: 'A',
    finished: { winner, reason: 'sets' },
    stats: {
      matchStartTime: Date.now() - (25 * 60 * 1000), // 25 minutes ago
      totalPointsPlayed: 67,
      pointsWon: { A: 35, B: 32 },
      servicePointsWon: { A: 22, B: 18 },
      breaks: { A: 3, B: 1 },
      longestStreak: { team: 'A', streak: 7 },
      currentStreak: { team: 'A', streak: 2 },
      pointHistory: [
        'A', 'B', 'A', 'A', 'B', 'A', 'B', 'B', 'A', 'A',
        'A', 'B', 'A', 'B', 'A', 'A', 'B', 'A', 'B', 'A',
        'B', 'A', 'A', 'B', 'A', 'A', 'A', 'B', 'A', 'B',
        'A', 'B', 'B', 'A', 'A', 'B', 'A', 'A', 'B', 'A',
        'B', 'A', 'A', 'B', 'B', 'A', 'A', 'A', 'B', 'A',
        'A', 'B', 'A', 'B', 'A', 'A', 'B', 'A', 'B', 'A',
        'A', 'B', 'A', 'A', 'B', 'A', 'A',
      ] as Team[],
    },
  };
};

const PRESET_STATES: Record<string, EngineState> = {
  'team-a-wins-1-set': createMockMatchState('A', [[6, 4]]),
  'team-b-wins-1-set': createMockMatchState('B', [[4, 6]]),
  'team-a-wins-3-sets': createMockMatchState('A', [[6, 4], [6, 3]]),
  'team-b-wins-3-sets': createMockMatchState('B', [[4, 6], [6, 3]]),
  'close-match': createMockMatchState('A', [[7, 5], [5, 7], [6, 4]]),
};

export default function MatchWinDevPage() {
  const [state, setState] = useState<EngineState>(PRESET_STATES['team-a-wins-1-set']);

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
        <h3 style={{ marginBottom: '1rem' }}>Match Win States</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
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
        <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '1rem' }}>
          Use Q/P to navigate slides or wait for auto-cycle
        </p>
      </div>

      {/* Component */}
      <MatchWin 
        state={state}
        onNewGame={() => console.log('New game requested')}
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