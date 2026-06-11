export type DrawMode = "ONE_TO_ONE" | "MULTI";
export type Status = "DRAFT" | "DRAWN";

export interface Entrant {
  id: string;
  sweepstakeId: string;
  name: string;
  order: number;
  paid: boolean;
}

export interface Option {
  id: string;
  sweepstakeId: string;
  label: string;
  meta: string | null;
  order: number;
}

export interface Assignment {
  id: string;
  sweepstakeId: string;
  entrantId: string;
  optionId: string;
  drawnAt: string;
}

export interface SidePrize {
  id: string;
  sweepstakeId: string;
  name: string;
  note: string | null;
  winnerEntrantId: string | null;
}

export interface Sweepstake {
  id: string;
  name: string;
  category: string;
  drawMode: DrawMode;
  status: Status;
  seed: string | null;
  stake: number;
  payoutSplit: string | null;
  allowSpare: boolean;
  createdAt: string;
  entrants: Entrant[];
  options: Option[];
  assignments: Assignment[];
  sidePrizes: SidePrize[];
}

export interface Reveal {
  entrantId: string;
  optionId: string;
}

export interface DrawResponse {
  sweepstake: Sweepstake;
  reveals: Reveal[];
  unassignedOptionIds: string[];
  seed: string;
}

export interface PresetSidePrize {
  name: string;
  note?: string;
}

export interface PresetOption {
  label: string;
  alias?: string;
}

export interface Preset {
  id: string;
  category: string;
  label: string;
  description: string;
  options: PresetOption[];
  sidePrizes: PresetSidePrize[];
}

/** Read the short alias stored in an option's meta JSON, if any. */
export function optionAlias(meta: string | null): string | undefined {
  if (!meta) return undefined;
  try {
    const parsed = JSON.parse(meta) as { alias?: unknown };
    return typeof parsed.alias === "string" && parsed.alias.trim() ? parsed.alias.trim() : undefined;
  } catch {
    return undefined;
  }
}

export interface PresetsResponse {
  categories: string[];
  presets: Preset[];
}
