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
  currentGame: { pA: number; pB: number; inTiebreak: boolean; deuceCount: number };
  server: Team;
  finished?: { winner: Team; reason: 'sets'|'games'|'points'|'timed' };
}

export interface DisplayModel {
  points: { A: string; B: string };
  games:  { A: number; B: number };
  setsWon:{ A: number; B: number };
  server: Team;
  flags:  { tiebreak: boolean; deuce: boolean; advantage: Team | null };
  message?: string;
}

const POINT_LABELS = ["0", "15", "30", "40"];

function standardGameWinner(pA: number, pB: number): Team | null {
  if (pA >= 4 || pB >= 4) {
    const diff = pA - pB;
    if (diff >= 2) return 'A';
    if (diff <= -2) return 'B';
  }
  return null;
}

export function initState(rules: GameRuleSet, initialServer: Team = 'A'): EngineState {
  return {
    sets: [{ gamesA: 0, gamesB: 0 }],
    currentGame: { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 },
    server: initialServer,
  };
}

export function scorePoint(prev: EngineState, rules: GameRuleSet, team: Team): EngineState {
  if (prev.finished) return prev;

  const s: EngineState = JSON.parse(JSON.stringify(prev));
  const currentSet = s.sets[s.sets.length - 1];

  if (s.currentGame.inTiebreak) {
    if (!currentSet.tiebreak) {
      currentSet.tiebreak = { a: 0, b: 0, startServer: s.server };
    }
    if (team === 'A') currentSet.tiebreak.a++;
    else currentSet.tiebreak.b++;

    const to = rules.tiebreakTo ?? 7;
    const a = currentSet.tiebreak.a;
    const b = currentSet.tiebreak.b;
    
    if ((a >= to || b >= to) && Math.abs(a - b) >= 2) {
      const tbWinner: Team = a > b ? 'A' : 'B';
      if (tbWinner === 'A') currentSet.gamesA++;
      else currentSet.gamesB++;

      const matchWin = applySetWinAndCheckMatch(s, tbWinner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: 'sets' };
        return s;
      }

      s.sets.push({ gamesA: 0, gamesB: 0 });
      s.server = currentSet.tiebreak.startServer === 'A' ? 'B' : 'A';
      s.currentGame = { pA: 0, pB: 0, inTiebreak: false, deuceCount: 0 };
      return s;
    }

    const totalPoints = a + b;
    const start = currentSet.tiebreak.startServer;
    if (totalPoints === 1) {
      s.server = start === 'A' ? 'B' : 'A';
    } else if (totalPoints > 1) {
      const blockIndex = Math.floor((totalPoints - 1) / 2);
      const evenBlock = blockIndex % 2 === 0;
      s.server = evenBlock ? (start === 'A' ? 'B' : 'A') : start;
    }
    return s;
  }

  // STANDARD GAME MODE
  // Check if we're at deuce BEFORE scoring the point
  const wasDeuce =
    rules.deuceRule !== undefined &&
    s.currentGame.pA >= 3 &&
    s.currentGame.pB >= 3 &&
    s.currentGame.pA === s.currentGame.pB;

  // Track if this is the first time reaching deuce
  if (wasDeuce && s.currentGame.deuceCount === 0) {
    s.currentGame.deuceCount = 1;
  }

  // Apply the point
  if (team === 'A') s.currentGame.pA++;
  else s.currentGame.pB++;

  // GOLDEN POINT: if it was deuce before this rally, this point wins the game
  if (rules.deuceRule === 'golden-point' && wasDeuce) {
    if (team === 'A') currentSet.gamesA++;
    else currentSet.gamesB++;

    const gp = rules.gamesPerSet ?? 6;
    const tieAt = rules.setTieAtGames ?? gp;
    const tieRule = rules.setTieRule ?? 'tiebreak';

    if (currentSet.gamesA === tieAt && currentSet.gamesB === tieAt && tieRule === 'tiebreak') {
      s.currentGame = { pA: 0, pB: 0, inTiebreak: true, deuceCount: 0 };
      currentSet.tiebreak = { a: 0, b: 0, startServer: s.server };
      return s;
    }

    const setWinner = checkSetWinner(currentSet, rules);
    if (setWinner) {
      const matchWin = applySetWinAndCheckMatch(s, setWinner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: 'sets' };
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

  // SILVER POINT: first deuce uses advantage, second+ deuce is golden
  if (rules.deuceRule === 'silver-point' && wasDeuce && s.currentGame.deuceCount >= 2) {
    // Second deuce = sudden death
    if (team === 'A') currentSet.gamesA++;
    else currentSet.gamesB++;

    const gp = rules.gamesPerSet ?? 6;
    const tieAt = rules.setTieAtGames ?? gp;
    const tieRule = rules.setTieRule ?? 'tiebreak';

    if (currentSet.gamesA === tieAt && currentSet.gamesB === tieAt && tieRule === 'tiebreak') {
      s.currentGame = { pA: 0, pB: 0, inTiebreak: true, deuceCount: 0 };
      currentSet.tiebreak = { a: 0, b: 0, startServer: s.server };
      return s;
    }

    const setWinner = checkSetWinner(currentSet, rules);
    if (setWinner) {
      const matchWin = applySetWinAndCheckMatch(s, setWinner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: 'sets' };
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

  // ADVANTAGE MODE (traditional) or SILVER FIRST DEUCE: use standard logic
  const gw = standardGameWinner(s.currentGame.pA, s.currentGame.pB);
  if (gw) {
    if (gw === 'A') currentSet.gamesA++;
    else currentSet.gamesB++;

    const gp = rules.gamesPerSet ?? 6;
    const tieAt = rules.setTieAtGames ?? gp;
    const tieRule = rules.setTieRule ?? 'tiebreak';

    if (currentSet.gamesA === tieAt && currentSet.gamesB === tieAt && tieRule === 'tiebreak') {
      s.currentGame = { pA: 0, pB: 0, inTiebreak: true, deuceCount: 0 };
      currentSet.tiebreak = { a: 0, b: 0, startServer: s.server };
      return s;
    }

    const setWinner = checkSetWinner(currentSet, rules);
    if (setWinner) {
      const matchWin = applySetWinAndCheckMatch(s, setWinner, rules);
      if (matchWin) {
        s.finished = { winner: matchWin, reason: 'sets' };
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

  // Check if we've returned to deuce after advantage (increment deuceCount)
  const nowDeuce = s.currentGame.pA >= 3 && s.currentGame.pB >= 3 && s.currentGame.pA === s.currentGame.pB;
  if (nowDeuce && !wasDeuce && s.currentGame.deuceCount === 1) {
    s.currentGame.deuceCount = 2;
  }

  return s;
}

function checkSetWinner(set: SetScore, rules: GameRuleSet): Team | null {
  const gp = rules.gamesPerSet ?? 6;
  const a = set.gamesA;
  const b = set.gamesB;

  if ((a >= gp || b >= gp) && Math.abs(a - b) >= 2) {
    return a > b ? 'A' : 'B';
  }
  return null;
}

function applySetWinAndCheckMatch(s: EngineState, setWinner: Team, rules?: GameRuleSet): Team | null {
  const currentSet = s.sets[s.sets.length - 1];
  currentSet.completed = true;
  currentSet.winner = setWinner;

  const wonA = s.sets.filter(x => x.completed && x.winner === 'A').length;
  const wonB = s.sets.filter(x => x.completed && x.winner === 'B').length;

  const target = rules?.target ?? 1;

  if (wonA >= target) return 'A';
  if (wonB >= target) return 'B';
  return null;
}

export function formatDisplay(s: EngineState): DisplayModel {
  const set = s.sets[s.sets.length - 1];

  if (s.currentGame.inTiebreak && set.tiebreak) {
    return {
      points: { A: `TB:${set.tiebreak.a}`, B: `TB:${set.tiebreak.b}` },
      games: { A: set.gamesA, B: set.gamesB },
      setsWon: countSetsWon(s),
      server: s.server,
      flags: { tiebreak: true, deuce: false, advantage: null },
      message: "Tiebreak to 7 (win by 2)"
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
    message: deuce ? "Deuce (advantage rule)" : undefined
  };
}

function countSetsWon(s: EngineState) {
  let A = 0, B = 0;
  for (const set of s.sets) {
    if (set.completed) {
      if (set.winner === 'A') A++;
      if (set.winner === 'B') B++;
    }
  }
  return { A, B };
}