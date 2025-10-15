// src/types/rules.ts

export type ScoringSystem = 'standard' | 'americano';
export type DeuceRule = 'advantage' | 'golden-point' | 'silver-point';
export type SetTieRule = 'tiebreak' | 'play-on';
export type FirstServer = 'random' | 'A' | 'B';

export interface StandardRules {
  scoringSystem: 'standard';
  deuceRule: DeuceRule;
  setTieRule: SetTieRule;
  setsTarget: 1 | 2; // Best of 1 or Best of 3
  firstServer: FirstServer;
}

export interface AmericanoRules {
  scoringSystem: 'americano';
  targetPoints: number;        // e.g., 50
  servesPerTurn: number;       // e.g., 4
  sideSwapEveryServes: number; // e.g., 16
  firstServer: FirstServer;
}

export type MatchRules = StandardRules | AmericanoRules;

// Validation bounds
export const VALIDATION_BOUNDS = {
  servesPerTurn: { min: 2, max: 6 },
  sideSwapEveryServes: { min: 8, max: 32 },
  targetPoints: { min: 10, max: 100 },
} as const;

// Helper function to validate a ruleset
export function validateRuleSet(rules: MatchRules): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rules.scoringSystem === 'standard') {
    if (!rules.deuceRule) errors.push('deuceRule required for standard padel');
    if (!rules.setTieRule) errors.push('setTieRule required for standard padel');
    if (!rules.setsTarget) errors.push('setsTarget required for standard padel');
  }

  if (rules.scoringSystem === 'americano') {
    if (!rules.servesPerTurn) errors.push('servesPerTurn required for americano');
    if (!rules.targetPoints) errors.push('targetPoints required for americano');
    if (!rules.sideSwapEveryServes) errors.push('sideSwapEveryServes required for americano');
    
    // Bounds validation
    if (rules.servesPerTurn < VALIDATION_BOUNDS.servesPerTurn.min || 
        rules.servesPerTurn > VALIDATION_BOUNDS.servesPerTurn.max) {
      errors.push(`servesPerTurn must be between ${VALIDATION_BOUNDS.servesPerTurn.min} and ${VALIDATION_BOUNDS.servesPerTurn.max}`);
    }
    
    if (rules.targetPoints < VALIDATION_BOUNDS.targetPoints.min || 
        rules.targetPoints > VALIDATION_BOUNDS.targetPoints.max) {
      errors.push(`targetPoints must be between ${VALIDATION_BOUNDS.targetPoints.min} and ${VALIDATION_BOUNDS.targetPoints.max}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Preset configurations
export const PRESETS = {
  QUICK_PLAY: {
    scoringSystem: 'standard' as const,
    deuceRule: 'advantage' as const,
    setTieRule: 'tiebreak' as const,
    setsTarget: 1 as const,
    firstServer: 'random' as const,
  },
  AMERICANO: {
    scoringSystem: 'americano' as const,
    targetPoints: 50,
    servesPerTurn: 4,
    sideSwapEveryServes: 16,
    firstServer: 'random' as const,
  },
} as const;