# Coco Agents — Little People with Real Lives

Goal: inhabitants that are **believable, watchable, and emergent** — each with personality, needs, a job, relationships, and an ambition — built on a deterministic simulation core that runs in any browser, with an optional LLM layer that makes them *speak*.

Architecture principle (The Sims' deepest lesson): **put the intelligence in the world, not the agent.** Places advertise what they offer; agents are simple need-driven choosers. That's how 100+ agents stay cheap, and how new content (a new café pattern) instantly enriches every agent's life with zero agent code.

---

## 1. The agent at a glance

```
Coco (an agent)
├── Identity      name, look (body/hat/color), age-band (kid/adult/elder), home, job
├── Personality   4 trait axes + 1–2 quirks
├── Needs         Energy · Hunger · Social · Fun · Purpose · Comfort   (0–100, decaying)
├── Ambition      one life goal with milestones (visible progress)
├── Relationships sentiment graph: friends, rivals-lite, romance, family
├── Memory        ring buffer of salient events ("met Maya at Fountain Plaza")
├── Schedule      today's plan: blocks (sleep/work) + utility-chosen free time
└── State         position, current activity, current thought (surfaced as bubble)
```

## 2. Needs (the engine)

Six needs, each 0–100, decaying at personality-modulated rates:

| Need | Refilled by | Starved looks like |
|---|---|---|
| Energy | Home (sleep), bench (rest) | Trudging walk, zzz bubble, goes home |
| Hunger | Café, bakery, restaurant, home kitchen | Beeline to food, 🍞 bubble |
| Social | Plaza, café chat, park meetup, visit friend | Seeks crowds; loneliness bubble (story hook!) |
| Fun | Park, arcade-shop, driving (for Cruisers), events | Wanders listlessly → seeks play |
| Purpose | Work shift, school (kids), volunteering | Skips work? No — purpose-starved off-hours = restless |
| Comfort | Home quality, park bench, nice weather spot | Wants to move somewhere nicer (ambition fuel) |

**Action choice — utility scoring (The Sims model):**

```
score(place, activity) =
    Σ_needs  traitWeight(need) × urgency(need)² × satisfaction(place, need)
  − travelCost(here → place)        // keeps lives local; the 15-tile city rule makes this work
  − crowdPenalty(place)             // full café → go elsewhere (distributes agents naturally)
  + socialPull(friends present)     // friends at the park? park scores higher  ← chance encounters
  + scheduleBias(time of day)
```

- `urgency²` = the whipsaw curve: a starving need dominates everything (Sims' classic trick).
- **Commitment/hysteresis:** once an activity starts, finish it unless an emergency need fires — prevents dithering (the #1 cause of "dumb NPC" feel).
- `socialPull` is the emergent-story engine: it makes friend groups *form habits* ("those three always lunch at the bakery") with zero scripting.

## 3. Personality

**Four axes** (each −1..+1) modulating need-decay and utility weights:

| Axis | − pole | + pole | Example effect |
|---|---|---|---|
| Social | Solitary | Outgoing | Social decay ×0.5 ↔ ×2; outgoing get bigger socialPull |
| Drive | Easygoing | Ambitious | Purpose decay; ambitious work overtime, chase promotions |
| Energy | Homebody | Adventurous | Travel-cost penalty ×2 ↔ ×0.5; adventurous roam the whole city |
| Order | Spontaneous | Orderly | Schedule adherence; spontaneous skip routines (story spice) |

**Plus 1–2 quirks** from a pool (~20): coffee-lover, night-owl, dog-person, gossip, bookworm, foodie, *loves-driving*, early-bird, romantic, penny-pincher, green-thumb, workaholic… Quirks add specific affordance bonuses (coffee-lover: café +30) and flavor text.

**Archetypes = named presets** (axes + quirk + ambition template) so the cast reads instantly — the user's brief, made systemic:

| Archetype | Wants | You'll see them… |
|---|---|---|
| **The Connector** | make friends | hopping cafés and plazas, introducing people |
| **The Hustler** | career, big house | first into the office, last out, eyeing downtown apartments |
| **The Cruiser** | the open road | taking joyrides, working as the taxi driver |
| **The Caregiver** | family life | school runs, playground afternoons, family dinners |
| **The Romantic** | find love | park walks, flowers from the market, fountain dates |
| **The Free Spirit** | experience everything | unpredictable, everywhere, schedule-optional |
| **The Regular** | comfort & routine | same bakery, same bench, same time, every day (the city's heartbeat) |
| **The Dreamer (kid)** | play, grow up | school, playground, trailing adults |

Generation: archetype + jittered axes + random quirk + look → no two Cocos identical, every Coco legible.

## 4. Schedules & time

- Clock: **1 real second = 1 sim minute** → a full sim-day ≈ 24 real minutes. The clock is anchored to **real-world time** (sim time = f(now − epoch)), so every viewer worldwide sees the same moment of the same day. No pause/fast-forward of the present — instead a **time machine**: determinism lets any past moment be re-simulated and scrubbed like a video. Day phases tint the city (dawn/day/dusk/night).
- **Schedule skeleton + utility infill:** sleep block (personality-shifted: night-owls!), work/school block if employed, meals as need-driven; *all other time is free* and utility-chosen. Skeleton gives believable rhythm (rush hours emerge!), utility gives variety and reactivity.
- Weekends: no work blocks → park crowds, market bustle, dates. The week has a *shape*; regulars make it visible.
- Offline (player away): agents simulate at schedule-level statistically; on return, the "Welcome back" sheet becomes a **story digest**: "While you were away: Maya & Ravi started dating · Kenji got promoted · 2 new residents arrived."

## 5. Relationships & social life

- Directed sentiment graph, −100..+100 per pair (asymmetry allowed — unrequited crushes are premium story content).
- Tracks: stranger → acquaintance → friend → close friend; crush → dating → partner (family ties at generation: some agents arrive as households).
- **Interactions fire on co-location** (same place, both in social-capable activity): chat / joke / deep-talk / flirt, outcome = compatibility roll (trait distance + quirk synergy + current moods). Visible as paired bubbles (💬❤😄) — the player can *see* society happening.
- Decay: unmaintained sentiment drifts toward 0 → friendships need upkeep → recurring meetups emerge naturally.
- Compatibility, not scripts: two foodie night-owls who keep meeting at the late café *will* become friends. The system writes the sitcom.

## 6. Ambitions (life arcs)

One active **ambition** per agent: template + milestones + visible progress bar on their card.

- *Own a cottage by the park* — save 5,000 → tour homes → move in (moving day = a city event)
- *Find love* — make 3 friends → first date → relationship
- *Open a bakery* — work 30 shifts → save 8,000 → a market lot converts → **the city itself changes**
- *Make 10 friends* / *Visit every district* / *Raise a family* / *Retire to the green edge*…

Completion → celebration moment → new ambition (next life chapter). Ambitions are the **demand signal for city growth** (§8) and the spine of long-form stories the player follows for days.

## 7. Memory & storytelling (the product surface)

- **Memory stream** (Generative Agents-lite): each agent keeps ~50 salient events, scored by salience (first-times, milestones, strong emotions beat routine). Memories bias behavior (great first date at the plaza → plaza scores higher forever — *places gain personal meaning*).
- **Surfacing — this is the actual game UI:**
  - **Thought bubbles** (icon language) over heads — ambient, glanceable.
  - **Agent card** (tap): portrait, needs, ambition progress, relationships, "life so far" timeline.
  - **Follow mode**: camera-follow one Coco through their day (the Crossy-Road-camera-as-documentary).
  - **Story feed**: toast-stream of notable events; tappable → camera jumps there.
  - **The Coco Daily**: a charming little newspaper each morning — top stories from yesterday's event log ("FIRST KISS AT FOUNTAIN PLAZA!", "Bakery opens on Market Lane"). Template-grammar text in the base game; LLM tier makes it genuinely funny (§9).
- Naming matters: agents get warm, diverse names; the name generator is part of the charm budget.

## 8. Agents ⇄ city (the master loop, mechanically)

- Agents earn wages → pay (abstract) rent → save toward ambitions.
- **Demand signals** drive master-plan construction (see `01-CITY-DESIGN.md` §6): homeless newcomer → next residential lot builds; purpose-starved agents → next workplace; social/fun deficits → next café/park. New arrivals walk in through the **city gate** (arrival = visible event, moving truck from the vehicle pack).
- Player nudges: **none in v1 (pure-observer decision, 2026-06-11).** The demand→growth loop runs fully autonomously. A nudge API (gift a bench, ring the plaza bell) stays cleanly designed-for as a future layer if observation tests as too passive.

## 9. The LLM layer ("literally AI agents") — tiered & honest

Per-agent-per-tick LLM calls are infeasible (cost, latency, offline). The fix is a **three-tier mind**:

| Tier | What | Cost | When |
|---|---|---|---|
| **0 — Sim core** | Needs, utility, schedules, relationships, memory — everything above | Free, offline, deterministic | Always (the game works fully without tiers 1–2) |
| **1 — Template voice** | Grammar-based (Tracery-style) dialogue snippets, thoughts, Daily headlines from event data | Free | Always |
| **2 — LLM voice** (Claude API) | Once per sim-day, **one batched call**: city event log + agent profiles in → unique dialogues, agent reflections, the Daily's feature article out. Cached; graceful fallback to Tier 1 | ~1 small call/day | Online, behind a flag; server-side proxy (never ship API keys to the browser) |

Tier 2 design rule: **LLM narrates the sim; it never decides it.** Determinism, saves, replays, and offline play stay intact; the words get magical. (Optionally later: tier-2.5 "interview an agent" — tap and chat with a Coco, grounded in their memory stream. Stanford-paper magic as a feature, cleanly scoped.)

## 10. Simulation architecture & budgets

- **Fixed-timestep tick** (1 sim-minute), pure TypeScript, zero Phaser imports — Vitest-able end to end.
- **LOD:** on-screen agents = full pathing + animation; off-screen = abstract (teleport along schedule, interactions still resolve). The camera is a spotlight on a simulation that's always running.
- **Population targets:** Phase 2: **10 agents** (every one followable, every one known by name). Phase 3: 60–120 with LOD. Later: 300+ with statistical background tier. Small casts first — attachment beats scale (Animal Crossing has ~10 villagers and people cry about them).
- **Pathfinding:** A* on the road/sidewalk/footpath graph from `01-CITY-DESIGN.md` §7; paths cached per (from,to) place-pair.
- **Determinism is THE architecture (one-shared-city decision):** with no player input, the entire world is a pure function of `(global seed, elapsed real time)`. Every browser computes the identical city locally — **one shared world with zero backend simulation.** Requirements this imposes: integer/fixed-point math only in the sim (float drift across devices would fork the world), seeded RNG everywhere, and sim-version discipline.
- **Checkpoints, not saves:** a tiny canonical snapshot (sim state hash + state) is published daily (CI cron / Cloudflare Worker) so clients fast-forward ≤24h of sim on load, and so code updates can re-anchor the world (new sim version starts from the last checkpoint — history is preserved, the world never resets). Player-side storage shrinks to preferences + followed monsters.
- **Time machine:** determinism makes the past replayable — scrub to yesterday's first kiss at the plaza and watch it again. Live present + replayable history, no recordings stored.

## 11. The believability bar (acceptance tests for "alive")

A build passes Phase 2/3 review only if an observer can, unprompted:
1. Watch any agent for one sim-day and **say what they did and why** ("she worked, grabbed a pastry, met a friend at the park").
2. Point at **rush hour** and **the weekend** happening.
3. Name two agents' relationship from observation alone (bubbles + co-location).
4. Witness one **unscripted story** per sim-week worth retelling (the RimWorld test).
5. Tap anyone and find their card consistent with what they were just seen doing.
