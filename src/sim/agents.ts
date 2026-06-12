/**
 * The Coco agent brain — pure TypeScript, no Phaser (docs/02 §2–4).
 * Needs decay over sim time; a schedule skeleton (sleep, work, lunch) plus
 * lowest-need utility infill picks each activity. Deterministic from the city seed.
 */
import { makeRng, type Rng } from '../core/rng';
import type { CityPlan } from '../citygen/types';
import { extractPlaces, type Place } from './places';

export type ActivityKind = 'sleep' | 'work' | 'eat' | 'fun' | 'social' | 'rest';

export interface Needs {
  energy: number;
  hunger: number; // 100 = full, 0 = starving
  social: number;
  fun: number;
  purpose: number;
}

export type NeedKey = keyof Needs;

export interface Archetype {
  label: string;
  employed: boolean;
  /** decay multipliers */
  social: number;
  fun: number;
  purpose: number;
  /** bedtime hour (sleep until 7) */
  bedtime: number;
}

const ARCHETYPES: Archetype[] = [
  { label: 'The Connector', employed: false, social: 1.8, fun: 1.1, purpose: 0.6, bedtime: 22 },
  { label: 'The Hustler', employed: true, social: 0.7, fun: 0.8, purpose: 1.8, bedtime: 23 },
  { label: 'The Regular', employed: true, social: 1.0, fun: 1.0, purpose: 1.0, bedtime: 21 },
  { label: 'The Free Spirit', employed: false, social: 1.1, fun: 1.7, purpose: 0.5, bedtime: 24 },
  { label: 'The Romantic', employed: false, social: 1.5, fun: 1.2, purpose: 0.7, bedtime: 22 },
  { label: 'The Caregiver', employed: true, social: 1.2, fun: 0.9, purpose: 1.2, bedtime: 21 },
  { label: 'The Night Owl', employed: false, social: 1.0, fun: 1.4, purpose: 0.6, bedtime: 26 },
  { label: 'The Dreamer', employed: false, social: 0.9, fun: 1.5, purpose: 0.8, bedtime: 21 },
  { label: 'The Workaholic', employed: true, social: 0.6, fun: 0.7, purpose: 2.0, bedtime: 23 },
  { label: 'The Foodie', employed: true, social: 1.1, fun: 1.0, purpose: 0.9, bedtime: 22 },
];

export const MONSTER_NAMES = [
  'Momo', 'Pip', 'Lulu', 'Zuzu', 'Kiko',
  'Bobo', 'Nana', 'Tato', 'Mimi', 'Gigi',
] as const;

export interface Agent {
  id: number;
  name: string;
  archetype: Archetype;
  home: Place;
  work: Place | null;
  favoriteCafe: Place;
  needs: Needs;
  activity: ActivityKind;
  /** the building/tile the agent wants to be at for the activity */
  target: Place;
  /** true once the walker reports arrival */
  atPlace: boolean;
  /** live approximate grid position, written by the render layer every frame —
   *  monsters "know where everyone is" (the moving-maze rendezvous) */
  posC: number;
  posR: number;
  /** sim-minute when the current activity ends (only meaningful when atPlace) */
  until: number;
  /** bumped whenever target changes — the render layer watches this */
  targetVersion: number;
}

export const ACTIVITY_EMOJI: Record<ActivityKind, string> = {
  sleep: '💤',
  work: '💼',
  eat: '🥐',
  fun: '🎈',
  social: '💬',
  rest: '🛋️',
};

export function activitySentence(a: Agent, walking: boolean): string {
  const dest: Record<ActivityKind, string> = {
    sleep: 'home to sleep',
    work: 'work',
    eat: 'a snack',
    fun: 'the park',
    social: 'the plaza',
    rest: 'home',
  };
  const doing: Record<ActivityKind, string> = {
    sleep: 'Sleeping at home',
    work: 'At work',
    eat: 'Having a snack',
    fun: 'Playing in the park',
    social: 'Hanging out at the plaza',
    rest: 'Relaxing at home',
  };
  return walking ? `Heading to ${dest[a.activity]}` : doing[a.activity];
}

export interface CityEvent {
  minute: number;
  text: string;
  c: number;
  r: number;
  kind: 'chat' | 'friend' | 'close';
  agentIds: number[];
}

/** sentiment thresholds */
export const FRIEND_AT = 30;
export const CLOSE_AT = 60;

const SOCIAL_ACTIVITIES: ReadonlySet<ActivityKind> = new Set(['eat', 'social', 'fun']);

const WHERE_LABEL: Record<ActivityKind, string> = {
  sleep: 'at home',
  rest: 'at home',
  work: 'at the office',
  eat: 'at the café',
  fun: 'in the park',
  social: 'out in the fields',
};

export class AgentSim {
  readonly agents: Agent[] = [];
  /** city event log, oldest → newest (capped) */
  readonly events: CityEvent[] = [];
  private sentiments = new Map<string, number>(); // reassigned on restore()
  private rng: Rng;
  private lastMinute = -1;
  private places;

  constructor(plan: CityPlan) {
    this.rng = makeRng(plan.seed ^ 0xa9e27);
    this.places = extractPlaces(plan);
    const homes = this.rng.shuffle([...this.places.homes]).slice(0, MONSTER_NAMES.length);
    MONSTER_NAMES.forEach((name, i) => {
      const archetype = ARCHETYPES[i % ARCHETYPES.length];
      const home = homes[i % homes.length];
      const agent: Agent = {
        id: i,
        name,
        archetype,
        home,
        work: archetype.employed ? this.rng.pick(this.places.works) : null,
        favoriteCafe: this.rng.pick(this.places.cafes),
        needs: {
          energy: 55 + this.rng.int(40),
          hunger: 50 + this.rng.int(45),
          social: 45 + this.rng.int(50),
          fun: 45 + this.rng.int(50),
          purpose: 50 + this.rng.int(45),
        },
        activity: 'rest',
        target: home,
        atPlace: false,
        posC: home.c,
        posR: home.r,
        until: 0,
        targetVersion: 0,
      };
      this.agents.push(agent);
    });
  }

  // ── persistence ────────────────────────────────────────────────

  serialize(seed: number): import('../state/save').SavedSim {
    return {
      v: 1,
      seed,
      lastMinute: this.lastMinute,
      sentiments: [...this.sentiments.entries()],
      events: this.events.slice(-80),
      agents: this.agents.map((a) => ({
        needs: { ...a.needs },
        activity: a.activity,
        target: a.target,
        until: a.until,
      })),
    };
  }

  restore(saved: import('../state/save').SavedSim, nowMinute: number): void {
    this.sentiments = new Map(saved.sentiments);
    this.events.length = 0;
    this.events.push(...saved.events);
    saved.agents.forEach((s, i) => {
      const a = this.agents[i];
      if (!a) return;
      a.needs = { ...s.needs };
      a.activity = s.activity;
      a.target = s.target;
      a.until = s.until;
      a.atPlace = false;
      a.targetVersion++; // walkers re-path to the restored destination
    });
    // offline catch-up, capped at 4 hours of sim so loads stay instant
    this.lastMinute = Math.max(saved.lastMinute, nowMinute - 240);
  }

  /** Render layer reports the walker reached its target. */
  arrived(id: number, simMinute: number): void {
    const a = this.agents[id];
    if (a.atPlace) return;
    a.atPlace = true;
    // short dwells: a lively town, monsters always on their way to someone
    a.until = simMinute + 10 + this.rng.int(15);
  }

  /** Advance the sim to the given absolute sim-minute (processes whole minutes). */
  advanceTo(simMinute: number): void {
    if (this.lastMinute < 0) this.lastMinute = simMinute - 1;
    while (this.lastMinute < simMinute) {
      this.lastMinute++;
      this.tickMinute(this.lastMinute);
    }
  }

  private tickMinute(minute: number): void {
    const hour = Math.floor(minute / 60) % 24;
    for (const a of this.agents) {
      this.decay(a);
      this.refill(a);
      const required = this.requiredActivity(a, hour);
      if (required) {
        // the schedule skeleton owns this hour — never free-choose out of it
        if (required !== a.activity) this.setActivity(a, required, minute);
      } else if (a.atPlace && minute >= a.until) {
        this.setActivity(a, this.chooseFreeTime(a, hour), minute);
      }
    }
    this.socialPass(minute);
  }

  // ── relationships ──────────────────────────────────────────────

  sentiment(a: number, b: number): number {
    return this.sentiments.get(pairKey(a, b)) ?? 0;
  }

  friendsOf(id: number): Array<{ name: string; score: number }> {
    const out: Array<{ name: string; score: number }> = [];
    for (const other of this.agents) {
      if (other.id === id) continue;
      const s = this.sentiment(id, other.id);
      if (s >= FRIEND_AT) out.push({ name: other.name, score: s });
    }
    return out.sort((x, y) => y.score - x.score);
  }

  /** Conversations: agents standing near each other (by LIVE position) may chat —
   *  works for field meetups, café tables and park benches alike. */
  private socialPass(minute: number): void {
    const present = this.agents.filter((a) => a.atPlace && SOCIAL_ACTIVITIES.has(a.activity));
    for (let i = 0; i < present.length; i++)
      for (let j = i + 1; j < present.length; j++) {
        const a = present[i];
        const b = present[j];
        if (Math.abs(a.posC - b.posC) + Math.abs(a.posR - b.posR) > 2) continue;
        // compatibility: sociable archetypes click faster
        const compat = (a.archetype.social + b.archetype.social) / 2;
        if (!this.rng.chance(Math.min(45, Math.round(10 * compat)))) continue;
        const key = pairKey(a.id, b.id);
        const before = this.sentiments.get(key) ?? 0;
        const after = Math.min(100, before + 3 + this.rng.int(4));
        this.sentiments.set(key, after);
        a.needs.social = Math.min(100, a.needs.social + 6);
        b.needs.social = Math.min(100, b.needs.social + 6);
        const where = WHERE_LABEL[a.activity] ?? 'in town';
        this.pushEvent({
          minute,
          c: Math.round(a.posC),
          r: Math.round(a.posR),
          kind: 'chat',
          agentIds: [a.id, b.id],
          text: `${a.name} and ${b.name} chatted ${where}`,
        });
        if (before < FRIEND_AT && after >= FRIEND_AT)
          this.pushEvent({
            minute,
            c: Math.round(a.posC),
            r: Math.round(a.posR),
            kind: 'friend',
            agentIds: [a.id, b.id],
            text: `${a.name} and ${b.name} became friends! 🎉`,
          });
        else if (before < CLOSE_AT && after >= CLOSE_AT)
          this.pushEvent({
            minute,
            c: Math.round(a.posC),
            r: Math.round(a.posR),
            kind: 'close',
            agentIds: [a.id, b.id],
            text: `${a.name} and ${b.name} are now close friends 💛`,
          });
      }
  }

  private pushEvent(e: CityEvent): void {
    this.events.push(e);
    if (this.events.length > 80) this.events.splice(0, this.events.length - 80);
  }

  /** Schedule skeleton: sleep and work blocks override free will. */
  private requiredActivity(a: Agent, hour: number): ActivityKind | null {
    const bedtime = a.archetype.bedtime;
    const asleep = bedtime >= 24 ? hour >= bedtime - 24 && hour < 7 : hour >= bedtime || hour < 7;
    if (asleep) return 'sleep';
    if (a.work && hour >= 9 && hour < 17) {
      if (hour === 12) return 'eat'; // lunch break
      return 'work';
    }
    return null;
  }

  /** Free time: Coco monsters are relentlessly sociable — they go find someone
   *  unless a need is genuinely critical. */
  private chooseFreeTime(a: Agent, _hour: number): ActivityKind {
    const n = a.needs;
    if (n.energy < 18) return 'rest';
    if (n.hunger < 25) return 'eat';
    if (n.fun < 22 && this.rng.chance(50)) return 'fun';
    return 'social';
  }

  private setActivity(a: Agent, kind: ActivityKind, minute: number): void {
    a.activity = kind;
    a.atPlace = false;
    a.until = minute + 240; // safety cap until arrival re-stamps it
    a.target = this.targetFor(a, kind);
    a.targetVersion++;
  }

  private targetFor(a: Agent, kind: ActivityKind): Place {
    switch (kind) {
      case 'sleep':
      case 'rest':
        return a.home;
      case 'work':
        return a.work ?? a.home;
      case 'eat':
        return this.rng.chance(70) ? a.favoriteCafe : this.rng.pick(this.places.cafes);
      case 'fun':
        return this.places.parks.length ? this.rng.pick(this.places.parks) : a.home;
      case 'social':
        return this.places.plazas.length
          ? this.rng.pick(this.places.plazas)
          : this.places.parks.length
            ? this.rng.pick(this.places.parks)
            : a.favoriteCafe;
    }
  }

  private decay(a: Agent): void {
    const m = a.archetype;
    const n = a.needs;
    const asleep = a.activity === 'sleep' && a.atPlace;
    n.energy = clamp(n.energy - (asleep ? 0 : 0.05));
    n.hunger = clamp(n.hunger - 0.07);
    n.social = clamp(n.social - 0.045 * m.social);
    n.fun = clamp(n.fun - 0.05 * m.fun);
    n.purpose = clamp(n.purpose - 0.035 * m.purpose);
  }

  private refill(a: Agent): void {
    if (!a.atPlace) return;
    const n = a.needs;
    switch (a.activity) {
      case 'sleep':
        n.energy = clamp(n.energy + 0.25);
        break;
      case 'rest':
        n.energy = clamp(n.energy + 0.15);
        break;
      case 'eat':
        n.hunger = clamp(n.hunger + 0.8);
        n.social = clamp(n.social + 0.1);
        break;
      case 'work':
        n.purpose = clamp(n.purpose + 0.3);
        break;
      case 'fun':
        n.fun = clamp(n.fun + 0.5);
        break;
      case 'social':
        n.social = clamp(n.social + 0.5);
        n.fun = clamp(n.fun + 0.2);
        break;
    }
  }
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 100 ? 100 : v;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
