import Phaser from 'phaser';
import type { CityPlan } from '../citygen/generator';
import { simTimeOfDay } from '../core/clock';
import { activitySentence, type AgentSim, type CityEvent, type NeedKey } from '../sim/agents';
import type { WalkerSim } from '../sim/walkers';

const NEED_ROWS: Array<[NeedKey, string, number]> = [
  ['energy', 'Energy', 0x6ec6ff],
  ['hunger', 'Food', 0xffb74d],
  ['social', 'Social', 0xce93d8],
  ['fun', 'Fun', 0x81c784],
  ['purpose', 'Purpose', 0xfff176],
];

/** Debug/browse UI: seed navigation so we can choose THE city. Runs above GameScene. */
export class UIScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;
  private stats!: Phaser.GameObjects.Text;
  private clock!: Phaser.GameObjects.Text;
  private seed = 1;
  private card?: Phaser.GameObjects.Container;
  private cardAgentId = -1;
  private cardName!: Phaser.GameObjects.Text;
  private cardActivity!: Phaser.GameObjects.Text;
  private cardFriends!: Phaser.GameObjects.Text;
  private cardFollow!: Phaser.GameObjects.Text;
  private cardBars: Phaser.GameObjects.Rectangle[] = [];
  private toasts: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('UI');
  }

  create(): void {
    // full re-layout on window resize (RESIZE scale mode); `once` removes only
    // this listener — each restart re-registers it
    this.scale.once('resize', () => this.scene.restart());
    const W = this.scale.width;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    };

    // image-based bar: Shape rectangles glitch in WebGL at some canvas sizes
    this.add
      .image(0, 0, '__WHITE')
      .setOrigin(0)
      .setDisplaySize(W, 92)
      .setTint(0x1d2733)
      .setScrollFactor(0)
      .setDepth(10);
    this.label = this.add
      .text(W / 2, 30, '', { ...style, fontSize: '30px', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(11);
    this.stats = this.add
      .text(W / 2, 66, '', { ...style, fontSize: '20px', color: '#9fb6c9' })
      .setOrigin(0.5)
      .setDepth(11);

    const mkBtn = (x: number, text: string, onTap: () => void) => {
      const btn = this.add
        .text(x, this.scale.height - 60, text, {
          ...style,
          fontSize: '34px',
          backgroundColor: '#1d2733',
          padding: { x: 22, y: 12 },
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', onTap);
      return btn;
    };
    mkBtn(W / 2 - 180, '◀', () => this.go(this.seed - 1));
    mkBtn(W / 2, '🎲', () => this.go(1 + ((Math.random() * 100000) | 0)));
    mkBtn(W / 2 + 180, '▶', () => this.go(this.seed + 1));

    const onPlan = (plan: CityPlan): void => {
      this.seed = plan.seed;
      this.label.setText(`Coco — candidate city #${plan.seed}`);
      const s = plan.stats;
      this.stats.setText(
        `${s.homes} homes · ${s.shops} shops · ${s.roadTiles} road · ${s.parks} green · heals ${s.healsApplied}`,
      );
    };
    this.game.events.on('city-ready', onPlan);
    // GameScene may have emitted before this scene was created
    const existing = this.registry.get('plan') as CityPlan | undefined;
    if (existing) onPlan(existing);

    // the shared world clock — identical for every viewer on Earth
    this.clock = this.add
      .text(W - 16, 30, '', { ...style, fontSize: '24px', color: '#ffe28a' })
      .setOrigin(1, 0.5)
      .setDepth(11);

    this.buildCard();
    this.game.events.on('monster-tap', (id: number) => this.openCard(id));
    this.game.events.on('city-event', (e: CityEvent) => this.addToast(e));
  }

  /** story feed: small tappable toasts under the header */
  private addToast(e: CityEvent): void {
    const W = this.scale.width;
    const toast = this.add.container(W / 2, 124).setDepth(15).setAlpha(0);
    const text = this.add
      .text(0, 0, e.text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const bg = this.add
      .rectangle(0, 0, text.width + 44, 44, e.kind === 'chat' ? 0x1d2733 : 0x3d2f59, 0.92)
      .setStrokeStyle(2, 0x4a5e75)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.game.events.emit('pan-to-tile', { c: e.c, r: e.r }));
    toast.add([bg, text]);

    // stack: push older toasts down, keep max 3
    this.toasts.unshift(toast);
    while (this.toasts.length > 3) {
      const old = this.toasts.pop();
      old?.destroy();
    }
    this.toasts.forEach((t, i) => this.tweens.add({ targets: t, y: 124 + i * 52, alpha: 1 - i * 0.25, duration: 200 }));

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 6500,
      duration: 500,
      onComplete: () => {
        toast.destroy();
        this.toasts = this.toasts.filter((t) => t !== toast);
      },
    });
  }

  private buildCard(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const cardW = Math.min(640, W - 40); // clamped: bottom-sheet on phones, panel on desktop
    const cardH = 360;
    const card = this.add
      .container((W - cardW) / 2, H - cardH - 110)
      .setDepth(20)
      .setVisible(false);

    const bg = this.add
      .rectangle(cardW / 2, cardH / 2, cardW, cardH, 0x1d2733, 0.94)
      .setStrokeStyle(3, 0x3a4c61)
      .setInteractive(); // swallow taps
    card.add(bg);

    this.cardName = this.add
      .text(44, 28, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0, 0);
    card.add(this.cardName);

    this.cardActivity = this.add
      .text(44, 76, '', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#9fd49f' })
      .setOrigin(0, 0);
    card.add(this.cardActivity);

    this.cardFriends = this.add
      .text(44, 112, '', { fontFamily: 'system-ui, sans-serif', fontSize: '21px', color: '#c9a9e8' })
      .setOrigin(0, 0);
    card.add(this.cardFriends);

    this.cardFollow = this.add
      .text(cardW - 110, 76, '👁 Follow', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#2c5a8f',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    this.cardFollow.on('pointerdown', () => {
      const current = this.registry.get('followId') as number;
      this.registry.set('followId', current === this.cardAgentId ? -1 : this.cardAgentId);
    });
    card.add(this.cardFollow);

    this.cardBars = [];
    NEED_ROWS.forEach(([, title, color], i) => {
      const y = 158 + i * 38;
      card.add(
        this.add
          .text(44, y, title, { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#9fb6c9' })
          .setOrigin(0, 0.5),
      );
      card.add(this.add.rectangle(160, y, 380, 16, 0x0e151d).setOrigin(0, 0.5));
      const fill = this.add.rectangle(160, y, 380, 16, color).setOrigin(0, 0.5);
      card.add(fill);
      this.cardBars.push(fill);
    });

    const close = this.add
      .text(cardW - 40, 30, '✕', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#9fb6c9',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => {
      this.card?.setVisible(false);
      this.cardAgentId = -1;
    });
    card.add(close);

    this.card = card;
  }

  private openCard(id: number): void {
    this.cardAgentId = id;
    this.card?.setVisible(true);
    this.refreshCard();
  }

  private refreshCard(): void {
    if (this.cardAgentId < 0 || !this.card?.visible) return;
    const sim = this.registry.get('agentSim') as AgentSim | undefined;
    const walkers = this.registry.get('walkerSim') as WalkerSim | undefined;
    if (!sim) return;
    const a = sim.agents[this.cardAgentId];
    if (!a) return;
    this.cardName.setText(`${a.name} — ${a.archetype.label}`);
    this.cardActivity.setText(activitySentence(a, walkers?.isWalking(a.id) ?? false));
    const friends = sim.friendsOf(a.id);
    this.cardFriends.setText(
      friends.length ? `Friends: ${friends.map((f) => f.name).join(', ')}` : 'No friends yet — give it time',
    );
    this.cardFollow.setText(this.registry.get('followId') === a.id ? '✓ Following' : '👁 Follow');
    NEED_ROWS.forEach(([key], i) => {
      this.cardBars[i].width = Math.max(6, (380 * a.needs[key]) / 100);
    });
  }

  update(): void {
    const { day, hour, minute } = simTimeOfDay(Date.now());
    this.clock.setText(
      `Day ${day + 1} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    );
    this.refreshCard();
  }

  private go(seed: number): void {
    if (seed < 1) return;
    this.scene.get('Game').scene.restart({ seed });
  }
}
