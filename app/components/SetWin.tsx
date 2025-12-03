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

  return (
    <div className="screen-wrapper">
      <div className="screen-content screen-bordered" style={{ borderColor }}>
        <div className="screen-border" style={{ borderColor }} />
        
        <div className="content-centered">
          <div className="set-win-content">
            <h1 className="set-win-title">{teamName} WINS SET {setNumber}</h1>
            <div className="set-win-score">{gamesScore}</div>
            <div className="set-win-countdown">{countdown}</div>
          </div>
        </div>
      </div>
    </div>
  );
}