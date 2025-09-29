// src/stores/game-store.ts
"use client";

import { create } from "zustand";
import type { GameRuleSet, DeuceRule, SetTieRule } from "@types/rules";
import { initState, scorePoint as engineScorePoint, formatDisplay, type EngineState, type Team } from "@lib/engine/engine";

const DEFAULT_RULES: GameRuleSet = {
  scoringMode: "standard",
  matchFormat: "sets",
  target: 1,
  deuceRule: "advantage",
  gamesPerSet: 6,
  setTieRule: "tiebreak",
  setTieAtGames: 6,
  tiebreakTo: 7
};

type GameStore = {
  rules: GameRuleSet;
  state: EngineState;
  history: EngineState[];
  scorePoint: (team: Team) => void;
  undo: () => void;
  reset: (server?: Team) => void;
  setDeuceRule: (rule: DeuceRule) => void;
  setSetsTarget: (sets: 1 | 2) => void;
  setTiebreakRule: (rule: SetTieRule) => void;
  view: () => ReturnType<typeof formatDisplay>;
};

export const useGameStore = create<GameStore>((set, get) => ({
  rules: DEFAULT_RULES,
  state: initState(DEFAULT_RULES, 'A'),
  history: [],

  scorePoint: (team) => {
    const { state, rules, history } = get();
    const next = engineScorePoint(state, rules, team);
    if (next !== state) {
      const newHistory = [...history, state];
      if (newHistory.length > 100) newHistory.shift();
      set({ state: next, history: newHistory });
    }
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({ state: prev, history: history.slice(0, -1) });
  },

  reset: (server = 'A') => {
    const { rules } = get();
    set({
      state: initState(rules, server),
      history: []
    });
  },

  setDeuceRule: (rule) => {
    const rules = { ...get().rules, deuceRule: rule };
    set({ 
      rules, 
      state: initState(rules, 'A'),
      history: []
    });
  },

  setSetsTarget: (sets) => {
    const rules = { ...get().rules, target: sets };
    set({ 
      rules, 
      state: initState(rules, 'A'),
      history: []
    });
  },

  setTiebreakRule: (rule) => {
    const rules = { ...get().rules, setTieRule: rule };
    set({ 
      rules, 
      state: initState(rules, 'A'),
      history: []
    });
  },

  view: () => formatDisplay(get().state, get().rules)
}));