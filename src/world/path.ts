import { Ground, idx, inBounds, type CityPlan } from '../citygen/types';
import type { Rng } from '../core/rng';

export interface GridPoint {
  c: number;
  r: number;
}

/** All road tiles of a plan. */
export function roadTiles(plan: CityPlan): GridPoint[] {
  const out: GridPoint[] = [];
  for (let r = 0; r < plan.size; r++)
    for (let c = 0; c < plan.size; c++)
      if (plan.ground[idx(plan.size, c, r)] === Ground.Road) out.push({ c, r });
  return out;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** BFS shortest path along road tiles, inclusive of endpoints. Returns null if unreachable. */
export function roadPath(plan: CityPlan, from: GridPoint, to: GridPoint): GridPoint[] | null {
  const { size, ground } = plan;
  const isRoad = (c: number, r: number) =>
    inBounds(size, c, r) && ground[idx(size, c, r)] === Ground.Road;
  if (!isRoad(from.c, from.r) || !isRoad(to.c, to.r)) return null;
  const prev = new Int32Array(size * size).fill(-1);
  const start = idx(size, from.c, from.r);
  const goal = idx(size, to.c, to.r);
  prev[start] = start;
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (cur === goal) break;
    const c = cur % size;
    const r = (cur / size) | 0;
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!isRoad(nc, nr)) continue;
      const ni = idx(size, nc, nr);
      if (prev[ni] === -1) {
        prev[ni] = cur;
        queue.push(ni);
      }
    }
  }
  if (prev[goal] === -1) return null;
  const path: GridPoint[] = [];
  for (let cur = goal; ; cur = prev[cur]) {
    path.push({ c: cur % size, r: (cur / size) | 0 });
    if (cur === prev[cur]) break;
  }
  path.reverse();
  return path;
}

/** A random road tile at least minDist (manhattan) from `from`. */
export function randomRoadTile(
  roads: GridPoint[],
  rng: Rng,
  from?: GridPoint,
  minDist = 6,
): GridPoint {
  for (let tries = 0; tries < 20; tries++) {
    const t = rng.pick(roads);
    if (!from || Math.abs(t.c - from.c) + Math.abs(t.r - from.r) >= minDist) return t;
  }
  return rng.pick(roads);
}
