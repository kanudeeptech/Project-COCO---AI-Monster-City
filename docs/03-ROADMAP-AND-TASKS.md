# Roadmap, Systems Map & Task Seeds

Purpose: tomorrow's planning session starts here. Systems inventory with dependencies, phase-by-phase task seeds, and the open decisions that need a human call.

---

## 1. Systems map (build order = dependency order)

```
FOUNDATION                          CITY                           AGENTS
─────────────                       ─────                          ──────
F1 Project scaffold ──┐
F2 Iso renderer ──────┼──► C1 Tile/grid model ──► C2 Road graph ──► A1 Pathfinding
F3 Portrait scale     │         │                      │
F4 Input (tap/pan/    │    C3 Generator pipeline ──────┤
   pinch)             │         │   (stages 0–8)       │
F5 Save manager ──────┘    C4 Pattern library          │
                           C5 Validator + gallery      │
                           C6 Place metadata API ──────┴──► A2 Needs/utility core
                           C7 Master-plan growth ◄──────────A6 Demand signals
                                                            A3 Personality/archetypes
UI / PRODUCT                                                A4 Schedules & clock
U1 HUD + bottom sheet                                       A5 Relationships
U2 Agent card / follow mode ◄── A7 Memory & events          A7 Memory & event log
U3 Story feed + Coco Daily  ◄── A7                          A8 LLM tier-2 (flagged)
U4 FTUE                        
U5 PWA + deploy (projectcoco.life)
```

Critical path to "it's alive": **F2 → C1 → C3 → C6 → A2 → A4** (a generated city with need-driven agents walking it). Everything else layers on.

## 2. Phase plan with task seeds

### Phase 1 — The Stage *(REVISED for pure-observer: no building mechanics at all)*
- F1–F5 foundation (scaffold, iso renderer, portrait scaling, camera input, saves)
- C1 grid + C3 generator stages 0–8 replace ALL manual placement work — the generator builds the city, full stop
- Cars on roads (ambient layer); day/night tint; camera = pan / pinch-zoom / double-tap-to-zoom
- From ../GAME_DESIGN.md keep: tech architecture (§7), mobile-web hardening (§7.5), juice principles (§6.4), deployment (§7.6). **Dead: placement UX, shop UI, bulldoze, coin economy, collect taps, offline coin earnings** (offline returns as the story digest in Phase 3).
- Player controls for the whole game (v1): pan · pinch-zoom · tap monster/building → card · follow mode · **time machine (scrub/replay the past; the live present can't be paused — one shared city)** · story feed · share/photo. That's the entire control surface — the game is a living shared diorama.
- **One-shared-city consequences:** sim must use integer/fixed-point math (cross-device determinism); clock anchored to real time; daily checkpoint job (CI cron or Cloudflare Worker) for fast loads + sim-version re-anchoring; localStorage holds only viewer prefs + followed monsters. Seed-sharing feature: dead.

### Phase 2 — The Inhabitants
1. C3 generator stages 0–3 (frame, arterials, districts, blocks) behind a debug "regenerate" button
2. C5 validator + 50-seed gallery harness (quality gate from day one)
3. C4 pattern library v1 (8 patterns) + C6 place-metadata registration
4. A1 A* on road/sidewalk graph; walking Coco sprite (placeholder art OK)
5. A2 needs + utility chooser; A3 four axes + 3 archetypes; A4 clock + schedule skeleton
6. U2 agent card v1 (needs, activity, home/job); thought bubbles (icon set)
7. 15 agents living one believable day → **believability tests 1–2** (02 §11)

### Phase 3 — The Society
1. A5 relationship graph + co-location interactions + bubbles
2. A6 ambitions (4 templates) + demand signals → C7 master-plan gradual construction + city-gate arrivals
3. A7 memory stream + event log → U3 story feed + Coco Daily (Tier-1 templates)
4. Follow mode; offline story digest; remaining archetypes & quirks
5. **Believability tests 3–5**; character art finalized (the "Coco bean" walkers)

### Phase 4 — The Minds
1. Server-side proxy (Cloudflare Worker) for Claude API; daily batched narrative call; caching + Tier-1 fallback
2. LLM-written Daily feature + agent reflections; "interview a Coco" experiment (flagged)
3. Share-a-moment links (deep link to a time+place in THE city: `?t=...&at=plaza` — time-machine powered), analytics funnel, polish, marketing site at projectcoco.life
4. **Phase 5 (next design session): player participation** — the gameplay layer added once the sim is proven (nudges/gifts/community mechanics; design TBD with user)

## 3. Open decisions for tomorrow (need your call)

| # | Decision | Options | Outcome |
|---|---|---|---|
| D1 | **Player's hand** | ~~decided~~ | ✅ **Observer-FIRST** (user decisions 2026-06-11) — v1 is 100% autonomous: prove the sim is correct and the stories are real before any player gameplay. Player participation (nudges etc.) is a planned LATER layer, not a maybe. |
| D6 | **World model** | ~~decided~~ | ✅ **ONE shared city** (user decision 2026-06-11) — every visitor watches the same city, live. No per-visitor cities, no seed sharing. Architecture: deterministic sim as pure function of (global seed, real clock) → every browser computes the identical world; daily canonical checkpoint published for fast loads & version re-anchoring (02 §10). |
| D2 | Character art | ~~decided~~ | ✅ **Kenney Monster Builder Pack** — procedurally-assembled little monsters (user decision 2026-06-11) |
| D3 | Economy's role | ~~decided~~ | ✅ **Retired** (user decision 2026-06-11) — monsters ARE the economy: wages → rent/savings → ambitions → demand-driven city growth. No player coins, no tapping-to-collect. |
| D4 | LLM tier timing | ~~decided~~ | ✅ **Phase 4 as planned** (user decision 2026-06-11) — template voice (Tier 1) until the sim earns its LLM voice. |
| D5 | Map size / population for Phase 2 | ~~decided~~ | ✅ **24×24 map, 10 agents** (user decision 2026-06-11) — every monster known by name |

## 4. Definition of "done" per phase
- **P2:** a stranger watches 2 minutes and asks "wait, do they all have jobs?" — yes, and you can prove it by tapping.
- **P3:** a playtester retells one agent story unprompted (the RimWorld test).
- **P4:** the Coco Daily makes someone screenshot and share it.
