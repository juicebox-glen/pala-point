// src/types/config.ts
import type { MatchRules } from "./rules";

export interface ClubConfig {
  schemaVersion: string;
  clubId: string;
  courtId: string;
  clubName: string;
  themeId: string;
  quickPlayRules: MatchRules;
  americanoRules: MatchRules;
}