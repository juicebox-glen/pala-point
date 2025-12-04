export type CourtState = 'idle' | 'mode_select' | 'in_play' | 'finished';

interface GameState {
  court_state: CourtState;
  current_score: { teamA: number; teamB: number } | null;
  game_mode: string | null;
}

export async function writeGameState(state: GameState): Promise<void> {
  try {
    // Only write in production (on Pi)
    if (process.env.NODE_ENV !== 'production') return;
    
    // Call API route to write state file
    await fetch('/api/write-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
  } catch (error) {
    console.error('Failed to write game state:', error);
  }
}

