"use client";

import type { EngineState, Team } from "@/lib/engine/engine";

// Mock match state with point history
const createMockMatchState = (): EngineState => ({
  sets: [],
  currentGame: { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 },
  server: 'A',
  finished: { winner: 'A', reason: 'sets' },
  stats: {
    matchStartTime: Date.now() - (25 * 60 * 1000),
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
});

const mockState = createMockMatchState();

// Generate momentum dots from point history
const generateMomentumDots = () => {
  const totalDots = 50; // 10 columns x 5 rows to match design
  const pointHistory = mockState.stats.pointHistory;
  const totalPoints = pointHistory.length;

  if (totalPoints === 0) {
    return Array(totalDots).fill('neutral');
  }

  const bins = [];
  const pointsPerBin = Math.max(1, Math.ceil(totalPoints / totalDots));

  for (let i = 0; i < totalDots; i++) {
    const startIdx = i * pointsPerBin;
    const endIdx = Math.min(startIdx + pointsPerBin, totalPoints);

    if (startIdx >= totalPoints) {
      bins.push('neutral');
      continue;
    }

    let teamACount = 0;
    let teamBCount = 0;

    for (let j = startIdx; j < endIdx; j++) {
      if (pointHistory[j] === 'A') teamACount++;
      else if (pointHistory[j] === 'B') teamBCount++;
    }

    if (teamACount > teamBCount) {
      bins.push('team-a');
    } else if (teamBCount > teamACount) {
      bins.push('team-b');
    } else {
      if (endIdx > startIdx) {
        bins.push(pointHistory[endIdx - 1] === 'A' ? 'team-a' : 'team-b');
      } else {
        bins.push('neutral');
      }
    }
  }

  return bins;
};

const momentumDots = generateMomentumDots();

export default function MatchMomentumDevPage() {
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
        <h3 style={{ marginBottom: '1rem' }}>Match Momentum (Slide 2)</h3>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          Visual representation of match flow
        </p>
      </div>

      {/* Component */}
      <div className="screen-wrapper">
        <div className="screen-content screen-bordered">
          <div className="content-centered">
            <div className="stats-content">
              <h2 className="stats-title">MATCH MOMENTUM</h2>
              <div className="momentum-grid">
                {momentumDots.map((type, i) => (
                  <div
                    key={i}
                    className={`momentum-dot ${type}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

