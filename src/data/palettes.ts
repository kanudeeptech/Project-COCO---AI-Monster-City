import { BuildingKind } from '../citygen/types';

/**
 * Kenney isometric-buildings classification (curated visually via the #tiles gallery).
 * Minimalist city: EVERY building renders as a 2–3 storey stack —
 * flat-top ground piece (with plinth) + 1–2 storey segments + roof cap.
 */
const f = (n: number): string => `buildingTiles_${String(n).padStart(3, '0')}.png`;

const STOREYS = [8, 15, 16, 23, 24, 29, 31, 39, 44, 48, 50, 51, 55, 56, 109].map(f);
const ROOFS = [94, 102, 110, 121, 126, 127].map(f);

export interface StackSpec {
  bases: string[];
  storeys: string[];
  roofs: string[];
  /** min/max number of storey segments (total storeys = base + this + roof) */
  minS: number;
  maxS: number;
}

const twoToThree = (bases: number[]): StackSpec => ({
  bases: bases.map(f),
  storeys: STOREYS,
  roofs: ROOFS,
  minS: 1,
  maxS: 2,
});

/** Every kind is a stack now; kind only matters for agent affordances. */
export const STACKS: Partial<Record<BuildingKind, StackSpec>> = {
  [BuildingKind.House]: twoToThree([1, 9, 17, 30, 36]),
  [BuildingKind.Cottage]: twoToThree([14, 21, 37, 42]),
  [BuildingKind.Shop]: twoToThree([4, 18, 99, 108, 113, 123]),
  [BuildingKind.Tall]: twoToThree([3, 19, 25, 100, 101, 116, 124, 125]),
  [BuildingKind.CivicHall]: twoToThree([35, 85, 93]),
  [BuildingKind.Landmark]: { bases: [92, 122].map(f), storeys: [45, 49, 52, 54, 114].map(f), roofs: [121, 126].map(f), minS: 1, maxS: 2 },
};

export function singleFrame(_kind: BuildingKind, _variant: number): string | null {
  return null; // all buildings are stacks in the minimalist city
}

/** Deterministically resolve a stack from the placement's variant. */
export function stackFrames(kind: BuildingKind, variant: number): string[] | null {
  const spec = STACKS[kind];
  if (!spec) return null;
  const base = spec.bases[variant % spec.bases.length];
  const nStoreys = spec.minS + ((variant >> 3) % (spec.maxS - spec.minS + 1));
  const frames = [base];
  for (let i = 0; i < nStoreys; i++)
    frames.push(spec.storeys[(variant + i * 7) % spec.storeys.length]);
  frames.push(spec.roofs[(variant >> 5) % spec.roofs.length]);
  return frames;
}
