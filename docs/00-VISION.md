# Project Coco — Vision

**One line:** A living city of AI agents — little people with personalities, goals, friendships and ambitions — going about human lives in a beautiful procedurally-grown isometric city, in your browser, in portrait.

## The fantasy

There is **one city**. Not one per player — ONE. Everyone who opens projectcoco.life watches the *same* living city at the same moment: the same little monsters going about their lives — someone grinding at the office to afford a bigger house, someone making a friend at the park, someone driving across town for a first date at the fountain plaza. The whole internet shares the same neighbors. "Did you see what Momo did today?" means the same Momo for everyone.

**Player verbs (v1 — observer phase):** watch → pan/zoom → tap to inspect → follow a monster → **time machine** (scrub/replay the city's past; the present runs live and cannot be paused — it's everyone's city) → read the story feed & Coco Daily → share a moment.
**The product is emergent narrative.** Every screenshot should contain a story.

*(Decided 2026-06-11: observer-FIRST, not observer-forever — v1 has no building or nudging so we can prove the simulation is correct and the stories are real; player gameplay layers (nudges, participation) are introduced after that, by design. One shared city, not per-visitor cities.)*

## Why this works (reference DNA)

| Source | What we take |
|---|---|
| **The Sims** | Needs-driven utility AI; "smart objects" — intelligence lives in the *places*, not the people |
| **Stanford Generative Agents (Smallville, 2023)** | Memory streams, daily plans, reflection; proof that agent towns produce believable emergent social life |
| **RimWorld / Dwarf Fortress** | Stories > systems; players retell what *happened*, not what they did |
| **Animal Crossing** | Real-time rhythm, personality archetypes, parasocial attachment to villagers |
| **Cities: Skylines** | Every citizen is a real simulated entity with a home, job, and commute |
| **Kevin Lynch, *The Image of the City*** | Paths, edges, districts, nodes, landmarks — the grammar of cities people can *read* |
| **Jane Jacobs** | Mixed use + short blocks + eyes on the street = vibrant, walkable, alive |

## The master loop (city ⇄ agents)

```
Agents have needs & ambitions
  → they use the city (cafés, offices, parks, homes)
    → their demands drive city growth (jobs, housing, leisure)
      → new places create new affordances
        → richer agent lives, new stories
          → loop
```

This is the elegant core: **the city's structure IS the agents' behavior.** A park placed next to apartments isn't decoration — it's where friendships will form. City design and game design are the same discipline here.

## Phased roadmap (each phase ships)

| Phase | Name | Player experience | Doc |
|---|---|---|---|
| 1 | **The Stage** | Cozy builder: grid, buildings, coins, cars (already designed) | `../GAME_DESIGN.md` |
| 2 | **The Inhabitants** | Agents move in: schedules, needs, jobs, walking the streets; tap anyone to see their life | `02-AGENT-DESIGN.md` |
| 3 | **The Society** | Relationships, romance, ambitions, life events; the *Coco Daily* newspaper; story feed | `02-AGENT-DESIGN.md` |
| 4 | **The Minds** | LLM-enriched layer: unique dialogue, reflections, emergent drama | `02-AGENT-DESIGN.md` §9 |

City generation (`01-CITY-DESIGN.md`) underpins all phases.

## Pillars (updated)

1. **Lives, not levels.** Progress is measured in stories witnessed, not points scored. No fail states.
2. **The city performs.** Every system must be *visible on screen* — a need, a friendship, a commute. If the player can't see it, it doesn't exist.
3. **Readable city.** A stranger should identify downtown, the market, the park district at a glance (Lynch test).
4. **One thumb, portrait, browser.** Loads in seconds, plays in minutes, lives at projectcoco.life.
5. **Honest simulation.** Deterministic sim core; LLMs enrich the narrative, never replace the simulation. The game works fully offline.
