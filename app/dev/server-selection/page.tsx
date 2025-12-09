"use client";

import { useState, useEffect, useRef } from "react";

export default function ServerSelectionDevPage() {
  const ballElementRef = useRef<HTMLDivElement | null>(null);
  const ballPositionRef = useRef({ x: 50, y: 50 });
  const ballVelocityRef = useRef({ x: 0.3, y: 0.2 });
  const animationRef = useRef<number | null>(null);

  // Bouncing ball animation - Optimized for performance
  useEffect(() => {
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

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

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
        <h3 style={{ marginBottom: '1rem' }}>Server Selection</h3>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          Phase 1: Bouncing ball animation
        </p>
      </div>

      {/* Component */}
      <div className="screen-wrapper">
        <div className="screen-content screen-bordered">
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
        </div>
      </div>
    </div>
  );
}

