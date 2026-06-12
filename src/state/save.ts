/**
 * Versioned sim persistence. NOTE: per-browser for now — the canonical
 * shared-city checkpoint (docs/02 §10) replaces this as the source of truth
 * once the daily checkpoint worker exists. Schema is versioned so that
 * migration never wipes a city.
 */
import type { Needs, ActivityKind, CityEvent } from '../sim/agents';
import type { Place } from '../sim/places';

export interface SavedAgent {
  needs: Needs;
  activity: ActivityKind;
  target: Place;
  until: number;
}

export interface SavedSim {
  v: 1;
  seed: number;
  lastMinute: number;
  sentiments: Array<[string, number]>;
  events: CityEvent[];
  agents: SavedAgent[];
}

// v3: real-time IST clock (1 min = 1 min) — earlier saves are from faster timelines
const key = (seed: number): string => `coco.sim.v3.${seed}`;

export function loadSim(seed: number): SavedSim | null {
  try {
    const raw = localStorage.getItem(key(seed));
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSim;
    if (data.v !== 1 || data.seed !== seed) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSim(data: SavedSim): void {
  try {
    localStorage.setItem(key(data.seed), JSON.stringify(data));
  } catch {
    // storage full/blocked — the sim still runs, persistence just pauses
  }
}
