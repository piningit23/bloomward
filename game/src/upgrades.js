// Bloom blessings: the 15 upgrades offered between waves, and what each
// one does to the player's stats. Choices are rolled from the pool minus
// anything already maxed out.
import { UPGRADE_POOL, DEW } from './config.js';
import { shuffle } from './random.js';

export function rollChoices(rng, taken) {
  const avail = UPGRADE_POOL.filter((u) => (taken[u.id] || 0) < u.max);
  return shuffle(rng, avail).slice(0, 3);
}

export function applyUpgrade(player, bloom, traps, id) {
  const p = player;
  switch (id) {
    case 'swift': p.fireRate *= 1.18; break;
    case 'heavy': p.damage *= 1.25; break;
    case 'twin': p.multishot = Math.min(4, p.multishot + 1); break;
    case 'fleet': p.speed *= 1.12; break;
    case 'petal': p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); break;
    case 'magnet': p.magnet *= 1.6; break;
    case 'pierce': p.pierce += 1; break;
    case 'dash': p.dashCooldown = Math.max(0.7, p.dashCooldown * 0.75); break;
    case 'thorn': traps.trapDamage *= 1.4; traps.trapMax += 2; break;
    case 'bee': p.bees = Math.min(3, (p.bees || 0) + 1); break;
    case 'crit': p.critChance = Math.min(0.6, p.critChance + 0.12); break;
    case 'salve': bloom.maxHp += 30; bloom.hp = Math.min(bloom.maxHp, bloom.hp + 30); break;
    case 'keeper': p.comboWindow += 1.2; p.comboCap = 6; break;
    case 'big': p.boltRadius *= 1.2; p.damage *= 1.1; break;
    case 'wind': p.secondWind = true; break;
    default: break;
  }
}

export { DEW };
