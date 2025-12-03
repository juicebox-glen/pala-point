import { describe, it, expect } from "vitest";
import { initState, scorePoint, formatDisplay } from "./engine";
import type { MatchRules } from "../../types/rules";

const STANDARD_RULES: MatchRules = {
  scoringSystem: "standard",
  deuceRule: "advantage",
  setTieRule: "tiebreak",
  setsTarget: 1,
  firstServer: "random",
};

const GOLDEN_RULES: MatchRules = {
  scoringSystem: "standard",
  deuceRule: "golden-point",
  setTieRule: "tiebreak",
  setsTarget: 1,
  firstServer: "random",
};

const SILVER_RULES: MatchRules = {
  scoringSystem: "standard",
  deuceRule: "silver-point",
  setTieRule: "tiebreak",
  setsTarget: 1,
  firstServer: "random",
};

const PLAY_ON_RULES: MatchRules = {
  scoringSystem: "standard",
  deuceRule: "advantage",
  setTieRule: "play-on",
  setsTarget: 1,
  firstServer: "random",
};

const AMERICANO_RULES: MatchRules = {
  scoringSystem: "americano",
  targetPoints: 50,
  servesPerTurn: 4,
  sideSwapEveryServes: 16,
  firstServer: "random",
};

describe("Engine — Standard Padel Scoring", () => {
  it("initializes with correct state", () => {
    const s = initState(STANDARD_RULES, "A");
    expect(s.server).toBe("A");
    expect(s.sets).toHaveLength(1);
    expect(s.currentGame.pA).toBe(0);
    expect(s.currentGame.pB).toBe(0);
  });

  it("scores points correctly (0→15→30→40)", () => {
    let s = initState(STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "A");
    const v = formatDisplay(s, STANDARD_RULES);
    expect(v.points.A).toBe("15");
    expect(v.points.B).toBe("0");
  });

  it("wins a game at 4 points with 2-point lead", () => {
    let s = initState(STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "A"); // 15-0
    s = scorePoint(s, STANDARD_RULES, "A"); // 30-0
    s = scorePoint(s, STANDARD_RULES, "A"); // 40-0
    s = scorePoint(s, STANDARD_RULES, "A"); // game
    const v = formatDisplay(s, STANDARD_RULES);
    expect(v.games.A).toBe(1);
    expect(v.games.B).toBe(0);
    expect(v.points.A).toBe("0");
  });

  it("handles deuce correctly (40-40)", () => {
    let s = initState(STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "A"); // 15-0
    s = scorePoint(s, STANDARD_RULES, "A"); // 30-0
    s = scorePoint(s, STANDARD_RULES, "A"); // 40-0
    s = scorePoint(s, STANDARD_RULES, "B"); // 40-15
    s = scorePoint(s, STANDARD_RULES, "B"); // 40-30
    s = scorePoint(s, STANDARD_RULES, "B"); // 40-40
    const v = formatDisplay(s, STANDARD_RULES);
    expect(v.points.A).toBe("40");
    expect(v.points.B).toBe("40");
    expect(v.flags.deuce).toBe(true);
  });

  it("shows advantage correctly", () => {
    let s = initState(STANDARD_RULES, "A");
    // Get to deuce
    s = scorePoint(s, STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "B");
    s = scorePoint(s, STANDARD_RULES, "B");
    s = scorePoint(s, STANDARD_RULES, "B"); // 40-40
    s = scorePoint(s, STANDARD_RULES, "A"); // Ad-40
    const v = formatDisplay(s, STANDARD_RULES);
    expect(v.points.A).toBe("Ad");
    expect(v.points.B).toBe("40");
    expect(v.flags.advantage).toBe("A");
  });

  it("wins set at 6 games with 2-game lead", () => {
    let s = initState(STANDARD_RULES, "A");
    // Win 6 games for A
    for (let i = 0; i < 6; i++) {
      s = scorePoint(s, STANDARD_RULES, "A");
      s = scorePoint(s, STANDARD_RULES, "A");
      s = scorePoint(s, STANDARD_RULES, "A");
      s = scorePoint(s, STANDARD_RULES, "A");
    }
    const v = formatDisplay(s, STANDARD_RULES);
    expect(v.setsWon.A).toBe(1);
    expect(v.setsWon.B).toBe(0);
    expect(s.finished?.winner).toBe("A");
  });

  it("triggers tiebreak at 6-6", () => {
    let s = initState(STANDARD_RULES, "A");
    // Win 6 games each
    for (let i = 0; i < 6; i++) {
      // Team A wins
      for (let j = 0; j < 4; j++) s = scorePoint(s, STANDARD_RULES, "A");
      // Team B wins
      for (let j = 0; j < 4; j++) s = scorePoint(s, STANDARD_RULES, "B");
    }
    const v = formatDisplay(s, STANDARD_RULES);
    expect(v.games.A).toBe(6);
    expect(v.games.B).toBe(6);
    expect(v.flags.tiebreak).toBe(true);
  });

  it("resolves tiebreak correctly", () => {
    let s = initState(STANDARD_RULES, "A");
    // Get to 6-6
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) s = scorePoint(s, STANDARD_RULES, "A");
      for (let j = 0; j < 4; j++) s = scorePoint(s, STANDARD_RULES, "B");
    }
    // Win tiebreak 7-5
    for (let i = 0; i < 7; i++) s = scorePoint(s, STANDARD_RULES, "A");
    for (let i = 0; i < 5; i++) s = scorePoint(s, STANDARD_RULES, "B");
    
    expect(s.finished?.winner).toBe("A");
  });
});

describe("Engine — Golden Point", () => {
  it("resolves deuce immediately with golden point", () => {
    let s = initState(GOLDEN_RULES, "A");
    // Get to deuce (40-40)
    s = scorePoint(s, GOLDEN_RULES, "A");
    s = scorePoint(s, GOLDEN_RULES, "A");
    s = scorePoint(s, GOLDEN_RULES, "A");
    s = scorePoint(s, GOLDEN_RULES, "B");
    s = scorePoint(s, GOLDEN_RULES, "B");
    s = scorePoint(s, GOLDEN_RULES, "B"); // 40-40
    
    const v1 = formatDisplay(s, GOLDEN_RULES);
    expect(v1.statusMessage).toBe("Golden Point");
    
    // Next point wins
    s = scorePoint(s, GOLDEN_RULES, "A");
    const v2 = formatDisplay(s, GOLDEN_RULES);
    expect(v2.games.A).toBe(1);
    expect(v2.points.A).toBe("0");
  });
});

describe("Engine — Silver Point", () => {
  it("first deuce uses advantage, second deuce is sudden death", () => {
    let s = initState(SILVER_RULES, "A");
    // Get to first deuce
    s = scorePoint(s, SILVER_RULES, "A");
    s = scorePoint(s, SILVER_RULES, "A");
    s = scorePoint(s, SILVER_RULES, "A");
    s = scorePoint(s, SILVER_RULES, "B");
    s = scorePoint(s, SILVER_RULES, "B");
    s = scorePoint(s, SILVER_RULES, "B"); // First deuce
    
    expect(s.currentGame.deuceCount).toBe(1);
    
    // Score advantage
    s = scorePoint(s, SILVER_RULES, "A");
    let v = formatDisplay(s, SILVER_RULES);
    expect(v.points.A).toBe("Ad");
    
    // Back to deuce (second deuce)
    s = scorePoint(s, SILVER_RULES, "B");
    v = formatDisplay(s, SILVER_RULES);
    expect(s.currentGame.deuceCount).toBe(2);
    expect(v.statusMessage).toContain("Silver Point");
    
    // Next point wins (sudden death)
    s = scorePoint(s, SILVER_RULES, "B");
    v = formatDisplay(s, SILVER_RULES);
    expect(v.games.B).toBe(1);
  });
});

describe("Engine — Play-On (no tiebreak)", () => {
  it("continues past 6-6 without tiebreak", () => {
    let s = initState(PLAY_ON_RULES, "A");
    // Get to 6-6
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) s = scorePoint(s, PLAY_ON_RULES, "A");
      for (let j = 0; j < 4; j++) s = scorePoint(s, PLAY_ON_RULES, "B");
    }
    
    const v = formatDisplay(s, PLAY_ON_RULES);
    expect(v.games.A).toBe(6);
    expect(v.games.B).toBe(6);
    expect(v.flags.tiebreak).toBe(false);
    
    // Continue playing games
    for (let j = 0; j < 4; j++) s = scorePoint(s, PLAY_ON_RULES, "A"); // 7-6
    const v2 = formatDisplay(s, PLAY_ON_RULES);
    expect(v2.games.A).toBe(7);
    expect(v2.games.B).toBe(6);
    expect(s.finished).toBeUndefined(); // Need 2-game lead
    
    // Win 8-6
    for (let j = 0; j < 4; j++) s = scorePoint(s, PLAY_ON_RULES, "A");
    expect(s.finished?.winner).toBe("A");
  });
});

describe("Engine — Americano Mode", () => {
  it("initializes americano state correctly", () => {
    const s = initState(AMERICANO_RULES, "A");
    expect(s.americano).toBeDefined();
    expect(s.americano?.teamAPoints).toBe(0);
    expect(s.americano?.teamBPoints).toBe(0);
    expect(s.americano?.servesInCurrentTurn).toBe(0);
  });

  it("increments points correctly", () => {
    let s = initState(AMERICANO_RULES, "A");
    s = scorePoint(s, AMERICANO_RULES, "A");
    s = scorePoint(s, AMERICANO_RULES, "A");
    s = scorePoint(s, AMERICANO_RULES, "B");
    
    const v = formatDisplay(s, AMERICANO_RULES);
    expect(v.points.A).toBe("2");
    expect(v.points.B).toBe("1");
    expect(v.flags.americano).toBe(true);
  });

  it("changes server after servesPerTurn", () => {
    let s = initState(AMERICANO_RULES, "A");
    expect(s.server).toBe("A");
    
    // Score 4 points (servesPerTurn = 4)
    s = scorePoint(s, AMERICANO_RULES, "A");
    s = scorePoint(s, AMERICANO_RULES, "A");
    s = scorePoint(s, AMERICANO_RULES, "B");
    s = scorePoint(s, AMERICANO_RULES, "A");
    
    // Server should switch
    expect(s.server).toBe("B");
    expect(s.americano?.servesInCurrentTurn).toBe(0);
  });

  it("displays serves remaining correctly", () => {
    let s = initState(AMERICANO_RULES, "A");
    s = scorePoint(s, AMERICANO_RULES, "A");
    s = scorePoint(s, AMERICANO_RULES, "B");
    
    const v = formatDisplay(s, AMERICANO_RULES);
    expect(v.americanoServes).toBe(2); // 4 - 2 = 2 serves remaining
  });

  it("ends match when target reached", () => {
    const lowTargetRules: MatchRules = {
      ...AMERICANO_RULES,
      targetPoints: 5,
    };
    
    let s = initState(lowTargetRules, "A");
    for (let i = 0; i < 5; i++) {
      s = scorePoint(s, lowTargetRules, "A");
    }
    
    expect(s.finished?.winner).toBe("A");
    expect(s.finished?.reason).toBe("points");
  });
});

describe("Engine — Point Situations", () => {
  it("detects set point correctly", () => {
    let s = initState(STANDARD_RULES, "A");
    // Get to 5-0, 40-0 (set point)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) s = scorePoint(s, STANDARD_RULES, "A");
    }
    // Get to 40-0 in 6th game
    s = scorePoint(s, STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "A");
    s = scorePoint(s, STANDARD_RULES, "A");
    
    const v = formatDisplay(s, STANDARD_RULES);
    expect(v.pointSituation?.type).toBe("match-point"); // Changed from "set-point"
    expect(v.pointSituation?.team).toBe("A");
  });

  it("detects match point in best-of-3", () => {
    const best3Rules: MatchRules = {
      ...STANDARD_RULES,
      setsTarget: 2,
    };
    
    let s = initState(best3Rules, "A");
    // Win first set
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) s = scorePoint(s, best3Rules, "A");
    }
    
    // Win second set up to 5-0, 40-0 (match point)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) s = scorePoint(s, best3Rules, "A");
    }
    s = scorePoint(s, best3Rules, "A");
    s = scorePoint(s, best3Rules, "A");
    s = scorePoint(s, best3Rules, "A");
    
    const v = formatDisplay(s, best3Rules);
    expect(v.pointSituation?.type).toBe("match-point");
    expect(v.pointSituation?.team).toBe("A");
  });
});