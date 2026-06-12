# Coco City Design — Structure & Procedural Generation

Goal: cities that are **structurally perfect** (readable, walkable, alive) and **procedurally generated** (every city unique, from a shareable seed), built from urban-design theory that's been true for 60 years.

---

## 1. The theory we operationalize

### 1.1 Kevin Lynch — the five elements of a legible city
A city people can "read" has exactly five kinds of things. We generate all five, deliberately:

| Lynch element | In Coco | Generator responsibility |
|---|---|---|
| **Paths** | Arterial avenues, local streets, footpaths | Hierarchical road network (§3.2, §3.4) |
| **Edges** | City boundary, the river/green belt | Map frame & one strong natural edge (§3.1) |
| **Districts** | Downtown, Old Market, residential quarters, park, civic | Region growth with identity palettes (§3.3) |
| **Nodes** | Plazas, key intersections, the fountain square | Placed at arterial crossings (§3.6) |
| **Landmarks** | Town hall, clock tower, the tall red building | One per district, visible from its streets (§3.6) |

**Lynch test (automated):** every generated city must have ≥4 distinct districts, ≥3 nodes, ≥1 landmark per district, and one continuous edge feature. The validator (§5) enforces it.

### 1.2 Jane Jacobs — what makes streets alive
- **Mixed use:** homes near shops near workplaces → streets used at all hours → agents visibly everywhere all day. Pure single-use zones are dead zones; we cap district purity at ~70%.
- **Short blocks:** more corners, more route choice, more chance encounters. Block size target: **4–6 tiles**.
- **Eyes on the street:** shops face arterials; homes face local streets. Fronts matter.

### 1.3 The 15-minute city → the **15-tile rule**
Every home must reach, within 15 walking tiles: a food place, a workplace, a leisure spot, and a social spot (park/plaza/café). This single rule is what makes agent lives *legible* — short, watchable daily loops instead of cross-map treks. The generator validates and **self-heals**: any home failing the rule gets a pocket park or corner shop inserted nearby.

### 1.4 Christopher Alexander — patterns, not noise
Pure procedural cities look like soup. We generate with a **pattern library**: hand-designed micro-patterns (a café corner with two trees; a row of three cottages with gardens; a plaza with fountain + benches) that the generator stamps and connects. Procedural *arrangement* of authored *patterns* = "designed by someone" feel with infinite variety. (This is the Dorfromantik/WFC insight: curate the vocabulary, generate the composition.)

---

## 2. City anatomy

A Coco city (target full size 32×32, grown gradually — see §6) contains:

```
            ╔══════════ GREEN EDGE (river / tree belt) ══════════╗
            ║  RESIDENTIAL NORTH      CIVIC QUARTER               ║
            ║  (cottages, gardens)    (town hall, school, plaza)  ║
            ║        │                     │                      ║
            ║  ══════╪═════ MAIN AVENUE ═══╪══════ (spine)        ║
            ║        │                     │                      ║
            ║  OLD MARKET            DOWNTOWN                     ║
            ║  (awning shops,        (tall buildings, offices,    ║
            ║   café corners)         the landmark tower)         ║
            ║        │                     │                      ║
            ║  CENTRAL PARK ──────── RESIDENTIAL SOUTH            ║
            ║  (the "lung")          (apartments near downtown)   ║
            ╚════════════════ CITY GATE (highway in) ═════════════╝
```

### District identities (mapped to the Kenney pack's palette)
| District | Visual identity | Function (agent affordances) |
|---|---|---|
| **Downtown** | Tall grey/red buildings, dense, street trees | Offices (jobs), restaurants, nightlife |
| **Old Market** | Low awning-shops (the striped-awning tiles), warm beige | Shops, cafés, bakery — social + food |
| **Residential (2–3 quarters)** | Small houses, cottages w/ gardens, apartments nearer downtown | Homes; density gradient: cottages → apartments toward center |
| **Civic Quarter** | White/large buildings, formal plaza | Town hall, school, library — purpose + community events |
| **Central Park** | Green tiles, trees, fountain, paths | Fun + social; the dating/friendship hotspot |
| **Green Edge** | River or tree belt on one map side | Lynch "edge"; jogging path, benches |
| **City Gate** | Highway stub at map edge | Where cars/new residents arrive — arrivals are an *event* |

Density gradient (real-city physics): tall at the center node, stepping down to cottages at the edge. This single rule makes the skyline read correctly from any zoom.

---

## 3. The generation pipeline (deterministic, seeded)

Every stage is a pure function `(seed, config, cityState) → cityState`. Same seed = same city, always. **One-shared-city decision (2026-06-11):** there is exactly ONE production seed — the canonical Coco city everyone watches. The generator's procedural breadth still earns its keep: the 50-seed gallery (§5) lets us *choose* the most beautiful city to be THE city, the validator guarantees its quality, and future "new town" events or test worlds are free.

### Stage 0 — Frame & anchors
- Choose map size, the edge feature side (river/green belt), the city-gate edge (opposite-ish), and the **heart**: the central node where downtown will grow.

### Stage 1 — Arterial skeleton (the Paths)
- **Main Avenue:** spine from city gate toward the heart, continuing to the far side, with 1–2 gentle doglegs (perfectly straight reads sterile; a bend gives character and view corridors).
- **Cross arterials:** 2–3 perpendicular avenues crossing the spine at intersections that become **nodes**.
- Portrait note: the spine runs *vertically in screen space* (iso NE–SW), so scrolling up the city is "traveling the avenue" — the camera's natural journey matches the city's structure.

### Stage 2 — Districts (region growing)
- Seed districts at the nodes: downtown at the heart, market adjacent to downtown along the spine, civic at a secondary node, park adjacent to both residential and civic (the "lung" placement), residential quarters filling remaining regions.
- Weighted flood-fill growth with adjacency rules (market never touches the green edge; apartments buffer downtown from cottages).
- **Mixed-use pass:** sprinkle 15–30% out-of-palette lots into every district (a café in residential, a flat above a market shop) — the Jacobs rule.

### Stage 3 — Local streets & blocks
- Recursive block subdivision inside each district until blocks ≤ 4–6 tiles per side.
- Connectivity rule: local streets form **loops**, not dead-end trees (max 1 cul-de-sac per district, as charm not pattern).
- Footpaths: park paths and mid-block cut-throughs (agents love shortcuts; players love watching them take them).

### Stage 4 — Lots & building placement
- Subdivide blocks into lots; score each lot:
  `desirability = parkProximity + cornerBonus + arterialFrontage(shops:+, homes:−) + landmarkView`
- Assignment: corner lots on arterials → shops/cafés; quiet interiors → homes; high-desirability residential → bigger/nicer homes (visible inequality of place = agent ambition fuel: "save up to move near the park").
- Stamp from the **pattern library** (§1.4) where lot shapes allow; fill remainder from district palettes.

### Stage 5 — Nodes & landmarks
- Best intersections → plazas (fountain, benches, market stalls).
- Per district, one landmark from its palette, placed for **visibility down a street** (terminated vista — the classic urban trick: the clock tower sits at the end of the avenue's sightline).

### Stage 6 — Green pass
- Street trees along arterials (rhythm: every 2–3 tiles), pocket parks wherever the 15-tile validator flags a gap, garden tiles beside cottages.

### Stage 7 — Validate & self-heal (see §5)

### Stage 8 — Render mapping
- Road auto-tiling (4-bit neighbor mask), district palette lookup, deterministic variation jitter (same-but-not-identical houses), depth-sort metadata.

---

## 4. Pattern library (the authored vocabulary)

~20 hand-designed stamps to start. Each is a tiny scene with built-in affordances:

- **Café corner** — awning shop + 2 outdoor tables + tree (Social+Food affordance, high story density)
- **Cottage row** — 3 houses + gardens + shared footpath
- **Plaza** — fountain center, 4 benches, lamp posts (the date spot)
- **School block** — civic building + yard (kids' playtime anchor)
- **Market lane** — 4 awning shops facing each other across a narrow street
- **Apartment cluster** — 2 mid-rises + courtyard + parking
- **Pocket park** — 2×2 green, 1 tree, 1 bench (the self-heal unit)
- **Bus stop / taxi rank** — vehicle pack tie-in
- … (library grows over time; each new pattern enriches every future city)

Patterns declare their affordances (what agent needs they serve) — this is The Sims' smart-object model applied at the urban scale. **Adding content = adding patterns**, no code.

---

## 5. The validator — "perfect city" as executable spec

A generated city ships only if it passes (Vitest, runs on every generator change):

| Check | Target |
|---|---|
| Connectivity | 100% of lots reachable from city gate (roads) AND every home↔every affordance (footpaths included) |
| 15-tile rule | 100% of homes (after self-heal pass) |
| Block size | ≥90% of blocks within 4–6 tiles |
| Mixed-use index | every district 15–30% non-primary use |
| Lynch checklist | ≥4 districts, ≥3 nodes, 1 landmark/district, 1 edge |
| Park access | ≥80% of homes within 10 tiles of any green |
| Intersection density | ≥1 per 25 tiles (short blocks proxy) |
| Determinism | same seed → identical city hash |

Plus a **gallery harness**: render 50 seeds to a contact-sheet PNG for eyeball review. Procgen quality is judged by the *worst* output, not the average — the gallery makes the worst visible.

---

## 6. Growth: master plan, gradual construction

The tension: procedural "perfect city" vs. a city that *grows* (and the v1 player-builder). Resolution — **the generator produces a master plan; the city constructs itself gradually against it**:

1. At new-game, generate the full master plan from the seed (invisible to player).
2. The city starts as a hamlet: city gate + first block of the spine + 3 homes + 1 café.
3. Growth is **demand-driven by agents** (see `02-AGENT-DESIGN.md` §8): population needs homes → next planned residential lots construct; jobs run short → next office; needs go unmet → next café/park. Construction is an *event*: scaffolding sprite, dust, a moving-truck arrival.
4. Player role (**decided: pure observer**): none — growth is fully autonomous. Construction events are *spectacle*: scaffolding, dust, the moving truck arriving through the city gate. The story feed announces them ("A bakery is going up on Market Lane!").

This gives structural perfection (the plan) plus organic growth feel (gradual, demand-led) with zero player input — the city is a character, and watching it grow is the show.

## 7. Streets serve the simulation

- **Two lanes per road tile:** cars on the road, agents on sidewalks — one graph, two layers; A* for both. Footpaths are agent-only edges.
- **Capacity-free traffic** (cosmetic congestion only — cars queue visually at busy nodes but never blocks anyone): simulation honesty without simulation pain.
- **Place metadata is the API:** every placed pattern/building registers `{affordances, jobSlots, capacity, openHours, entranceTile}`. The agent layer consumes *only* this — city and agents stay decoupled, testable independently.

## 8. Asset notes & gaps

- Buildings + vehicles: covered by the two Kenney packs (129 building tiles incl. awning shops, talls, civic whites; vehicles in 5 colors × 8 directions incl. taxi/police/ambulance/garbage).
- **Gap — ground/park/road set:** the buildings pack includes ground tiles but we'll want a fuller iso road/park set (Kenney's iso roads/landscape packs are same-spec, public domain).
- **Characters — DECIDED:** the **Kenney Monster Builder Pack** (in `assets/`) — agents are little monsters assembled procedurally from parts (6 body shapes × 6 colors × arms × legs × 17 eyes × mouths × horns/details = millions of unique Cocos). Parts are front-facing: monsters render as billboard sprites that bob/waddle while walking and flip for left/right — the Crossy Road toy look, cheap and charming. Each monster's look can echo its personality (sleepy eyes for night-owls, big grin for Connectors).
