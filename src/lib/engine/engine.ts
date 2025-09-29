// src/lib/engine/engine.ts
import type { GameRuleSet } from "@types/rules";

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
}

export interface DisplayModel {
  points: { A: string; B: string };
  games: { A: number; B: number };
  setsWon: { A: number; B: number };
  server: Team;
  flags: { tiebreak: boolean; deuce: boolean; advantage: 'A' | 'B' | null };
  message?: string;
  pointSituation?: {
    type: 'set-point' | 'match-point';
    team: Team;
  } | null;
}

const POINT_LABELS = ["0", "15", "30", "40"];

export function initState(rules: GameRuleSet, startServer: Team): EngineState {
  return {
    sets: [{ gamesA: 0, gamesB: 0 }],
    currentGame: { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 },
    server: startServer,
  };
}

function countSetsWon(s: EngineState): { A: number; B: number } {
  let A = 0, B = 0;
  for (const set of s.sets) {
    if (set.completed && set.winner === 'A') A++;
    if (set.completed && set.winner === 'B') B++;
  }
  return { A, B };
}

function checkSetWinner(set: SetScore, rules: GameRuleSet): Team | null {
  const gp = rules.gamesPerSet ?? 6;
  const { gamesA, gamesB } = set;
  if (gamesA >= gp && gamesA - gamesB >= 2) return 'A';
  if (gamesB >= gp && gamesB - gamesA >= 2) return 'B';
  return null;
}

function applySetWinAndCheckMatch(s: EngineState, winner: Team, rules: GameRuleSet): Team | null {
  const lastSet = s.sets[s.sets.length - 1];
  lastSet.completed = true;
  lastSet.winner = winner;
  
  const setsWon = countSetsWon(s);
  const target = rules.target ?? 1;
  if (setsWon[winner] >= target) return winner;
  return null;
}

function standardGameWinner(pA: number, pB: number): Team | null {
  if (pA >= 4 && pA - pB >= 2) return 'A';
  if (pB >= 4 && pB - pA >= 2) return 'B';
  return null;
}

export function scorePoint(s: EngineState, rules: GameRuleSet, team: Team): EngineState {
  s = JSON.parse(JSON.stringify(s));
  if (s.finished) return s;

  const set = s.sets[s.sets.length - 1];

  // TIEBREAK SCORING
  if (s.currentGame.inTiebreak && set.tiebreak) {
    if (team === 'A') set.tiebreak.a++;
    else set.tiebreak.b++;

    const to = rules.tiebreakTo ?? 7;
    const a = set.tiebreak.a;
    const b = set.tiebreak.b;
    const winner = (a >= to && a - b >= 2) ? 'A' : (b >= to && b - a >= 2) ? 'B' : null;

    if (winner) {
      if (winner === 'A') set.gamesA++;
      else set.gamesB++;

      // Tiebreak always ends the set - winner takes the set
      const matchWin = applySetWinAndCheckMatch(s, winner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: "sets" };
        return s;
      }
      s.sets.push({ gamesA: 0, gamesB: 0 });
      s.server = s.server === 'A' ? 'B' : 'A';
      s.currentGame = { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 };
    } else {
      const total = a + b;
      if (total === 1) {
        s.server = set.tiebreak.startServer;
      } else if ((total - 1) % 2 === 0) {
        s.server = s.server === 'A' ? 'B' : 'A';
      }
    }
    return s;
  }

  // STANDARD GAME SCORING
  const wasDeuce =
    s.currentGame.pA >= 3 &&
    s.currentGame.pB >= 3 &&
    s.currentGame.pA === s.currentGame.pB;

  // Apply the point
  if (team === "A") s.currentGame.pA++;
  else s.currentGame.pB++;

  // Check if we're at deuce NOW
  const nowDeuce =
    s.currentGame.pA >= 3 &&
    s.currentGame.pB >= 3 &&
    s.currentGame.pA === s.currentGame.pB;

  // Increment deuce count when transitioning to deuce
  if (!wasDeuce && nowDeuce) {
    s.currentGame.deuceCount++;
  }

  // GOLDEN POINT: immediate sudden death at first deuce
  if (rules.deuceRule === "golden-point" && wasDeuce) {
    // Just scored from deuce → game over
    if (team === "A") set.gamesA++;
    else set.gamesB++;

    const setWinner = checkSetWinner(set, rules);
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

  // SILVER POINT: normal advantage on first deuce, sudden death on second
  if (rules.deuceRule === "silver-point") {
    // If we were at deuce (2nd time or more) and just scored, it's sudden death
    if (wasDeuce && s.currentGame.deuceCount >= 2) {
      // Sudden death - this point wins
      if (team === "A") set.gamesA++;
      else set.gamesB++;

      const setWinner = checkSetWinner(set, rules);
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

  // STANDARD WIN CHECK (advantage or silver-point first deuce)
  const winner = standardGameWinner(s.currentGame.pA, s.currentGame.pB);
  if (winner) {
    if (winner === 'A') set.gamesA++;
    else set.gamesB++;

    const tie = rules.setTieAtGames ?? 6;
    if (set.gamesA === tie && set.gamesB === tie && rules.setTieRule === 'tiebreak') {
      set.tiebreak = { a: 0, b: 0, startServer: s.server === 'A' ? 'B' : 'A' };
      s.currentGame = { pA: 0, pB: 0, inTiebreak: true, deuceCount: 0 };
      s.server = set.tiebreak.startServer;
      return s;
    }

    const setWinner = checkSetWinner(set, rules);
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

function getPointSituation(s: EngineState, rules: GameRuleSet): {
  type: 'set-point' | 'match-point';
  team: Team;
} | null {
  if (s.finished) return null;
  
  const set = s.sets[s.sets.length - 1];
  const { pA, pB, inTiebreak } = s.currentGame;
  
  let teamACanWinGame = false;
  let teamBCanWinGame = false;
  
  if (inTiebreak && set.tiebreak) {
    const to = rules.tiebreakTo ?? 7;
    const a = set.tiebreak.a;
    const b = set.tiebreak.b;
    
    teamACanWinGame = a >= to - 1 && a - b >= 1;
    teamBCanWinGame = b >= to - 1 && b - a >= 1;

    // In tiebreak, winning the tiebreak = winning the set
    // So if either team can win the game (tiebreak), check if it's set/match point
    const target = rules.target ?? 1;
    const setsWon = countSetsWon(s);

    if (teamACanWinGame) {
      const setsAfterWin = setsWon.A + 1;
      if (setsAfterWin >= target) {
        return { type: 'match-point', team: 'A' };
      }
      return { type: 'set-point', team: 'A' };
    }

    if (teamBCanWinGame) {
      const setsAfterWin = setsWon.B + 1;
      if (setsAfterWin >= target) {
        return { type: 'match-point', team: 'B' };
      }
      return { type: 'set-point', team: 'B' };
    }

    return null;
  } else {
    // Standard game scoring
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
  
    const gp = rules.gamesPerSet ?? 6;
    const target = rules.target ?? 1;
    const setsWon = countSetsWon(s);
    
    if (teamACanWinGame) {
      const gamesAfterWin = set.gamesA + 1;
      const wouldWinSet = gamesAfterWin >= gp && gamesAfterWin - set.gamesB >= 2;
      
      if (wouldWinSet) {
        const setsAfterWin = setsWon.A + 1;
        if (setsAfterWin >= target) {
          return { type: 'match-point', team: 'A' };
        }
        return { type: 'set-point', team: 'A' };
      }
    }
    
    if (teamBCanWinGame) {
      const gamesAfterWin = set.gamesB + 1;
      const wouldWinSet = gamesAfterWin >= gp && gamesAfterWin - set.gamesA >= 2;
      
      if (wouldWinSet) {
        const setsAfterWin = setsWon.B + 1;
        if (setsAfterWin >= target) {
          return { type: 'match-point', team: 'B' };
        }
        return { type: 'set-point', team: 'B' };
      }
    }
    
    return null;
  }
}

export function formatDisplay(s: EngineState, rules?: GameRuleSet): DisplayModel {
  const set = s.sets[s.sets.length - 1];
  const pointSituation = rules ? getPointSituation(s, rules) : null;

  if (s.currentGame.inTiebreak && set.tiebreak) {
    return {
      points: { A: `TB:${set.tiebreak.a}`, B: `TB:${set.tiebreak.b}` },
      games: { A: set.gamesA, B: set.gamesB },
      setsWon: countSetsWon(s),
      server: s.server,
      flags: { tiebreak: true, deuce: false, advantage: null },
      message: "Tiebreak to 7 (win by 2)",
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

  return {
    points: { A, B },
    games: { A: set.gamesA, B: set.gamesB },
    setsWon: countSetsWon(s),
    server: s.server,
    flags: { tiebreak: false, deuce, advantage: adv },
    message: deuce ? "Deuce (advantage rule)" : undefined,
    pointSituation
  };
}