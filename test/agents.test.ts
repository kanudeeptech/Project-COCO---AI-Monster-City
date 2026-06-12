import { describe, it, expect } from 'vitest';
import { generate } from '../src/citygen/generator';
import { AgentSim, MONSTER_NAMES } from '../src/sim/agents';
import { extractPlaces } from '../src/sim/places';

describe('places', () => {
  it('every city offers all affordances', () => {
    for (const seed of [1, 7, 42]) {
      const places = extractPlaces(generate(seed));
      expect(places.homes.length).toBeGreaterThanOrEqual(2);
      expect(places.works.length).toBeGreaterThan(0);
      expect(places.cafes.length).toBeGreaterThan(0);
      expect(places.parks.length).toBeGreaterThan(0);
    }
  });
});

describe('agent sim', () => {
  it('creates the full cast deterministically', () => {
    const plan = generate(7);
    const a = new AgentSim(plan);
    const b = new AgentSim(plan);
    expect(a.agents.length).toBe(MONSTER_NAMES.length);
    a.agents.forEach((agent, i) => {
      expect(agent.home).toEqual(b.agents[i].home);
      expect(agent.archetype.label).toBe(b.agents[i].archetype.label);
      expect(agent.needs).toEqual(b.agents[i].needs);
    });
  });

  it('agents sleep at night and employed agents work at 10am', () => {
    const sim = new AgentSim(generate(7));
    // start of day 100, 03:00 — walk to 10:00 same day, arriving everywhere instantly
    const dayStart = 100 * 1440;
    sim.advanceTo(dayStart + 180);
    for (const a of sim.agents) {
      sim.arrived(a.id, dayStart + 181);
      expect(a.activity).toBe('sleep');
    }
    sim.advanceTo(dayStart + 600); // 10:00
    for (const a of sim.agents) {
      if (a.work) expect(a.activity).toBe('work');
      else expect(a.activity).not.toBe('sleep');
    }
  });

  it('needs stay in [0,100] over a simulated week', () => {
    const sim = new AgentSim(generate(7));
    const start = 1440;
    for (let m = start; m < start + 1440 * 7; m += 17) {
      sim.advanceTo(m);
      for (const a of sim.agents) {
        sim.arrived(a.id, m); // teleporting playtester: always at the destination
        for (const v of Object.values(a.needs)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
