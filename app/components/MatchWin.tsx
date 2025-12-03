"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Team } from "@lib/engine/engine";
import type { EngineState } from "@lib/engine/engine";
import Screensaver from "./Screensaver";

interface MatchWinProps {
  state: EngineState;
  onNewGame: () => void;
}

type Slide = 0 | 1 | 2 | 3;

export default function MatchWin({ state, onNewGame }: MatchWinProps) {
  const [currentSlide, setCurrentSlide] = useState<Slide>(0);
  const [manualNavigation, setManualNavigation] = useState(false);
  const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);

  // Screensaver state
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNewGame = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setTimeout(() => onNewGame(), 0);
  }, [onNewGame]);

  // Register activity
  const registerActivity = useCallback(() => {
    setLastActivity(Date.now());
    if (showScreensaver) {
      setShowScreensaver(false);
    }
  }, [showScreensaver]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      registerActivity();
      const key = e.key.toLowerCase();
      
      if (key === 'r') {
        handleNewGame();
      } else if (key === 'q' || key === 'p') {
        // Next slide
        setManualNavigation(true);
        setCurrentSlide((prev) => (prev >= 3 ? 0 : (prev + 1) as Slide));
      } else if (key === 'a' || key === 'l') {
        // Previous slide
        setManualNavigation(true);
        setCurrentSlide((prev) => (prev <= 0 ? 3 : (prev - 1) as Slide));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleNewGame, registerActivity]);

  // Auto-cycle slides
  useEffect(() => {
    if (manualNavigation) return;

    autoSlideTimerRef.current = setTimeout(() => {
      setCurrentSlide((prev) => (prev >= 3 ? 0 : (prev + 1) as Slide));
    }, 15000); // 15 seconds per slide

    return () => {
      if (autoSlideTimerRef.current) {
        clearTimeout(autoSlideTimerRef.current);
      }
    };
  }, [currentSlide, manualNavigation]);

  // Reset manual navigation after 5 seconds
  useEffect(() => {
    if (!manualNavigation) return;

    const resetTimer = setTimeout(() => {
      setManualNavigation(false);
    }, 5000);

    return () => clearTimeout(resetTimer);
  }, [manualNavigation]);

  // Idle detection for screensaver (5 minutes on match win)
  useEffect(() => {
    const checkIdle = () => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > 300000) { // 5 minutes
        setShowScreensaver(true);
      }
    };

    idleTimerRef.current = setInterval(checkIdle, 1000);

    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [lastActivity]);

  // Track activity on mouse movement
  useEffect(() => {
    const handleActivity = () => registerActivity();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [registerActivity]);

  if (!state.finished) return null;

  // Show screensaver if idle
  if (showScreensaver) {
    return <Screensaver onDismiss={() => setShowScreensaver(false)} />;
  }

  const winner = state.finished.winner;
  const winnerName = winner === 'A' ? 'TEAM A' : 'TEAM B';
  const borderColor = winner === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';

  // Get completed sets for display
  const completedSets = state.sets.filter(s => s.completed);

  // Calculate match duration in minutes
  const matchDuration = Math.floor((Date.now() - state.stats.matchStartTime) / 60000);

  // Calculate max points for bar chart scaling
  const maxPoints = Math.max(state.stats.pointsWon.A, state.stats.pointsWon.B, 1);
  const maxServicePoints = Math.max(state.stats.servicePointsWon.A, state.stats.servicePointsWon.B, 1);

  // Generate momentum dots from point history
  const generateMomentumDots = () => {
    const totalDots = 98; // 14 columns x 7 rows
    const pointHistory = state.stats.pointHistory;
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

  return (
    <div className="screen-wrapper">
      <div className="screen-content screen-bordered" style={{ borderColor }}>
        <div className="screen-border" style={{ borderColor }} />
        
        <div className="content-centered">
          {/* Slide 0: Match Result */}
          {currentSlide === 0 && (
            <div className="match-win-content">
              <h1 className="match-win-title">{winnerName} WINS!</h1>
              
              {/* Set scores */}
              <div className="match-win-sets">
                {completedSets.map((set, index) => {
                  const setNumber = index + 1;
                  let scoreDisplay = '';
                  
                  if (set.tiebreak) {
                    // Tiebreak score
                    scoreDisplay = `${set.gamesA}-${set.gamesB} (${set.tiebreak.a}-${set.tiebreak.b})`;
                  } else {
                    // Regular set score
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
          )}

          {/* Slide 1: Game Statistics */}
          {currentSlide === 1 && (
            <div className="stats-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">GAME LENGTH</div>
                  <div className="stat-value">{matchDuration}m</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">TOTAL POINTS</div>
                  <div className="stat-value">{state.stats.totalPointsPlayed}</div>
                </div>
                <div className="stat-card stat-card-wide">
                  <div className="stat-label">POINTS WON</div>
                  <div className="stat-bars">
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(state.stats.pointsWon.B / maxPoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-2)' 
                        }} 
                      />
                      <div className="bar-value">{state.stats.pointsWon.B}</div>
                    </div>
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(state.stats.pointsWon.A / maxPoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-1)' 
                        }} 
                      />
                      <div className="bar-value">{state.stats.pointsWon.A}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 2: Match Momentum */}
          {currentSlide === 2 && (
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
          )}

          {/* Slide 3: Service Stats */}
          {currentSlide === 3 && (
            <div className="stats-content">
              <div className="stats-grid">
                <div className="stat-card stat-card-wide">
                  <div className="stat-label">SERVICE POINTS WON</div>
                  <div className="stat-bars">
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(state.stats.servicePointsWon.B / maxServicePoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-2)' 
                        }} 
                      />
                      <div className="bar-value">{state.stats.servicePointsWon.B}</div>
                    </div>
                    <div className="stat-bar">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(state.stats.servicePointsWon.A / maxServicePoints) * 85}%`, 
                          backgroundColor: 'var(--color-team-1)' 
                        }} 
                      />
                      <div className="bar-value">{state.stats.servicePointsWon.A}</div>
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">BREAKS</div>
                  <div className="stat-value-split">
                    <span style={{ color: 'var(--color-team-2)' }}>{state.stats.breaks.B}</span>
                    <span className="stat-separator">-</span>
                    <span style={{ color: 'var(--color-team-1)' }}>{state.stats.breaks.A}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">BEST STREAK</div>
                  <div 
                    className="stat-value" 
                    style={{ 
                      color: state.stats.longestStreak.team === 'A' 
                        ? 'var(--color-team-1)' 
                        : 'var(--color-team-2)' 
                    }}
                  >
                    {state.stats.longestStreak.streak}<span className="stat-label-small">PTS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation dots */}
        <div className="stats-navigation">
          <div className="stats-dots">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className={`stats-dot ${currentSlide === index ? 'active' : ''}`} />
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="match-win-footer">
          <p className="match-win-instruction">Press R for new game</p>
        </div>
      </div>
    </div>
  );
}