"use client";

import { useState } from "react";
import type { Team } from "@/lib/engine/engine";

type GameState = {
  pointsA: string;
  pointsB: string;
  gamesA: number;
  gamesB: number;
  setsA: number;
  setsB: number;
  server: Team;
  sidesSwapped: boolean;
  statusMessage?: string;
};

const PRESET_STATES: Record<string, GameState> = {
  'start': { pointsA: '0', pointsB: '0', gamesA: 0, gamesB: 0, setsA: 0, setsB: 0, server: 'A', sidesSwapped: false },
  '15-0': { pointsA: '15', pointsB: '0', gamesA: 0, gamesB: 0, setsA: 0, setsB: 0, server: 'A', sidesSwapped: false },
  '30-30': { pointsA: '30', pointsB: '30', gamesA: 2, gamesB: 1, setsA: 0, setsB: 0, server: 'B', sidesSwapped: false },
  'deuce': { pointsA: '40', pointsB: '40', gamesA: 3, gamesB: 3, setsA: 0, setsB: 0, server: 'A', sidesSwapped: false, statusMessage: 'Deuce' },
  'advantage-a': { pointsA: 'Ad', pointsB: '40', gamesA: 4, gamesB: 4, setsA: 0, setsB: 0, server: 'A', sidesSwapped: false },
  'set-point': { pointsA: '40', pointsB: '30', gamesA: 5, gamesB: 4, setsA: 0, setsB: 0, server: 'A', sidesSwapped: false, statusMessage: 'SET POINT - Team A' },
  'match-point': { pointsA: '40', pointsB: '15', gamesA: 5, gamesB: 3, setsA: 1, setsB: 0, server: 'A', sidesSwapped: false, statusMessage: 'MATCH POINT - Team A' },
  'tiebreak': { pointsA: '3', pointsB: '4', gamesA: 6, gamesB: 6, setsA: 0, setsB: 0, server: 'B', sidesSwapped: false, statusMessage: 'Tiebreak' },
  'swapped': { pointsA: '15', pointsB: '30', gamesA: 2, gamesB: 1, setsA: 0, setsB: 0, server: 'A', sidesSwapped: true },
};

export default function GameDevPage() {
  const [state, setState] = useState<GameState>(PRESET_STATES['start']);

  const teamOnLeft: Team = state.sidesSwapped ? 'B' : 'A';
  const teamOnRight: Team = state.sidesSwapped ? 'A' : 'B';

  const leftTeamData = teamOnLeft === 'A' 
    ? { name: 'TEAM A', points: state.pointsA, games: state.gamesA, sets: state.setsA, color: 'team-1-dark' }
    : { name: 'TEAM B', points: state.pointsB, games: state.gamesB, sets: state.setsB, color: 'team-2-dark' };

  const rightTeamData = teamOnRight === 'A'
    ? { name: 'TEAM A', points: state.pointsA, games: state.gamesA, sets: state.setsA, color: 'team-1-dark' }
    : { name: 'TEAM B', points: state.pointsB, games: state.gamesB, sets: state.setsB, color: 'team-2-dark' };

  const servingBorderColor = state.server === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';
  const servingBorderSide = 
    (state.server === 'A' && !state.sidesSwapped) || (state.server === 'B' && state.sidesSwapped) 
      ? 'left' 
      : 'right';

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
        <h3 style={{ marginBottom: '1rem' }}>Game States</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.keys(PRESET_STATES).map((key) => (
            <button 
              key={key} 
              onClick={() => setState(PRESET_STATES[key])} 
              style={buttonStyle}
            >
              {key.replace('-', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Game Scoreboard */}
      <div className="screen-wrapper">
        <div className="screen-content layout-split-50-horizontal">
          {/* Left Side */}
          <div className={`tile ${leftTeamData.color} game-team-side`}>
            <div className="game-team-content">
              <div className="game-team-name">{leftTeamData.name}</div>
              <div className="game-score">{leftTeamData.points}</div>
              <div className="game-games">GAMES: {leftTeamData.games}</div>
              <div className="game-set-indicators">
                {Array.from({ length: leftTeamData.sets }).map((_, i) => (
                  <div key={i} className="game-set-dot" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className={`tile ${rightTeamData.color} game-team-side`}>
            <div className="game-team-content">
              <div className="game-team-name">{rightTeamData.name}</div>
              <div className="game-score">{rightTeamData.points}</div>
              <div className="game-games">GAMES: {rightTeamData.games}</div>
              <div className="game-set-indicators">
                {Array.from({ length: rightTeamData.sets }).map((_, i) => (
                  <div key={i} className="game-set-dot" />
                ))}
              </div>
            </div>
          </div>

          {/* Serving border */}
          <div
            className={`screen-border-serving-${servingBorderSide}`}
            style={{ borderColor: servingBorderColor }}
          />

          {/* Point Situation Indicator */}
          {state.statusMessage && (
            <div className="point-situation-overlay">
              <div className="point-situation-badge">
                {state.statusMessage}
              </div>
            </div>
          )}
        </div>
      </div>
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