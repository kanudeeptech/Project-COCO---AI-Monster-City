import Phaser from 'phaser';
import { generate, type CityPlan } from '../citygen/generator';
import { Ground, BuildingKind, idx, inBounds } from '../citygen/types';
import { singleFrame, stackFrames } from '../data/palettes';
import { isoX, isoY, isoDepth, TILE_W, TILE_H } from '../world/iso';
import { simTimeOfDay, simMinutesSinceEpoch, dayPhase } from '../core/clock';
import { TrafficSim } from '../sim/traffic';
import { WalkerSim } from '../sim/walkers';
import { AgentSim } from '../sim/agents';
import { loadSim, saveSim } from '../state/save';

export class GameScene extends Phaser.Scene {
  private plan!: CityPlan;
  private pinchDist = 0;
  private minZoom = 0.45;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private traffic!: TrafficSim;
  private walkers!: WalkerSim;
  private agents!: AgentSim;
  private seenEvents = 0;

  constructor() {
    super('Game');
  }

  init(data: { seed?: number }): void {
    const urlSeed = Number(new URLSearchParams(window.location.search).get('seed'));
    const seed = data.seed ?? (Number.isFinite(urlSeed) && urlSeed > 0 ? urlSeed : 1);
    this.plan = generate(seed);
    this.registry.set('plan', this.plan);
  }

  create(): void {
    this.renderCity();
    this.setupCamera();
    this.traffic = new TrafficSim(this, this.plan);
    this.agents = new AgentSim(this.plan);
    const saved = loadSim(this.plan.seed);
    const nowMin = simMinutesSinceEpoch(Date.now());
    if (saved) this.agents.restore(saved, nowMin);
    this.agents.advanceTo(nowMin);
    this.walkers = new WalkerSim(this, this.plan, this.agents);

    // persistence: every 30s + when the tab goes to background
    const persist = (): void => saveSim(this.agents.serialize(this.plan.seed));
    this.time.addEvent({ delay: 30_000, loop: true, callback: persist });
    const onVis = (): void => {
      if (document.visibilityState === 'hidden') persist();
    };
    document.addEventListener('visibilitychange', onVis);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      persist();
      document.removeEventListener('visibilitychange', onVis);
    });
    this.registry.set('agentSim', this.agents);
    this.registry.set('walkerSim', this.walkers);
    this.registry.set('followId', -1);
    this.seenEvents = this.agents.events.length;
    this.game.events.on('pan-to-tile', ({ c, r }: { c: number; r: number }) => {
      this.registry.set('followId', -1);
      this.cameras.main.pan(isoX(c, r), isoY(c, r), 600, 'Sine.easeInOut');
    });
    // shared-world day/night tint (driven by the real clock — same for every viewer).
    // World-space rect refitted to the camera's visible area every frame —
    // screen-pinned rects scale with camera zoom and would float as a slab.
    this.nightOverlay = this.add
      .rectangle(0, 0, 100, 100, 0x16244d, 0)
      .setOrigin(0)
      .setDepth(1000);
    this.scale.on('resize', () => this.setupCamera());
    this.game.events.emit('city-ready', this.plan);
  }

  update(time: number, delta: number): void {
    // keep the tint covering exactly what the camera sees, at any zoom
    const wv = this.cameras.main.worldView;
    this.nightOverlay.setPosition(wv.x - 4, wv.y - 4);
    this.nightOverlay.setSize(wv.width + 8, wv.height + 8);

    const simMin = simMinutesSinceEpoch(Date.now());
    this.traffic.update(delta);
    this.agents.advanceTo(simMin);
    this.walkers.update(delta, time, simMin);

    // cinematic drift for the landing-page background
    if (new URLSearchParams(window.location.search).has('bg')) {
      const cx = isoX(this.plan.plaza.c, this.plan.plaza.r);
      const cy = isoY(this.plan.plaza.c, this.plan.plaza.r);
      this.cameras.main.centerOn(
        cx + Math.sin(time / 21000) * 320,
        cy + Math.cos(time / 27000) * 180,
      );
    }

    // surface new city events: chat bubbles + story feed
    while (this.seenEvents < this.agents.events.length) {
      const e = this.agents.events[this.seenEvents++];
      for (const id of e.agentIds) this.walkers.showChat(id, time);
      this.game.events.emit('city-event', e);
    }

    // follow mode: camera shadows the chosen monster
    const followId = this.registry.get('followId') as number;
    if (followId >= 0) {
      const pos = this.walkers.positionOf(followId);
      if (pos) {
        const cam = this.cameras.main;
        const mid = cam.midPoint;
        cam.centerOn(mid.x + (pos.x - mid.x) * 0.06, mid.y + (pos.y - 60 - mid.y) * 0.06);
      }
    }
    if (new URLSearchParams(window.location.search).has('notint')) {
      this.nightOverlay.setFillStyle(0x16244d, 0);
      return;
    }
    const { hour } = simTimeOfDay(Date.now());
    const phase = dayPhase(hour);
    const alpha = phase === 'night' ? 0.38 : phase === 'dusk' ? 0.22 : phase === 'dawn' ? 0.12 : 0;
    const color = phase === 'dusk' ? 0x4d2c50 : 0x16244d;
    this.nightOverlay.setFillStyle(color, alpha);
  }

  private roadMask(c: number, r: number): number {
    const { size, ground } = this.plan;
    const road = (cc: number, rr: number) =>
      inBounds(size, cc, rr) && ground[idx(size, cc, rr)] === Ground.Road;
    return (road(c, r - 1) ? 1 : 0) | (road(c + 1, r) ? 2 : 0) | (road(c, r + 1) ? 4 : 0) | (road(c - 1, r) ? 8 : 0);
  }

  private renderCity(): void {
    const { size, ground, placements } = this.plan;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = isoX(c, r);
        const y = isoY(c, r);
        const gv = ground[idx(size, c, r)];
        let key: string;
        switch (gv) {
          case Ground.Road:
            key = `road_${this.roadMask(c, r)}`;
            break;
          case Ground.Plaza:
            key = 'ground_plaza';
            break;
          case Ground.Park:
            key = 'ground_park';
            break;
          case Ground.GreenBelt:
            key = 'ground_belt';
            break;
          default:
            key = 'ground_grass';
        }
        this.add.image(x, y, key).setOrigin(0.5, 0.5).setDepth(0);
      }
    }

    for (const p of placements) {
      const x = isoX(p.c, p.r);
      const yBottom = isoY(p.c, p.r) + TILE_H / 2; // bottom vertex of the tile diamond
      const depth = isoDepth(p.c, p.r) + 1;
      if (p.kind === BuildingKind.Tree) {
        this.add.image(x, yBottom - 4, 'prop_tree').setOrigin(0.5, 1).setDepth(depth);
        continue;
      }
      if (p.kind === BuildingKind.Fountain) {
        this.add
          .image(x, isoY(p.c, p.r), 'prop_fountain')
          .setOrigin(0.5, 0.5)
          .setDepth(depth);
        continue;
      }
      const stack = stackFrames(p.kind, p.variant);
      if (stack) {
        // modular stack: base + storeys + roof. Each piece's top face is TILE_H tall,
        // so the next piece sits (displayHeight − TILE_H) higher.
        let y = yBottom;
        stack.forEach((frame, i) => {
          const img = this.add
            .image(x, y, 'buildings', frame)
            .setOrigin(0.5, 1)
            .setDepth(depth + i * 0.01);
          if (img.width > TILE_W) img.setScale(TILE_W / img.width);
          y -= img.displayHeight - TILE_H;
        });
        continue;
      }
      const frame = singleFrame(p.kind, p.variant);
      if (!frame) continue;
      const img = this.add.image(x, yBottom, 'buildings', frame).setOrigin(0.5, 1).setDepth(depth);
      if (img.width > TILE_W) img.setScale(TILE_W / img.width);
    }
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    const { size } = this.plan;
    const minX = isoX(0, size - 1) - TILE_W;
    const maxX = isoX(size - 1, 0) + TILE_W;
    const minY = -TILE_H * 2;
    const maxY = isoY(size - 1, size - 1) + TILE_H * 3;
    cam.setBounds(minX, minY, maxX - minX, maxY - minY);
    cam.centerOn(isoX(this.plan.plaza.c, this.plan.plaza.r), isoY(this.plan.plaza.c, this.plan.plaza.r));
    // never let the city shrink smaller than the viewport's larger fit
    const fitZoom = Math.max(this.scale.width / (maxX - minX), this.scale.height / (maxY - minY));
    this.minZoom = Math.min(1, Math.max(0.45, fitZoom * 0.85));
    cam.setZoom(Math.max(1, this.minZoom));

    // Drag pan + two-finger pinch zoom
    this.input.addPointer(1);
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const p2 = this.input.pointer2;
      if (p.isDown && p2 && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p.x, p.y, p2.x, p2.y);
        if (this.pinchDist > 0) {
          cam.setZoom(Phaser.Math.Clamp(cam.zoom * (d / this.pinchDist), this.minZoom, 2.5));
        }
        this.pinchDist = d;
      } else if (p.isDown) {
        if (Math.abs(p.x - p.prevPosition.x) + Math.abs(p.y - p.prevPosition.y) > 2)
          this.registry.set('followId', -1); // dragging cancels follow
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      }
    });
    this.input.on('pointerup', () => (this.pinchDist = 0));
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.92 : 1.08), this.minZoom, 2.5));
      },
    );
  }
}
