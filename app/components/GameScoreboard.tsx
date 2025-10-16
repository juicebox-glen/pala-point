"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@stores/game-store";
import { formatDisplay } from "@lib/engine/engine";
import type { Team } from "@lib/engine/engine";
import SideSwap from "./SideSwap";

interface GameScoreboardProps {
  onReset: () => void;
}

export default function GameScoreboard({ onReset }: GameScoreboardProps) {
  const state = useGameStore((s) => s.state);
  const rules = useGameStore((s) => s.rules);
  const scorePoint = useGameStore((s) => s.scorePoint);
  const undo = useGameStore((s) => s.undo);
  const sidesSwapped = useGameStore((s) => s.sidesSwapped);
  const swapSides = useGameStore((s) => s.swapSides);

  const [showSideSwap, setShowSideSwap] = useState(false);
  const prevTotalGamesRef = useRef(0);
  const prevTiebreakPointsRef = useRef(0);

  // Format the display using the engine
  const view = formatDisplay(state, rules);
  const isTeamAServing = state.server === 'A';

  // Determine which team is on which side
  const teamOnLeft: Team = sidesSwapped ? 'B' : 'A';
  const teamOnRight: Team = sidesSwapped ? 'A' : 'B';

  // Keyboard controls
  useEffect(() => {
    if (showSideSwap) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (key === 'q') {
        scorePoint(teamOnLeft);
      } else if (key === 'p') {
        scorePoint(teamOnRight);
      } else if (key === 'a') {
        undo();
      } else if (key === 'r') {
        onReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scorePoint, undo, onReset, showSideSwap, teamOnLeft, teamOnRight]);

  // Side swap detection
  useEffect(() => {
    if (state.finished) return;

    const currentSet = state.sets[state.sets.length - 1];
    
    // Check if we're in a tiebreak
    if (currentSet.tiebreak) {
      const tiebreakPointsA = typeof view.points.A === 'string' ? parseInt(view.points.A) : 0;
      const tiebreakPointsB = typeof view.points.B === 'string' ? parseInt(view.points.B) : 0;
      const totalTiebreakPoints = tiebreakPointsA + tiebreakPointsB;

      // Tiebreak side swap: every 6 points (at 6, 12, 18, etc.)
      if (totalTiebreakPoints > prevTiebreakPointsRef.current) {
        if (totalTiebreakPoints > 0 && totalTiebreakPoints % 6 === 0) {
          setShowSideSwap(true);
        }
        prevTiebreakPointsRef.current = totalTiebreakPoints;
      }
    } else {
      // Regular game side swap: after odd-numbered games
      const totalGames = currentSet.gamesA + currentSet.gamesB;

      if (totalGames > prevTotalGamesRef.current) {
        if (totalGames % 2 === 1) {
          setShowSideSwap(true);
        }
        prevTotalGamesRef.current = totalGames;
      }

      // Reset tiebreak counter when not in tiebreak
      prevTiebreakPointsRef.current = 0;
    }
  }, [state, sidesSwapped, view.points]);

  const handleSideSwapComplete = () => {
    setShowSideSwap(false);
    swapSides();
  };

  if (showSideSwap) {
    return <SideSwap onComplete={handleSideSwapComplete} />;
  }

  // Get data for each side based on which team is there
  const leftTeamData = teamOnLeft === 'A' 
    ? { name: 'TEAM A', points: view.points.A, games: view.games.A, sets: view.setsWon.A, color: 'team-1-dark', isServing: isTeamAServing }
    : { name: 'TEAM B', points: view.points.B, games: view.games.B, sets: view.setsWon.B, color: 'team-2-dark', isServing: !isTeamAServing };

  const rightTeamData = teamOnRight === 'A'
    ? { name: 'TEAM A', points: view.points.A, games: view.games.A, sets: view.setsWon.A, color: 'team-1-dark', isServing: isTeamAServing }
    : { name: 'TEAM B', points: view.points.B, games: view.games.B, sets: view.setsWon.B, color: 'team-2-dark', isServing: !isTeamAServing };

  const servingBorderColor = state.server === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';
  
  const servingBorderSide = 
    (state.server === 'A' && !sidesSwapped) || (state.server === 'B' && sidesSwapped) 
      ? 'left' 
      : 'right';

  return (
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
      </div>
    </div>
  );
}