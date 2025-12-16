"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ServerAnnouncement from "../components/ServerAnnouncement";
import GameScoreboard from "../components/GameScoreboard";
import { useGameStore } from "@stores/game-store";
import { writeGameState } from "@/lib/state-writer";

type GamePhase = 'server-announcement' | 'playing';

export default function GamePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<GamePhase>('server-announcement');
  const reset = useGameStore((s) => s.reset);
  const state = useGameStore((s) => s.state);
  const rules = useGameStore((s) => s.rules);
  const courtId = useGameStore((s) => s.courtId);
  const matchStartTime = useGameStore((s) => s.matchStartTime);
  const setMatchId = useGameStore((s) => s.setMatchId);

  const handleServerAnnouncementComplete = () => {
    setPhase('playing');
  };

  // Write state and create match when game phase changes to playing
  useEffect(() => {
    if (phase === 'playing') {
      // Detect if it's Quick Play (default config: 1 set, advantage, tiebreak)
      const isQuickPlay = rules.scoringSystem === 'standard' &&
        rules.setsTarget === 1 &&
        rules.deuceRule === 'advantage' &&
        rules.setTieRule === 'tiebreak';
      
      const gameMode: 'quick-play' | 'custom' = isQuickPlay ? 'quick-play' : 'custom';
      
      writeGameState({
        court_state: 'in_play',
        current_score: { teamA: 0, teamB: 0 },
        game_mode: gameMode
      });

      // Create match entry in database when game starts
      async function createMatch() {
        if (!courtId) {
          console.warn('COURT_ID not configured - match not created');
          return;
        }

        const startTime = matchStartTime || new Date().toISOString();

        try {
          const response = await fetch('/api/save-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              court_id: courtId,
              mode: gameMode,
              started_at: startTime,
              ended_at: null,  // Game in progress
              team1_score: 0,
              team2_score: 0,
              duration_seconds: 0
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create match');
          }

          const data = await response.json();
          if (data.matchId) {
            setMatchId(data.matchId);
            console.log('Match created with ID:', data.matchId);
          }
        } catch (error) {
          console.error('Failed to create match:', error);
          // Don't block the game - continue even if match creation fails
        }
      }

      createMatch();
    }
  }, [phase, rules.scoringSystem, rules.setsTarget, rules.deuceRule, rules.setTieRule, courtId, matchStartTime, setMatchId]);

  const handleReset = () => {
    reset();
    // matchSavedRef will be reset when a new game starts (in GameScoreboard)
    writeGameState({
      court_state: 'idle',
      current_score: null,
      game_mode: null
    });
    router.push('/'); // Navigate back to setup
  };

  if (phase === 'server-announcement') {
    return <ServerAnnouncement servingTeam={state.server} onComplete={handleServerAnnouncementComplete} />;
  }
  return <GameScoreboard onReset={handleReset} />;
}