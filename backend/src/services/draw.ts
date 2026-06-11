import { hashSeed, mulberry32, seededShuffle } from "../util/random";

export interface DrawEntrant {
  id: string;
  order: number;
}

export interface DrawOption {
  id: string;
  order: number;
}

/** A single reveal step: which entrant got which option. */
export interface Reveal {
  entrantId: string;
  optionId: string;
}

export type DrawMode = "ONE_TO_ONE" | "MULTI";

export interface DrawResult {
  reveals: Reveal[];
  /** Options that ended up with no entrant (ONE_TO_ONE leftovers, or MULTI spares). */
  unassignedOptionIds: string[];
}

/**
 * Compute a fair draw using a seeded Fisher-Yates shuffle.
 *
 * - ONE_TO_ONE: each entrant receives exactly one option. If counts differ,
 *   we pair up to the smaller count and report leftover options.
 * - MULTI: options are dealt round-robin across entrants so everyone gets a
 *   roughly equal share (handles fewer entrants than options). When
 *   `allowSpare` is true (and there are more options than entrants), each
 *   entrant instead gets an equal `floor` share and the remaining options are
 *   left spare (unassigned).
 *
 * The `seed` makes the result reproducible/auditable.
 */
export function computeDraw(
  entrants: DrawEntrant[],
  options: DrawOption[],
  mode: DrawMode,
  seed: string,
  allowSpare = false
): DrawResult {
  const rng = mulberry32(hashSeed(seed));

  // Keep a stable starting order before shuffling for determinism.
  const sortedEntrants = entrants.slice().sort((a, b) => a.order - b.order);
  const sortedOptions = options.slice().sort((a, b) => a.order - b.order);

  const shuffledEntrants = seededShuffle(sortedEntrants, rng);
  const shuffledOptions = seededShuffle(sortedOptions, rng);

  const reveals: Reveal[] = [];
  const unassignedOptionIds: string[] = [];

  if (mode === "ONE_TO_ONE") {
    const pairs = Math.min(shuffledEntrants.length, shuffledOptions.length);
    for (let i = 0; i < pairs; i++) {
      reveals.push({
        entrantId: shuffledEntrants[i].id,
        optionId: shuffledOptions[i].id,
      });
    }
    for (let i = pairs; i < shuffledOptions.length; i++) {
      unassignedOptionIds.push(shuffledOptions[i].id);
    }
  } else {
    // MULTI: deal options round-robin across entrants.
    if (shuffledEntrants.length === 0) {
      return { reveals: [], unassignedOptionIds: shuffledOptions.map((o) => o.id) };
    }
    // When sparing, give everyone an equal `floor` share and leave the rest
    // spare. With fewer options than entrants the floor is 0, so every option
    // is spared (matching the create-page preview).
    const perEntrant = Math.floor(shuffledOptions.length / shuffledEntrants.length);
    const assignCount = allowSpare ? perEntrant * shuffledEntrants.length : shuffledOptions.length;
    shuffledOptions.forEach((opt, i) => {
      if (i < assignCount) {
        const entrant = shuffledEntrants[i % shuffledEntrants.length];
        reveals.push({ entrantId: entrant.id, optionId: opt.id });
      } else {
        unassignedOptionIds.push(opt.id);
      }
    });
  }

  return { reveals, unassignedOptionIds };
}
