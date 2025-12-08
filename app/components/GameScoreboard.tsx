"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGameStore } from "@stores/game-store";
import { formatDisplay } from "@lib/engine/engine";
import type { Team } from "@lib/engine/engine";
import SideSwap from "./SideSwap";
import SetWin from "./SetWin";
import MatchWin from "./MatchWin";
import Screensaver from "./Screensaver";
import { writeGameState } from "@/lib/state-writer";

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
  const matchStartTime = useGameStore((s) => s.matchStartTime);
  const courtId = useGameStore((s) => s.courtId);

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
  const isUndoingRef = useRef(false);
  const matchSavedRef = useRef(false);

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
  }, []);

  // Handle screensaver dismissal - must reset activity timer
  const handleScreensaverDismiss = useCallback(() => {
    setLastActivity(Date.now()); // CRITICAL: Reset timer when exiting screensaver
    setShowScreensaver(false);
  }, []);

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
      } else       if (key === 'a') {
        isUndoingRef.current = true;
        undo();
      } else if (key === 'r') {
        onReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scorePoint, undo, onReset, showSideSwap, showSetWin, teamOnLeft, teamOnRight, state.finished, registerActivity]);

  // Idle detection for screensaver (30 seconds of inactivity)
  useEffect(() => {
    const checkIdle = () => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > 30000) { // 30 seconds
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
      
      // Find the most recently completed set (last one in array that is completed)
      const completedSet = [...state.sets].reverse().find(s => s.completed);
      
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
    
    // Never show swap overlay when undoing - undo should restore state silently
    const wasUndoing = isUndoingRef.current;
    if (wasUndoing) {
      // Reset the flag now that we've detected it
      isUndoingRef.current = false;
      // Still update refs to current values for correct tracking
      const currentSet = state.sets[state.sets.length - 1];
      if (currentSet.tiebreak) {
        const tiebreakPointsA = currentSet.tiebreak.a;
        const tiebreakPointsB = currentSet.tiebreak.b;
        prevTiebreakPointsRef.current = tiebreakPointsA + tiebreakPointsB;
      } else {
        prevTotalGamesRef.current = currentSet.gamesA + currentSet.gamesB;
        prevTiebreakPointsRef.current = 0;
      }
      return;
    }

    const currentSet = state.sets[state.sets.length - 1];
    
    if (currentSet.tiebreak) {
      // Read tie-break points directly from state
      const tiebreakPointsA = currentSet.tiebreak.a;
      const tiebreakPointsB = currentSet.tiebreak.b;
      const totalTiebreakPoints = tiebreakPointsA + tiebreakPointsB;

      // Check if we're at a swap condition (every 6 points)
      const isAtSwapCondition = totalTiebreakPoints > 0 && totalTiebreakPoints % 6 === 0;
      
      // Show swap if:
      // 1. We're at a swap condition, AND
      // 2. The total points changed (handles both forward and undo/re-score cases)
      // 3. We're NOT undoing (checked above)
      if (isAtSwapCondition && totalTiebreakPoints !== prevTiebreakPointsRef.current) {
        setShowSideSwap(true);
      }
      
      // Always update ref to current value (ensures undo works correctly)
      prevTiebreakPointsRef.current = totalTiebreakPoints;
    } else {
      const totalGames = currentSet.gamesA + currentSet.gamesB;
      
      // Check if we're at a swap condition (odd-numbered games)
      const isAtSwapCondition = totalGames % 2 === 1;
      
      // Show swap if:
      // 1. We're at a swap condition, AND
      // 2. The total games changed (handles both forward and undo/re-score cases)
      // 3. We're NOT undoing (checked above)
      if (isAtSwapCondition && totalGames !== prevTotalGamesRef.current) {
        setShowSideSwap(true);
      }
      
      // Always update ref to current value (ensures undo works correctly)
      prevTotalGamesRef.current = totalGames;
      prevTiebreakPointsRef.current = 0;
    }
  }, [state, sidesSwapped, view.points, showSetWin]);

  const handleSideSwapComplete = () => {
    setShowSideSwap(false);
    // Update sidesSwapped state immediately when swap completes
    // This ensures the state is correct for future undo operations
    swapSides();
  };

  const handleSetWinComplete = () => {
    setShowSetWin(false);
    setSetWinData(null);
    
    prevTotalGamesRef.current = 0;
    prevTiebreakPointsRef.current = 0;
  };

  // Reset matchSavedRef when a new game starts (state is not finished)
  useEffect(() => {
    if (!state.finished) {
      matchSavedRef.current = false;
    }
  }, [state.finished]);

  // Write game state when score changes
  useEffect(() => {
    if (state.finished) return; // Handled by finished state effect
    
    // Detect if it's Quick Play (default config: 1 set, advantage, tiebreak)
    const isQuickPlay = rules.scoringSystem === 'standard' &&
      rules.setsTarget === 1 &&
      rules.deuceRule === 'advantage' &&
      rules.setTieRule === 'tiebreak';
    
    const gameMode: 'quick-play' | 'custom' = isQuickPlay ? 'quick-play' : 'custom';
    
    writeGameState({
      court_state: 'in_play',
      current_score: {
        teamA: view.games.A,
        teamB: view.games.B
      },
      game_mode: gameMode
    });
  }, [view.games.A, view.games.B, state.finished, rules.scoringSystem, rules.setsTarget, rules.deuceRule, rules.setTieRule]);

  // Write finished state and save match when game ends
  useEffect(() => {
    if (state.finished && state.finished.winner && !matchSavedRef.current) {
      matchSavedRef.current = true; // Prevent duplicate saves
      
      // Detect if it's Quick Play (default config: 1 set, advantage, tiebreak)
      const isQuickPlay = rules.scoringSystem === 'standard' &&
        rules.setsTarget === 1 &&
        rules.deuceRule === 'advantage' &&
        rules.setTieRule === 'tiebreak';
      
      const gameMode: 'quick-play' | 'custom' = isQuickPlay ? 'quick-play' : 'custom';
      
      const finalScore = {
        teamA: view.games.A,
        teamB: view.games.B
      };
      
      writeGameState({
        court_state: 'finished',
        current_score: finalScore,
        game_mode: gameMode
      });

      // Save match to Supabase
      async function saveMatch() {
        if (!courtId) {
          console.error('COURT_ID not configured - match not saved');
          return;
        }

        const endTime = new Date().toISOString();
        
        // Calculate duration
        const durationSeconds = matchStartTime 
          ? Math.round((new Date(endTime).getTime() - new Date(matchStartTime).getTime()) / 1000)
          : null;

        // Determine if this is a 1-set or 3-set match
        // setsTarget: 1 = 1-set match, setsTarget: 2 = 3-set match (best of 3)
        const is3SetMatch = rules.scoringSystem === 'standard' && 
          'setsTarget' in rules && 
          (rules as { setsTarget: number }).setsTarget === 2;
        
        let team1Score: number;
        let team2Score: number;
        let lastSet: any = null;
        
        if (is3SetMatch) {
          // For 3-set matches: save sets won (2-1, 2-0, etc.)
          team1Score = view.setsWon.A ?? 0;
          team2Score = view.setsWon.B ?? 0;
        } else {
          // For 1-set matches: save game scores (6-4, 7-6, etc.)
          const lastSetIndex = state.sets.length - 1;
          lastSet = state.sets[lastSetIndex];
          team1Score = lastSet?.gamesA ?? 0;
          team2Score = lastSet?.gamesB ?? 0;
        }

        console.log('=== MATCH SAVE DEBUG ===');
        console.log('Court ID:', courtId);
        console.log('Game mode:', gameMode);
        console.log('Match start time:', matchStartTime);
        console.log('Current state:', state);
        console.log('Rules:', rules);
        console.log('Last set:', lastSet);
        console.log('Team 1 score:', team1Score);
        console.log('Team 2 score:', team2Score);
        console.log('Duration seconds:', durationSeconds);
        console.log('Payload:', JSON.stringify({
          court_id: courtId,
          mode: gameMode,
          team1_score: team1Score,
          team2_score: team2Score,
          duration_seconds: durationSeconds,
          started_at: matchStartTime,
          ended_at: endTime
        }, null, 2));
        console.log('======================');

        try {
          const response = await fetch('/api/save-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              court_id: courtId,
              mode: gameMode,
              team1_score: team1Score,
              team2_score: team2Score,
              duration_seconds: durationSeconds,
              started_at: matchStartTime,
              ended_at: endTime
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save match');
          }

          console.log('Match saved successfully');
        } catch (error) {
          console.error('Failed to save match:', error);
          // Don't block the game - continue showing win screen even if save fails
        }
      }

      saveMatch();
    }
  }, [state.finished, view.games.A, view.games.B, view.setsWon.A, view.setsWon.B, rules.scoringSystem, rules.setsTarget, rules.deuceRule, rules.setTieRule, matchStartTime, courtId]);

  // Show screensaver if idle
  if (showScreensaver) {
    return <Screensaver onDismiss={handleScreensaverDismiss} />;
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
        {/* Tie-break indicator */}
        {view.flags.tiebreak && (
          <div className="tiebreak-indicator" style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFA500',
            color: '#000',
            padding: '10px 30px',
            borderRadius: '8px',
            fontSize: '24px',
            fontWeight: 'bold',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            TIE-BREAK
          </div>
        )}

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