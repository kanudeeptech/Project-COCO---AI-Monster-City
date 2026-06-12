 > **⚠️ Vision update — large parts of this doc are retired.** Coco is now a **pure-observer AI-monster city**: the city builds itself, monster agents live autonomous lives, the player watches. Start with [docs/00-VISION.md](docs/00-VISION.md); city in [docs/01-CITY-DESIGN.md](docs/01-CITY-DESIGN.md); agents in [docs/02-AGENT-DESIGN.md](docs/02-AGENT-DESIGN.md); planning in [docs/03-ROADMAP-AND-TASKS.md](docs/03-ROADMAP-AND-TASKS.md).
 > **Still valid here:** tech architecture (§7), mobile-web hardening (§7.5), juice principles (§6.4), FTUE philosophy (§5), deployment (§7.6). **Retired:** manual placement (§6.1), coin economy & collect taps (§3–4), shop UI, bulldoze, reference table's builder-loop steals (§1).

# Project Coco — Game Design & Tech Plan (v2)

**Domain:** projectcoco.life
**Pitch:** A cozy isometric city builder you can play one-handed in the browser. Plant a tiny town, watch little cars bring it to life, grow it into a humming city — a few relaxing minutes at a time. No fail states, no energy bars, no dark patterns.

---

## 1. Reference games — what we steal, what we avoid

The design is assembled from proven patterns. Every mechanic below ships in a successful game; nothing here is speculative.

| Game | What it proves | We steal | We avoid |
|---|---|---|---|
| **Township** (Playrix) | Warm "starting town" onboarding; vehicles as ambient life | Pre-built starter town (never show an empty grid); placement *thunk* feedback; vehicles roaming roads | Energy-style gating, social pressure, ad walls |
| **SimCity BuildIt** (EA) | Bottom-tray build UI is the portrait standard | Bottom sheet with horizontally scrolling building cards; drag-ghost with green/red validity | Production-chain grind, wait timers, premium currency |
| **Tiny Tower** (NimbleBit) | Stock-and-collect taps drive check-ins; readable vertical progression | Per-building income storage cap → tapping full buildings is *the* core verb; milestone toast charm | Stocking micromanagement, elevator minigame filler |
| **AdVenture Capitalist / Egg, Inc.** | Disciplined exponential curves; offline earnings as a gift, not FOMO | "Welcome back, Mayor!" offline-earnings sheet; cost-curve math (§4) | Prestige resets (parked for v2), screen-clutter numbers |
| **Triple Town / Dorfromantik** | Adjacency rules create depth from almost nothing; placement itself is the relaxation | Decoration adjacency bonuses; calm pace; placement as a satisfying *act*, not a chore | Merge complexity, scoring pressure |
| **Pocket City** (Codebrew, solo dev) | A premium-feel, no-fail city builder works and reviews superbly | No-lose philosophy; instant gratification on every build; one-dev-scale feature discipline | Zoning/RCI simulation depth (wrong scope for v1), landscape orientation |
| **Mini Motorways** | Minimal road networks + moving vehicles = endless watchability | Color-clean traffic readability; roads as the player's "drawing" | Failure states, demand pressure |
| **Crossy Road / Monument Valley** | Portrait + isometric + toy-like dioramas are a beloved combo on mobile | The "model village" camera framing; chunky silhouette readability | — |

**The synthesis:** Township's warmth + Tiny Tower's tap loop + AdCap's math discipline + Dorfromantik's calm + Pocket City's no-fail philosophy, rendered as a Crossy-Road-style toy diorama. That's Coco.

---

## 2. Design pillars (every decision checks against these)

1. **Always say yes.** No fail states, no punishments, nothing the player can do wrong. Bulldozing refunds 60%. Misplaced building? Free move mode.
2. **One thumb, eyes optional.** Everything reachable in the bottom ⅔ of a portrait screen. No precision drags required. (Thumb-zone research: top corners are the dead zone — HUD only, never actions.)
3. **The city performs for you.** Cars, smoke puffs, lights — reward *watching*, not just doing. This is the screenshot/share driver.
4. **Respect the clock.** Sessions are complete in 3 minutes. Offline earnings are a warm gift with a cap, never a guilt mechanic. No push-notification-bait design.
5. **Ship small, ship real.** Every milestone ends with a playable build on a phone. Features that can't be cut cleanly don't go in v1.

---

## 3. Core loop & session design

```
EARN (buildings fill their coin storage over time)
  → COLLECT (tap full buildings; coins arc to the counter — the dopamine verb)
  → BUILD (spend in the bottom-sheet shop; placement is juicy)
  → UNLOCK (population milestones gate tiers; toast + confetti)
  → loop
```

**Session shape (target 3 min):** open → "Welcome back" sheet (offline coins) → 20–40s of collection taps around the city → 1–2 purchase decisions → place + admire → a milestone or near-milestone visible ("3 more pop to unlock Bakery!") → close. The *visible next goal* at session end is the retention hook — borrowed from Tiny Tower's "next floor in sight" pattern.

**Why storage caps matter (the Tiny Tower lesson):** if income accrues unbounded, there's no reason to tap individual buildings and the core verb dies. Each building stores at most ~10 minutes of its own income; a full building shows a bouncing coin. Collection is *the* tactile joy, so it must stay distributed across the city, pulling the camera (and the player's eyes) across their creation every session.

---

## 4. Economy — the actual math

Vibes-based economies are the #1 killer of idle-adjacent games. Rules:

- **Cost curve:** the n-th copy of a building costs `base × 1.15ⁿ` (the AdCap coefficient — proven to pace well without a spreadsheet PhD).
- **Payback discipline:** every building's *payback time* (cost ÷ income rate) is the real balance lever:

| Tier | Unlock (pop) | Base cost | Income | Payback | Storage cap |
|---|---|---|---|---|---|
| 1 — Small house | start | 50 | +2 pop, 1c/min | ~1 min | 10 min |
| 2 — Cottage / corner shop | 10 | 250 | 4c/min | ~1.5 min | 10 min |
| 3 — Apartment / bakery / café | 25 | 1,200 | 12c/min | ~3 min | 10 min |
| 4 — Office / restaurant | 60 | 8,000 | 45c/min | ~6 min | 12 min |
| 5 — Landmarks | 150 | 50,000 | 180c/min | ~10 min | 15 min |
| Decorations (tree, plaza, fountain) | various | 100–5,000 | +10% to orthogonal neighbors | — | — |
| Land expansion 12→16→20 | 40 / 120 pop | 5,000 / 40,000 | — | — | — |

- **Pacing targets:** Tier 3 by end of day 1; first land expansion day 2; Tier 5 landmark by day 5–7. Numbers above are first-pass; tuned by simulation, not by feel:
- **Veteran move — simulated playtester:** the economy lives in pure TypeScript (no Phaser), so we write a Vitest "bot" that plays optimally for simulated days and asserts the pacing table holds (`expect(botAtDay(1).tier).toBe(3)`). Every balance change re-validates the whole curve in milliseconds. This is how we "make no mistakes" on economy.
- **Adjacency:** +10% income per orthogonally-adjacent decoration, cap +30%. Creates Dorfromantik-style placement puzzles ("where does the fountain do the most work?") with one rule.
- **Offline earnings:** accrue at 50% rate, capped at 4 hours, presented as a gift sheet. 50% (not 100%) keeps active play clearly better without making absence feel punished.

---

## 5. FTUE — the first 60 seconds

Browser games get **one** chance; there's no install commitment sunk-cost. Drop-off is decided in the first minute.

1. **0s:** Load screen is the game's diorama art, loading bar styled as a road being paved. Total payload budget: **< 3 MB, interactive < 3s on 4G** (this is a hard requirement, not a wish — see §8).
2. **5s:** Player sees a *pre-built starter hamlet* — 2 houses, a road, a tree, one car already driving (Township's trick: never show an empty lot; show the fantasy already alive).
3. **10s:** One house has a bouncing coin. Single highlight: "Tap to collect!" → instant coin-arc + sound. First dopamine inside 15 seconds.
4. **30s:** Guided: open shop → place a house (ghost preview, tap ✓). The placement *thunk* + dust puff is the second hook.
5. **60s:** "Reach 10 population to unlock the Corner Shop" goal pinned. Tutorial over — 5 steps total, implemented as a step-machine overlay, skippable.
- Audio note: browsers block audio until a gesture — the very first collect tap doubles as the audio unlock. Designed-in, not patched-in.

---

## 6. Systems detail

### 6.1 Grid & placement
- Iso diamond grid 12×12 → 16×16 → 20×20 (expansions as coin sinks).
- All buildings 1×1 footprint in v1 (multi-tile is a depth-sorting and UX tax we defer; tall sprites give visual variety for free).
- **Placement UX (mobile-tested pattern from SimCity BuildIt):** tap card in bottom sheet → ghost appears center-screen → drag ghost *or tap any tile* to move it (tap-to-move is the one-thumb fallback) → green/red tint validity → ✓/✗ buttons in thumb zone. Never confirm-on-drop (mis-drops are the #1 mobile placement rage).
- Roads auto-connect (4-bit neighbor mask → correct tile variant). Buildings of tier ≥ 4 require road adjacency (gentle layout constraint that makes cities *look* like cities).
- Move mode: free relocation anytime (pillar 1). Bulldoze refunds 60%.

### 6.2 Traffic (ambient life, zero gameplay coupling)
- Cars spawn at random road tiles, BFS to another random road tile, drive at constant speed with the correct 8-direction sprite, despawn, respawn elsewhere. No collision sim — cars may pass each other; at this art scale nobody notices, and it cannot break.
- Count scales with road tiles (1 car per ~6 road tiles, cap 12) — performance-bounded by design.
- Taxi/police/ambulance/garbage unlock as *cosmetic* milestone rewards ("50 pop: a police car now patrols!"). Cosmetic-only means traffic can never block progression — it's pure delight.

### 6.3 Save system
- Versioned JSON (`{v:1,...}`), autosave on every mutation + `visibilitychange` (mobile Safari kills tabs without warning; `beforeunload` is unreliable on iOS — `visibilitychange` is the dependable hook).
- **localStorage + IndexedDB dual-write** (Safari can evict storage for sites unused ~7 days; two stores + PWA install materially reduce wipe risk).
- "Backup city" button: export/import save as a copyable string. Costs an hour to build, saves us from the one-star "I LOST MY CITY" review — the most common catastrophic failure of storage-based web games.
- Clock-cheat protection: none in v1 (single-player, no leaderboard — cheating yourself is allowed).

### 6.4 Juice checklist (the difference between "works" and "feels good")
- Collect: coin arcs to HUD counter with count-up tick; subtle pitch-up on rapid consecutive taps (the Mario coin-combo trick).
- Place: building drops in with squash-and-stretch + dust puff + soft thud.
- Unlock: toast banner + confetti burst + new card glows in shop.
- Idle city: chimney smoke on some houses, birds occasionally crossing, day-tint shift (subtle, v1.5 if time).
- Every tween ≤ 300ms. Cozy ≠ slow.

---

## 7. Tech architecture

### 7.1 Stack
- **Phaser (latest stable) + TypeScript + Vite.** Phaser's WebGL renderer is Pixi-derived — one dependency covers the Phaser+Pixi intent. No backend; static site.
- Kenney sheets load directly via `load.atlasXML` (both packs ship XML atlases) — zero asset re-packing.

### 7.2 Scenes
| Scene | Responsibility |
|---|---|
| `BootScene` | Atlases, audio, fonts; styled loader |
| `GameScene` | Iso world, camera pan + pinch-zoom, placement controller, traffic |
| `UIScene` (parallel) | HUD, bottom-sheet shop, toasts, tutorial overlay — never scales with camera |

### 7.3 Code layout — sim/render separation (the testability backbone)
```
src/
  main.ts            // Phaser config, scale setup
  scenes/            // Boot, Game, UI
  world/             // IsoGrid math, TileRenderer, PlacementController, RoadMask
  sim/               // Economy, OfflineEarnings, TrafficSim — ZERO Phaser imports
  data/              // buildings.ts, unlocks.ts — pure data, the balance surface
  state/             // GameState, SaveManager (versioned, dual-write)
  ui/                // BottomSheet, HUD, Toast, TutorialStepMachine
test/                // Vitest: economy pacing bot, save migration, road masks
```

### 7.4 Iso rendering notes
- 2:1 tiles; world→screen `x=(c−r)·w/2`, `y=(c+r)·h/2`; depth = `r+c` (cars get fractional depth within their edge).
- One container, depth-sort **only on mutation** for static objects; cars use `setDepth` per tile-crossing, not per frame.
- Cull: with ≤ 20×20 grid + 12 cars we're well inside mobile WebGL budgets; no chunking needed (deliberate scope ceiling).

### 7.5 Portrait & mobile-web hardening (where browser games actually die)
| Trap | Mitigation |
|---|---|
| iOS Safari URL-bar resize / 100vh lies | `100dvh` + resize listener; `Scale.FIT` re-layout on `resize` |
| Pull-to-refresh / scroll hijack | `touch-action: none` on canvas; `overscroll-behavior: none` |
| Browser pinch-zoom vs game pinch | `user-scalable=no` viewport meta + pointer-event pinch handled in-game |
| Audio blocked until gesture | First tutorial tap unlocks AudioContext (designed into FTUE) |
| Tab discard = lost progress | Autosave on mutation + `visibilitychange` |
| Notches / home indicator | `viewport-fit=cover` + `env(safe-area-inset-*)` padding on HUD |
| Slow first load = bounce | < 3 MB budget; atlases are the bulk (~1.5 MB); preload only what Boot needs |
- Design resolution 720×1280, `Scale.FIT` + `autoCenter`; UI anchored by layout helper for 18:9–21:9. Desktop gets the letterboxed "toy in a frame" presentation with a soft page background.
- PWA manifest + icons: installable, fullscreen, portrait-locked when launched from home screen.

### 7.6 Deployment & measurement
- **Cloudflare Pages** → projectcoco.life (free tier, custom domain, instant rollbacks).
- **Plausible (or Cloudflare Web Analytics)** — privacy-friendly, no-cookie funnel: load → first collect → first build → day-2 return. Four numbers tell us if FTUE works. No player data collected.

---

## 8. Risk register (make-no-mistakes list)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Economy pacing wrong → boring or blown-through | High (default outcome for first drafts) | Vitest pacing bot (§4); data-only rebalance, no code changes |
| Iso depth-sort bugs (buildings popping over cars) | Medium | Single sorted container + fractional depths; visual regression check in M1, *before* content scales |
| Scope creep (multi-tile, quests, citizens...) | High | Parking lot (§10); pillar 5; v1 feature freeze after M3 |
| Save loss on Safari | Medium | Dual-write + export string + PWA (§6.3) |
| Placement feels bad on small phones | Medium | Tap-to-move fallback, never confirm-on-drop; test on a real phone every milestone |
| First-load bounce | Medium | 3 MB budget enforced in CI (`vite build` size check) |
| Tutorial skipped → lost player | Low | World pre-built + bouncing coin is self-explanatory even with tutorial skipped |

---

## 9. Milestones (each ends playable-on-phone)

| # | Milestone | Definition of done |
|---|---|---|
| M0 | Skeleton | Vite+TS+Phaser boots; atlases render; portrait scaling verified on a real phone |
| M1 | World | Iso grid + starter hamlet renders; pan + pinch-zoom; depth-sort verified with tall buildings |
| M2 | Core loop | Place/move/bulldoze with ghost UX; income ticks; storage caps; collect with coin-arc juice |
| M3 | Progression | Tiers, unlocks, adjacency, land expansion; save/load + export; **pacing bot green** |
| M4 | Alive | Road auto-tiling + cars; audio; juice checklist done; offline earnings sheet |
| M5 | Ship | FTUE (5-step), PWA, analytics funnel, balance pass, live at projectcoco.life |

## 10. Parking lot (v1.5 / v2 — explicitly NOT v1)
Multi-tile buildings · quests/tasks · citizens walking · day/night & weather · prestige/"found a new city" · cloud saves & accounts · leaderboards · seasonal events · monetization of any kind.
