import Phaser from 'phaser';
import { Ground, idx, type CityPlan } from '../citygen/types';
import { makeRng, type Rng } from '../core/rng';
import { isoX, isoY, TILE_H } from '../world/iso';
import { AgentSim, ACTIVITY_EMOJI, type Agent } from './agents';

const BODY_COLORS = ['blue', 'dark', 'green', 'red', 'white', 'yellow'] as const;
const BODY_SHAPES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const EYES = [
  'eye_cute_light.png', 'eye_cute_dark.png', 'eye_blue.png', 'eye_yellow.png',
  'eye_human.png', 'eye_human_blue.png', 'eye_human_green.png',
] as const;
const MOUTHS = [
  'mouth_closed_happy.png', 'mouthA.png', 'mouthB.png', 'mouthD.png',
  'mouth_closed_teeth.png', 'mouth_closed_fangs.png',
] as const;
const DETAILS = ['antenna_large', 'antenna_small', 'horn_large', 'horn_small', 'ear_round'] as const;

interface Limbs {
  armL: Phaser.GameObjects.Image;
  armR: Phaser.GameObjects.Image;
  legL: Phaser.GameObjects.Image;
  legR: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Image;
}

interface Walker {
  root: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  limbs: Limbs;
  agent: Agent;
  /** straight-line destination in world px (monsters roam the open fields) */
  destX: number;
  destY: number;
  /** mid-journey wander waypoint so walks curve a little */
  wayX: number | null;
  wayY: number | null;
  speed: number; // px per second
  seenTargetVersion: number;
  walking: boolean;
  /** which gathering spot this monster is heading to / standing at (−1 = none) */
  spotIdx: number;
  bobPhase: number;
  chatUntil: number;
}

/** Build a full monster the way the pack intends: legs + body + arms + face.
 *  Limb pivots are set at hip/shoulder so the walk cycle can swing them. */
function buildMonster(
  scene: Phaser.Scene,
  rng: Rng,
  name: string,
): { root: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text; limbs: Limbs } {
  const color = rng.pick(BODY_COLORS);
  const shape = rng.pick(BODY_SHAPES);
  const armV = rng.pick(['A', 'B', 'C', 'D', 'E']);
  const legV = rng.pick(['A', 'B', 'C', 'D', 'E']);
  const root = scene.add.container(0, 0);

  const body = scene.add.image(0, 0, 'monsters', `body_${color}${shape}.png`);
  const bw = body.width;
  const bh = body.height;

  // anatomy: container origin = ground point under the feet
  const legLen = bh * 0.34;
  const bodyBottom = -legLen * 0.8; // hips overlap the body's lower edge

  root.add(scene.add.ellipse(0, 2, bw * 0.74, bw * 0.2, 0x000000, 0.18));

  // legs: pivot at the hip (origin near top) so rotation = a step
  const legL = scene.add
    .image(-bw * 0.2, bodyBottom + 6, 'monsters', `leg_${color}${legV}.png`)
    .setOrigin(0.5, 0.08)
    .setFlipX(true); // pack sprites are right-side limbs — mirror for the left
  const legR = scene.add
    .image(bw * 0.2, bodyBottom + 6, 'monsters', `leg_${color}${legV}.png`)
    .setOrigin(0.5, 0.08);
  for (const leg of [legL, legR]) leg.setScale(((legLen + 10) / leg.height) * 1.0);
  root.add(legL);
  root.add(legR);

  // arms: pivot at the shoulder, drawn behind the body so they peek out at the sides
  const shoulderY = bodyBottom - bh * 0.68;
  const armL = scene.add
    .image(-bw * 0.46, shoulderY, 'monsters', `arm_${color}${armV}.png`)
    .setOrigin(0.3, 0.1)
    .setFlipX(true); // mirror right-side sprite for the left arm
  const armR = scene.add
    .image(bw * 0.46, shoulderY, 'monsters', `arm_${color}${armV}.png`)
    .setOrigin(0.7, 0.1);
  for (const arm of [armL, armR]) arm.setScale((bh * 0.52) / arm.height);
  root.add(armL);
  root.add(armR);

  body.setOrigin(0.5, 1).setPosition(0, bodyBottom);
  root.add(body);

  // head details (horns / antennae / ears)
  const bodyTop = bodyBottom - bh;
  if (rng.chance(70)) {
    const detail = rng.pick(DETAILS);
    if (detail === 'ear_round') {
      for (const side of [-1, 1]) {
        const ear = scene.add
          .image(side * bw * 0.34, bodyTop + bh * 0.08, 'monsters', `detail_${color}_ear_round.png`)
          .setOrigin(0.5, 0.5)
          .setScale(0.6);
        ear.setFlipX(side < 0);
        root.add(ear);
      }
    } else {
      root.add(
        scene.add
          .image(0, bodyTop + bh * 0.04, 'monsters', `detail_${color}_${detail}.png`)
          .setOrigin(0.5, 1)
          .setScale(0.7),
      );
    }
  }

  // face
  const eye = rng.pick(EYES);
  const eyeY = bodyBottom - bh * 0.62;
  if (rng.chance(30)) {
    const e = scene.add.image(0, eyeY, 'monsters', eye).setOrigin(0.5, 0.5);
    e.setScale((bw * 0.3) / e.width);
    root.add(e);
  } else {
    for (const side of [-1, 1]) {
      const e = scene.add.image(side * bw * 0.17, eyeY, 'monsters', eye).setOrigin(0.5, 0.5);
      e.setScale((bw * 0.22) / e.width);
      e.setFlipX(side < 0);
      root.add(e);
    }
  }
  const mouth = scene.add
    .image(0, bodyBottom - bh * 0.38, 'monsters', rng.pick(MOUTHS))
    .setOrigin(0.5, 0.5);
  mouth.setScale((bw * 0.34) / mouth.width);
  root.add(mouth);

  const label = scene.add
    .text(0, bodyTop - 22, name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#1d2733',
      strokeThickness: 5,
    })
    .setOrigin(0.5, 1)
    .setName('label');
  root.add(label);

  root.setScale(54 / (bh + legLen));
  // tappable: generous hit box around the whole monster (local, pre-scale coords)
  root.setInteractive(
    new Phaser.Geom.Rectangle(-bw * 0.75, bodyTop - bh * 0.35, bw * 1.5, bh * 1.7 + legLen),
    Phaser.Geom.Rectangle.Contains,
  );
  return { root, label, limbs: { armL, armR, legL, legR, body } };
}

export class WalkerSim {
  private walkers: Walker[] = [];
  private rng: Rng;
  /** fixed gathering spots on the green fields — where small groups form */
  private meetSpots: Array<{ x: number; y: number }> = [];

  constructor(
    private scene: Phaser.Scene,
    plan: CityPlan,
    private sim: AgentSim,
  ) {
    this.rng = makeRng(plan.seed ^ 0xbeef);
    // 6 grassy clearings, well spread out (deterministic from the seed)
    const chosen: Array<{ c: number; r: number }> = [];
    for (let tries = 0; tries < 600 && chosen.length < 6; tries++) {
      const c = this.rng.range(4, plan.size - 5);
      const r = this.rng.range(4, plan.size - 5);
      if (plan.ground[idx(plan.size, c, r)] !== Ground.Grass) continue;
      if (chosen.some((s) => Math.abs(s.c - c) + Math.abs(s.r - r) < 9)) continue;
      chosen.push({ c, r });
    }
    this.meetSpots = chosen.map((s) => ({ x: isoX(s.c, s.r), y: isoY(s.c, s.r) }));
    for (const agent of sim.agents) {
      const { x, y } = this.doorstep(agent.home);
      const { root, label, limbs } = buildMonster(this.scene, this.rng, agent.name);
      root.setPosition(x, y);
      root.on('pointerdown', () => this.scene.game.events.emit('monster-tap', agent.id));
      this.walkers.push({
        root,
        label,
        limbs,
        agent,
        destX: x,
        destY: y,
        wayX: null,
        wayY: null,
        speed: 42 + this.rng.int(18),
        seenTargetVersion: -1,
        walking: false,
        spotIdx: -1,
        bobPhase: this.rng.int(628) / 100,
        chatUntil: 0,
      });
    }
  }

  /** world position just in front of a building tile */
  private doorstep(t: { c: number; r: number }): { x: number; y: number } {
    return {
      x: isoX(t.c, t.r) + (this.rng.int(31) - 15),
      y: isoY(t.c, t.r) + TILE_H * 0.7 + this.rng.int(10),
    };
  }

  isWalking(id: number): boolean {
    return this.walkers[id]?.walking ?? false;
  }

  /** world position of a monster (for camera follow / event panning) */
  positionOf(id: number): { x: number; y: number } | null {
    const w = this.walkers[id];
    return w ? { x: w.root.x, y: w.root.y } : null;
  }

  /** show a 💬 bubble over a monster for a few seconds */
  showChat(id: number, nowMs: number): void {
    const w = this.walkers[id];
    if (w) w.chatUntil = nowMs + 5000;
  }

  /** pick a gathering spot: join a small group (1–3), avoid crowds — keeps the
   *  monsters evenly spread across several field locations */
  private pickSpot(w: Walker): number {
    let best = 0;
    let bestScore = Infinity;
    this.meetSpots.forEach((spot, i) => {
      const occupants = this.walkers.filter(
        (o) => o !== w && o.spotIdx === i && o.agent.activity === 'social',
      ).length;
      const dist = Math.hypot(spot.x - w.root.x, spot.y - w.root.y);
      // small groups are inviting; crowds are not; empty spots are fine
      const crowdFactor = occupants === 0 ? 1.0 : occupants <= 2 ? 0.45 : 4.0;
      const score = (dist + 120) * crowdFactor;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    return best;
  }

  /** personal position in the loose circle at a spot */
  private circleSpot(w: Walker, spotIdx: number): { x: number; y: number } {
    const spot = this.meetSpots[spotIdx];
    const angle = (w.agent.id / this.walkers.length) * Math.PI * 2;
    return {
      x: spot.x + Math.cos(angle) * 30,
      y: spot.y + Math.sin(angle) * 17,
    };
  }

  update(deltaMs: number, timeMs: number, simMinute: number): void {
    for (const w of this.walkers) {
      const a = w.agent;
      // new decision from the brain → casually stroll across the fields toward it
      if (a.targetVersion !== w.seenTargetVersion) {
        w.seenTargetVersion = a.targetVersion;
        let dest: { x: number; y: number };
        if (a.activity === 'social' && this.meetSpots.length) {
          w.spotIdx = this.pickSpot(w);
          dest = this.circleSpot(w, w.spotIdx);
        } else {
          w.spotIdx = -1;
          dest = this.doorstep(a.target);
        }
        w.destX = dest.x;
        w.destY = dest.y;
        // curve the walk through a sideways waypoint — meadow strolling, not bee-lines
        const mx = (w.root.x + dest.x) / 2;
        const my = (w.root.y + dest.y) / 2;
        w.wayX = mx + (this.rng.int(121) - 60);
        w.wayY = my + (this.rng.int(61) - 30);
        w.walking = true;
      }

      this.updateLabel(w, timeMs);

      if (w.walking) {
        const tx = w.wayX ?? w.destX;
        const ty = w.wayY ?? w.destY;
        const dx = tx - w.root.x;
        const dy = ty - w.root.y;
        const dist = Math.hypot(dx, dy);
        const farFromGoal = Math.hypot(w.destX - w.root.x, w.destY - w.root.y) > 520;
        const step = (w.speed * (farFromGoal ? 1.75 : 1) * deltaMs) / 1000; // jog when it's far
        if (dist <= step) {
          if (w.wayX !== null) {
            w.wayX = null;
            w.wayY = null; // waypoint reached — head for the doorstep
          } else {
            w.root.setPosition(w.destX, w.destY);
            w.walking = false;
            this.sim.arrived(a.id, simMinute);
          }
        } else {
          const bob = Math.abs(Math.sin(timeMs / 130 + w.bobPhase)) * 3;
          w.root.setPosition(w.root.x + (dx / dist) * step, w.root.y + (dy / dist) * step - bob * 0.2);
          if (Math.abs(dx) > 1) this.face(w, dx < 0 ? -1 : 1);
        }
        w.root.setDepth(w.root.y / (TILE_H / 2) + 1.6);
      } else {
        // idle breathing bob while at a place
        const bob = Math.abs(Math.sin(timeMs / 420 + w.bobPhase)) * 1.5;
        w.root.setPosition(w.destX, w.destY - bob);
        w.root.setDepth(w.destY / (TILE_H / 2) + 1.6);
      }

      // limb animation — smooth per-frame walk/run cycle (no keyframe snapping)
      const { armL, armR, legL, legR, body } = w.limbs;
      if (w.walking) {
        const running = Math.hypot(w.destX - w.root.x, w.destY - w.root.y) > 520;
        const phase = timeMs / (running ? 68 : 105) + w.bobPhase * 4;
        const amp = running ? 0.8 : 0.5;
        const swing = Math.sin(phase) * amp;
        legL.rotation = swing;
        legR.rotation = -swing;
        armL.rotation = -swing * 0.75;
        armR.rotation = swing * 0.75;
        body.rotation = Math.sin(phase * 2) * 0.03; // tiny torso wobble
      } else {
        // smoothly relax limbs, then a gentle idle arm sway
        const relax = Math.max(0, 1 - deltaMs / 140);
        const idle = Math.sin(timeMs / 640 + w.bobPhase) * 0.05;
        legL.rotation *= relax;
        legR.rotation *= relax;
        armL.rotation = armL.rotation * relax + idle;
        armR.rotation = armR.rotation * relax - idle;
        body.rotation *= relax;
      }

      // publish live position to the brain — this is how monsters know where everyone is
      // inverse iso: c−r = x/(W/2), c+r = y/(H/2)
      const cr = w.root.x / 50;
      const cpr = w.root.y / 25;
      a.posC = (cpr + cr) / 2;
      a.posR = (cpr - cr) / 2;
    }
  }

  private face(w: Walker, sign: number): void {
    const s = Math.abs(w.root.scaleX);
    w.root.setScale(sign * s, w.root.scaleY);
    w.label.setScale(sign * Math.abs(w.label.scaleX), w.label.scaleY);
  }

  private updateLabel(w: Walker, timeMs: number): void {
    const emoji = timeMs < w.chatUntil ? '💬' : ACTIVITY_EMOJI[w.agent.activity];
    const text = `${w.agent.name} ${emoji}`;
    if (w.label.text !== text) w.label.setText(text);
  }
}
