"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ServerAnnouncement from "../components/ServerAnnouncement";
import GameScoreboard from "../components/GameScoreboard";
import { useGameStore } from "@stores/game-store";

type GamePhase = 'server-announcement' | 'playing';

export default function GamePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<GamePhase>('server-announcement');
  const reset = useGameStore((s) => s.reset);
  const state = useGameStore((s) => s.state);

  const handleServerAnnouncementComplete = () => {
    setPhase('playing');
  };

  const handleReset = () => {
    reset();
    router.push('/'); // Navigate back to setup
  };

  if (phase === 'server-announcement') {
    return <ServerAnnouncement server={state.server} onComplete={handleServerAnnouncementComplete} />;
  }

  return <GameScoreboard onReset={handleReset} />;
}