import Phaser from 'phaser';
import type { CityPlan } from '../citygen/types';
import { makeRng, type Rng } from '../core/rng';
import { roadTiles, roadPath, randomRoadTile, type GridPoint } from '../world/path';
import { isoX, isoY, isoDepth } from '../world/iso';

const VEHICLES = ['taxi', 'taxi', 'taxi', 'police', 'ambulance', 'garbage'] as const;

/** grid step → Kenney compass frame suffix (grid N = screen up-right) */
function dirSuffix(dc: number, dr: number): string {
  if (dr < 0) return 'NE';
  if (dr > 0) return 'SW';
  if (dc > 0) return 'SE';
  return 'NW';
}

interface Car {
  sprite: Phaser.GameObjects.Image;
  kind: string;
  path: GridPoint[];
  /** index of the segment start in path */
  seg: number;
  /** 0..1 progress along current segment */
  t: number;
  speed: number; // tiles per second
  pauseMs: number;
}

export class TrafficSim {
  private cars: Car[] = [];
  private rng: Rng;
  private roads: GridPoint[];

  constructor(
    private scene: Phaser.Scene,
    private plan: CityPlan,
  ) {
    this.rng = makeRng(plan.seed ^ 0xcafe);
    this.roads = roadTiles(plan);
    const count = Math.min(12, Math.max(3, Math.floor(this.roads.length / 14)));
    for (let i = 0; i < count; i++) this.spawn(VEHICLES[i % VEHICLES.length]);
  }

  private spawn(kind: string): void {
    const from = randomRoadTile(this.roads, this.rng);
    const path = this.newPath(from);
    if (!path) return;
    const sprite = this.scene.add
      .image(isoX(from.c, from.r), isoY(from.c, from.r), 'cars', `${kind}_SE.png`)
      .setOrigin(0.5, 0.78)
      .setScale(1.7);
    this.cars.push({ sprite, kind, path, seg: 0, t: 0, speed: 1.6, pauseMs: this.rng.int(2000) });
  }

  private newPath(from: GridPoint): GridPoint[] | null {
    for (let tries = 0; tries < 8; tries++) {
      const to = randomRoadTile(this.roads, this.rng, from, 8);
      const p = roadPath(this.plan, from, to);
      if (p && p.length > 2) return p;
    }
    return null;
  }

  update(deltaMs: number): void {
    for (const car of this.cars) {
      if (car.pauseMs > 0) {
        car.pauseMs -= deltaMs;
        continue;
      }
      car.t += (car.speed * deltaMs) / 1000;
      while (car.t >= 1) {
        car.t -= 1;
        car.seg++;
        if (car.seg >= car.path.length - 1) {
          // journey done: rest, then drive somewhere new
          const end = car.path[car.path.length - 1];
          const next = this.newPath(end);
          if (next) {
            car.path = next;
            car.seg = 0;
            car.t = 0;
            car.pauseMs = 800 + this.rng.int(4000);
          }
          break;
        }
      }
      const a = car.path[Math.min(car.seg, car.path.length - 1)];
      const b = car.path[Math.min(car.seg + 1, car.path.length - 1)];
      const ax = isoX(a.c, a.r);
      const ay = isoY(a.c, a.r);
      const vx = isoX(b.c, b.r) - ax;
      const vy = isoY(b.c, b.r) - ay;
      // two-lane traffic: keep to the right of the dashed divider
      const len = Math.hypot(vx, vy) || 1;
      const ox = (-vy / len) * 9;
      const oy = (vx / len) * 9;
      car.sprite.setPosition(ax + vx * car.t + ox, ay + vy * car.t + oy);
      const fc = a.c + (b.c - a.c) * car.t;
      const fr = a.r + (b.r - a.r) * car.t;
      car.sprite.setDepth(isoDepth(fc, fr) + 1.5);
      if (b.c !== a.c || b.r !== a.r)
        car.sprite.setFrame(`${car.kind}_${dirSuffix(b.c - a.c, b.r - a.r)}.png`);
    }
  }
}
