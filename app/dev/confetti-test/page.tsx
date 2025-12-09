"use client";

import { useState, useEffect } from "react";
import Confetti from "react-confetti";

export default function ConfettiTestPage() {
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Get window size
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset confetti every 5 seconds for testing
  useEffect(() => {
    const interval = setInterval(() => {
      setShowConfetti(false);
      setTimeout(() => {
        setShowConfetti(true);
      }, 100);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#121212',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '2rem'
    }}>
      <h1 style={{ color: 'white', fontSize: '3rem' }}>Confetti Test</h1>
      <p style={{ color: '#999', fontSize: '1.5rem' }}>
        Confetti should appear across the screen
      </p>
      
      {/* Fireworks/Confetti */}
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          colors={["#04CA95", "#BB86FC", "#D0FF14", "#FFFFFF"]}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 10000,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

