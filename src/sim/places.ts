import { Ground, BuildingKind, idx, type CityPlan } from '../citygen/types';

export type PlaceKind = 'home' | 'work' | 'cafe' | 'park' | 'plaza';

export interface Place {
  kind: PlaceKind;
  c: number;
  r: number;
}

export interface CityPlaces {
  homes: Place[];
  works: Place[];
  cafes: Place[];
  parks: Place[];
  plazas: Place[];
}

/** The city's affordances — what the agent layer consumes (docs/01 §7). */
export function extractPlaces(plan: CityPlan): CityPlaces {
  const homes: Place[] = [];
  const works: Place[] = [];
  const cafes: Place[] = [];
  for (const p of plan.placements) {
    switch (p.kind) {
      case BuildingKind.House:
      case BuildingKind.Cottage:
        homes.push({ kind: 'home', c: p.c, r: p.r });
        break;
      case BuildingKind.Tall:
      case BuildingKind.CivicHall:
      case BuildingKind.Landmark:
        works.push({ kind: 'work', c: p.c, r: p.r });
        break;
      case BuildingKind.Shop:
        cafes.push({ kind: 'cafe', c: p.c, r: p.r });
        break;
    }
  }
  const parks: Place[] = [];
  const plazas: Place[] = [];
  for (let r = 0; r < plan.size; r++)
    for (let c = 0; c < plan.size; c++) {
      const g = plan.ground[idx(plan.size, c, r)];
      if (g === Ground.Park) parks.push({ kind: 'park', c, r });
      else if (g === Ground.Plaza) plazas.push({ kind: 'plaza', c, r });
    }
  return { homes, works, cafes, parks, plazas };
}
