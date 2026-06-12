import Phaser from 'phaser';

/** Debug: open /#tiles — shows every Kenney building frame with its index, for palette curation. */
export class GalleryScene extends Phaser.Scene {
  constructor() {
    super('Gallery');
  }

  create(): void {
    const tex = this.textures.get('buildings');
    const frames = tex
      .getFrameNames()
      .filter((f) => f.startsWith('buildingTiles_'))
      .sort();

    const cols = 5;
    const cellW = 144;
    const cellH = 170;
    this.cameras.main.setBackgroundColor('#2c3a4a');

    frames.forEach((frame, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW + cellW / 2;
      const y = row * cellH + cellH / 2 + 20;
      const img = this.add.image(x, y, 'buildings', frame).setOrigin(0.5, 0.5);
      const fit = Math.min(1, (cellW - 14) / img.width, (cellH - 40) / img.height);
      img.setScale(fit);
      this.add
        .text(x, y + cellH / 2 - 16, frame.replace('buildingTiles_', '').replace('.png', ''), {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffe28a',
        })
        .setOrigin(0.5);
    });

    const totalH = Math.ceil(frames.length / cols) * cellH + 60;
    this.cameras.main.setBounds(0, 0, cols * cellW, totalH);
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.cameras.main.scrollY -= p.y - p.prevPosition.y;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.cameras.main.scrollY += dy;
    });
  }
}
