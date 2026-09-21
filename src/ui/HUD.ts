import { GameState } from '../game/GameState';
import { pixelSprites } from '../engine/PixelSpriteGenerator';

export class HUD {
  private game: GameState;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private avatarCanvas: HTMLCanvasElement;
  private avatarCtx: CanvasRenderingContext2D;

  constructor(game: GameState) {
    this.game = game;
    this.minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.avatarCanvas = document.getElementById('hudAvatarCanvas') as HTMLCanvasElement;
    this.avatarCtx = this.avatarCanvas.getContext('2d')!;
  }

  update() {
    const p = this.game.activePlayer;
    if (!p) return;

    // Player info
    const nameEl = document.getElementById('hudPlayerName')!;
    nameEl.innerText = p.displayName;
    nameEl.style.color = p.isDarkling ? '#f43f5e' : p.color;

    document.getElementById('hudPlayerClass')!.innerText = p.isDarkling ? 'THE DARKLING' : p.className;
    document.getElementById('hudPlayerLevel')!.innerText = `LV. ${p.level}`;

    // Darkling badge
    const badge = document.getElementById('hudDarklingBadge')!;
    if (p.isDarkling) badge.classList.remove('hidden');
    else badge.classList.add('hidden');

    // Health and Mana Bars
    const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
    const mpPct = Math.max(0, (p.mp / p.maxMp) * 100);
    document.getElementById('hudHPBar')!.style.width = `${hpPct}%`;
    document.getElementById('hudHPText')!.innerText = `${p.hp}/${p.maxHp}`;
    document.getElementById('hudMPBar')!.style.width = `${mpPct}%`;
    document.getElementById('hudMPText')!.innerText = `${p.mp}/${p.maxMp}`;

    // Gold & Net Worth
    document.getElementById('hudPlayerGold')!.innerText = `${p.gold}G`;
    const netWorth = p.getNetWorth(this.game.allNodes);
    document.getElementById('hudPlayerNetWorth')!.innerText = `${netWorth}G`;
    document.getElementById('hudPlayerTowns')!.innerText = `${p.townsControlled} Towns`;

    document.getElementById('hudDayCount')!.innerText = `${this.game.dayCounter}`;
    document.getElementById('hudWeekCount')!.innerText = `${this.game.weekCounter}`;

    // Render Avatar
    this.renderAvatar();

    // Render Mini Radar
    this.renderMinimap();
  }

  private renderAvatar() {
    const p = this.game.activePlayer;
    this.avatarCtx.clearRect(0, 0, 48, 48);
    this.avatarCtx.imageSmoothingEnabled = false;

    const sprite = pixelSprites.getHeroSprite(
      p.classKey,
      'SE',
      'idle',
      0,
      p.equipment,
      p.isDarkling,
      p.prank
    );
    this.avatarCtx.drawImage(sprite, -16, -16, 80, 80);
  }

  private renderMinimap() {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / 36;
    const scaleY = h / 32;

    // Draw lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    this.game.allNodes.forEach(node => {
      node.neighbors.forEach(nId => {
        if (nId > node.id) {
          const target = this.game.allNodes.find(n => n.id === nId);
          if (target) {
            ctx.beginPath();
            ctx.moveTo(node.gx * scaleX, node.gy * scaleY);
            ctx.lineTo(target.gx * scaleX, target.gy * scaleY);
            ctx.stroke();
          }
        }
      });
    });

    // Draw spaces
    this.game.allNodes.forEach(node => {
      ctx.fillStyle =
        node.type === 'town'
          ? '#fbbf24'
          : node.type === 'boss'
          ? '#ef4444'
          : node.type === 'dark_gate'
          ? '#c084fc'
          : node.type === 'blue'
          ? '#3b82f6'
          : '#64748b';
      ctx.fillRect(node.gx * scaleX - 2, node.gy * scaleY - 2, 4, 4);
    });

    // Draw players
    this.game.players.forEach(pl => {
      ctx.fillStyle = pl.isDarkling ? '#f43f5e' : pl.color;
      ctx.beginPath();
      ctx.arc(pl.gridX * scaleX, pl.gridY * scaleY, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
