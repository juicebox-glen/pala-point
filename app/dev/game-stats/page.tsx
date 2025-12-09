"use client";

import type { EngineState, Team } from "@/lib/engine/engine";

// Mock match state
const createMockMatchState = (): EngineState => ({
  sets: [],
  currentGame: { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 },
  server: 'A',
  finished: { winner: 'A', reason: 'sets' },
  stats: {
    matchStartTime: Date.now() - (25 * 60 * 1000), // 25 minutes ago
    totalPointsPlayed: 67,
    pointsWon: { A: 35, B: 32 },
    servicePointsWon: { A: 22, B: 18 },
    breaks: { A: 3, B: 1 },
    longestStreak: { team: 'A', streak: 7 },
    currentStreak: { team: 'A', streak: 2 },
    pointHistory: [] as Team[],
  },
});

const mockState = createMockMatchState();

export default function GameStatsDevPage() {
  // Calculate match duration in minutes
  const matchDuration = Math.floor((Date.now() - mockState.stats.matchStartTime) / 60000);

  // Calculate max points for bar chart scaling
  const maxPoints = Math.max(mockState.stats.pointsWon.A, mockState.stats.pointsWon.B, 1);

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
        <h3 style={{ marginBottom: '1rem' }}>Game Statistics (Slide 1)</h3>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          Game length, total points, and points won
        </p>
      </div>

      {/* Component */}
      <div className="screen-wrapper">
        <div className="screen-content screen-bordered">
          <div className="content-centered">
            <div className="stats-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">GAME LENGTH</div>
                  <div className="stat-value">{matchDuration}m</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">TOTAL POINTS</div>
                  <div className="stat-value">{mockState.stats.totalPointsPlayed}</div>
                </div>
                <div className="stat-card stat-card-wide">
                  <div className="stat-label">POINTS WON</div>
                  <div className="stat-bars">
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(mockState.stats.pointsWon.B / maxPoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-2)' 
                        }} 
                      />
                      <div className="bar-value">{mockState.stats.pointsWon.B}</div>
                    </div>
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(mockState.stats.pointsWon.A / maxPoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-1)' 
                        }} 
                      />
                      <div className="bar-value">{mockState.stats.pointsWon.A}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

