"use client";

import { useState, useEffect, useRef } from "react";
import type { Team } from "@lib/engine/engine";

interface ServerAnnouncementProps {
  servingTeam: Team;
  onComplete: () => void;
}

export default function ServerAnnouncement({ servingTeam, onComplete }: ServerAnnouncementProps) {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const ballVelocityRef = useRef({ x: 2, y: 1.5 });
  const animationRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 1: Bouncing ball animation
  useEffect(() => {
    if (phase !== 1) return;

    const animate = () => {
      setBallPosition((prev) => {
        let newX = prev.x + ballVelocityRef.current.x;
        let newY = prev.y + ballVelocityRef.current.y;

        // Bounce off edges (with 2% margin)
        if (newX <= 2 || newX >= 98) {
          ballVelocityRef.current.x = -ballVelocityRef.current.x;
          newX = newX <= 2 ? 2 : 98;
        }
        if (newY <= 2 || newY >= 94) {
          ballVelocityRef.current.y = -ballVelocityRef.current.y;
          newY = newY <= 2 ? 2 : 94;
        }

        return { x: newX, y: newY };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Switch to phase 2 after 3 seconds - STOP ANIMATION FIRST
    phaseTimerRef.current = setTimeout(() => {
      console.log('Stopping animation and switching to phase 2');
      
      // CRITICAL: Cancel animation BEFORE state update
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Use setTimeout to ensure animation is stopped
      setTimeout(() => {
        setPhase(2);
      }, 0);
      
    }, 3000);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
      }
    };
  }, [phase]);

  // Phase 2: Auto-complete after 8 seconds (or any key press)
  useEffect(() => {
    if (phase !== 2) return;

    console.log('Phase 2 started');

    completeTimerRef.current = setTimeout(() => {
      console.log('Auto-completing announcement');
      onComplete();
    }, 8000);

    const handleKeyPress = () => {
      console.log('Key pressed, completing announcement');
      onComplete();
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current);
      }
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [phase, onComplete]);

  const teamColor = servingTeam === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';
  const isTeamA = servingTeam === 'A';

  return (
    <div className="screen-wrapper">
      <div className="screen-content screen-bordered">
        {/* Phase 1: Selecting Server */}
        {phase === 1 && (
          <>
            <div className="content-centered">
              <div className="server-announcement-text-overlay">
                <h1 className="server-announcement-title">SELECTING SERVER</h1>
              </div>
            </div>
            <div
              className="server-announcement-bouncing-ball"
              style={{
                left: `${ballPosition.x}%`,
                top: `${ballPosition.y}%`,
              }}
            />
          </>
        )}

        {/* Phase 2: Team Announcement */}
        {phase === 2 && (
          <>
            {/* Serving border (left or right half) */}
            <div
              className={`screen-border-serving-${isTeamA ? 'left' : 'right'}`}
              style={{ borderColor: teamColor }}
            />

            {/* Player circles */}
            <div className="server-announcement-player-positions">
              {isTeamA ? (
                <>
                  <div
                    className="server-announcement-player-circle server-announcement-player-team-a-top"
                    style={{ backgroundColor: teamColor }}
                  />
                  <div
                    className="server-announcement-player-circle server-announcement-player-team-a-bottom"
                    style={{ backgroundColor: teamColor }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="server-announcement-player-circle server-announcement-player-team-b-top"
                    style={{ backgroundColor: teamColor }}
                  />
                  <div
                    className="server-announcement-player-circle server-announcement-player-team-b-bottom"
                    style={{ backgroundColor: teamColor }}
                  />
                </>
              )}
            </div>

            {/* Tennis ball */}
            <div
              className={`server-announcement-ball ${
                isTeamA ? 'server-announcement-ball-team-a' : 'server-announcement-ball-team-b'
              }`}
            />

            {/* Text */}
            <div className="content-centered">
              <div className="server-announcement-text-overlay">
                <h1 className="server-announcement-title">TEAM {servingTeam} TO SERVE</h1>
              </div>
              <p className="server-announcement-instruction">Game on. Press button to begin</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}