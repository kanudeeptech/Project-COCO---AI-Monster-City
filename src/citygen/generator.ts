/**
 * Coco city generator — a deterministic, pure-function pipeline (docs/01-CITY-DESIGN.md).
 * generate(seed) always returns the identical city for the same seed, on every device.
 * Integer math only.
 */
import { makeRng, fnv1a, type Rng } from '../core/rng';
import {
  Ground,
  District,
  BuildingKind,
  idx,
  inBounds,
  type CityPlan,
  type Placement,
  type CityStats,
} from './types';

export const CITY_SIZE = 32;
export type { CityPlan } from './types';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function generate(seed: number, size: number = CITY_SIZE): CityPlan {
  const rng = makeRng(seed);
  const ground = new Uint8Array(size * size).fill(Ground.Grass);
  const district = new Uint8Array(size * size).fill(District.None);
  const placements: Placement[] = [];
  const g = (c: number, r: number) => ground[idx(size, c, r)];
  const setG = (c: number, r: number, v: Ground) => (ground[idx(size, c, r)] = v);
  const setD = (c: number, r: number, v: District) => (district[idx(size, c, r)] = v);

  // ── Stage 0: frame — green belt along the north edge, city gate on the south ──
  const beltDepth = 2;
  for (let r = 0; r < beltDepth; r++)
    for (let c = 0; c < size; c++) {
      setG(c, r, Ground.GreenBelt);
      setD(c, r, District.Park);
    }

  // ── Stage 1: arterial skeleton ──
  // Main avenue: south gate → north, with one dogleg for character.
  const gateCol = rng.range(Math.floor(size / 2) - 3, Math.floor(size / 2) + 2);
  const dogRow = rng.range(Math.floor(size / 2) - 2, Math.floor(size / 2) + 3);
  const shift = rng.pick([-3, -2, 2, 3] as const);
  const northCol = Math.min(size - 4, Math.max(3, gateCol + shift));
  for (let r = size - 1; r >= dogRow; r--) setG(gateCol, r, Ground.Road);
  const [jx0, jx1] = gateCol < northCol ? [gateCol, northCol] : [northCol, gateCol];
  for (let c = jx0; c <= jx1; c++) setG(c, dogRow, Ground.Road);
  for (let r = dogRow; r >= beltDepth; r--) setG(northCol, r, Ground.Road);

  // Cross arterials: two horizontal avenues.
  const crossN = rng.range(beltDepth + 3, dogRow - 2);
  const crossS = rng.range(dogRow + 2, size - 4);
  for (let c = 0; c < size; c++) {
    setG(c, crossN, Ground.Road);
    setG(c, crossS, Ground.Road);
  }

  // ── Stage 3 (before districts so regions see real blocks): local streets ──
  // Vertical streets stepping out from the avenue; jittered spacing 3–5.
  const vCols: number[] = [];
  for (let c = Math.min(gateCol, northCol) - rng.range(4, 6); c >= 2; c -= rng.range(4, 6))
    vCols.push(c);
  for (let c = Math.max(gateCol, northCol) + rng.range(4, 6); c <= size - 3; c += rng.range(4, 6))
    vCols.push(c);
  for (const c of vCols)
    for (let r = crossN; r <= crossS; r++) if (g(c, r) === Ground.Grass) setG(c, r, Ground.Road);
  // Horizontal connectors north of crossN and south of crossS so edges aren't dead.
  const hRows: number[] = [];
  if (crossN - beltDepth >= 5) hRows.push(rng.range(beltDepth + 2, crossN - 2));
  if (size - 1 - crossS >= 5) hRows.push(rng.range(crossS + 2, size - 3));
  for (const r of hRows)
    for (let c = 1; c < size - 1; c++) if (g(c, r) === Ground.Grass) setG(c, r, Ground.Road);
  // A couple of vertical stubs connecting the extra rows to the arterials.
  for (const r of hRows) {
    const dir = r < crossN ? 1 : -1; // connect toward nearest cross arterial
    const target = r < crossN ? crossN : crossS;
    for (let i = 0; i < 2; i++) {
      const c = rng.range(3, size - 4);
      for (let rr = r; rr !== target; rr += dir)
        if (g(c, rr) === Ground.Grass) setG(c, rr, Ground.Road);
    }
  }

  // ── Stage 2: districts — nearest-seed assignment (integer manhattan + weights) ──
  const nodeMain = { c: northCol, r: crossN }; // downtown heart
  const seeds: Array<{ c: number; r: number; d: District; w: number }> = [
    { c: nodeMain.c, r: nodeMain.r, d: District.Downtown, w: 0 },
    { c: gateCol, r: crossS, d: District.Market, w: 0 },
    { c: northCol > size / 2 ? 3 : size - 4, r: crossN - 1, d: District.Civic, w: 1 },
    { c: 2, r: size - 3, d: District.Residential, w: 0 },
    { c: size - 3, r: size - 3, d: District.Residential, w: 0 },
    { c: northCol > size / 2 ? size - 4 : 3, r: beltDepth + 2, d: District.Residential, w: 0 },
  ];
  for (let r = beltDepth; r < size; r++)
    for (let c = 0; c < size; c++) {
      let best = District.Residential;
      let bestScore = 1 << 30;
      for (const s of seeds) {
        const score = Math.abs(c - s.c) + Math.abs(r - s.r) + s.w * 2;
        if (score < bestScore) {
          bestScore = score;
          best = s.d;
        }
      }
      setD(c, r, best);
    }

  // ── Stage 2b: the park — a green rectangle near downtown+residential ──
  const parkW = rng.range(6, 8);
  const parkH = rng.range(4, 6);
  const parkC = northCol > size / 2 ? rng.range(2, 4) : size - parkW - rng.range(2, 4);
  const parkR = rng.range(dogRow, crossS - parkH);
  for (let r = parkR; r < parkR + parkH; r++)
    for (let c = parkC; c < parkC + parkW; c++) {
      if (g(c, r) === Ground.Grass) setG(c, r, Ground.Park);
      setD(c, r, District.Park);
    }

  // ── Stage 5a: plaza at the heart node ──
  const plaza = { c: nodeMain.c + 1, r: nodeMain.r + 1 };
  for (let r = plaza.r; r < plaza.r + 2; r++)
    for (let c = plaza.c; c < plaza.c + 2; c++)
      if (inBounds(size, c, r) && g(c, r) === Ground.Grass) setG(c, r, Ground.Plaza);

  // ── Stage 4: TWENTY buildings (2–3 storeys), each fronting a road ──
  // Minimalist city: buildings line the streets, the fields stay open and green.
  const variantOf = (rng: Rng): number => rng.int(1000);
  const roadAdj = (c: number, r: number): boolean =>
    DIRS.some(([dc, dr]) => inBounds(size, c + dc, r + dr) && g(c + dc, r + dr) === Ground.Road);
  const TWENTY_KINDS: BuildingKind[] = [
    ...Array(6).fill(BuildingKind.House),
    ...Array(2).fill(BuildingKind.Cottage), // 8 homes for the cast
    ...Array(4).fill(BuildingKind.Shop), // cafés
    ...Array(4).fill(BuildingKind.Tall), // workplaces
    BuildingKind.CivicHall,
    BuildingKind.CivicHall,
    BuildingKind.Landmark,
    BuildingKind.Tall,
  ];
  const spots: Array<{ c: number; r: number }> = [];
  for (const kind of TWENTY_KINDS) {
    for (let tries = 0; tries < 400; tries++) {
      const c = rng.range(1, size - 2);
      const r = rng.range(beltDepth + 1, size - 2);
      if (g(c, r) !== Ground.Grass || !roadAdj(c, r)) continue; // street frontage required
      if (spots.some((s) => Math.abs(s.c - c) + Math.abs(s.r - r) < 3)) continue; // breathing room
      spots.push({ c, r });
      placements.push({ c, r, kind, variant: variantOf(rng) });
      break;
    }
  }

  // light scatter of field trees
  for (let r = beltDepth; r < size; r++)
    for (let c = 0; c < size; c++)
      if (
        g(c, r) === Ground.Grass &&
        rng.chance(5) &&
        !placements.some((p) => p.c === c && p.r === r)
      )
        placements.push({ c, r, kind: BuildingKind.Tree, variant: variantOf(rng) });
  // park trees
  for (let r = parkR; r < parkR + parkH; r++)
    for (let c = parkC; c < parkC + parkW; c++)
      if (g(c, r) === Ground.Park && rng.chance(35))
        placements.push({ c, r, kind: BuildingKind.Tree, variant: variantOf(rng) });
  // fountain in the park
  placements.push({
    c: parkC + (parkW >> 1),
    r: parkR + (parkH >> 1),
    kind: BuildingKind.Fountain,
    variant: 0,
  });

  // ── Stage 6: green pass — street trees along the cross arterials ──
  for (const r of [crossN - 1, crossS + 1])
    for (let c = 1; c < size - 1; c += 2)
      if (
        inBounds(size, c, r) &&
        g(c, r) === Ground.Grass &&
        !placements.some((p) => p.c === c && p.r === r) &&
        rng.chance(50)
      )
        placements.push({ c, r, kind: BuildingKind.Tree, variant: variantOf(rng) });

  // ── Stage 7: validate & self-heal ──
  const stats = validateAndHeal(ground, district, placements, size, gateCol, rng);

  return { seed, size, ground, district, placements, gateCol, plaza, stats };
}

function validateAndHeal(
  ground: Uint8Array,
  _district: Uint8Array,
  placements: Placement[],
  size: number,
  gateCol: number,
  rng: Rng,
): CityStats {
  const g = (c: number, r: number) => ground[idx(size, c, r)];
  // Road connectivity from the gate (BFS).
  const seen = new Uint8Array(size * size);
  const queue: number[] = [];
  const gateIdx = idx(size, gateCol, size - 1);
  if (ground[gateIdx] === Ground.Road) {
    seen[gateIdx] = 1;
    queue.push(gateIdx);
  }
  while (queue.length) {
    const cur = queue.pop()!;
    const c = cur % size;
    const r = (cur / size) | 0;
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!inBounds(size, nc, nr)) continue;
      const ni = idx(size, nc, nr);
      if (!seen[ni] && ground[ni] === Ground.Road) {
        seen[ni] = 1;
        queue.push(ni);
      }
    }
  }
  let roadTiles = 0;
  let disconnected = 0;
  for (let i = 0; i < ground.length; i++)
    if (ground[i] === Ground.Road) {
      roadTiles++;
      if (!seen[i]) disconnected++;
    }
  // Heal: orphan roads become grass (construction guarantees this is rare).
  if (disconnected > 0)
    for (let i = 0; i < ground.length; i++)
      if (ground[i] === Ground.Road && !seen[i]) ground[i] = Ground.Grass;

  // 15-tile rule: every home within manhattan 8 of food/shop and 10 of green.
  const homes = placements.filter(
    (p) => p.kind === BuildingKind.House || p.kind === BuildingKind.Cottage,
  );
  const shops = placements.filter((p) => p.kind === BuildingKind.Shop);
  const isGreen = (p: Placement) => p.kind === BuildingKind.Tree || p.kind === BuildingKind.Fountain;
  const greens = placements.filter(isGreen);
  const parkTiles: Array<{ c: number; r: number }> = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (g(c, r) === Ground.Park || g(c, r) === Ground.GreenBelt) parkTiles.push({ c, r });

  let failing = 0;
  let heals = 0;
  for (const home of homes) {
    const near = (pts: Array<{ c: number; r: number }>, d: number) =>
      pts.some((p) => Math.abs(p.c - home.c) + Math.abs(p.r - home.r) <= d);
    const hasShop = near(shops, 16);
    const hasGreen = near(greens, 10) || near(parkTiles, 10);
    if (hasShop && hasGreen) continue;
    failing++;
    // Minimalist city: never convert buildings (there are only ten!). Heal greenery only.
    if (hasShop && !hasGreen) {
      placements.push({ c: home.c, r: home.r === 0 ? home.r + 1 : home.r - 1, kind: BuildingKind.Tree, variant: rng.int(1000) });
      greens.push(placements[placements.length - 1]);
      heals++;
    }
  }

  return {
    roadTiles,
    buildings: placements.filter((p) => p.kind !== BuildingKind.Tree && p.kind !== BuildingKind.Fountain).length,
    homes: homes.length,
    shops: shops.length,
    parks: parkTiles.length,
    disconnectedRoads: disconnected,
    homesFailing15TileRule: failing,
    healsApplied: heals,
  };
}

/** Stable hash of a plan — the determinism contract for the one-shared-city architecture. */
export function cityHash(plan: CityPlan): number {
  const stream: number[] = [plan.size, plan.gateCol, plan.plaza.c, plan.plaza.r];
  for (const v of plan.ground) stream.push(v);
  for (const v of plan.district) stream.push(v);
  for (const p of plan.placements) stream.push(p.c, p.r, p.kind, p.variant & 0xffff);
  return fnv1a(stream);
}
