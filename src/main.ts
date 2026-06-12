import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GalleryScene } from './scenes/GalleryScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#79c0e0',
  scale: {
    mode: Phaser.Scale.RESIZE, // full-window canvas on every device
    width: '100%',
    height: '100%',
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, GameScene, UIScene, GalleryScene],
});

// debug handle (used by tooling/screenshot scripts)
(window as unknown as { game: Phaser.Game }).game = game;
