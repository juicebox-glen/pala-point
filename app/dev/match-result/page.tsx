"use client";

import { useState, useEffect } from "react";
import type { EngineState, Team } from "@/lib/engine/engine";
import Confetti from "react-confetti";

// Mock match state
const createMockMatchState = (winner: Team, sets: Array<[number, number]>): EngineState => {
  const completedSets = sets.map((score) => ({
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
      matchStartTime: Date.now() - (25 * 60 * 1000),
      totalPointsPlayed: 67,
      pointsWon: { A: 35, B: 32 },
      servicePointsWon: { A: 22, B: 18 },
      breaks: { A: 3, B: 1 },
      longestStreak: { team: 'A', streak: 7 },
      currentStreak: { team: 'A', streak: 2 },
      pointHistory: [] as Team[],
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

export default function MatchResultDevPage() {
  const [state, setState] = useState<EngineState>(PRESET_STATES['team-a-wins-1-set']);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Get window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Trigger confetti when component mounts
  useEffect(() => {
    if (state.finished) {
      setShowConfetti(true);
      // Auto-hide after 8 seconds to let confetti animation complete naturally
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [state.finished]);

  if (!state.finished) return null;

  const winner = state.finished.winner;
  const winnerName = winner === 'A' ? 'TEAM A' : 'TEAM B';
  const borderColor = winner === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';

  // Get completed sets for display
  const completedSets = state.sets.filter(s => s.completed);

  return (
    <>
      {/* Fireworks/Confetti */}
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          colors={["#04CA95", "#BB86FC", "#D0FF14", "#FFFFFF"]}
          gravity={0.3}
          initialVelocityY={20}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 10000,
            pointerEvents: "none",
          }}
        />
      )}
      
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
        color: 'white',
        maxWidth: '300px'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Match Result (Slide 0)</h3>
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
      </div>

      {/* Component */}
      <div className="screen-wrapper">
        <div className="screen-content screen-bordered" style={{ borderColor }}>
          <div className="screen-border" style={{ borderColor }} />
          
          <div className="content-centered">
            <div className="match-win-content">
              <h1 className="match-win-title">{winnerName} WINS!</h1>
              
              {/* Set scores */}
              <div className="match-win-sets">
                {completedSets.map((set, index) => {
                  const setNumber = index + 1;
                  let scoreDisplay = '';
                  
                  if (set.tiebreak) {
                    scoreDisplay = `${set.gamesA}-${set.gamesB} (${set.tiebreak.a}-${set.tiebreak.b})`;
                  } else {
                    scoreDisplay = `${set.gamesA}-${set.gamesB}`;
                  }
                  
                  return (
                    <div key={setNumber} className="match-win-set-score">
                      {scoreDisplay}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

const buttonStyle = {
  padding: '0.5rem 1rem',
  backgroundColor: '#1E1E1F',
  color: 'white',
  border: '1px solid #333',
  borderRadius: '4px',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left' as const,
};

