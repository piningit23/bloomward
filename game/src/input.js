// Keyboard + mouse input, tracked per frame. Keys are read by code
// (WASD/arrows to move, Space/click to shoot, Shift dash, E trap, P pause).
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 640;
    this.mouseY = 300;
    this.mouseDown = false;
    this.mousePressed = false; // edge: a fresh mousedown this frame
    this.pressed = new Set(); // edge-triggered keys, consumed each frame
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseDown = true; this.mousePressed = true; }
      this.mouseX = (e.clientX - canvas.getBoundingClientRect().left) * (canvas.width / canvas.getBoundingClientRect().width);
      this.mouseY = (e.clientY - canvas.getBoundingClientRect().top) * (canvas.height / canvas.getBoundingClientRect().height);
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(...names) { return names.some((n) => this.keys.has(n)); }
  wasPressed(...names) { return names.some((n) => this.pressed.has(n)); }
  firing() { return this.mouseDown || this.keys.has(' '); }
  endFrame() { this.pressed.clear(); this.mousePressed = false; }

  // Test/autopilot hooks: pretend a key is held, or set the aim point.
  // A fresh press also lands in `pressed`, so edge-triggered actions
  // (Enter to start, Shift to dash, E to trap) work for the autopilot.
  fakeKey(name, held) {
    if (held) {
      if (!this.keys.has(name)) this.pressed.add(name);
      this.keys.add(name);
    } else this.keys.delete(name);
  }
  fakeAim(x, y) { this.mouseX = x; this.mouseY = y; }
  fakeMouse(held) { this.mouseDown = held; }
}
