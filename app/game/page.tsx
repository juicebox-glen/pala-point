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

  const handleServerAnnouncementComplete = () => {
    setPhase('playing');
  };

  // Write state when game phase changes to playing
  useEffect(() => {
    if (phase === 'playing') {
      const gameMode = rules.scoringSystem === 'americano' 
        ? 'americano' 
        : rules.setsTarget === 1 
          ? '1-set' 
          : '3-set';
      
      writeGameState({
        court_state: 'in_play',
        current_score: { teamA: 0, teamB: 0 },
        game_mode: gameMode
      });
    }
  }, [phase, rules.scoringSystem, rules.setsTarget]);

  const handleReset = () => {
    reset();
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