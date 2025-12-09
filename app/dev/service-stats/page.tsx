"use client";

import type { EngineState, Team } from "@/lib/engine/engine";

// Mock match state
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
    pointHistory: [] as Team[],
  },
});

const mockState = createMockMatchState();

export default function ServiceStatsDevPage() {
  // Calculate max service points for bar chart scaling
  const maxServicePoints = Math.max(mockState.stats.servicePointsWon.A, mockState.stats.servicePointsWon.B, 1);

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
        <h3 style={{ marginBottom: '1rem' }}>Service Stats (Slide 3)</h3>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          Service points, breaks, and best streak
        </p>
      </div>

      {/* Component */}
      <div className="screen-wrapper">
        <div className="screen-content screen-bordered">
          <div className="content-centered">
            <div className="stats-content">
              <div className="stats-grid">
                <div className="stat-card stat-card-wide">
                  <div className="stat-label">SERVICE POINTS WON</div>
                  <div className="stat-bars">
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(mockState.stats.servicePointsWon.B / maxServicePoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-2)' 
                        }} 
                      />
                      <div className="bar-value">{mockState.stats.servicePointsWon.B}</div>
                    </div>
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(mockState.stats.servicePointsWon.A / maxServicePoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-1)' 
                        }} 
                      />
                      <div className="bar-value">{mockState.stats.servicePointsWon.A}</div>
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">BREAKS</div>
                  <div className="stat-value-split">
                    <span style={{ color: 'var(--color-team-2)' }}>{mockState.stats.breaks.B}</span>
                    <span className="stat-separator">-</span>
                    <span style={{ color: 'var(--color-team-1)' }}>{mockState.stats.breaks.A}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">BEST STREAK</div>
                  <div 
                    className="stat-value" 
                    style={{ 
                      color: mockState.stats.longestStreak.team === 'A' 
                        ? 'var(--color-team-1)' 
                        : 'var(--color-team-2)' 
                    }}
                  >
                    {mockState.stats.longestStreak.streak}<span className="stat-label-small">PTS</span>
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

