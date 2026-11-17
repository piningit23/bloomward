// BLOOMWARD world: the arena simulation. Owns the player, the Glowbloom,
// enemies, bolts, dew, traps, waves, combo and score. Screens live in main.js.
import { VIEW, BLOOM_POS, WAVES_TOTAL, PLAYER, BLOOM, DEW, ENEMIES, wavePlan } from './config.js';
import { clamp, dist, angleTo, shuffle } from './random.js';
import { spawnEnemy, spawnBoss, edgeSpawn, stepEnemy } from './enemies.js';
import { rollChoices, applyUpgrade } from './upgrades.js';
import { Particles } from './particles.js';

export function createWorld(rng, seed) {
  const world = {
    w: VIEW.w, h: VIEW.h, rng, seed,
    time: 0, state: 'title',
    player: null, bloom: null,
    enemies: [], bolts: [], enemyShots: [], orbs: [], traps: [],
    wave: 0, waveState: 'idle', spawnQueue: [], spawnTimer: 0, spawnInterval: 1,
    score: 0, dew: 0, kills: 0, combo: 0, comboTimer: 0, comboMult: 1,
    shake: 0, banner: '', bannerT: 0, surge: false,
    shotsFired: 0, shotsHit: 0, timePlayed: 0,
    choices: [], taken: {}, rerolls: 0,
    fx: new Particles(),
    bossActive: null,
    trapDamage: DEW.trapDamage, trapMax: DEW.trapMax,
  };
  world.burst = (x, y, color, n, speed) => world.fx.burst(x, y, color, n, speed);
  resetRun(world);
  return world;
}

export function resetRun(world) {
  world.player = {
    x: 640, y: 520, radius: PLAYER.radius,
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, speed: PLAYER.speed,
    fireRate: PLAYER.fireRate, damage: PLAYER.damage,
    boltSpeed: PLAYER.boltSpeed, boltRadius: PLAYER.boltRadius,
    multishot: PLAYER.multishot, pierce: PLAYER.pierce, magnet: PLAYER.magnet,
    dashCooldown: PLAYER.dashCooldown, dashCd: 0, dashTime: 0, dashVx: 0, dashVy: 0,
    invuln: 0, fireTimer: 0, aim: -Math.PI / 2,
    critChance: PLAYER.critChance, critMult: PLAYER.critMult,
    bees: 0, beeTimer: 0, secondWind: false, usedWind: false,
    comboWindow: 2.5, comboCap: 5,
  };
  world.bloom = { x: BLOOM_POS.x, y: BLOOM_POS.y, radius: BLOOM.radius, hp: BLOOM.maxHp, maxHp: BLOOM.maxHp };
  world.enemies = []; world.bolts = []; world.enemyShots = []; world.orbs = []; world.traps = [];
  world.wave = 0; world.waveState = 'idle'; world.spawnQueue = [];
  world.score = 0; world.dew = 0; world.kills = 0; world.combo = 0; world.comboTimer = 0; world.comboMult = 1;
  world.shake = 0; world.banner = ''; world.bannerT = 0;
  world.shotsFired = 0; world.shotsHit = 0; world.timePlayed = 0;
  world.choices = []; world.taken = {}; world.rerolls = 0; world.bossActive = null;
  world.trapDamage = DEW.trapDamage; world.trapMax = DEW.trapMax;
  world.state = 'playing';
}

export function startWave(world, n, sound) {
  const plan = wavePlan(n);
  const bossKey = n === 5 ? 'queen' : n === 10 ? 'king' : null;
  world.wave = n;
  world.surge = plan.surge;
  world.spawnInterval = plan.interval;
  const queue = [];
  for (const [kind, count] of plan.plan) {
    for (let i = 0; i < count; i++) queue.push({ kind, elite: world.rng() < plan.eliteChance });
  }
  world.spawnQueue = shuffle(world.rng, queue);
  // Boss waves thin the regulars so the boss itself is the threat,
  // not an endless pile of adds on the Glowbloom.
  if (bossKey) world.spawnQueue = world.spawnQueue.filter((_, i) => i % 3 !== 2);
  world.spawnTimer = 0.8;
  world.waveState = 'spawning';
  world.bossActive = null;
  if (bossKey) {
    const pos = edgeSpawn(world.rng, world.w, world.h, 40);
    const boss = spawnBoss(bossKey, pos.x, pos.y);
    world.enemies.push(boss);
    world.bossActive = boss;
    if (sound) sound.bossRoar();
    world.banner = boss.name + ' has arrived!';
  } else {
    if (sound) sound.waveHorn();
    world.banner = plan.surge ? `Wave ${n} — SURGE! Double dew!` : `Wave ${n} of ${WAVES_TOTAL}`;
  }
  world.bannerT = 2.4;
}

export function nearestEnemy(world, x, y, maxD) {
  let best = null; let bd = maxD || 1e9;
  for (const e of world.enemies) {
    const d = dist(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function fireBolts(world, sound) {
  const p = world.player;
  const n = p.multishot;
  const spread = 0.14;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * spread;
    const a = p.aim + off;
    world.bolts.push({
      x: p.x + Math.cos(a) * (p.radius + 6), y: p.y + Math.sin(a) * (p.radius + 6),
      vx: Math.cos(a) * p.boltSpeed, vy: Math.sin(a) * p.boltSpeed,
      radius: p.boltRadius, damage: p.damage, pierce: p.pierce, life: 1.4, hitIds: new Set(),
    });
  }
  world.shotsFired += n;
  if (sound) sound.shoot();
}

function damageEnemy(world, e, dmg, crit, sound) {
  e.hp -= dmg;
  e.flash = 0.09;
  world.fx.floatText(e.x, e.y - e.radius - 6, String(Math.round(dmg)), crit ? '#ffb300' : '#ffffff', crit);
  if (sound) sound.hit();
  if (e.hp <= 0) killEnemy(world, e, sound);
}

function killEnemy(world, e, sound) {
  const idx = world.enemies.indexOf(e);
  if (idx < 0) return;
  world.enemies.splice(idx, 1);
  world.kills++;
  world.combo++;
  world.comboTimer = world.player.comboWindow;
  world.comboMult = Math.min(world.player.comboCap, 1 + Math.floor(world.combo / 4) * 0.5);
  const gained = Math.round(e.score * world.comboMult);
  world.score += gained;
  world.fx.floatText(e.x, e.y, `+${gained}`, '#fff59d', e.boss || e.elite);
  world.burst(e.x, e.y, e.boss ? '#ffd54f' : '#ce93d8', e.boss ? 30 : 12, 200);
  world.fx.ring(e.x, e.y, '#ffffff', e.boss ? 130 : 60);
  if (sound) sound.kill();
  // Dew orbs.
  const dewValue = e.dew * (world.surge ? 2 : 1);
  const orbs = e.boss ? 6 : e.elite ? 3 : 1;
  for (let i = 0; i < orbs; i++) {
    const a = world.rng() * Math.PI * 2;
    world.orbs.push({ x: e.x + Math.cos(a) * 12, y: e.y + Math.sin(a) * 12, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, value: Math.max(1, Math.round(dewValue / orbs)), life: 14 });
  }
  if (e.splits) {
    for (let i = 0; i < e.splits; i++) {
      world.enemies.push(spawnEnemy('mite', e.x + (world.rng() - 0.5) * 30, e.y + (world.rng() - 0.5) * 30, world.rng, false));
    }
  }
  if (e.behaviour === 'volatile') {
    world.burst(e.x, e.y, '#26a69a', 18, 260);
    world.fx.ring(e.x, e.y, '#4db6ac', 90);
    world.shake = Math.max(world.shake, 4);
    for (const other of world.enemies.slice()) {
      if (other !== e && dist(other.x, other.y, e.x, e.y) < 90) damageEnemy(world, other, 30, false, sound);
    }
    const p = world.player;
    if (dist(p.x, p.y, e.x, e.y) < 80) hurtPlayer(world, 8, sound);
    if (dist(world.bloom.x, world.bloom.y, e.x, e.y) < 80 + world.bloom.radius) hurtBloom(world, 8, sound);
  }
  if (e.boss) {
    world.bossActive = null;
    world.shake = Math.max(world.shake, 10);
    world.banner = e.name + ' defeated!';
    world.bannerT = 2.2;
  }
}

export function hurtPlayer(world, dmg, sound) {
  const p = world.player;
  if (p.invuln > 0 || p.dashTime > 0) return;
  p.hp -= dmg;
  p.invuln = 0.6;
  world.shake = Math.max(world.shake, 5);
  world.burst(p.x, p.y, '#ef5350', 10, 180);
  if (sound) sound.hurt();
  if (p.hp <= 0) {
    if (p.secondWind && !p.usedWind) {
      p.usedWind = true;
      p.hp = Math.round(p.maxHp * 0.5);
      p.invuln = 2;
      world.burst(p.x, p.y, '#ffd54f', 26, 240);
      world.banner = 'Second Wind! You bloom again!';
      world.bannerT = 2;
    } else {
      p.hp = 0;
      world.state = 'gameover';
      if (sound) sound.defeat();
    }
  }
}

export function hurtBloom(world, dmg, sound) {
  const b = world.bloom;
  b.hp -= dmg;
  world.shake = Math.max(world.shake, 4);
  world.burst(b.x, b.y, '#ef5350', 8, 150);
  if (sound) sound.bloomHurt();
  if (b.hp <= 0) {
    b.hp = 0;
    world.state = 'gameover';
    if (sound) sound.defeat();
  }
}

function plantTrap(world, sound) {
  const p = world.player;
  if (world.dew < DEW.trapCost || world.traps.length >= world.trapMax) return false;
  world.dew -= DEW.trapCost;
  world.traps.push({ x: p.x, y: p.y, radius: DEW.trapRadius, damage: world.trapDamage, life: DEW.trapLife, tick: 0 });
  world.burst(p.x, p.y, '#8d6e63', 10, 120);
  if (sound) sound.trap();
  return true;
}

export function chooseBlessing(world, index, sound) {
  const choice = world.choices[index];
  if (!choice) return false;
  world.taken[choice.id] = (world.taken[choice.id] || 0) + 1;
  applyUpgrade(world.player, world.bloom, world, choice.id);
  if (sound) sound.upgrade();
  world.choices = [];
  startWave(world, world.wave + 1, sound);
  world.state = 'playing';
  return true;
}

export function rerollChoices(world) {
  if (world.dew < DEW.rerollCost) return false;
  world.dew -= DEW.rerollCost;
  world.rerolls++;
  world.choices = rollChoices(world.rng, world.taken);
  return true;
}

export function updateWorld(world, dt, input, sound) {
  const p = world.player;
  world.time += dt;
  world.timePlayed += dt;
  if (world.bannerT > 0) world.bannerT -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) { world.combo = 0; world.comboMult = 1; }
  }

  // --- Player movement & dash ---
  let mx = (input.down('d', 'arrowright') ? 1 : 0) - (input.down('a', 'arrowleft') ? 1 : 0);
  let my = (input.down('s', 'arrowdown') ? 1 : 0) - (input.down('w', 'arrowup') ? 1 : 0);
  const mag = Math.hypot(mx, my);
  if (mag > 0) { mx /= mag; my /= mag; }
  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (input.wasPressed('shift') && p.dashCd <= 0 && mag > 0) {
    p.dashCd = p.dashCooldown;
    p.dashTime = PLAYER.dashTime;
    p.dashVx = mx * (PLAYER.dashDistance / PLAYER.dashTime);
    p.dashVy = my * (PLAYER.dashDistance / PLAYER.dashTime);
    p.invuln = Math.max(p.invuln, 0.3);
    if (sound) sound.dash();
  }
  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashVx * dt; p.y += p.dashVy * dt;
    world.burst(p.x, p.y, '#fff59d', 1, 40);
  } else {
    p.x += mx * p.speed * dt;
    p.y += my * p.speed * dt;
  }
  p.x = clamp(p.x, 24, world.w - 24);
  p.y = clamp(p.y, 24, world.h - 24);

  // Aim + fire.
  p.aim = angleTo(p.x, p.y, input.mouseX, input.mouseY);
  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) {
    p.fireTimer = 1 / p.fireRate;
    fireBolts(world, sound);
  }
  if (input.wasPressed('e')) plantTrap(world, sound);

  // Companion bees.
  if (p.bees > 0) {
    p.beeTimer -= dt;
    if (p.beeTimer <= 0) {
      p.beeTimer = 0.85;
      const target = nearestEnemy(world, p.x, p.y, 520);
      if (target) {
        const a = angleTo(p.x, p.y, target.x, target.y);
        world.bolts.push({ x: p.x, y: p.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, radius: 5, damage: Math.max(4, p.damage * 0.5), pierce: 0, life: 1.2, hitIds: new Set() });
        if (sound) sound.shoot();
      }
    }
  }

  // --- Spawning ---
  if (world.waveState === 'spawning') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      if (world.spawnQueue.length > 0) {
        const next = world.spawnQueue.pop();
        const pos = edgeSpawn(world.rng, world.w, world.h, 30);
        world.enemies.push(spawnEnemy(next.kind, pos.x, pos.y, world.rng, next.elite));
        world.spawnTimer = world.spawnInterval * (0.7 + world.rng() * 0.6);
      } else {
        world.waveState = 'fighting';
      }
    }
  }

  // --- Enemies ---
  for (const e of world.enemies.slice()) {
    stepEnemy(e, dt, world);
    // Touch damage: enemies bite whoever they reach.
    if (e.touchCd <= 0) {
      const dp = dist(e.x, e.y, p.x, p.y);
      const db = dist(e.x, e.y, world.bloom.x, world.bloom.y);
      if (dp < e.radius + p.radius + 2 && dp <= db) {
        e.touchCd = 0.8;
        hurtPlayer(world, e.damage, sound);
        e.x -= Math.cos(angleTo(p.x, p.y, e.x, e.y)) * 12;
        e.y -= Math.sin(angleTo(p.x, p.y, e.x, e.y)) * 12;
      } else if (db < e.radius + world.bloom.radius + 2) {
        e.touchCd = 0.9;
        // The flower is sturdier than the warden: bites hurt it less.
        hurtBloom(world, Math.round(e.damage * 0.75), sound);
      }
    }
    // Thorn traps.
    for (const t of world.traps) {
      if (dist(e.x, e.y, t.x, t.y) < t.radius + e.radius) {
        e.slow = 0.45; e.slowT = 0.4;
        t.tick -= dt;
        if (t.tick <= 0) {
          t.tick = 0.5;
          damageEnemy(world, e, t.damage, false, sound);
        }
      }
    }
  }

  // --- Bolts ---
  for (const b of world.bolts.slice()) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > world.w + 20 || b.y < -20 || b.y > world.h + 20) {
      world.bolts.splice(world.bolts.indexOf(b), 1);
      continue;
    }
    for (const e of world.enemies.slice()) {
      if (b.hitIds.has(e.id)) continue;
      if (dist(b.x, b.y, e.x, e.y) < b.radius + e.radius) {
        b.hitIds.add(e.id);
        world.shotsHit++;
        const crit = world.rng() < p.critChance;
        damageEnemy(world, e, b.damage * (crit ? p.critMult : 1), crit, sound);
        if (b.pierce > 0) { b.pierce--; } else { world.bolts.splice(world.bolts.indexOf(b), 1); }
        break;
      }
    }
  }

  // --- Enemy shots ---
  for (const s of world.enemyShots.slice()) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    let dead = s.life <= 0 || s.x < -20 || s.x > world.w + 20 || s.y < -20 || s.y > world.h + 20;
    if (!dead && dist(s.x, s.y, p.x, p.y) < s.radius + p.radius) {
      hurtPlayer(world, s.damage, sound);
      dead = true;
    }
    if (!dead && dist(s.x, s.y, world.bloom.x, world.bloom.y) < s.radius + world.bloom.radius) {
      hurtBloom(world, Math.round(s.damage * 0.75), sound);
      dead = true;
    }
    if (dead) world.enemyShots.splice(world.enemyShots.indexOf(s), 1);
  }

  // --- Dew orbs ---
  for (const o of world.orbs.slice()) {
    o.life -= dt;
    const d = dist(o.x, o.y, p.x, p.y);
    if (d < p.magnet) {
      const a = angleTo(o.x, o.y, p.x, p.y);
      const pull = 520 * (1 - d / (p.magnet + 60));
      o.vx += Math.cos(a) * pull * dt * 6;
      o.vy += Math.sin(a) * pull * dt * 6;
    } else {
      o.vx *= 0.96; o.vy *= 0.96;
    }
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (d < 24) {
      world.dew += o.value;
      world.orbs.splice(world.orbs.indexOf(o), 1);
      if (sound) sound.pickup();
      world.burst(o.x, o.y, '#4fc3f7', 4, 90);
    } else if (o.life <= 0) {
      world.orbs.splice(world.orbs.indexOf(o), 1);
    }
  }

  // --- Traps decay ---
  for (const t of world.traps.slice()) {
    t.life -= dt;
    if (t.life <= 0) world.traps.splice(world.traps.indexOf(t), 1);
  }

  // --- Wave clear ---
  if (world.waveState === 'fighting' && world.enemies.length === 0) {
    world.waveState = 'clear';
    p.hp = Math.min(p.maxHp, p.hp + 15);
    world.bloom.hp = Math.min(world.bloom.maxHp, world.bloom.hp + 20);
    world.score += 100 * world.wave;
    if (world.wave >= WAVES_TOTAL) {
      world.state = 'victory';
      if (sound) sound.victory();
    } else {
      world.choices = rollChoices(world.rng, world.taken);
      world.state = 'upgrade';
      if (sound) sound.upgrade();
    }
  }

  world.fx.update(dt);
}
