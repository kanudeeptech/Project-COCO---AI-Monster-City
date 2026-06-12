import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../world/iso';

const COLORS = {
  grass: 0x8fc967,
  grassEdge: 0x7db757,
  park: 0xa4d97e,
  belt: 0x6fae52,
  plaza: 0xe3cfa2,
  plazaEdge: 0xd4bd8c,
  road: 0x4a5462,
  roadLane: 0x6b7585,
  treeTrunk: 0x8a6644,
  tree: 0x4e9143,
  treeLight: 0x63a854,
  water: 0x5db3d9,
} as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.atlasXML('buildings', 'assets/buildingTiles_sheet.png', 'assets/buildingTiles_sheet.xml');
    this.load.atlasXML('cars', 'assets/sheet_allCars.png', 'assets/sheet_allCars.xml');
    this.load.atlasXML('monsters', 'assets/spritesheet_default.png', 'assets/spritesheet_default.xml');
  }

  create(): void {
    this.makeGroundTextures();
    this.makeRoadTextures();
    this.makePropTextures();
    const mode = window.location.hash === '#tiles' ? 'Gallery' : 'Game';
    this.scene.start(mode);
    // ?bg = cinematic background mode (landing page): no HUD, camera drifts
    const isBg = new URLSearchParams(window.location.search).has('bg');
    if (mode === 'Game' && !isBg) this.scene.launch('UI');
  }

  private diamond(g: Phaser.GameObjects.Graphics, fill: number, edge: number): void {
    g.fillStyle(edge, 1);
    g.fillPoints(
      [
        new Phaser.Geom.Point(TILE_W / 2, 0),
        new Phaser.Geom.Point(TILE_W, TILE_H / 2),
        new Phaser.Geom.Point(TILE_W / 2, TILE_H),
        new Phaser.Geom.Point(0, TILE_H / 2),
      ],
      true,
    );
    const inset = 2;
    g.fillStyle(fill, 1);
    g.fillPoints(
      [
        new Phaser.Geom.Point(TILE_W / 2, inset),
        new Phaser.Geom.Point(TILE_W - inset * 2, TILE_H / 2),
        new Phaser.Geom.Point(TILE_W / 2, TILE_H - inset),
        new Phaser.Geom.Point(inset * 2, TILE_H / 2),
      ],
      true,
    );
  }

  private makeGroundTextures(): void {
    const make = (key: string, fill: number, edge: number) => {
      const g = this.add.graphics();
      this.diamond(g, fill, edge);
      g.generateTexture(key, TILE_W, TILE_H);
      g.destroy();
    };
    make('ground_grass', COLORS.grass, COLORS.grassEdge);
    make('ground_belt', COLORS.belt, COLORS.grassEdge);
    make('ground_plaza', COLORS.plaza, COLORS.plazaEdge);
    // park: brighter lawn with tiny flower dots so it reads as a distinct place
    {
      const g = this.add.graphics();
      this.diamond(g, 0xb5e48c, 0x99d066);
      const dots: Array<[number, number, number]> = [
        [30, 22, 0xffffff],
        [62, 30, 0xffd166],
        [48, 14, 0xef6f91],
        [70, 20, 0xffffff],
        [38, 34, 0xffd166],
      ];
      for (const [x, y, color] of dots) {
        g.fillStyle(color, 1);
        g.fillCircle(x, y, 1.8);
      }
      g.generateTexture('ground_park', TILE_W, TILE_H);
      g.destroy();
    }
  }

  private makeRoadTextures(): void {
    // 16 variants by neighbor mask: N(r-1)=1, E(c+1)=2, S(r+1)=4, W(c-1)=8
    // Look: full-tile light SIDEWALK slab with a wide asphalt bed inset,
    // plus white dashed lane lines toward each connected edge.
    const mid: Record<number, [number, number]> = {
      1: [TILE_W * 0.75, TILE_H * 0.25], // N → up-right edge
      2: [TILE_W * 0.75, TILE_H * 0.75], // E → down-right edge
      4: [TILE_W * 0.25, TILE_H * 0.75], // S → down-left edge
      8: [TILE_W * 0.25, TILE_H * 0.25], // W → up-left edge
    };
    const cx = TILE_W / 2;
    const cy = TILE_H / 2;
    const innerDiamond = (g: Phaser.GameObjects.Graphics, color: number, inset: number) => {
      const ix = (inset * TILE_W) / TILE_H; // keep 2:1 proportions
      g.fillStyle(color, 1);
      g.fillPoints(
        [
          new Phaser.Geom.Point(cx, inset),
          new Phaser.Geom.Point(TILE_W - ix, cy),
          new Phaser.Geom.Point(cx, TILE_H - inset),
          new Phaser.Geom.Point(ix, cy),
        ],
        true,
      );
    };
    for (let mask = 0; mask < 16; mask++) {
      const g = this.add.graphics();
      // sidewalk slab fills the whole tile (this is where monsters walk)
      this.diamond(g, 0xb8bec8, 0x9aa1ad);
      // asphalt bed — wide, leaving a clear sidewalk band on each side
      innerDiamond(g, COLORS.road, 5);
      // white dashed lane line toward each connected neighbor
      g.lineStyle(2, 0xe8ecf2, 0.9);
      for (const bit of [1, 2, 4, 8]) {
        if (mask & bit) {
          const [ex, ey] = mid[bit];
          for (let s = 0.15; s < 0.95; s += 0.3) {
            g.beginPath();
            g.moveTo(cx + (ex - cx) * s, cy + (ey - cy) * s);
            g.lineTo(cx + (ex - cx) * (s + 0.14), cy + (ey - cy) * (s + 0.14));
            g.strokePath();
          }
        }
      }
      if (mask === 0) {
        g.fillStyle(0xe8ecf2, 0.9);
        g.fillCircle(cx, cy, 3);
      }
      g.generateTexture(`road_${mask}`, TILE_W, TILE_H);
      g.destroy();
    }
  }

  private makePropTextures(): void {
    // Tree: trunk + two-tone canopy, base aligned to diamond center bottom.
    {
      const w = 48;
      const h = 64;
      const g = this.add.graphics();
      g.fillStyle(COLORS.treeTrunk, 1);
      g.fillRect(w / 2 - 4, h - 18, 8, 16);
      g.fillStyle(COLORS.tree, 1);
      g.fillCircle(w / 2, h - 36, 18);
      g.fillStyle(COLORS.treeLight, 1);
      g.fillCircle(w / 2 - 6, h - 42, 10);
      g.generateTexture('prop_tree', w, h);
      g.destroy();
    }
    // Fountain: stone ring + water
    {
      const w = 64;
      const h = 40;
      const g = this.add.graphics();
      g.fillStyle(0xb9b9b9, 1);
      g.fillEllipse(w / 2, h / 2, 56, 30);
      g.fillStyle(COLORS.water, 1);
      g.fillEllipse(w / 2, h / 2, 42, 21);
      g.fillStyle(0xd9f1fb, 1);
      g.fillEllipse(w / 2, h / 2 - 4, 12, 7);
      g.generateTexture('prop_fountain', w, h);
      g.destroy();
    }
  }
}
