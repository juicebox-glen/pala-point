import { create } from 'zustand';
import { initState, scorePoint as engineScorePoint, formatDisplay } from '@lib/engine/engine';
import type { EngineState, Team } from '@lib/engine/engine';
import type { MatchRules, DeuceRule, SetTieRule } from '../types/rules';

const STORAGE_KEY = 'palapoint_saved_game';
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

interface HistoryEntry {
  state: EngineState;
  sidesSwapped: boolean;
}

interface SavedGameState {
  state: EngineState;
  rules: MatchRules;
  history: HistoryEntry[];
  sidesSwapped: boolean;
  timestamp: number;
}

// Save game state to localStorage
function saveGameState(state: EngineState, rules: MatchRules, history: HistoryEntry[], sidesSwapped: boolean): void {
  try {
    const savedState: SavedGameState = {
      state,
      rules,
      history,
      sidesSwapped,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

// Load saved game from localStorage if less than 24 hours old
function loadSavedGame(): SavedGameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const savedState: SavedGameState = JSON.parse(saved);
    const age = Date.now() - savedState.timestamp;

    // Delete if older than 24 hours
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return savedState;
  } catch (error) {
    console.error('Failed to load saved game:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (clearError) {
      console.error('Failed to clear corrupted save:', clearError);
    }
    return null;
  }
}

// Clear saved game from localStorage
function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear saved game:', error);
  }
}

interface GameStore {
  state: EngineState;
  rules: MatchRules;
  history: HistoryEntry[];
  sidesSwapped: boolean;
  matchStartTime: string | null;  // ISO timestamp when game started
  courtId: string | null;          // Court UUID from environment
  
  scorePoint: (team: Team) => void;
  undo: () => void;
  reset: (server?: Team) => void;
  swapSides: () => void;
  restoreSavedGame: () => boolean;
  clearSavedGame: () => void;
  setMatchStartTime: (time: string | null) => void;
  setCourtId: (id: string | null) => void;
  
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
  matchStartTime: null,
  courtId: null,

  scorePoint: (team) => {
    const { state, rules, history, sidesSwapped } = get();
    const newState = engineScorePoint(state, rules, team);
    // Save current state and sidesSwapped to history before scoring
    const newHistory: HistoryEntry[] = [...history, { state, sidesSwapped }].slice(-50);
    set({ 
      state: newState, 
      history: newHistory
    });
    // Auto-save after each point
    saveGameState(newState, rules, newHistory, sidesSwapped);
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prevEntry = history[history.length - 1];
    // Restore both the engine state and the sidesSwapped state
    set({ 
      state: prevEntry.state, 
      sidesSwapped: prevEntry.sidesSwapped,
      history: history.slice(0, -1) 
    });
  },

  reset: (server?: Team) => {
    const { rules } = get();
    // If no server specified, randomly select one
    const startServer = server || (Math.random() > 0.5 ? 'A' : 'B');
    set({
      state: initState(rules, startServer),
      history: [],
      sidesSwapped: false,
      matchStartTime: null  // Reset match start time
    });
    // Clear saved game when starting new game
    clearSavedGame();
  },

  swapSides: () => {
    set((state) => ({ sidesSwapped: !state.sidesSwapped }));
  },

  restoreSavedGame: () => {
    const saved = loadSavedGame();
    if (!saved) {
      return false;
    }

    try {
      // Migrate old history format (EngineState[]) to new format (HistoryEntry[])
      let migratedHistory: HistoryEntry[];
      if (saved.history.length > 0 && !('state' in saved.history[0])) {
        // Old format: EngineState[]
        migratedHistory = (saved.history as any[]).map((state: EngineState) => ({
          state,
          sidesSwapped: saved.sidesSwapped // Use current sidesSwapped for all entries (best guess)
        }));
      } else {
        // New format: HistoryEntry[]
        migratedHistory = saved.history as HistoryEntry[];
      }
      
      set({
        state: saved.state,
        rules: saved.rules,
        history: migratedHistory,
        sidesSwapped: saved.sidesSwapped,
      });
      return true;
    } catch (error) {
      console.error('Failed to restore saved game:', error);
      clearSavedGame();
      return false;
    }
  },

  clearSavedGame: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear saved game:', error);
    }
  },

  setMatchStartTime: (time) => {
    set({ matchStartTime: time });
  },

  setCourtId: (id) => {
    set({ courtId: id });
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