"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SideSwapProps {
  onComplete: () => void;
}

export default function SideSwap({ onComplete }: SideSwapProps) {
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

  return (
    <div className="screen-wrapper">
      <div className="screen-content screen-bordered">
        <div className="screen-border" style={{ borderColor: 'var(--color-accent)' }} />
        <div className="side-swap-icon-container">
          <div className="side-swap-icon">↑↓</div>
        </div>
        <div className="side-swap-circles">
          <div className="side-swap-circle side-swap-circle-1" style={{ backgroundColor: 'var(--color-team-1)' }} />
          <div className="side-swap-circle side-swap-circle-2" style={{ backgroundColor: 'var(--color-team-1)' }} />
          <div className="side-swap-circle side-swap-circle-3" style={{ backgroundColor: 'var(--color-team-2)' }} />
          <div className="side-swap-circle side-swap-circle-4" style={{ backgroundColor: 'var(--color-team-2)' }} />
        </div>
        <div className="content-centered">
          <div className="side-swap-text-overlay">
            <h1 className="side-swap-title">CHANGE ENDS</h1>
          </div>
          <div className="side-swap-countdown">{countdown}</div>
        </div>
      </div>
    </div>
  );
}