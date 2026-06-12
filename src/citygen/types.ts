export const enum Ground {
  Grass = 0,
  Road = 1,
  Plaza = 2,
  Park = 3,
  GreenBelt = 4,
}

export const enum District {
  None = 0,
  Downtown = 1,
  Market = 2,
  Residential = 3,
  Civic = 4,
  Park = 5,
}

export const enum BuildingKind {
  House = 0,
  Cottage = 1,
  Shop = 2,
  Tall = 3,
  CivicHall = 4,
  Landmark = 5,
  Tree = 6,
  Fountain = 7,
}

export interface Placement {
  c: number;
  r: number;
  kind: BuildingKind;
  /** index into the palette frame list for this kind (resolved to a frame at render time) */
  variant: number;
}

export interface CityStats {
  roadTiles: number;
  buildings: number;
  homes: number;
  shops: number;
  parks: number;
  disconnectedRoads: number;
  homesFailing15TileRule: number;
  healsApplied: number;
}

export interface CityPlan {
  seed: number;
  size: number;
  /** ground[r * size + c] */
  ground: Uint8Array;
  /** district[r * size + c] */
  district: Uint8Array;
  placements: Placement[];
  /** main avenue column at the south (gate) edge */
  gateCol: number;
  /** the chosen central plaza node */
  plaza: { c: number; r: number };
  stats: CityStats;
}

export const idx = (size: number, c: number, r: number): number => r * size + c;
export const inBounds = (size: number, c: number, r: number): boolean =>
  c >= 0 && r >= 0 && c < size && r < size;
