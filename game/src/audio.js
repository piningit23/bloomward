// Synthesized WebAudio: cheerful plucks, pops and a soft ambient arpeggio.
// No audio files, no network. The context is created on the first user
// gesture so headless/automated runs never throw.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.enabled = true;
  }

  ensure() {
    if (this.ctx || !this.enabled) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.enabled = false; }
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch (e) { /* audio is cosmetic; never break the game */ }
  }

  shoot() { this.tone(740 + Math.random() * 120, 0.07, 'triangle', 0.10, 520); }
  hit() { this.tone(190, 0.05, 'square', 0.06, 120); }
  kill() { this.tone(520, 0.12, 'sine', 0.16, 880); this.tone(1040, 0.09, 'sine', 0.08, 1560); }
  pickup() { this.tone(880, 0.08, 'sine', 0.10, 1320); }
  hurt() { this.tone(160, 0.18, 'sawtooth', 0.14, 70); }
  bloomHurt() { this.tone(220, 0.25, 'sawtooth', 0.12, 90); }
  dash() { this.tone(300, 0.12, 'sine', 0.10, 900); }
  trap() { this.tone(420, 0.1, 'triangle', 0.12, 180); }
  waveHorn() { this.tone(392, 0.3, 'triangle', 0.16); this.tone(523, 0.35, 'triangle', 0.16); }
  bossRoar() { this.tone(90, 0.6, 'sawtooth', 0.2, 45); this.tone(140, 0.5, 'square', 0.1, 60); }
  upgrade() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.14), i * 70)); }
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.15), i * 110)); }
  defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'sine', 0.14), i * 140)); }

  // Gentle pentatonic plucks, one note every ~0.45s while playing.
  update(dt, playing) {
    if (!this.ctx || this.muted || !playing) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.46;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const note = scale[this.musicStep % scale.length];
    this.musicStep = (this.musicStep + 1 + Math.floor(Math.random() * 2)) % 64;
    this.tone(note, 0.5, 'sine', 0.045);
    if (this.musicStep % 8 === 0) this.tone(note / 2, 0.8, 'sine', 0.03);
  }
}
