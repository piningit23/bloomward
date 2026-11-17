// Particles, shockwave rings and floating combat text. All cosmetic:
// nothing here touches game state, so it can never break a run.
export class Particles {
  constructor() {
    this.list = [];
    this.rings = [];
    this.texts = [];
  }

  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (speed || 140) * (0.4 + Math.random() * 0.8);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3.5 });
    }
  }

  ring(x, y, color, maxR) {
    this.rings.push({ x, y, r: 8, maxR: maxR || 90, life: 0.45, max: 0.45, color });
  }

  floatText(x, y, str, color, big) {
    this.texts.push({ x, y, str, color: color || '#fff', life: 0.9, max: 0.9, big: !!big });
  }

  update(dt) {
    for (const p of this.list) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
    this.list = this.list.filter((p) => p.life > 0);
    for (const r of this.rings) { r.r += (r.maxR - r.r) * dt * 9; r.life -= dt; }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const t of this.texts) { t.y -= 42 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.life / r.max) * 0.8;
      ctx.strokeStyle = r.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.max);
      ctx.font = t.big ? 'bold 20px "Trebuchet MS", sans-serif' : 'bold 14px "Trebuchet MS", sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
