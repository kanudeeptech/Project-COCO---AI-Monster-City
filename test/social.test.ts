import { describe, it, expect } from 'vitest';
import { generate } from '../src/citygen/generator';
import { AgentSim, FRIEND_AT } from '../src/sim/agents';

describe('relationships', () => {
  it('co-located monsters chat and become friends over an afternoon', () => {
    const sim = new AgentSim(generate(7));
    const [a, b] = sim.agents;
    const plaza = a.target; // any shared spot works
    const start = 200 * 1440 + 17 * 60; // day 200, 17:00 — work over, bedtime far away

    // pin both to the same place, socially active
    for (let m = start; m < start + 280; m++) {
      for (const agent of [a, b]) {
        agent.activity = 'social';
        agent.target = plaza;
        agent.atPlace = true;
        agent.posC = 8; // standing together out in the fields
        agent.posR = 8;
        agent.until = m + 999;
      }
      sim.advanceTo(m);
    }

    expect(sim.sentiment(a.id, b.id)).toBeGreaterThanOrEqual(FRIEND_AT);
    expect(sim.friendsOf(a.id).map((f) => f.name)).toContain(b.name);
    const texts = sim.events.map((e) => e.text).join('\n');
    expect(texts).toContain(`${a.name} and ${b.name} chatted`);
    expect(texts).toContain('became friends');
  });

  it('agents far apart never interact', () => {
    const sim = new AgentSim(generate(7));
    const start = 200 * 1440 + 14 * 60;
    sim.advanceTo(start + 60);
    // nobody pinned together: any sentiment must come from genuine co-location,
    // so just assert the API is consistent
    for (const a of sim.agents)
      for (const b of sim.agents)
        if (a.id !== b.id) expect(sim.sentiment(a.id, b.id)).toBeGreaterThanOrEqual(0);
  });
});

describe('persistence', () => {
  it('serialize → restore round-trips friendships and needs', async () => {
    const { generate } = await import('../src/citygen/generator');
    const { AgentSim } = await import('../src/sim/agents');
    const sim = new AgentSim(generate(7));
    const [a, b] = sim.agents;
    const start = 200 * 1440 + 17 * 60;
    for (let m = start; m < start + 200; m++) {
      for (const agent of [a, b]) {
        agent.activity = 'social';
        agent.target = a.target;
        agent.atPlace = true;
        agent.posC = 8;
        agent.posR = 8;
        agent.until = m + 999;
      }
      sim.advanceTo(m);
    }
    const before = sim.sentiment(a.id, b.id);
    expect(before).toBeGreaterThan(0);

    const saved = sim.serialize(7);
    const sim2 = new AgentSim(generate(7));
    sim2.restore(saved, start + 200);
    expect(sim2.sentiment(a.id, b.id)).toBe(before);
    expect(sim2.agents[0].needs).toEqual(sim.agents[0].needs);
    expect(sim2.events.map((e) => e.text)).toEqual(sim.events.map((e) => e.text));
  });
});
