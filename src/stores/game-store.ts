// src/stores/game-store.ts
"use client";

import { create } from "zustand";
import type { MatchRules, DeuceRule, SetTieRule, ScoringSystem } from "@types/rules";
import type { ClubConfig } from "@types/config";
import { initState, scorePoint as engineScorePoint, formatDisplay, type EngineState, type Team } from "@lib/engine/engine";

import clubConfigData from "@config/club-config.example.json";
const clubConfig = clubConfigData as ClubConfig;

const DEFAULT_RULES: MatchRules = {
    scoringSystem: 'standard',
    deuceRule: 'advantage',
    setTieRule: 'tiebreak',
    setsTarget: 1,
    firstServer: 'random',
  };

type GameStore = {
  clubId: string;
  courtId: string;
  rules: MatchRules;
  state: EngineState;
  history: EngineState[];
  scorePoint: (team: Team) => void;
  undo: () => void;
  reset: (server?: Team) => void;
  setDeuceRule: (rule: DeuceRule) => void;
  setSetsTarget: (sets: 1 | 2) => void;
  setTiebreakRule: (rule: SetTieRule) => void;
  setScoringSystem: (system: ScoringSystem) => void;
  setGameRules: (config: { 
    deuceRule: DeuceRule; 
    setsTarget: 1 | 2; 
    setTieRule: SetTieRule; 
  }) => void;
  view: () => ReturnType<typeof formatDisplay>;
};

export const useGameStore = create<GameStore>((set, get) => ({
  clubId: clubConfig.clubId,
  courtId: clubConfig.courtId,
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
    const { rules } = get();
    if (rules.scoringSystem !== 'standard') return;
    
    const newRules = { ...rules, deuceRule: rule };
    set({ 
      rules: newRules, 
      state: initState(newRules, 'A'),
      history: []
    });
  },

  setSetsTarget: (sets) => {
    const { rules } = get();
    if (rules.scoringSystem !== 'standard') return;
    
    const newRules = { ...rules, setsTarget: sets };
    set({ 
      rules: newRules, 
      state: initState(newRules, 'A'),
      history: []
    });
  },

  setTiebreakRule: (rule) => {
    const { rules } = get();
    if (rules.scoringSystem !== 'standard') return;
    
    const newRules = { ...rules, setTieRule: rule };
    set({ 
      rules: newRules, 
      state: initState(newRules, 'A'),
      history: []
    });
  },

  setScoringSystem: (system) => {
    let rules: MatchRules;
    
    if (system === 'americano') {
      rules = {
        scoringSystem: 'americano',
        targetPoints: 50,
        servesPerTurn: 4,
        sideSwapEveryServes: 16,
        firstServer: 'random',
      };
    } else {
      rules = {
        scoringSystem: 'standard',
        deuceRule: 'advantage',
        setTieRule: 'tiebreak',
        setsTarget: 1,
        firstServer: 'random',
      };
    }
    
    set({ 
      rules, 
      state: initState(rules, 'A'),
      history: []
    });
  },

  // NEW: Batch update all game rules at once
  setGameRules: (config) => {
    const rules: MatchRules = {
      scoringSystem: 'standard',
      deuceRule: config.deuceRule,
      setTieRule: config.setTieRule,
      setsTarget: config.setsTarget,
      firstServer: 'random',
    };
    
    set({ 
      rules,
      history: []
    });
  },

  view: () => formatDisplay(get().state, get().rules)
}));