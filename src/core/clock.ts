/**
 * The shared world clock — REAL TIME, anchored to IST (UTC+5:30).
 * 1 real minute = 1 sim minute: when it's daytime in India, it's daytime in
 * Coco, and the monsters sleep when you do. Everyone sees the same moment.
 */

/** Coco Day 1 begins at IST midnight, 2026-06-12 (= 2026-06-11T18:30:00Z). */
export const CITY_EPOCH_MS = Date.UTC(2026, 5, 11, 18, 30, 0);

export const SIM_MINUTES_PER_DAY = 24 * 60;

export function simMinutesSinceEpoch(nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - CITY_EPOCH_MS) / 60_000));
}

export function simTimeOfDay(nowMs: number): { day: number; hour: number; minute: number } {
  const total = simMinutesSinceEpoch(nowMs);
  const day = Math.floor(total / SIM_MINUTES_PER_DAY);
  const m = total % SIM_MINUTES_PER_DAY;
  return { day, hour: Math.floor(m / 60), minute: m % 60 };
}

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function dayPhase(hour: number): DayPhase {
  if (hour >= 6 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}
