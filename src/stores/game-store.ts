import { create } from 'zustand';
import { initState, scorePoint as engineScorePoint, formatDisplay } from '@lib/engine/engine';
import type { GameState, MatchRules, Team } from '@lib/engine/engine';

interface GameStore {
  state: GameState;
  rules: MatchRules;
  history: GameState[];
  sidesSwapped: boolean;
  
  scorePoint: (team: Team) => void;
  undo: () => void;
  reset: (server?: Team) => void;
  swapSides: () => void;
  
  setDeuceRule: (rule: 'advantage' | 'silver' | 'golden') => void;
  setSetsTarget: (sets: 1 | 3) => void;
  setTiebreakRule: (rule: 'tiebreak' | 'play-on') => void;
  setScoringSystem: (system: 'standard' | 'americano') => void;
  setGameRules: (config: {
    deuceRule: 'advantage' | 'silver' | 'golden';
    setTieRule: 'tiebreak' | 'play-on';
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