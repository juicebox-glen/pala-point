"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Team } from "@lib/engine/engine";

interface SetWinProps {
  winningTeam: Team;
  setNumber: number;
  gamesScore: string;
  onComplete: () => void;
}

export default function SetWin({ winningTeam, setNumber, gamesScore, onComplete }: SetWinProps) {
  const [countdown, setCountdown] = useState(10);
  const completedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setTimeout(() => onComplete(), 0);
  }, [onComplete]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleComplete]);

  // Allow skipping with any key press
  useEffect(() => {
    const handleKeyPress = () => handleComplete();

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleComplete]);

  const teamName = winningTeam === 'A' ? 'TEAM A' : 'TEAM B';
  const borderColor = winningTeam === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';

  // Extract main score (remove tiebreak if present)
  // Format can be "6-0" or "7-6 (7-5)" - we want just "7-6"
  const mainScore = gamesScore.split(' ')[0]; // Get part before space (removes tiebreak)
  const [scoreA, scoreB] = mainScore.split('-');

  return (
    <div className="screen-wrapper">
      <div className="screen-content screen-bordered" style={{ borderColor }}>
        <div className="screen-border" style={{ borderColor }} />
        
        <div className="content-centered">
          <div className="set-win-text-overlay">
            <h1 className="set-win-title">{teamName} WINS SET {setNumber}</h1>
            <div className="set-win-score">
              <span className="set-win-score-value">{scoreA}</span>
              <span className="set-win-score-dash">-</span>
              <span className="set-win-score-value">{scoreB}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}