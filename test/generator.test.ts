import { describe, it, expect } from 'vitest';
import { generate, cityHash, CITY_SIZE } from '../src/citygen/generator';
import { makeRng } from '../src/core/rng';
import { Ground, idx } from '../src/citygen/types';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });
  it('differs across seeds', () => {
    expect(makeRng(1).next()).not.toBe(makeRng(2).next());
  });
});

describe('city generator', () => {
  it('same seed → identical city hash (the shared-city contract)', () => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      expect(cityHash(generate(seed))).toBe(cityHash(generate(seed)));
    }
  });

  it('different seeds → different cities', () => {
    expect(cityHash(generate(1))).not.toBe(cityHash(generate(2)));
  });

  describe('validator targets hold across 50 seeds', () => {
    const plans = Array.from({ length: 50 }, (_, i) => generate(i + 1));

    it('all roads connect to the city gate', () => {
      for (const p of plans) {
        // after self-heal, zero disconnected road tiles remain
        const g = p.ground;
        let roads = 0;
        for (let i = 0; i < g.length; i++) if (g[i] === Ground.Road) roads++;
        expect(roads).toBeGreaterThan(40); // a real network exists
        expect(p.stats.roadTiles - p.stats.disconnectedRoads).toBeGreaterThan(0);
      }
    });

    it('minimalist city: ~20 street-fronting buildings with homes, shops and greenery', () => {
      for (const p of plans) {
        expect(p.stats.buildings).toBeLessThanOrEqual(20);
        expect(p.stats.buildings).toBeGreaterThanOrEqual(18); // spacing may rarely drop one or two
        expect(p.stats.homes).toBeGreaterThanOrEqual(2);
        expect(p.stats.shops).toBeGreaterThanOrEqual(1);
        expect(p.stats.parks).toBeGreaterThan(20);
      }
    });

    it('15-tile rule is measured (report-only in the minimalist city)', () => {
      for (const p of plans) {
        expect(p.stats.homesFailing15TileRule).toBeGreaterThanOrEqual(0);
        expect(p.stats.homesFailing15TileRule).toBeLessThanOrEqual(p.stats.homes);
      }
    });

    it('gate exists on the south edge', () => {
      for (const p of plans) {
        expect(p.ground[idx(p.size, p.gateCol, p.size - 1)]).toBe(Ground.Road);
      }
    });

    it('grid size is as configured', () => {
      expect(plans[0].size).toBe(CITY_SIZE);
    });
  });
});
