// BLOOMWARD entry: game loop, screens, and the autopilot test hook.
// URL flags: ?auto=1&seed=N runs the autopilot (for regression tests);
// ?wave=N jumps straight into that wave for staged screenshots.
import { VIEW, WAVES_TOTAL } from './config.js';
import { makeRng } from './random.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { createWorld, resetRun, startWave, updateWorld, chooseBlessing, rerollChoices, nearestEnemy } from './world.js';
import { drawWorld, drawTitle, drawUpgrade, drawPaused, drawEnd } from './render.js';

const canvas = document.getElementById('bloom');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || (Date.now() % 2147483647));
const rng = makeRng(seed);
const AUTO = params.get('auto') === '1';
const START_WAVE = Math.max(0, Math.min(WAVES_TOTAL, Number(params.get('wave') || 0)));

const input = new Input(canvas);
const sound = new SoundBank();
const world = createWorld(rng, seed);
world.state = 'title';

let best = 0;
try { best = Number(localStorage.getItem('bloomward-best') || 0); } catch (e) { /* private mode */ }
let last = performance.now();
let titleT = 0;

// --- Autopilot: plays the game with simple rules, for regression tests. ---
function autopilot(dt) {
  const p = world.player;
  if (world.state === 'victory' || world.state === 'gameover') {
    // Let the end screen stand: release everything so the run is not
    // instantly restarted by a held button.
    input.fakeMouse(false);
    for (const k of ['w', 'a', 's', 'd', 'shift', 'e', 'enter', ' ']) input.fakeKey(k, false);
    return;
  }
  if (world.state === 'title') { input.fakeKey('enter', true); return; }
  if (world.state === 'upgrade') {
    // Take the first blessing (prefer damage / multishot when offered,
    // healing when hurt).
    let idx = -1;
    if (p.hp < 55) idx = world.choices.findIndex((c) => c.id === 'petal');
    if (idx < 0 && world.bloom.hp < 60) idx = world.choices.findIndex((c) => c.id === 'salve');
    if (idx < 0) idx = world.choices.findIndex((c) => c.id === 'twin' || c.id === 'heavy');
    chooseBlessing(world, idx >= 0 ? idx : 0, sound);
    return;
  }
  if (world.state !== 'playing') return;
  // Guard the Glowbloom: hunt the enemy nearest the flower, and stand
  // between it and the threat so leaks get shot before they bite.
  const target = nearestEnemy(world, world.bloom.x, world.bloom.y, 900)
    || nearestEnemy(world, p.x, p.y, 700);
  if (!target) {
    input.fakeMouse(false);
    // Drift back toward the flower while the meadow is quiet.
    const bx = world.bloom.x - p.x, by = world.bloom.y - p.y;
    const db = Math.hypot(bx, by) || 1;
    if (db > 120) {
      input.fakeKey('d', bx / db > 0.35);
      input.fakeKey('a', bx / db < -0.35);
      input.fakeKey('s', by / db > 0.35);
      input.fakeKey('w', by / db < -0.35);
    } else {
      for (const k of ['w', 'a', 's', 'd']) input.fakeKey(k, false);
    }
    return;
  }
  const dx = target.x - p.x, dy = target.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  // Guard point: 170px out from the bloom toward the threat.
  const bdx = target.x - world.bloom.x, bdy = target.y - world.bloom.y;
  const bd = Math.hypot(bdx, bdy) || 1;
  const gx = world.bloom.x + (bdx / bd) * 170;
  const gy = world.bloom.y + (bdy / bd) * 170;
  let mx = (gx - p.x) / 200, my = (gy - p.y) / 200;
  if (d > 340) { mx += (dx / d) * 0.7; my += (dy / d) * 0.7; }
  if (d < 150) { mx -= (dx / d) * 0.7; my -= (dy / d) * 0.7; }
  // Do not drift off the meadow.
  if (p.x < 90) mx += 0.8; if (p.x > VIEW.w - 90) mx -= 0.8;
  if (p.y < 90) my += 0.8; if (p.y > VIEW.h - 90) my -= 0.8;
  const m = Math.hypot(mx, my) || 1;
  input.fakeKey('d', mx / m > 0.35);
  input.fakeKey('a', mx / m < -0.35);
  input.fakeKey('s', my / m > 0.35);
  input.fakeKey('w', my / m < -0.35);
  input.fakeAim(target.x, target.y);
  input.fakeMouse(true);
  // Dash away when something is very close, plant a trap when the bloom is pressed.
  const close = nearestEnemy(world, p.x, p.y, 80);
  if (close && p.dashCd <= 0) input.fakeKey('shift', true); else input.fakeKey('shift', false);
  if (world.dew >= 5 && nearestEnemy(world, world.bloom.x, world.bloom.y, 220)) {
    input.fakeKey('e', true);
  } else input.fakeKey('e', false);
}

function startRun() {
  resetRun(world);
  world.state = 'playing';
  startWave(world, 1, sound);
}

function frame(now) {
  // One bad frame must never freeze the game: catch, log, keep looping.
  try {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  titleT += dt;
  sound.update(dt, world.state === 'playing');

  if (AUTO) autopilot(dt);

  if (world.state === 'title') {
    if (input.wasPressed('enter') || input.mouseDown) {
      sound.resume();
      startRun();
      if (START_WAVE > 1) {
        // Staged start: jump straight into a later wave for screenshots.
        for (let w = 2; w <= START_WAVE; w++) {
          world.wave = w - 1;
          world.waveState = 'fighting';
          world.enemies = [];
          startWave(world, w, null);
        }
      }
    }
    drawTitle(ctx, titleT, best);
  } else if (world.state === 'playing') {
    if (input.wasPressed('p', 'escape')) { world.state = 'paused'; }
    else if (input.wasPressed('m')) { sound.toggleMute(); }
    else {
      updateWorld(world, dt, input, sound);
      if (world.state === 'victory' || world.state === 'gameover') {
        if (world.score > best) {
          best = world.score;
          try { localStorage.setItem('bloomward-best', String(best)); } catch (e) { /* ignore */ }
        }
      }
    }
    drawWorld(ctx, world, world.time);
    if (world.state === 'paused') drawPaused(ctx);
    if (world.state === 'victory') drawEnd(ctx, world, true);
    if (world.state === 'gameover') drawEnd(ctx, world, false);
  } else if (world.state === 'paused') {
    drawWorld(ctx, world, world.time);
    drawPaused(ctx);
    if (input.wasPressed('p', 'escape', 'enter')) world.state = 'playing';
    else if (input.wasPressed('m')) sound.toggleMute();
  } else if (world.state === 'upgrade') {
    drawUpgrade(ctx, world);
    if (input.wasPressed('1')) chooseBlessing(world, 0, sound);
    else if (input.wasPressed('2')) chooseBlessing(world, 1, sound);
    else if (input.wasPressed('3')) chooseBlessing(world, 2, sound);
    else if (input.wasPressed('r')) rerollChoices(world);
    else if (input.mousePressed) {
      // Click a card: cards are laid out by drawUpgrade.
      const cards = world.choices;
      const cw = 300, gap = 30;
      const total = cards.length * cw + (cards.length - 1) * gap;
      const x0 = (1280 - total) / 2;
      for (let i = 0; i < cards.length; i++) {
        const x = x0 + i * (cw + gap);
        if (input.mouseX >= x && input.mouseX <= x + cw && input.mouseY >= 210 && input.mouseY <= 460) {
          chooseBlessing(world, i, sound);
          break;
        }
      }
    }
  } else if (world.state === 'victory' || world.state === 'gameover') {
    drawWorld(ctx, world, world.time);
    drawEnd(ctx, world, world.state === 'victory');
    // Fresh inputs only: a button held since before the end screen
    // appeared must not restart the run by itself.
    if (input.wasPressed('enter', 'r') || input.mousePressed) {
      startRun();
    }
  }

  input.endFrame();
  } catch (err) { console.error('bloomward frame error:', err); }
  requestAnimationFrame(frame);
}

// Test hook: read-only state for automated play tests.
window.__bloomward = {
  world,
  state: () => world.state,
  score: () => world.score,
  wave: () => world.wave,
  kills: () => world.kills,
  playerHp: () => Math.round(world.player.hp),
  bloomHp: () => Math.round(world.bloom.hp),
};

requestAnimationFrame(frame);
