// src/lib/engine/engine.ts
import type { MatchRules } from "@types/rules";

export type Team = 'A' | 'B';

export interface SetScore {
  gamesA: number;
  gamesB: number;
  tiebreak?: { a: number; b: number; startServer: Team };
  completed?: boolean;
  winner?: Team;
}

export interface EngineState {
  sets: SetScore[];
  currentGame: {
    pA: number;
    pB: number;
    inTiebreak: boolean;
    deuceCount: number;
  };
  server: Team;
  finished?: { winner: Team; reason: string };
  
  // Americano state
  americano?: {
    teamAPoints: number;
    teamBPoints: number;
    servesInCurrentTurn: number;
    totalServesPlayed: number;
  };

  // Match statistics
  stats: {
    matchStartTime: number;
    totalPointsPlayed: number;
    pointsWon: { A: number; B: number };
    servicePointsWon: { A: number; B: number };
    breaks: { A: number; B: number };
    longestStreak: { team: Team | null; streak: number };
    currentStreak: { team: Team | null; streak: number };
    pointHistory: Team[]; // Array of which team won each point
  };
}

export interface DisplayModel {
  points: { A: string; B: string };
  games: { A: number; B: number };
  setsWon: { A: number; B: number };
  server: Team;
  flags: { 
    tiebreak: boolean; 
    deuce: boolean; 
    advantage: 'A' | 'B' | null;
    americano: boolean;
  };
  message?: string;
  statusMessage: string;
  pointSituation?: {
    type: 'set-point' | 'match-point';
    team: Team;
  } | null;
  americanoServes?: number; // serves remaining in current turn
}

const POINT_LABELS = ["0", "15", "30", "40"];

export function initState(rules: MatchRules, startServer: Team): EngineState {
  const baseState: EngineState = {
    sets: [{ gamesA: 0, gamesB: 0 }],
    currentGame: { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 },
    server: startServer,
    stats: {
      matchStartTime: Date.now(),
      totalPointsPlayed: 0,
      pointsWon: { A: 0, B: 0 },
      servicePointsWon: { A: 0, B: 0 },
      breaks: { A: 0, B: 0 },
      longestStreak: { team: null, streak: 0 },
      currentStreak: { team: null, streak: 0 },
      pointHistory: [],
    },
  };

  // Initialize Americano state if needed
  if (rules.scoringSystem === 'americano') {
    baseState.americano = {
      teamAPoints: 0,
      teamBPoints: 0,
      servesInCurrentTurn: 0,
      totalServesPlayed: 0,
    };
  }

  return baseState;
}

function countSetsWon(s: EngineState): { A: number; B: number } {
  let A = 0, B = 0;
  for (const set of s.sets) {
    if (set.completed && set.winner === 'A') A++;
    if (set.completed && set.winner === 'B') B++;
  }
  return { A, B };
}

function checkSetWinner(set: SetScore): Team | null {
  const { gamesA, gamesB } = set;
  // Standard padel: first to 6 games, win by 2
  if (gamesA >= 6 && gamesA - gamesB >= 2) return 'A';
  if (gamesB >= 6 && gamesB - gamesA >= 2) return 'B';
  return null;
}

function applySetWinAndCheckMatch(s: EngineState, winner: Team, rules: MatchRules): Team | null {
  if (rules.scoringSystem === 'americano') return null;
  
  const lastSet = s.sets[s.sets.length - 1];
  lastSet.completed = true;
  lastSet.winner = winner;
  
  const setsWon = countSetsWon(s);
  if (setsWon[winner] >= rules.setsTarget) return winner;
  return null;
}

function standardGameWinner(pA: number, pB: number): Team | null {
  // Standard padel game: win by 2 at 4+ points
  if (pA >= 4 && pA - pB >= 2) return 'A';
  if (pB >= 4 && pB - pA >= 2) return 'B';
  return null;
}

// Helper function to update stats after a point
function updateStats(s: EngineState, team: Team, wasBreakPoint: boolean = false) {
  s.stats.totalPointsPlayed++;
  s.stats.pointsWon[team]++;
  s.stats.pointHistory.push(team);

  // Service points won
  if (s.server === team) {
    s.stats.servicePointsWon[team]++;
  }

  // Breaks tracking (tracked when game is won, not per point)
  if (wasBreakPoint) {
    s.stats.breaks[team]++;
  }

  // Update streak
  if (s.stats.currentStreak.team === team) {
    s.stats.currentStreak.streak++;
  } else {
    s.stats.currentStreak = { team, streak: 1 };
  }

  // Update longest streak
  if (s.stats.currentStreak.streak > s.stats.longestStreak.streak) {
    s.stats.longestStreak = { ...s.stats.currentStreak };
  }
}

export function scorePoint(s: EngineState, rules: MatchRules, team: Team): EngineState {
  s = JSON.parse(JSON.stringify(s));
  if (s.finished) return s;

  // Update stats for every point
  updateStats(s, team);

  // AMERICANO SCORING
  if (rules.scoringSystem === 'americano' && s.americano) {
    // Increment point
    if (team === 'A') {
      s.americano.teamAPoints++;
    } else {
      s.americano.teamBPoints++;
    }

    // Track serves
    s.americano.servesInCurrentTurn++;
    s.americano.totalServesPlayed++;

    // Change server every servesPerTurn
    if (s.americano.servesInCurrentTurn >= rules.servesPerTurn) {
      s.server = s.server === 'A' ? 'B' : 'A';
      s.americano.servesInCurrentTurn = 0;
    }

    // Check for winner
    if (s.americano.teamAPoints >= rules.targetPoints) {
      s.finished = { winner: 'A', reason: 'points' };
    } else if (s.americano.teamBPoints >= rules.targetPoints) {
      s.finished = { winner: 'B', reason: 'points' };
    }

    return s;
  }

  // STANDARD PADEL SCORING
  if (rules.scoringSystem !== 'standard') return s;
  
  const set = s.sets[s.sets.length - 1];

  // TIEBREAK SCORING (7-point tiebreak, win by 2)
  if (s.currentGame.inTiebreak && set.tiebreak) {
    if (team === 'A') set.tiebreak.a++;
    else set.tiebreak.b++;

    const a = set.tiebreak.a;
    const b = set.tiebreak.b;
    const winner = (a >= 7 && a - b >= 2) ? 'A' : (b >= 7 && b - a >= 2) ? 'B' : null;

    if (winner) {
      // Check if this was a break (winner is not the server)
      const wasBreak = winner !== s.server;
      if (wasBreak) {
        s.stats.breaks[winner]++;
      }

      if (winner === 'A') set.gamesA++;
      else set.gamesB++;

      const matchWin = applySetWinAndCheckMatch(s, winner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: "sets" };
        return s;
      }
      s.sets.push({ gamesA: 0, gamesB: 0 });
      s.server = s.server === 'A' ? 'B' : 'A';
      s.currentGame = { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 };
    } else {
      // Official tie-break serving rules (FIP - Padel):
      // Point 0: Start server serves (1 point)
      // Points 1-2: Opposite server serves (2 points)
      // Points 3-4: Start server serves (2 points)
      // Points 5-6: Opposite server serves (2 points)
      // Points 7-8: Start server serves (2 points)
      // etc.
      // Pattern: 1, 2, 2, 2, 2, 2, 2...
      const total = a + b;
      const startServer = set.tiebreak.startServer;
      const oppositeServer = startServer === 'A' ? 'B' : 'A';
      
      if (total === 0) {
        // Point 0: Start server serves (just 1 point)
        s.server = startServer;
      } else {
        // Point 1+: Everyone else serves 2 points
        // Subtract 1 (for the first single point), then check pairs
        const pointsAfterFirst = total - 1;
        const pairNumber = Math.floor(pointsAfterFirst / 2);
        
        // Even pairs (0, 2, 4...): opposite server serves 2
        // Odd pairs (1, 3, 5...): start server serves 2
        s.server = pairNumber % 2 === 0 ? oppositeServer : startServer;
      }
    }
    return s;
  }

  // STANDARD GAME SCORING (0, 15, 30, 40, deuce, advantage)
  const wasDeuce =
    s.currentGame.pA >= 3 &&
    s.currentGame.pB >= 3 &&
    s.currentGame.pA === s.currentGame.pB;

  if (team === "A") s.currentGame.pA++;
  else s.currentGame.pB++;

  const nowDeuce =
    s.currentGame.pA >= 3 &&
    s.currentGame.pB >= 3 &&
    s.currentGame.pA === s.currentGame.pB;

  if (!wasDeuce && nowDeuce) {
    s.currentGame.deuceCount++;
  }

  // GOLDEN POINT
  if (rules.deuceRule === "golden-point" && wasDeuce) {
    // Check if this was a break
    const wasBreak = team !== s.server;
    if (wasBreak) {
      s.stats.breaks[team]++;
    }

    if (team === "A") set.gamesA++;
    else set.gamesB++;

    const setWinner = checkSetWinner(set);
    if (setWinner) {
      const matchWin = applySetWinAndCheckMatch(s, setWinner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: "sets" };
        return s;
      }
      s.sets.push({ gamesA: 0, gamesB: 0 });
      s.server = s.server === 'A' ? 'B' : 'A';
    } else {
      s.server = s.server === 'A' ? 'B' : 'A';
    }
    s.currentGame = { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 };
    return s;
  }

  // SILVER POINT
  if (rules.deuceRule === "silver-point") {
    if (wasDeuce && s.currentGame.deuceCount >= 2) {
      // Check if this was a break
      const wasBreak = team !== s.server;
      if (wasBreak) {
        s.stats.breaks[team]++;
      }

      if (team === "A") set.gamesA++;
      else set.gamesB++;

      const setWinner = checkSetWinner(set);
      if (setWinner) {
        const matchWin = applySetWinAndCheckMatch(s, setWinner, rules);
        if (matchWin) {
          s.finished = { winner: matchWin, reason: "sets" };
          return s;
        }
        s.sets.push({ gamesA: 0, gamesB: 0 });
        s.server = s.server === 'A' ? 'B' : 'A';
      } else {
        s.server = s.server === 'A' ? 'B' : 'A';
      }
      s.currentGame = { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 };
      return s;
    }
  }

  // STANDARD WIN CHECK (advantage rule, win by 2)
  const winner = standardGameWinner(s.currentGame.pA, s.currentGame.pB);
  if (winner) {
    // Check if this was a break
    const wasBreak = winner !== s.server;
    if (wasBreak) {
      s.stats.breaks[winner]++;
    }

    if (winner === 'A') set.gamesA++;
    else set.gamesB++;

    // Check for 6-6 tiebreak
    if (set.gamesA === 6 && set.gamesB === 6 && rules.setTieRule === 'tiebreak') {
      set.tiebreak = { a: 0, b: 0, startServer: s.server === 'A' ? 'B' : 'A' };
      s.currentGame = { pA: 0, pB: 0, inTiebreak: true, deuceCount: 0 };
      s.server = set.tiebreak.startServer;
      return s;
    }

    const setWinner = checkSetWinner(set);
    if (setWinner) {
      const matchWin = applySetWinAndCheckMatch(s, setWinner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: "sets" };
        return s;
      }
      s.sets.push({ gamesA: 0, gamesB: 0 });
      s.server = s.server === 'A' ? 'B' : 'A';
    } else {
      s.server = s.server === 'A' ? 'B' : 'A';
    }
    s.currentGame = { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 };
  }

  return s;
}

function getPointSituation(s: EngineState, rules: MatchRules): {
  type: 'set-point' | 'match-point';
  team: Team;
} | null {
  if (s.finished || rules.scoringSystem === 'americano') return null;
  
  const set = s.sets[s.sets.length - 1];
  const { pA, pB, inTiebreak } = s.currentGame;
  
  let teamACanWinGame = false;
  let teamBCanWinGame = false;
  
  if (inTiebreak && set.tiebreak) {
    const a = set.tiebreak.a;
    const b = set.tiebreak.b;
    
    teamACanWinGame = a >= 6 && a - b >= 1;
    teamBCanWinGame = b >= 6 && b - a >= 1;

    const setsWon = countSetsWon(s);

    if (teamACanWinGame) {
      const setsAfterWin = setsWon.A + 1;
      if (setsAfterWin >= rules.setsTarget) {
        return { type: 'match-point', team: 'A' };
      }
      return { type: 'set-point', team: 'A' };
    }

    if (teamBCanWinGame) {
      const setsAfterWin = setsWon.B + 1;
      if (setsAfterWin >= rules.setsTarget) {
        return { type: 'match-point', team: 'B' };
      }
      return { type: 'set-point', team: 'B' };
    }

    return null;
  } else {
    if (rules.deuceRule === 'golden-point') {
      const atDeuce = pA >= 3 && pB >= 3 && pA === pB;
      if (atDeuce) {
        teamACanWinGame = true;
        teamBCanWinGame = true;
      } else {
        teamACanWinGame = pA >= 3 && pA > pB;
        teamBCanWinGame = pB >= 3 && pB > pA;
      }
    } else if (rules.deuceRule === 'silver-point') {
      const atDeuce = pA >= 3 && pB >= 3 && pA === pB;
      if (atDeuce && s.currentGame.deuceCount >= 2) {
        teamACanWinGame = true;
        teamBCanWinGame = true;
      } else {
        teamACanWinGame = pA >= 3 && pA - pB >= 1;
        teamBCanWinGame = pB >= 3 && pB - pA >= 1;
      }
    } else {
      teamACanWinGame = pA >= 3 && pA - pB >= 1;
      teamBCanWinGame = pB >= 3 && pB - pA >= 1;
    }
  
    const setsWon = countSetsWon(s);
    
    if (teamACanWinGame) {
      const gamesAfterWin = set.gamesA + 1;
      const wouldWinSet = gamesAfterWin >= 6 && gamesAfterWin - set.gamesB >= 2;
      
      if (wouldWinSet) {
        const setsAfterWin = setsWon.A + 1;
        if (setsAfterWin >= rules.setsTarget) {
          return { type: 'match-point', team: 'A' };
        }
        return { type: 'set-point', team: 'A' };
      }
    }
    
    if (teamBCanWinGame) {
      const gamesAfterWin = set.gamesB + 1;
      const wouldWinSet = gamesAfterWin >= 6 && gamesAfterWin - set.gamesA >= 2;
      
      if (wouldWinSet) {
        const setsAfterWin = setsWon.B + 1;
        if (setsAfterWin >= rules.setsTarget) {
          return { type: 'match-point', team: 'B' };
        }
        return { type: 'set-point', team: 'B' };
      }
    }
    
    return null;
  }
}

export function formatDisplay(s: EngineState, rules?: MatchRules): DisplayModel {
  // AMERICANO DISPLAY
  if (rules?.scoringSystem === 'americano' && s.americano) {
    const servesRemaining = rules.servesPerTurn - s.americano.servesInCurrentTurn;
    
    return {
      points: { 
        A: s.americano.teamAPoints.toString(), 
        B: s.americano.teamBPoints.toString() 
      },
      games: { A: 0, B: 0 },
      setsWon: { A: 0, B: 0 },
      server: s.server,
      flags: { tiebreak: false, deuce: false, advantage: null, americano: true },
      statusMessage: "Americano",
      americanoServes: servesRemaining,
    };
  }

  // STANDARD PADEL DISPLAY
  const set = s.sets[s.sets.length - 1];
  const pointSituation = rules ? getPointSituation(s, rules) : null;

  let statusMessage = "";
  if (pointSituation) {
    statusMessage = pointSituation.type === 'match-point' 
      ? `MATCH\nPOINT` 
      : `SET\nPOINT`;
  }

  if (s.currentGame.inTiebreak && set.tiebreak) {
    if (!statusMessage) {
      statusMessage = "TIE\nBREAK";
    }

    return {
      points: { A: set.tiebreak.a.toString(), B: set.tiebreak.b.toString() },
      games: { A: set.gamesA, B: set.gamesB },
      setsWon: countSetsWon(s),
      server: s.server,
      flags: { tiebreak: true, deuce: false, advantage: null, americano: false },
      message: "Tiebreak to 7 (win by 2)",
      statusMessage,
      pointSituation
    };
  }

  const { pA, pB } = s.currentGame;
  let A = "", B = "", deuce = false, adv: 'A' | 'B' | null = null;

  if (pA >= 3 && pB >= 3) {
    if (pA === pB) {
      A = "40"; B = "40"; deuce = true;
    } else if (pA > pB) {
      A = "Ad"; B = "40"; adv = 'A';
    } else {
      A = "40"; B = "Ad"; adv = 'B';
    }
  } else {
    A = POINT_LABELS[Math.min(pA, 3)] ?? "0";
    B = POINT_LABELS[Math.min(pB, 3)] ?? "0";
  }

  if (!statusMessage) {
    if (deuce && rules?.scoringSystem === 'standard') {
      if (rules.deuceRule === "golden-point") {
        statusMessage = "Golden Point";
      } else if (rules.deuceRule === "silver-point") {
        statusMessage = s.currentGame.deuceCount >= 2 ? "Silver Point (Sudden Death)" : "Deuce";
      } else {
        statusMessage = "Deuce";
      }
    }
  }

  return {
    points: { A, B },
    games: { A: set.gamesA, B: set.gamesB },
    setsWon: countSetsWon(s),
    server: s.server,
    flags: { tiebreak: false, deuce, advantage: adv, americano: false },
    message: deuce ? "Deuce (advantage rule)" : undefined,
    statusMessage,
    pointSituation
  };
}