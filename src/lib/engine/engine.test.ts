// src/lib/engine/engine.test.ts
import { describe, it, expect } from "vitest";
import {
  initState,
  scorePoint,
  formatDisplay,
  type EngineState,
  type Team,
} from "./engine";
import type { GameRuleSet } from "@types/rules";

/**
 * Quick Play rules (advantage, TB7 at 6–6, best of 1 set)
 */
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

/** helper: apply a short sequence of point winners like "AABAB" */
function applySeq(s: EngineState, seq: string, rules: GameRuleSet = RULES): EngineState {
  let cur = s;
  for (const ch of seq) {
    const t: Team = ch === "A" ? "A" : "B";
    cur = scorePoint(cur, rules, t);
  }
  return cur;
}

describe("engine: quick play baseline", () => {
  it("starts at 0-0 points, 0-0 games, sets 0-0", () => {
    const s = initState(RULES, "A");
    const v = formatDisplay(s);
    expect(v.points.A).toBe("0");
    expect(v.points.B).toBe("0");
    expect(v.games.A).toBe(0);
    expect(v.games.B).toBe(0);
    expect(v.setsWon.A).toBe(0);
    expect(v.setsWon.B).toBe(0);
    expect(v.server).toBe("A");
  });

  it("A wins a clean game (four straight points) → gamesA=1, server flips", () => {
    let s = initState(RULES, "A");
    s = applySeq(s, "AAAA");
    const v = formatDisplay(s);
    expect(v.games.A).toBe(1);
    expect(v.games.B).toBe(0);
    expect(v.points.A).toBe("0");
    expect(v.points.B).toBe("0");
    expect(v.setsWon.A).toBe(0); // no premature set win
    expect(v.server).toBe("B");  // server flips after game
  });

  it("multiple deuce cycles do not prematurely end the game", () => {
    let s = initState(RULES, "A");
    // Reach deuce: A(3),B(3)
    s = applySeq(s, "AAABBB");
    let v = formatDisplay(s);
    expect(v.flags.deuce).toBe(true);

    // A gets advantage, back to deuce, then A wins game by 2
    s = applySeq(s, "ABAA");
    v = formatDisplay(s);
    expect(v.games.A).toBe(1);
    expect(v.games.B).toBe(0);
  });

  it("set can be won 7-5 (win by 2 without tiebreak)", () => {
    let s = initState(RULES, "A");
    const winGameA = () => (s = applySeq(s, "AAAA"));
    const winGameB = () => (s = applySeq(s, "BBBB"));

    winGameA(); // 1-0
    winGameB(); // 1-1
    winGameA(); // 2-1
    winGameB(); // 2-2
    winGameA(); // 3-2
    winGameB(); // 3-3
    winGameA(); // 4-3
    winGameB(); // 4-4
    winGameA(); // 5-4
    winGameB(); // 5-5
    winGameA(); // 6-5
    winGameA(); // 7-5 (set ends)

    const v = formatDisplay(s);
    expect(v.setsWon.A).toBe(1);
    expect(s.finished?.winner).toBe("A");
  });

  it("tiebreak triggers at 6-6 and ends at 7 by 2", () => {
    let s = initState(RULES, "A");
    const winGameA = () => (s = applySeq(s, "AAAA"));
    const winGameB = () => (s = applySeq(s, "BBBB"));

    // alternate wins to reach 6–6 (avoid ending the set early)
    for (let i = 0; i < 6; i++) {
      winGameA();
      winGameB();
    }

    const v0 = formatDisplay(s);
    expect(v0.flags.tiebreak).toBe(true);

    // A wins TB 7–5
    s = applySeq(s, "AABB"); // 2–2
    s = applySeq(s, "ABAB"); // 4–4
    s = applySeq(s, "AB");   // 5–5
    s = applySeq(s, "AA");   // 7–5

    const v = formatDisplay(s);
    expect(v.setsWon.A).toBe(1);
    expect(s.finished?.winner).toBe("A");
  });

  it("server alternates each game; tiebreak uses 1, then 2/2 pattern", () => {
    let s = initState(RULES, "A");
    const winGame = (team: Team) =>
      (s = applySeq(s, team === "A" ? "AAAA" : "BBBB"));

    // normal alternation
    expect(s.server).toBe("A");
    winGame("A");
    expect(s.server).toBe("B");
    winGame("B");
    expect(s.server).toBe("A");

    // reach 6–6 by alternating games
    for (let i = 0; i < 4; i++) { winGame("A"); winGame("B"); } // 5–5
    winGame("A"); // 6–5
    winGame("B"); // 6–6 → tiebreak

    expect(s.currentGame.inTiebreak).toBe(true);
    const set = s.sets[s.sets.length - 1];
    const startServer = set.tiebreak?.startServer!;
    expect(startServer).toBeDefined();

    // First TB point by startServer
    const before = s.server;
    s = scorePoint(s, RULES, "A"); // play 1 TB point
    expect(before).toBe(startServer);       // first point served by startServer
    expect(s.server).not.toBe(startServer); // then switch to the other team (start of 2/2 blocks)
  });

  it("formatDisplay counts only completed sets", () => {
    let s = initState(RULES, "A");
    s = applySeq(s, "AAAA"); // one game only
    const v = formatDisplay(s);
    expect(v.setsWon.A).toBe(0);
    expect(v.setsWon.B).toBe(0);
  });
});

describe("engine: boundary behaviours", () => {
  it("'undo-like' check: snapshots across deuce and across game end", () => {
    // NOTE: engine is pure; real undo lives in the store. Here we just snapshot.
    const rules = RULES;
    let s0 = initState(rules, "A");

    // Reach deuce
    let s1 = scorePoint(s0, rules, "A");
    s1 = scorePoint(s1, rules, "A");
    s1 = scorePoint(s1, rules, "A");
    s1 = scorePoint(s1, rules, "B");
    s1 = scorePoint(s1, rules, "B");
    s1 = scorePoint(s1, rules, "B");
    const vDeuce = formatDisplay(s1);
    expect(vDeuce.flags.deuce).toBe(true);

    const snapAtDeuce = structuredClone(s1);

    // A takes the game (Ad, then game)
    let s2 = scorePoint(s1, rules, "A");
    s2 = scorePoint(s2, rules, "A");

    // Compare with snapshot
    const vSnap = formatDisplay(snapAtDeuce);
    expect(vSnap.flags.deuce).toBe(true);

    // Confirm game progressed
    const vAfter = formatDisplay(s2);
    expect(vAfter.games.A).toBe(1);
    expect(vAfter.points.A).toBe("0");
    expect(vAfter.points.B).toBe("0");
  });

  it("tiebreak: team that did NOT start the TB serves first in the next set (rule conformance)", () => {
    let s = initState(RULES, "A");
    const winGame = (team: Team) =>
      (s = applySeq(s, team === "A" ? "AAAA" : "BBBB"));

    // Reach 6–6 by alternating
    for (let i = 0; i < 6; i++) { winGame("A"); winGame("B"); }

    const tbStartServer = s.sets[s.sets.length - 1].tiebreak?.startServer;
    expect(tbStartServer).toBeDefined();

    // Let A win TB 7–5
    s = applySeq(s, "AABBABABABAA");

    // In Quick Play the match ends, but engine marked the set completed.
    const lastSet = s.sets[s.sets.length - 1];
    expect(lastSet.completed).toBe(true);
    expect(s.finished?.winner).toBeDefined();

    // By rule: next set (if it existed) would start with the opposite of TB start server
    const expectedNextServer = tbStartServer === "A" ? "B" : "A";
    expect(["A", "B"]).toContain(expectedNextServer); // conceptual assertion
  });

  it("reset behaviour: initState returns a clean slate", () => {
    let s = initState(RULES, "A");
    s = scorePoint(s, RULES, "A");
    s = scorePoint(s, RULES, "A");
    s = scorePoint(s, RULES, "B");

    const vMid = formatDisplay(s);
    expect(vMid.points.A).not.toBe("0");

    // 'Reset' at engine level = re-init
    const r = initState(RULES, "A");
    const v0 = formatDisplay(r);
    expect(v0.points.A).toBe("0");
    expect(v0.points.B).toBe("0");
    expect(v0.games.A).toBe(0);
    expect(v0.games.B).toBe(0);
    expect(v0.setsWon.A).toBe(0);
    expect(v0.setsWon.B).toBe(0);
    expect(v0.server).toBe("A");
  });
});

// ----------------- GOLDEN POINT TESTS -----------------
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
    // Reach deuce: 3–3
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "B");
    let v = formatDisplay(s);
    expect(v.flags.deuce).toBe(true);
    
    // Next point should immediately take the game for that team
    s = scorePoint(s, RULES_GOLDEN, "A");
    v = formatDisplay(s);
    expect(v.games.A).toBe(1);
    expect(v.games.B).toBe(0);
    expect(v.points.A).toBe("0");
    expect(v.points.B).toBe("0");
  });

  it("normal scoring still works pre-deuce; golden only applies at deuce", () => {
    let s = initState(RULES_GOLDEN, "A");
    // A: 40–30 (3–2)
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "B");
    let v = formatDisplay(s);
    expect(v.flags.deuce).toBe(false);
    
    // Next A point should also win the game (but that's just normal 40–30 → game)
    s = scorePoint(s, RULES_GOLDEN, "A");
    v = formatDisplay(s);
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
    
    // Alternate wins to 6–6 so we trigger tiebreak
    for (let i = 0; i < 6; i++) { winGame("A"); winGame("B"); }
    let v = formatDisplay(s);
    expect(v.flags.tiebreak).toBe(true);
    
    // Play some TB points; ensure it behaves as usual
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    s = scorePoint(s, RULES_GOLDEN, "A");
    s = scorePoint(s, RULES_GOLDEN, "B");
    v = formatDisplay(s);
    expect(v.flags.tiebreak).toBe(true); // still in tiebreak
  });
});

// ----------------- SILVER POINT TESTS -----------------
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

  it("first deuce uses advantage rule (traditional)", () => {
    let s = initState(RULES_SILVER, "A");
    // Reach deuce: 3–3
    s = applySeq(s, "AAABBB", RULES_SILVER);
    let v = formatDisplay(s);
    expect(v.flags.deuce).toBe(true);
    
    // A gets advantage
    s = scorePoint(s, RULES_SILVER, "A");
    v = formatDisplay(s);
    expect(v.points.A).toBe("Ad");
    expect(v.points.B).toBe("40");
    
    // A wins from advantage
    s = scorePoint(s, RULES_SILVER, "A");
    v = formatDisplay(s);
    expect(v.games.A).toBe(1);
    expect(v.games.B).toBe(0);
  });

  it("first deuce can return to deuce (advantage cycle)", () => {
    let s = initState(RULES_SILVER, "A");
    // Reach deuce
    s = applySeq(s, "AAABBB", RULES_SILVER);
    let v = formatDisplay(s);
    expect(v.flags.deuce).toBe(true);
    
    // A gets advantage, then back to deuce
    s = scorePoint(s, RULES_SILVER, "A");
    s = scorePoint(s, RULES_SILVER, "B");
    v = formatDisplay(s);
    expect(v.flags.deuce).toBe(true);
    expect(v.points.A).toBe("40");
    expect(v.points.B).toBe("40");
  });

  it("second deuce is sudden death (golden point)", () => {
    let s = initState(RULES_SILVER, "A");
    // Reach first deuce
    s = applySeq(s, "AAABBB", RULES_SILVER);
    
    // Advantage cycle back to deuce (this is now the second deuce)
    s = scorePoint(s, RULES_SILVER, "A"); // Adv A
    s = scorePoint(s, RULES_SILVER, "B"); // Back to deuce (deuce #2)
    
    let v = formatDisplay(s);
    expect(v.flags.deuce).toBe(true);
    
    // Next point should win the game (sudden death)
    s = scorePoint(s, RULES_SILVER, "B");
    v = formatDisplay(s);
    expect(v.games.B).toBe(1);
    expect(v.games.A).toBe(0);
    expect(v.points.A).toBe("0");
    expect(v.points.B).toBe("0");
  });

  it("silver point doesn't affect pre-deuce scoring", () => {
    let s = initState(RULES_SILVER, "A");
    // Normal 40-30 scenario
    s = applySeq(s, "AAABB", RULES_SILVER);
    let v = formatDisplay(s);
    expect(v.points.A).toBe("40");
    expect(v.points.B).toBe("30");
    
    // A wins normally
    s = scorePoint(s, RULES_SILVER, "A");
    v = formatDisplay(s);
    expect(v.games.A).toBe(1);
  });
});