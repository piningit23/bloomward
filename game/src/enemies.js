// Enemies: spawn, movement behaviours, boss attacks, and per-kind drawing.
// Every enemy is a plain object; the world owns the arrays.
import { ENEMIES, BOSSES } from './config.js';
import { clamp, dist, angleTo } from './random.js';

let nextId = 1;

export function spawnEnemy(kind, x, y, rng, elite) {
  const base = ENEMIES[kind];
  const mult = elite ? 2.4 : 1;
  return {
    id: nextId++, kind, x, y,
    hp: base.hp * mult, maxHp: base.hp * mult,
    speed: base.speed * (elite ? 0.92 : 1) * (0.9 + rng() * 0.2),
    radius: base.radius * (elite ? 1.25 : 1),
    damage: base.damage, score: base.score, dew: base.dew * (elite ? 6 : 1),
    behaviour: base.behaviour, splits: base.splits || 0,
    elite: !!elite, boss: false,
    spitTimer: 1 + rng() * 1.5, blinkTimer: 1.5 + rng(), dashTimer: 1 + rng(),
    dashVx: 0, dashVy: 0, dashing: 0, flash: 0, slow: 0, slowT: 0,
    wobble: rng() * Math.PI * 2, touchCd: 0,
  };
}

export function spawnBoss(key, x, y) {
  const base = BOSSES[key];
  return {
    id: nextId++, kind: key, x, y,
    hp: base.hp, maxHp: base.hp, speed: base.speed, radius: base.radius,
    damage: base.damage, score: base.score, dew: base.dew,
    behaviour: 'boss', splits: 0, elite: false, boss: true,
    name: base.name, spitTimer: 2, blinkTimer: 3, dashTimer: 4,
    dashVx: 0, dashVy: 0, dashing: 0, flash: 0, slow: 0, slowT: 0,
    wobble: 0, touchCd: 0, summonTimer: 5, burstTimer: 3.5, phase: 0,
  };
}

export function edgeSpawn(rng, w, h, margin) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: -margin + rng() * 40, y: rng() * h };
  if (side === 1) return { x: w + margin - rng() * 40, y: rng() * h };
  if (side === 2) return { x: rng() * w, y: -margin + rng() * 40 };
  return { x: rng() * w, y: h + margin - rng() * 40 };
}

// Move one enemy for dt seconds. Returns spawned projectiles / minions.
export function stepEnemy(e, dt, world) {
  const { player, bloom } = world;
  if (e.flash > 0) e.flash -= dt;
  if (e.touchCd > 0) e.touchCd -= dt;
  if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
  const speed = e.speed * (1 - (e.slow || 0));
  e.wobble += dt * 3;

  const tx = e.behaviour === 'bloom' ? bloom.x : (dist(e.x, e.y, player.x, player.y) < dist(e.x, e.y, bloom.x, bloom.y) || e.behaviour === 'chase' ? nearestTarget(e, world) : bloom);
  const target = typeof tx === 'object' ? tx : (e.behaviour === 'bloom' ? bloom : player);
  const d = dist(e.x, e.y, target.x, target.y);
  const ang = angleTo(e.x, e.y, target.x, target.y);

  if (e.behaviour === 'ranged') {
    // Keep ~250px away, strafe, and spit goo.
    const want = 250;
    const radial = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
    e.x += Math.cos(ang) * speed * radial * dt + Math.cos(ang + Math.PI / 2) * speed * 0.4 * dt;
    e.y += Math.sin(ang) * speed * radial * dt + Math.sin(ang + Math.PI / 2) * speed * 0.4 * dt;
    e.spitTimer -= dt;
    if (e.spitTimer <= 0 && d < 520) {
      e.spitTimer = 2.3;
      world.enemyShots.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, radius: 7, damage: e.damage, life: 3, kind: 'goo' });
    }
  } else if (e.behaviour === 'blink') {
    e.blinkTimer -= dt;
    if (e.blinkTimer <= 0 && d > 130) {
      e.blinkTimer = 2.4;
      const hop = Math.min(d * 0.55, 190);
      e.x += Math.cos(ang) * hop; e.y += Math.sin(ang) * hop;
      world.burst(e.x, e.y, '#b388ff', 8);
    } else {
      e.x += Math.cos(ang) * speed * dt; e.y += Math.sin(ang) * speed * dt;
    }
  } else if (e.behaviour === 'dasher') {
    e.dashTimer -= dt;
    if (e.dashing > 0) {
      e.dashing -= dt;
      e.x += e.dashVx * dt; e.y += e.dashVy * dt;
    } else if (e.dashTimer <= 0 && d < 420 && d > 90) {
      e.dashTimer = 2.2; e.dashing = 0.45;
      e.dashVx = Math.cos(ang) * 430; e.dashVy = Math.sin(ang) * 430;
    } else {
      e.x += Math.cos(ang) * speed * dt + Math.cos(e.wobble) * 22 * dt;
      e.y += Math.sin(ang) * speed * dt + Math.sin(e.wobble) * 22 * dt;
    }
  } else if (e.behaviour === 'boss') {
    stepBoss(e, dt, world, ang, d);
  } else {
    // chase / bloom / volatile: drift toward the target with a wobble.
    e.x += Math.cos(ang) * speed * dt + Math.cos(e.wobble) * 14 * dt;
    e.y += Math.sin(ang) * speed * dt + Math.sin(e.wobble) * 14 * dt;
  }

  e.x = clamp(e.x, -60, world.w + 60);
  e.y = clamp(e.y, -60, world.h + 60);
}

function nearestTarget(e, world) {
  const dp = dist(e.x, e.y, world.player.x, world.player.y);
  const db = dist(e.x, e.y, world.bloom.x, world.bloom.y);
  return dp < db ? world.player : world.bloom;
}

function stepBoss(e, dt, world, ang, d) {
  const { player } = world;
  e.summonTimer -= dt; e.burstTimer -= dt; e.spitTimer -= dt;
  // Bosses lumber toward the player, with telegraphed charges.
  if (e.dashing > 0) {
    e.dashing -= dt;
    e.x += e.dashVx * dt; e.y += e.dashVy * dt;
  } else {
    e.x += Math.cos(ang) * e.speed * dt;
    e.y += Math.sin(ang) * e.speed * dt;
    if (e.kind === 'king' && d < 380 && e.dashTimer <= 0) {
      e.dashTimer = 4.5; e.dashing = 0.5;
      e.dashVx = Math.cos(ang) * 380; e.dashVy = Math.sin(ang) * 380;
      world.shake = Math.max(world.shake, 6);
    }
  }
  e.dashTimer -= dt;
  if (e.spitTimer <= 0) {
    e.spitTimer = e.kind === 'queen' ? 2.0 : 2.6;
    const n = e.kind === 'queen' ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * 0.28;
      world.enemyShots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, radius: 8, damage: e.damage, life: 3.2, kind: 'goo' });
    }
  }
  if (e.burstTimer <= 0 && e.kind === 'king') {
    e.burstTimer = 4.2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + e.wobble * 0.1;
      world.enemyShots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, radius: 7, damage: 12, life: 4, kind: 'goo' });
    }
    world.shake = Math.max(world.shake, 5);
  }
  if (e.summonTimer <= 0) {
    e.summonTimer = 8;
    const kind = e.kind === 'queen' ? 'mite' : 'wasp';
    for (let i = 0; i < 2; i++) {
      const a = (i / 3) * Math.PI * 2 + e.wobble;
      world.enemies.push(spawnEnemy(kind, e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, world.rng, false));
    }
    world.burst(e.x, e.y, '#e040fb', 14);
  }
  // Enrage under half health: faster spits.
  if (e.hp < e.maxHp / 2 && e.phase === 0) { e.phase = 1; e.speed *= 1.25; }
}

// --- Drawing ---------------------------------------------------------------
const KINDS = {
  mite: { body: '#7b1fa2', belly: '#ab47bc', eye: '#fff', spikes: 0 },
  beetle: { body: '#4e342e', belly: '#8d6e63', eye: '#ffeb3b', spikes: 0 },
  spitter: { body: '#2e7d32', belly: '#66bb6a', eye: '#fff', spikes: 0 },
  splitter: { body: '#c62828', belly: '#ef5350', eye: '#fff', spikes: 0 },
  moth: { body: '#5e35b1', belly: '#9575cd', eye: '#e1bee7', spikes: 0 },
  brute: { body: '#37474f', belly: '#78909c', eye: '#ff5252', spikes: 1 },
  wasp: { body: '#f9a825', belly: '#ffca28', eye: '#212121', spikes: 0 },
  spore: { body: '#00897b', belly: '#4db6ac', eye: '#e0f2f1', spikes: 0 },
};

export function drawEnemy(ctx, e, t) {
  const c = KINDS[e.kind] || KINDS.mite;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.elite) {
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, e.radius + 5 + Math.sin(t * 4) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  if (e.boss) {
    ctx.fillStyle = e.kind === 'queen' ? '#6a1b9a' : '#311b92';
    ctx.beginPath(); ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a148c';
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.72, 0, Math.PI * 2); ctx.fill();
    // Crown spikes for the bosses.
    ctx.fillStyle = '#ffd54f';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.radius * 0.9, Math.sin(a) * e.radius * 0.9);
      ctx.lineTo(Math.cos(a + 0.25) * (e.radius + 14), Math.sin(a + 0.25) * (e.radius + 14));
      ctx.lineTo(Math.cos(a + 0.5) * e.radius * 0.9, Math.sin(a + 0.5) * e.radius * 0.9);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : c.body;
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : c.belly;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.62, 0, Math.PI * 2); ctx.fill();
    if (e.kind === 'brute') {
      ctx.fillStyle = '#eceff1';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.radius * 0.8, Math.sin(a) * e.radius * 0.8);
        ctx.lineTo(Math.cos(a) * (e.radius + 9), Math.sin(a) * (e.radius + 9));
        ctx.lineTo(Math.cos(a + 0.3) * e.radius * 0.8, Math.sin(a + 0.3) * e.radius * 0.8);
        ctx.fill();
      }
    }
    if (e.kind === 'moth' || e.kind === 'wasp') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const flap = Math.sin(t * 14 + e.id) * 0.5;
      ctx.beginPath(); ctx.ellipse(-e.radius * 0.9, -e.radius * 0.4 + flap * 4, e.radius * 0.8, e.radius * 0.42, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(e.radius * 0.9, -e.radius * 0.4 - flap * 4, e.radius * 0.8, e.radius * 0.42, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    if (e.kind === 'spore') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t;
        ctx.beginPath(); ctx.arc(Math.cos(a) * e.radius * 0.55, Math.sin(a) * e.radius * 0.55, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // Eyes look toward the target.
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-e.radius * 0.32, -e.radius * 0.2, e.radius * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e.radius * 0.32, -e.radius * 0.2, e.radius * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#212121';
  ctx.beginPath(); ctx.arc(-e.radius * 0.32, -e.radius * 0.2, e.radius * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e.radius * 0.32, -e.radius * 0.2, e.radius * 0.1, 0, Math.PI * 2); ctx.fill();
  // Health bar for hurt or elite/boss enemies.
  if ((e.hp < e.maxHp && !e.boss) || e.elite) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2, 5);
    ctx.fillStyle = e.elite ? '#ffd54f' : '#ff5252';
    ctx.fillRect(-e.radius, -e.radius - 10, e.radius * 2 * Math.max(0, e.hp / e.maxHp), 5);
  }
  ctx.restore();
}
