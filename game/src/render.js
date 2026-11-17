// BLOOMWARD rendering: a bright sunlit meadow, drawn fresh every frame.
// Light background + dark text so every screen reads at a glance,
// even shrunk to a contact-sheet thumbnail.
import { VIEW, WAVES_TOTAL, DEW } from './config.js';
import { drawEnemy } from './enemies.js';

const FONT = '"Trebuchet MS", Verdana, sans-serif';

// Pre-placed meadow decoration (deterministic, no RNG per frame).
const FLOWERS = [];
const GRASS = [];
{
  let s = 1234567;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < 90; i++) FLOWERS.push({ x: rnd() * 1280, y: 90 + rnd() * 600, c: ['#ff8a80', '#ffd54f', '#f48fb1', '#ce93d8', '#fff176'][i % 5], r: 3 + rnd() * 4 });
  for (let i = 0; i < 130; i++) GRASS.push({ x: rnd() * 1280, y: 80 + rnd() * 620, h: 6 + rnd() * 10 });
}

function pill(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(47,122,61,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2); ctx.fill();
}

export function drawMeadow(ctx, t) {
  // Sky-to-meadow gradient: cream sunlit top, fresh green below.
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, '#fff8d6');
  g.addColorStop(0.35, '#e8f5c8');
  g.addColorStop(1, '#a8dba0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  // Sun with soft rays.
  const sx = 1120, sy = 80;
  const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 130);
  sg.addColorStop(0, 'rgba(255, 236, 120, 0.95)');
  sg.addColorStop(1, 'rgba(255, 236, 120, 0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 140, sy - 140, 280, 280);
  ctx.fillStyle = '#ffdf3d';
  ctx.beginPath(); ctx.arc(sx, sy, 42, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 180, 0, 0.7)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.05;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 52, sy + Math.sin(a) * 52);
    ctx.lineTo(sx + Math.cos(a) * 66, sy + Math.sin(a) * 66);
    ctx.stroke();
  }
  // Drifting clouds.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 3; i++) {
    const cx = ((t * 9 + i * 430) % 1500) - 120;
    const cy = 56 + i * 42;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.arc(cx + 26, cy + 6, 20, 0, Math.PI * 2);
    ctx.arc(cx - 26, cy + 8, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  // Grass tufts and wildflowers.
  ctx.strokeStyle = '#5da24a';
  ctx.lineWidth = 2;
  for (const tuft of GRASS) {
    ctx.beginPath();
    ctx.moveTo(tuft.x, tuft.y);
    ctx.lineTo(tuft.x - 3, tuft.y - tuft.h);
    ctx.moveTo(tuft.x + 3, tuft.y);
    ctx.lineTo(tuft.x + 5, tuft.y - tuft.h * 0.8);
    ctx.stroke();
  }
  for (const f of FLOWERS) {
    ctx.fillStyle = f.c;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r, f.r * 0.55, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
}

function drawGlowbloom(ctx, bloom, t) {
  const pulse = 1 + Math.sin(t * 2.2) * 0.05;
  const glow = ctx.createRadialGradient(bloom.x, bloom.y, 10, bloom.x, bloom.y, 150);
  const hurt = bloom.hp < bloom.maxHp * 0.35;
  glow.addColorStop(0, hurt ? 'rgba(255, 120, 90, 0.5)' : 'rgba(255, 235, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 235, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(bloom.x - 160, bloom.y - 160, 320, 320);
  // Petals.
  ctx.save();
  ctx.translate(bloom.x, bloom.y);
  ctx.scale(pulse, pulse);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.15;
    ctx.fillStyle = i % 2 ? '#ffca28' : '#ffd54f';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 34, Math.sin(a) * 34, 26, 15, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff8f00';
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff176';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * 11, Math.sin(a) * 11, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#e65100';
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Bloom health ring.
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(bloom.x, bloom.y, bloom.radius + 12, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = hurt ? '#e53935' : '#43a047';
  ctx.beginPath(); ctx.arc(bloom.x, bloom.y, bloom.radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, bloom.hp / bloom.maxHp)); ctx.stroke();
}

function drawPlayer(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  // Glow.
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  glow.addColorStop(0, 'rgba(255, 240, 140, 0.8)');
  glow.addColorStop(1, 'rgba(255, 240, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-48, -48, 96, 96);
  // Wings.
  const flap = Math.sin(t * 26) * 0.55;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(-11, -8 + flap * 5, 13, 6, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, -8 - flap * 5, 13, 6, 0.7, 0, Math.PI * 2); ctx.fill();
  // Body.
  ctx.fillStyle = '#2e4a1f';
  ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7cb342';
  ctx.beginPath(); ctx.arc(0, 0, p.radius - 4, 0, Math.PI * 2); ctx.fill();
  // Lantern belly + eyes.
  ctx.fillStyle = '#ffee58';
  ctx.beginPath(); ctx.arc(0, 4, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#212121';
  ctx.beginPath(); ctx.arc(-5, -5, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -5, 2.6, 0, Math.PI * 2); ctx.fill();
  // Aim tick.
  ctx.strokeStyle = 'rgba(46,74,31,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(p.aim) * (p.radius + 4), Math.sin(p.aim) * (p.radius + 4));
  ctx.lineTo(Math.cos(p.aim) * (p.radius + 14), Math.sin(p.aim) * (p.radius + 14));
  ctx.stroke();
  ctx.restore();
  // Dash cooldown ring.
  if (p.dashCd > 0) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / p.dashCooldown)); ctx.stroke();
  }
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.textAlign = 'left';
  // Top-left: wave + score + dew.
  pill(ctx, 14, 12, 330, 64, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = '#2e4a1f';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(`Wave ${world.wave} / ${WAVES_TOTAL}`, 28, 38);
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillStyle = '#5d4037';
  ctx.fillText(`Score ${world.score.toLocaleString()}`, 28, 62);
  ctx.fillStyle = '#0277bd';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`💧 Dew ${world.dew}`, 210, 40);
  ctx.fillStyle = '#5d4037';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`Kills ${world.kills}`, 210, 62);
  // Top-right: combo.
  if (world.combo >= 4) {
    pill(ctx, 1000, 12, 266, 46, 'rgba(255, 243, 180, 0.95)');
    ctx.fillStyle = '#e65100';
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`COMBO x${world.comboMult.toFixed(1)}  (${world.combo})`, 1133, 43);
    ctx.textAlign = 'left';
    bar(ctx, 1010, 48, 246, 5, world.comboTimer / p.comboWindow, '#ff9800');
  }
  // Bottom-left: player HP + dash.
  pill(ctx, 14, 646, 300, 62, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = '#2e4a1f';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText('Warden', 28, 668);
  bar(ctx, 28, 676, 180, 12, p.hp / p.maxHp, p.hp > 30 ? '#43a047' : '#e53935');
  ctx.fillStyle = '#37474f';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 216, 687);
  ctx.fillStyle = '#5d4037';
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText(p.dashCd <= 0 ? 'Dash ready (Shift)' : `Dash ${p.dashCd.toFixed(1)}s`, 28, 702 - 2);
  // Bottom-right: bloom HP + traps.
  pill(ctx, 966, 646, 300, 62, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = '#2e4a1f';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText('🌼 Glowbloom', 980, 668);
  bar(ctx, 980, 676, 180, 12, world.bloom.hp / world.bloom.maxHp, world.bloom.hp > 40 ? '#ffb300' : '#e53935');
  ctx.fillStyle = '#37474f';
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`${Math.ceil(world.bloom.hp)} / ${world.bloom.maxHp}`, 1168, 687);
  // Boss bar.
  if (world.bossActive) {
    const b = world.bossActive;
    pill(ctx, 440, 12, 400, 44, 'rgba(255,255,255,0.92)');
    ctx.fillStyle = '#4a148c';
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(b.name, 640, 30);
    bar(ctx, 452, 36, 376, 10, b.hp / b.maxHp, '#8e24aa');
    ctx.textAlign = 'left';
  }
  // Banner.
  if (world.bannerT > 0 && world.banner) {
    ctx.globalAlpha = Math.min(1, world.bannerT);
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText(world.banner, 640, 130);
    ctx.fillStyle = '#2e4a1f';
    ctx.fillText(world.banner, 640, 130);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

function drawOrbs(ctx, world) {
  for (const o of world.orbs) {
    ctx.fillStyle = '#29b6f6';
    ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b3e5fc';
    ctx.beginPath(); ctx.arc(o.x - 1.5, o.y - 1.5, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTraps(ctx, world) {
  for (const t of world.traps) {
    ctx.strokeStyle = 'rgba(93, 64, 55, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#8d6e63';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t.life;
      ctx.beginPath();
      ctx.moveTo(t.x + Math.cos(a) * 8, t.y + Math.sin(a) * 8);
      ctx.lineTo(t.x + Math.cos(a) * 16, t.y + Math.sin(a) * 16);
      ctx.lineTo(t.x + Math.cos(a + 0.4) * 8, t.y + Math.sin(a + 0.4) * 8);
      ctx.fill();
    }
  }
}

export function drawWorld(ctx, world, t) {
  ctx.save();
  if (world.shake > 0.3) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawMeadow(ctx, t);
  drawGlowbloom(ctx, world.bloom, t);
  drawTraps(ctx, world);
  drawOrbs(ctx, world);
  for (const e of world.enemies) drawEnemy(ctx, e, t);
  // Bolts.
  for (const b of world.bolts) {
    ctx.fillStyle = '#fff176';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
  }
  for (const s of world.enemyShots) {
    ctx.fillStyle = '#7b1fa2';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ce93d8';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  // Companion bees.
  const p = world.player;
  for (let i = 0; i < (p.bees || 0); i++) {
    const a = t * 2.4 + (i / Math.max(1, p.bees)) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * 40, by = p.y + Math.sin(a) * 40;
    ctx.fillStyle = '#ffca28';
    ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.fillRect(bx - 6, by - 2, 4, 4);
    ctx.fillRect(bx + 1, by - 2, 4, 4);
  }
  drawPlayer(ctx, p, t);
  world.fx.draw(ctx);
  ctx.restore();
  drawHud(ctx, world);
}

export function drawTitle(ctx, t, best) {
  drawMeadow(ctx, t);
  // Hero bloom, big and glowing, centre-left of the title art.
  drawGlowbloom(ctx, { x: 640, y: 300, hp: 100, maxHp: 100, radius: 46 }, t);
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.fillStyle = '#1b5e20';
  ctx.font = `bold 76px ${FONT}`;
  ctx.strokeText('BLOOMWARD', 640, 150);
  ctx.fillText('BLOOMWARD', 640, 150);
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillStyle = '#4e342e';
  ctx.fillText('Guard the last Glowbloom — 10 waves of blight', 640, 192);
  pill(ctx, 340, 380, 600, 150, 'rgba(255,255,255,0.92)');
  ctx.fillStyle = '#2e4a1f';
  ctx.font = `bold 19px ${FONT}`;
  ctx.fillText('You are the firefly Warden. Shoot pollen, dash,', 640, 414);
  ctx.fillText('plant thorn traps, and keep the flower alive.', 640, 442);
  ctx.fillStyle = '#5d4037';
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText('WASD move  ·  Mouse aim  ·  Click / Space shoot  ·  Shift dash  ·  E trap', 640, 478);
  ctx.fillText('Clear a wave to pick a bloom blessing. Fall, or let the', 640, 504);
  ctx.fillText('Glowbloom die, and the meadow goes dark.', 640, 528 - 6);
  // Start prompt, pulsing.
  const pulse = 0.75 + Math.sin(t * 4) * 0.25;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#b3541e';
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText('▶  Click or press Enter to play', 640, 600);
  ctx.globalAlpha = 1;
  if (best > 0) {
    ctx.fillStyle = '#5d4037';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`Best score: ${best.toLocaleString()}`, 640, 640);
  }
  ctx.textAlign = 'left';
}

export function drawUpgrade(ctx, world) {
  drawWorld(ctx, world, world.time);
  ctx.fillStyle = 'rgba(20, 40, 20, 0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 40px ${FONT}`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeText(`Wave ${world.wave} cleared!`, 640, 110);
  ctx.fillText(`Wave ${world.wave} cleared!`, 640, 110);
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = '#fff9c4';
  ctx.fillText('Choose a bloom blessing  (click a card, or press 1 / 2 / 3)', 640, 150);
  const cards = world.choices;
  const cw = 300, ch = 250, gap = 30;
  const total = cards.length * cw + (cards.length - 1) * gap;
  const x0 = (1280 - total) / 2;
  cards.forEach((c, i) => {
    const x = x0 + i * (cw + gap);
    const y = 210;
    pill(ctx, x, y, cw, ch, 'rgba(255,255,255,0.96)');
    ctx.fillStyle = '#2e4a1f';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(c.name, x + cw / 2, y + 52);
    ctx.fillStyle = '#5d4037';
    ctx.font = `bold 18px ${FONT}`;
    const words = c.desc.split(' ');
    let line = '', ly = y + 100;
    for (const w of words) {
      if ((line + ' ' + w).length > 22) { ctx.fillText(line, x + cw / 2, ly); ly += 26; line = w; }
      else line = line ? line + ' ' + w : w;
    }
    ctx.fillText(line, x + cw / 2, ly);
    ctx.fillStyle = '#b3541e';
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`[${i + 1}]`, x + cw / 2, y + ch - 30);
    const owned = world.taken[c.id] || 0;
    if (owned > 0) {
      ctx.fillStyle = '#757575';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`owned x${owned}`, x + cw / 2, y + ch - 56);
    }
  });
  ctx.fillStyle = '#fff9c4';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`Dew ${world.dew}  ·  Reroll for ${DEW.rerollCost} dew (press R)`, 640, 510);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20, 40, 20, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText('Paused', 640, 330);
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = '#fff9c4';
  ctx.fillText('Press P to keep playing  ·  M toggles sound', 640, 380);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, world, won) {
  drawWorld(ctx, world, world.time);
  ctx.fillStyle = won ? 'rgba(255, 248, 200, 0.55)' : 'rgba(40, 10, 30, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#1b5e20' : '#4a148c';
  ctx.font = `bold 56px ${FONT}`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  const title = won ? '🌼 THE MEADOW BLOOMS AGAIN!' : '🥀 The Glowbloom has faded…';
  ctx.strokeText(title, 640, 190);
  ctx.fillText(title, 640, 190);
  ctx.fillStyle = '#2e4a1f';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText(won ? `You held all ${WAVES_TOTAL} waves. The blight is gone.` : `You fell on wave ${world.wave}. The blight creeps on.`, 640, 240);
  pill(ctx, 440, 280, 400, 190, 'rgba(255,255,255,0.94)');
  ctx.fillStyle = '#2e4a1f';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(`Score  ${world.score.toLocaleString()}`, 640, 322);
  ctx.fillStyle = '#5d4037';
  ctx.font = `bold 19px ${FONT}`;
  ctx.fillText(`Waves cleared  ${won ? WAVES_TOTAL : world.wave - 1} / ${WAVES_TOTAL}`, 640, 358);
  ctx.fillText(`Blight slain  ${world.kills}`, 640, 390);
  const acc = world.shotsFired ? Math.round((world.shotsHit / world.shotsFired) * 100) : 0;
  ctx.fillText(`Pollen accuracy  ${acc}%`, 640, 422);
  ctx.fillText(`Time  ${Math.floor(world.timePlayed / 60)}:${String(Math.floor(world.timePlayed % 60)).padStart(2, '0')}`, 640, 452);
  const pulse = 0.75 + Math.sin(world.time * 4) * 0.25;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#b3541e';
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText('Press Enter or R to play again', 640, 530);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
