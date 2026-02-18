export type SymbioRole = "HUMAN" | "AGENT_BUILDER";

export type TaskDirection = "AGENT_TO_HUMAN" | "HUMAN_TO_AGENT";

export interface MatchingCandidate {
  id: string;
  score: number;
  reason: string;
}
