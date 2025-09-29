// src/types/rules.ts
export type ScoringMode = 'standard' | 'points';
export type MatchFormat = 'sets' | 'games' | 'points' | 'timed';
export type DeuceRule   = 'advantage' | 'silver-point' | 'golden-point';
export type SetTieRule  = 'tiebreak' | 'play-on';

export interface GameRuleSet {
  scoringMode: ScoringMode;
  matchFormat: MatchFormat;

  // Win targets
  target?: number;               // required except for timed

  // Standard scoring options
  deuceRule?: DeuceRule;         // required when scoringMode = 'standard'
  gamesPerSet?: number;          // required when matchFormat = 'sets'
  setTieRule?: SetTieRule;       // required when matchFormat in {'sets','games'}
  setTieAtGames?: number;        // default: gamesPerSet (sets) or target (games)
  tiebreakTo?: number;           // default: 7; valid only when setTieRule = 'tiebreak'

  // Points/Americano (later phases)
  servesPerTurn?: number;
  sideSwapEveryServes?: number;

  // Timed (later phases)
  timeLimitMinutes?: number;
}
