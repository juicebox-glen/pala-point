"use client";

import { useEffect, useCallback, useRef } from "react";
import { useGameStore } from "@stores/game-store";

interface SideSwapProps {
  onComplete: () => void;
}

export default function SideSwap({ onComplete }: SideSwapProps) {
  const completedRef = useRef(false);
  const sidesSwapped = useGameStore((s) => s.sidesSwapped);
  const servingTeam = useGameStore((s) => s.state.server);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setTimeout(() => onComplete(), 0);
  }, [onComplete]);

  // Auto-complete after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, 10000);

    return () => clearTimeout(timer);
  }, [handleComplete]);

  // Allow skipping with any key press
  useEffect(() => {
    const handleKeyPress = () => handleComplete();

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleComplete]);

  // Determine which team is on which side BEFORE swap
  const teamAOnLeft = !sidesSwapped;
  const teamAServing = servingTeam === 'A';
  
  // Serving team circle (top position)
  const servingColor = teamAServing ? 'var(--color-team-1)' : 'var(--color-team-2)';
  const servingOnLeft = (teamAServing && teamAOnLeft) || (!teamAServing && !teamAOnLeft);
  
  // Receiving team circle (bottom position)
  const receivingColor = teamAServing ? 'var(--color-team-2)' : 'var(--color-team-1)';
  const receivingOnLeft = !servingOnLeft;

  return (
    <div className="screen-wrapper">
      <div className="screen-content screen-bordered">
        {/* Spinning swap icon */}
        <div className="side-swap-icon-bg" />
        
        {/* Player circles - Only 2 total */}
        <div className="side-swap-circles">
          {/* Serving team circle (top) */}
          <div 
            className={`side-swap-circle ${servingOnLeft ? 'side-swap-left-top' : 'side-swap-right-top'}`}
            style={{ backgroundColor: servingColor }} 
          />
          
          {/* Receiving team circle (bottom) */}
          <div 
            className={`side-swap-circle ${receivingOnLeft ? 'side-swap-left-bottom' : 'side-swap-right-bottom'}`}
            style={{ backgroundColor: receivingColor }} 
          />
        </div>
        
        {/* Text overlay */}
        <div className="content-centered">
          <div className="side-swap-text-overlay">
            <h1 className="side-swap-title">SWAP SIDES</h1>
          </div>
        </div>
      </div>
    </div>
  );
}