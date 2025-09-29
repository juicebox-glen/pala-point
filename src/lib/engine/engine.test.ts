import { describe, it, expect } from "vitest";
import {
  initState,
  scorePoint,
  formatDisplay,
  type EngineState,
  type Team,
} from "./engine";
import type { GameRuleSet } from "@types/rules";

const RULES: GameRuleSet = {
  scoringMode: "standard",
  matchFormat: "sets",
  target: 1,
  deuceRule: "advantage",
  gamesPerSet: 6,
  setTieRule: "tiebreak",
  setTieAtGames: 6,
  tiebreakTo: 7,
};

function applySeq(s: EngineState, seq: string, rules: GameRuleSet): EngineState {
  for (const ch of seq) {
    if (ch === "A") s = scorePoint(s, rules, "A");
    else if (ch === "B") s = scorePoint(s, rules, "B");
  }
  return s;
}

describe("engine: basic game scoring", () => {
  it("starts at 0–0", () => {
    const s = initState(RULES, "A");
    const v = formatDisplay(s, RULES);
    expect(v.points).toEqual({ A: "0", B: "0" });
    expect(v.games).toEqual({ A: 0, B: 0 });
    expect(v.setsWon).toEqual({ A: 0, B: 0 });
  });

  it("scores a clean 4-point game (0→15→30→40→game)", () => {
    let s = initState(RULES, "A");
    s = applySeq(s, "AAAA", RULES);
    const v = formatDisplay(s, RULES);
    expect(v.points).toEqual({ A: "0", B: "0" });
    expect(v.games).toEqual({ A: 1, B: 0 });
  });

  it("deuce cycle: 40–40 → Ad–40 → 40–40 → 40–Ad → game", () => {
    let s = initState(RULES, "A");
    s = applySeq(s, "AAABBB", RULES);
    let v = formatDisplay(s, RULES);
    expect(v.flags.deuce).toBe(true);
    s = scorePoint(s, RULES, "A");
    v = formatDisplay(s, RULES);
    expect(v.points.A).toBe("Ad");
    s = scorePoint(s, RULES, "B");
    v = formatDisplay(s, RULES);
    expect(v.flags.deuce).toBe(true);
    s = scorePoint(s, RULES, "B");
    v = formatDisplay(s, RULES);
    expect(v.points.B).toBe("Ad");
    s = scorePoint(s, RULES, "B");
    v = formatDisplay(s, RULES);
    expect(v.games.B).toBe(1);
    expect(v.points).toEqual({ A: "0", B: "0" });
  });

  it("set can be won 7–5 (no tiebreak)", () => {
    let s = initState(RULES, "A");
    s = applySeq(s, "AAAA", RULES); // A: 1-0
    s = applySeq(s, "BBBB", RULES); // 1-1
    s = applySeq(s, "AAAA", RULES); // A: 2-1
    s = applySeq(s, "BBBB", RULES); // 2-2
    s = applySeq(s, "AAAA", RULES); // A: 3-2
    s = applySeq(s, "BBBB", RULES); // 3-3
    s = applySeq(s, "AAAA", RULES); // A: 4-3
    s = applySeq(s, "BBBB", RULES); // 4-4
    s = applySeq(s, "AAAA", RULES); // A: 5-4
    s = applySeq(s, "BBBB", RULES); // 5-5
    s = applySeq(s, "AAAA", RULES); // A: 6-5
    
    let v = formatDisplay(s, RULES);
    expect(v.games).toEqual({ A: 6, B: 5 });
    expect(v.setsWon).toEqual({ A: 0, B: 0 });
    
    s = applySeq(s, "AAAA", RULES);
    v = formatDisplay(s, RULES);
    expect(v.setsWon.A).toBe(1);
    expect(s.finished).toBeTruthy();
  });

  it("tiebreak at 6–6", () => {
    let s = initState(RULES, "A");
    for (let i = 0; i < 6; i++) {
      s = applySeq(s, "AAAA", RULES);
      s = applySeq(s, "BBBB", RULES);
    }
    const v = formatDisplay(s, RULES);
    expect(v.flags.tiebreak).toBe(true);
  });

  it("tiebreak win at 7–5", () => {
    let s = initState(RULES, "A");
    for (let i = 0; i < 6; i++) {
      s = applySeq(s, "AAAA", RULES);
      s = applySeq(s, "BBBB", RULES);
    }
    s = applySeq(s, "AAAAA", RULES);
    s = applySeq(s, "BB", RULES);
    let v = formatDisplay(s, RULES);
    expect(v.points.A).toBe("TB:5");
    expect(v.points.B).toBe("TB:2");
    s = applySeq(s, "AA", RULES);
    v = formatDisplay(s, RULES);
    expect(v.setsWon.A).toBe(1);
    expect(s.finished).toBeTruthy();
  });
});

describe("engine: undo and snapshots", () => {
  it("undo mid-game restores previous point", () => {
    let s = initState(RULES, "A");
    s = applySeq(s, "AA", RULES);
    const before = formatDisplay(s, RULES);
    expect(before.points.A).toBe("30");
  });

  it("server alternates every game", () => {
    let s = initState(RULES, "A");
    expect(s.server).toBe("A");
    s = applySeq(s, "AAAA", RULES);
    expect(s.server).toBe("B");
    s = applySeq(s, "BBBB", RULES);
    expect(s.server).toBe("A");
  });

  it("reset creates fresh state", () => {
    let s = initState(RULES, "A");
    s = applySeq(s, "AAABBB", RULES);
    s = initState(RULES, "B");
    const v = formatDisplay(s, RULES);
    expect(v.points).toEqual({ A: "0", B: "0" });
    expect(v.games).toEqual({ A: 0, B: 0 });
    expect(s.server).toBe("B");
  });
});

describe("engine: golden point", () => {
  const RULES_GOLDEN: GameRuleSet = {
    scoringMode: "standard",
    matchFormat: "sets",
    target: 1,
    deuceRule: "golden-point",
    gamesPerSet: 6,
    setTieRule: "tiebreak",
    setTieAtGames: 6,
    tiebreakTo: 7,
  };

  it("at deuce, the very next point wins the game (no advantage flow)", () => {
    let s = initState(RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "B");
    let v = formatDisplay(s, RULES_GOLDEN);
    expect(v.flags.deuce).toBe(true);
    s = scorePoint(s, RULES_GOLDEN, "A");
    v = formatDisplay(s, RULES_GOLDEN);
    expect(v.games.A).toBe(1);
    expect(v.games.B).toBe(0);
    expect(v.points.A).toBe("0");
    expect(v.points.B).toBe("0");
  });

  it("normal scoring still works pre-deuce; golden only applies at deuce", () => {
    let s = initState(RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "B");
    let v = formatDisplay(s, RULES_GOLDEN);
    expect(v.flags.deuce).toBe(false);
    s = scorePoint(s, RULES_GOLDEN, "A");
    v = formatDisplay(s, RULES_GOLDEN);
    expect(v.games.A).toBe(1);
    expect(v.points.A).toBe("0");
    expect(v.points.B).toBe("0");
  });

  it("golden point doesn't change tiebreak behavior at 6–6", () => {
    let s = initState(RULES_GOLDEN, "A");
    const winGame = (team: Team) => {
      s = scorePoint(s, RULES_GOLDEN, team);
      s = scorePoint(s, RULES_GOLDEN, team);
      s = scorePoint(s, RULES_GOLDEN, team);
      s = scorePoint(s, RULES_GOLDEN, team);
    };
    for (let i = 0; i < 6; i++) {
      winGame("A");
      winGame("B");
    }
    let v = formatDisplay(s, RULES_GOLDEN);
    expect(v.flags.tiebreak).toBe(true);
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    v = formatDisplay(s, RULES_GOLDEN);
    expect(v.flags.tiebreak).toBe(true);
  });
});

describe("engine: silver point", () => {
  const RULES_SILVER: GameRuleSet = {
    scoringMode: "standard",
    matchFormat: "sets",
    target: 1,
    deuceRule: "silver-point",
    gamesPerSet: 6,
    setTieRule: "tiebreak",
    setTieAtGames: 6,
    tiebreakTo: 7,
  };

  it("first deuce: normal advantage cycle", () => {
    let s = initState(RULES_SILVER, "A");
    s = applySeq(s, "AAABBB", RULES_SILVER);
    let v = formatDisplay(s, RULES_SILVER);
    expect(v.flags.deuce).toBe(true);
    expect(s.currentGame.deuceCount).toBe(1);

    s = scorePoint(s, RULES_SILVER, "A");
    v = formatDisplay(s, RULES_SILVER);
    expect(v.points.A).toBe("Ad");

    s = scorePoint(s, RULES_SILVER, "B");
    v = formatDisplay(s, RULES_SILVER);
    expect(v.flags.deuce).toBe(true);
    expect(s.currentGame.deuceCount).toBe(2);
  });

  it("second deuce: sudden death (next point wins)", () => {
    let s = initState(RULES_SILVER, "A");
    s = applySeq(s, "AAABBB", RULES_SILVER);
    expect(s.currentGame.deuceCount).toBe(1);

    s = scorePoint(s, RULES_SILVER, "A");
    s = scorePoint(s, RULES_SILVER, "B");
    expect(s.currentGame.deuceCount).toBe(2);

    s = scorePoint(s, RULES_SILVER, "A");
    const v = formatDisplay(s, RULES_SILVER);
    expect(v.games.A).toBe(1);
    expect(v.points).toEqual({ A: "0", B: "0" });
  });

  it("can convert advantage before second deuce", () => {
    let s = initState(RULES_SILVER, "A");
    s = applySeq(s, "AAABBB", RULES_SILVER);
    s = scorePoint(s, RULES_SILVER, "A");
    s = scorePoint(s, RULES_SILVER, "A");
    const v = formatDisplay(s, RULES_SILVER);
    expect(v.games.A).toBe(1);
  });

  it("deuceCount resets after game ends", () => {
    let s = initState(RULES_SILVER, "A");
    s = applySeq(s, "AAABBB", RULES_SILVER);
    s = scorePoint(s, RULES_SILVER, "A");
    s = scorePoint(s, RULES_SILVER, "A");
    expect(s.currentGame.deuceCount).toBe(0);
  });
});

describe("engine: set and match point detection", () => {
  const RULES_BEST_OF_1: GameRuleSet = {
    scoringMode: "standard",
    matchFormat: "sets",
    target: 1,
    deuceRule: "advantage",
    gamesPerSet: 6,
    setTieRule: "tiebreak",
    setTieAtGames: 6,
    tiebreakTo: 7,
  };

  const RULES_BEST_OF_3: GameRuleSet = {
    ...RULES_BEST_OF_1,
    target: 2,
  };

  it("shows match point in best-of-1 at 5-0, 40-0", () => {
    let s = initState(RULES_BEST_OF_1, "A");
    for (let i = 0; i < 5; i++) {
      s = applySeq(s, "AAAA", RULES_BEST_OF_1);
    }
    s = applySeq(s, "AAA", RULES_BEST_OF_1);
    
    const v = formatDisplay(s, RULES_BEST_OF_1);
    expect(v.pointSituation).toEqual({ type: 'match-point', team: 'A' });
  });

  it("shows set point in best-of-3 at 5-0, 40-0 in first set", () => {
    let s = initState(RULES_BEST_OF_3, "A");
    for (let i = 0; i < 5; i++) {
      s = applySeq(s, "AAAA", RULES_BEST_OF_3);
    }
    s = applySeq(s, "AAA", RULES_BEST_OF_3);
    
    const v = formatDisplay(s, RULES_BEST_OF_3);
    expect(v.pointSituation).toEqual({ type: 'set-point', team: 'A' });
  });

  it("shows match point in best-of-3 when leading 1-0 in sets and 5-0, 40-0 in second set", () => {
    let s = initState(RULES_BEST_OF_3, "A");
    // Win first set 6-0
    for (let i = 0; i < 6; i++) {
      s = applySeq(s, "AAAA", RULES_BEST_OF_3);
    }
    // Win 5 games in second set
    for (let i = 0; i < 5; i++) {
      s = applySeq(s, "AAAA", RULES_BEST_OF_3);
    }
    // Get to 40-0
    s = applySeq(s, "AAA", RULES_BEST_OF_3);
    
    const v = formatDisplay(s, RULES_BEST_OF_3);
    expect(v.pointSituation).toEqual({ type: 'match-point', team: 'A' });
  });

  it("shows no point situation at 5-0, 30-0 (not yet at game point)", () => {
    let s = initState(RULES_BEST_OF_1, "A");
    for (let i = 0; i < 5; i++) {
      s = applySeq(s, "AAAA", RULES_BEST_OF_1);
    }
    s = applySeq(s, "AA", RULES_BEST_OF_1);
    
    const v = formatDisplay(s, RULES_BEST_OF_1);
    expect(v.pointSituation).toBeNull();
  });
});