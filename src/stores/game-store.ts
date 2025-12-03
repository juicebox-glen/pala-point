import { create } from 'zustand';
import { initState, scorePoint as engineScorePoint, formatDisplay } from '@lib/engine/engine';
import type { EngineState, Team } from '@lib/engine/engine';
import type { MatchRules, DeuceRule, SetTieRule } from '../types/rules';

interface GameStore {
  state: EngineState;
  rules: MatchRules;
  history: EngineState[];
  sidesSwapped: boolean;
  
  scorePoint: (team: Team) => void;
  undo: () => void;
  reset: (server?: Team) => void;
  swapSides: () => void;
  
  setDeuceRule: (rule: DeuceRule) => void;
  setSetsTarget: (sets: 1 | 3) => void;
  setTiebreakRule: (rule: SetTieRule) => void;
  setScoringSystem: (system: 'standard' | 'americano') => void;
  setGameRules: (config: {
    deuceRule: DeuceRule;
    setTieRule: SetTieRule;
    setsTarget: 1 | 3;
  }) => void;
  
  view: () => ReturnType<typeof formatDisplay>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: initState({
    scoringSystem: 'standard',
    deuceRule: 'advantage',
    setTieRule: 'tiebreak',
    setsTarget: 1,
    firstServer: 'random',
  }, 'A'),
  
  rules: {
    scoringSystem: 'standard',
    deuceRule: 'advantage',
    setTieRule: 'tiebreak',
    setsTarget: 1,
    firstServer: 'random',
  },
  
  history: [],
  sidesSwapped: false,

  scorePoint: (team) => {
    const { state, rules, history } = get();
    const newState = engineScorePoint(state, rules, team);
    set({ 
      state: newState, 
      history: [...history, state].slice(-50)
    });
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
      history: [],
      sidesSwapped: false
    });
  },

  swapSides: () => {
    set((state) => ({ sidesSwapped: !state.sidesSwapped }));
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
    
    // Convert setsTarget: 1 | 3 (number of sets) to 1 | 2 (best of format)
    // 1 set = best of 1 (setsTarget: 1)
    // 3 sets = best of 3 (setsTarget: 2, meaning need 2 sets to win)
    const setsTarget: 1 | 2 = sets === 3 ? 2 : 1;
    
    const newRules = { ...rules, setsTarget };
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

  setGameRules: (config) => {
    // Convert setsTarget: 1 | 3 (number of sets) to 1 | 2 (best of format)
    // 1 set = best of 1 (setsTarget: 1)
    // 3 sets = best of 3 (setsTarget: 2, meaning need 2 sets to win)
    const setsTarget: 1 | 2 = config.setsTarget === 3 ? 2 : 1;
    
    const rules: MatchRules = {
      scoringSystem: 'standard',
      deuceRule: config.deuceRule,
      setTieRule: config.setTieRule,
      setsTarget,
      firstServer: 'random',
    };
    
    set({ 
      rules,
      history: []
    });
  },

  view: () => formatDisplay(get().state, get().rules)
}));