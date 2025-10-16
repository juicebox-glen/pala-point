"use client";

import { useState } from "react";
import { useGameStore } from "@stores/game-store";
import ServerAnnouncement from "@/app/components/ServerAnnouncement";

export default function GamePage() {
  const servingTeam = useGameStore((s) => s.servingTeam);
  const [showServerAnnouncement, setShowServerAnnouncement] = useState(true);

  const handleServerAnnouncementComplete = () => {
    setShowServerAnnouncement(false);
    // TODO: Start the actual game
  };

  if (showServerAnnouncement) {
    return (
      <ServerAnnouncement
        servingTeam={servingTeam}
        onComplete={handleServerAnnouncementComplete}
      />
    );
  }

  // TODO: Return actual game scoreboard
  return (
    <div className="screen-wrapper">
      <div className="screen-content content-centered">
        <h1 style={{ fontSize: '4rem', color: 'white' }}>
          GAME SCOREBOARD GOES HERE
        </h1>
        <p style={{ fontSize: '2rem', color: '#9ca3af', marginTop: '2rem' }}>
          Server announcement complete. Team {servingTeam} is serving.
        </p>
      </div>
    </div>
  );
}