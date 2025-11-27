"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGameStore } from "@stores/game-store";
import { formatDisplay } from "@lib/engine/engine";
import type { Team } from "@lib/engine/engine";
import SideSwap from "./SideSwap";
import SetWin from "./SetWin";
import MatchWin from "./MatchWin";
import Screensaver from "./Screensaver";

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
  const [showSetWin, setShowSetWin] = useState(false);
  const [setWinData, setSetWinData] = useState<{
    winningTeam: Team;
    setNumber: number;
    gamesScore: string;
  } | null>(null);

  const prevTotalGamesRef = useRef(0);
  const prevTiebreakPointsRef = useRef(0);
  const prevSetsWonRef = useRef({ A: 0, B: 0 });

  // Screensaver state
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format the display using the engine
  const view = formatDisplay(state, rules);
  const isTeamAServing = state.server === 'A';

  // Determine which team is on which side
  const teamOnLeft: Team = sidesSwapped ? 'B' : 'A';
  const teamOnRight: Team = sidesSwapped ? 'A' : 'B';

  // Register activity
  const registerActivity = useCallback(() => {
    setLastActivity(Date.now());
    if (showScreensaver) {
      setShowScreensaver(false);
    }
  }, [showScreensaver]);

  // Keyboard controls
  useEffect(() => {
    if (showSideSwap || showSetWin || state.finished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      registerActivity();
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
  }, [scorePoint, undo, onReset, showSideSwap, showSetWin, teamOnLeft, teamOnRight, state.finished, registerActivity]);

  // Idle detection for screensaver (10 minutes during game)
  useEffect(() => {
    const checkIdle = () => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > 600000) { // 10 minutes
        setShowScreensaver(true);
      }
    };

    idleTimerRef.current = setInterval(checkIdle, 1000);

    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [lastActivity]);

  // Track activity on mouse movement
  useEffect(() => {
    const handleActivity = () => registerActivity();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [registerActivity]);

  // Set win detection
  useEffect(() => {
    const currentSetsWon = view.setsWon;
    
    if (currentSetsWon.A > prevSetsWonRef.current.A || currentSetsWon.B > prevSetsWonRef.current.B) {
      const winningTeam: Team = currentSetsWon.A > prevSetsWonRef.current.A ? 'A' : 'B';
      const setNumber = currentSetsWon.A + currentSetsWon.B;
      
      const completedSet = state.sets.find(s => s.completed && !prevSetsWonRef.current);
      
      let gamesScore = '';
      if (completedSet) {
        if (completedSet.tiebreak) {
          const tbA = completedSet.tiebreak.a;
          const tbB = completedSet.tiebreak.b;
          gamesScore = `${completedSet.gamesA}-${completedSet.gamesB} (${tbA}-${tbB})`;
        } else {
          gamesScore = `${completedSet.gamesA}-${completedSet.gamesB}`;
        }
      }
      
      if (!state.finished) {
        setSetWinData({ winningTeam, setNumber, gamesScore });
        setShowSetWin(true);
      }
    }
    
    prevSetsWonRef.current = currentSetsWon;
  }, [view.setsWon, state.sets, state.finished]);

  // Side swap detection
  useEffect(() => {
    if (state.finished || showSetWin) return;

    const currentSet = state.sets[state.sets.length - 1];
    
    if (currentSet.tiebreak) {
      const tiebreakPointsA = typeof view.points.A === 'string' ? parseInt(view.points.A) : 0;
      const tiebreakPointsB = typeof view.points.B === 'string' ? parseInt(view.points.B) : 0;
      const totalTiebreakPoints = tiebreakPointsA + tiebreakPointsB;

      if (totalTiebreakPoints > prevTiebreakPointsRef.current) {
        if (totalTiebreakPoints > 0 && totalTiebreakPoints % 6 === 0) {
          setShowSideSwap(true);
        }
        prevTiebreakPointsRef.current = totalTiebreakPoints;
      }
    } else {
      const totalGames = currentSet.gamesA + currentSet.gamesB;

      if (totalGames > prevTotalGamesRef.current) {
        if (totalGames % 2 === 1) {
          setShowSideSwap(true);
        }
        prevTotalGamesRef.current = totalGames;
      }

      prevTiebreakPointsRef.current = 0;
    }
  }, [state, sidesSwapped, view.points, showSetWin]);

  const handleSideSwapComplete = () => {
    setShowSideSwap(false);
    swapSides();
  };

  const handleSetWinComplete = () => {
    setShowSetWin(false);
    setSetWinData(null);
    
    prevTotalGamesRef.current = 0;
    prevTiebreakPointsRef.current = 0;
  };

  // Show screensaver if idle
  if (showScreensaver) {
    return <Screensaver onDismiss={() => setShowScreensaver(false)} />;
  }

  // Show match win if finished
  if (state.finished && state.finished.winner) {
    return <MatchWin state={state} onNewGame={onReset} />;
  }

  // Show set win screen
  if (showSetWin && setWinData) {
    return (
      <SetWin
        winningTeam={setWinData.winningTeam}
        setNumber={setWinData.setNumber}
        gamesScore={setWinData.gamesScore}
        onComplete={handleSetWinComplete}
      />
    );
  }

  // Show side swap overlay
  if (showSideSwap) {
    return <SideSwap onComplete={handleSideSwapComplete} />;
  }

  // Get data for each side based on which team is there
  // Background is fixed by SIDE, not by team
  const leftTeamData = teamOnLeft === 'A' 
    ? { name: 'TEAM A', points: view.points.A, games: view.games.A, sets: view.setsWon.A, team: 'A' as Team, isServing: isTeamAServing }
    : { name: 'TEAM B', points: view.points.B, games: view.games.B, sets: view.setsWon.B, team: 'B' as Team, isServing: !isTeamAServing };

  const rightTeamData = teamOnRight === 'A'
    ? { name: 'TEAM A', points: view.points.A, games: view.games.A, sets: view.setsWon.A, team: 'A' as Team, isServing: isTeamAServing }
    : { name: 'TEAM B', points: view.points.B, games: view.games.B, sets: view.setsWon.B, team: 'B' as Team, isServing: !isTeamAServing };

  const servingBorderColor = state.server === 'A' ? 'var(--color-team-1)' : 'var(--color-team-2)';
  
  const servingBorderSide = 
    (state.server === 'A' && !sidesSwapped) || (state.server === 'B' && sidesSwapped) 
      ? 'left' 
      : 'right';

  return (
    <div className="screen-wrapper">
      <div className="screen-content game-scoreboard-screen layout-split-50-horizontal">
        {/* Serving border */}
        <div
          className={`screen-border-serving-${servingBorderSide}`}
          style={{ borderColor: servingBorderColor }}
        />

        {/* Left Side - Always darker background */}
        <div className="tile team-1-dark game-team-side">
          <div className="game-team-name">{leftTeamData.name}</div>
          
          <div className="game-score-display">
            <div className={leftTeamData.points === 'ADV' ? 'game-score-adv' : 'game-score'}>
              {leftTeamData.points}
            </div>
          </div>

          <div className={`game-set-indicators game-set-indicators-left`}>
            {Array.from({ length: rules.setsTarget === 1 ? 1 : 2 }).map((_, i) => (
              <div
                key={i}
                className={`game-set-dot ${
                  leftTeamData.sets > i
                    ? (leftTeamData.team === 'A' ? 'game-set-dot-won-team-1' : 'game-set-dot-won-team-2')
                    : 'game-set-dot-not-won'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Side - Always lighter background */}
        <div className="tile team-2-dark game-team-side">
          <div className="game-team-name">{rightTeamData.name}</div>
          
          <div className="game-score-display">
            <div className={rightTeamData.points === 'ADV' ? 'game-score-adv' : 'game-score'}>
              {rightTeamData.points}
            </div>
          </div>

          <div className={`game-set-indicators game-set-indicators-right`}>
            {Array.from({ length: rules.setsTarget === 1 ? 1 : 2 }).map((_, i) => (
              <div
                key={i}
                className={`game-set-dot ${
                  rightTeamData.sets > i
                    ? (rightTeamData.team === 'A' ? 'game-set-dot-won-team-1' : 'game-set-dot-won-team-2')
                    : 'game-set-dot-not-won'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Games score (centered at bottom) */}
        <div className="game-games-center">
          <div>
            {leftTeamData.games} - {rightTeamData.games}
          </div>
        </div>

        {/* Point Situation Indicator - Only show SET POINT, MATCH POINT, TIE BREAK */}
        {view.statusMessage && 
         (view.statusMessage.includes('SET POINT') || 
          view.statusMessage.includes('MATCH POINT') || 
          view.statusMessage.includes('TIE') ||
          view.statusMessage.includes('BREAK')) && (
          <div className="point-situation-overlay">
            <div className="point-situation-badge">
              {view.statusMessage.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}