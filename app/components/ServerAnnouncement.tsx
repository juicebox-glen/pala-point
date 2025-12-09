"use client";

import { useState, useEffect, useRef } from "react";
import type { Team } from "@lib/engine/engine";

interface ServerAnnouncementProps {
  servingTeam: Team;
  onComplete: () => void;
}

export default function ServerAnnouncement({ servingTeam, onComplete }: ServerAnnouncementProps) {
  const [phase, setPhase] = useState<1 | 2>(1);
  const ballElementRef = useRef<HTMLDivElement | null>(null);
  const ballPositionRef = useRef({ x: 50, y: 50 });
  const ballVelocityRef = useRef({ x: 0.3, y: 0.2 });
  const animationRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 1: Bouncing ball animation - Optimized for performance
  useEffect(() => {
    if (phase !== 1) return;

    const ballElement = ballElementRef.current;
    if (!ballElement) return;

    const animate = () => {
      // Update position directly without React state (better performance)
      let newX = ballPositionRef.current.x + ballVelocityRef.current.x;
      let newY = ballPositionRef.current.y + ballVelocityRef.current.y;

      // Bounce off edges (with 2% margin)
      if (newX <= 2 || newX >= 98) {
        ballVelocityRef.current.x = -ballVelocityRef.current.x;
        newX = newX <= 2 ? 2 : 98;
      }
      if (newY <= 2 || newY >= 94) {
        ballVelocityRef.current.y = -ballVelocityRef.current.y;
        newY = newY <= 2 ? 2 : 94;
      }

      // Update ref for next frame
      ballPositionRef.current = { x: newX, y: newY };

      // Use left/top with percentages - simpler and works correctly
      // Still using direct DOM manipulation to avoid React re-renders
      ballElement.style.left = `${newX}%`;
      ballElement.style.top = `${newY}%`;

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Switch to phase 2 after 3 seconds - STOP ANIMATION FIRST
    phaseTimerRef.current = setTimeout(() => {
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

    completeTimerRef.current = setTimeout(() => {
      onComplete();
    }, 8000);

    const handleKeyPress = () => {
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
                <h1 className="server-announcement-title server-announcement-title-selecting">
                  SELECTING<br />SERVER
                </h1>
              </div>
            </div>
            <div
              ref={ballElementRef}
              className="server-announcement-bouncing-ball"
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
                <h1 className="server-announcement-title">
                  TEAM {servingTeam}<br />TO SERVE
                </h1>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}