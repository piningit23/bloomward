// BLOOMWARD tuning: every number that shapes the difficulty curve lives here.
export const VIEW = { w: 1280, h: 720 };
export const BLOOM_POS = { x: 640, y: 372 };
export const WAVES_TOTAL = 10;

export const PLAYER = {
  radius: 14,
  maxHp: 100,
  speed: 255,
  fireRate: 3.4, // shots per second
  damage: 13,
  boltSpeed: 640,
  boltRadius: 6,
  multishot: 1,
  pierce: 0,
  magnet: 95,
  dashCooldown: 2.1,
  dashDistance: 135,
  dashTime: 0.16,
  critChance: 0.05,
  critMult: 2,
};

export const BLOOM = { radius: 46, maxHp: 160 };

export const DEW = {
  trapCost: 5,
  rerollCost: 8,
  trapMax: 6,
  trapRadius: 74,
  trapDamage: 26,
  trapLife: 14,
};

// Enemy table: hp, speed, radius, damage, score, dew, behaviour.
// behaviour: 'chase' (nearest of player/bloom), 'bloom' (siege the flower),
// 'ranged' (keep distance, spit), 'blink' (teleport hops), 'dasher' (burst charges),
// 'volatile' (explodes on death).
export const ENEMIES = {
  mite:     { hp: 15,  speed: 98,  radius: 9,  damage: 6,  score: 10, dew: 1, behaviour: 'chase' },
  beetle:   { hp: 58,  speed: 50,  radius: 16, damage: 12, score: 20, dew: 2, behaviour: 'bloom' },
  spitter:  { hp: 27,  speed: 62,  radius: 12, damage: 8,  score: 25, dew: 2, behaviour: 'ranged' },
  splitter: { hp: 36,  speed: 72,  radius: 13, damage: 8,  score: 25, dew: 2, behaviour: 'chase', splits: 2 },
  moth:     { hp: 32,  speed: 86,  radius: 12, damage: 9,  score: 30, dew: 2, behaviour: 'blink' },
  brute:    { hp: 140, speed: 39,  radius: 22, damage: 20, score: 50, dew: 4, behaviour: 'bloom' },
  wasp:     { hp: 24,  speed: 118, radius: 10, damage: 8,  score: 30, dew: 2, behaviour: 'dasher' },
  spore:    { hp: 22,  speed: 56,  radius: 11, damage: 10, score: 25, dew: 2, behaviour: 'volatile' },
};

export const BOSSES = {
  queen: { name: 'Blight Queen', hp: 950, speed: 42, radius: 34, damage: 16, score: 500, dew: 40, wave: 5 },
  king:  { name: 'Hollow Moth King', hp: 1750, speed: 52, radius: 38, damage: 22, score: 1000, dew: 60, wave: 10 },
};

// Wave composition: [kind, count] entries, plus spawn pacing.
// counts grow with the wave number; kinds unlock as the run goes on.
export function wavePlan(n) {
  const plan = [];
  const add = (kind, count) => { if (count > 0) plan.push([kind, count]); };
  add('mite', 5 + 3 * n);
  if (n >= 2) add('beetle', 2 + n);
  if (n >= 2) add('spitter', 1 + Math.floor(n / 2));
  if (n >= 3) add('splitter', 2 + Math.floor(n / 2));
  if (n >= 3) add('moth', 1 + Math.floor(n / 2));
  if (n >= 4) add('spore', 2 + Math.floor(n / 2));
  if (n >= 5) add('brute', 1 + Math.floor((n - 3) / 2));
  if (n >= 6) add('wasp', 2 + Math.floor(n / 2));
  // Surge waves double the dew payout (not the count).
  const surge = n === 4 || n === 8;
  // Spawn interval shrinks as waves progress; elites appear from wave 3.
  const interval = Math.max(0.42, 1.05 - n * 0.06);
  const eliteChance = n >= 3 ? Math.min(0.16, 0.03 + n * 0.012) : 0;
  return { plan, interval, eliteChance, surge };
}

export const UPGRADE_POOL = [
  { id: 'swift', name: 'Swift Wings', desc: '+18% fire rate', max: 5 },
  { id: 'heavy', name: 'Heavy Pollen', desc: '+25% bolt damage', max: 5 },
  { id: 'twin', name: 'Twin Bloom', desc: '+1 pollen bolt per shot', max: 3 },
  { id: 'fleet', name: 'Fleet Feet', desc: '+12% flight speed', max: 4 },
  { id: 'petal', name: 'Thick Petal', desc: '+25 max health, heal 25', max: 4 },
  { id: 'magnet', name: 'Dew Magnet', desc: '+60% dew pickup range', max: 3 },
  { id: 'pierce', name: 'Piercing Stamen', desc: 'Bolts pierce +1 enemy', max: 3 },
  { id: 'dash', name: 'Quick Dash', desc: '-25% dash cooldown', max: 3 },
  { id: 'thorn', name: 'Thornbed', desc: 'Thorn traps +40% damage, +2 max traps', max: 3 },
  { id: 'bee', name: 'Bee Friend', desc: 'A companion bee fires beside you', max: 3 },
  { id: 'crit', name: 'Critical Nectar', desc: '+12% critical chance (crits deal double)', max: 4 },
  { id: 'salve', name: 'Bloom Salve', desc: '+30 max Glowbloom health, heal 30', max: 3 },
  { id: 'keeper', name: 'Combo Keeper', desc: 'Combo lasts +1.2s, combo cap x6', max: 2 },
  { id: 'big', name: 'Big Pollen', desc: '+20% bolt size, +10% damage', max: 3 },
  { id: 'wind', name: 'Second Wind', desc: 'Revive once at 50% health when you fall', max: 1 },
];
