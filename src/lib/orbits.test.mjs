// run with `node --test`. the window and the canvas are stand-ins whose timers and frames the test
// runs by hand, and the context counts the segments drawn and how often the drawing was started over
import test from 'node:test';
import assert from 'node:assert/strict';
import { traceOrbits } from './orbits.ts';

// a phone's viewport in portrait, with the browser's toolbar hiding the bottom 80 px of the canvas
const WIDTH = 390;
const HEIGHT = 744;
const TOOLBAR = 80;
const SCENES = 21;

function fakes(width = WIDTH, height = HEIGHT) {
  const ctx = {
    starts: 0,
    segments: 0,
    lineWidth: 0,
    strokeStyle: '',
    setTransform() {},
    beginPath() {},
    moveTo() {},
    lineTo() {
      this.segments += 1;
    },
    stroke() {},
    clearRect() {
      this.starts += 1;
    },
  };
  const canvas = { clientWidth: width, clientHeight: height, width: 0, height: 0, getContext: () => ctx };
  const listeners = [];
  let pending = null;
  let frames = [];
  const win = {
    innerWidth: width,
    innerHeight: height - TOOLBAR,
    devicePixelRatio: 2,
    addEventListener: (type, fn) => listeners.push([type, fn]),
    setTimeout: (fn) => {
      pending = fn;
      return 1;
    },
    clearTimeout: () => {
      pending = null;
    },
    requestAnimationFrame: (fn) => {
      frames.push(fn);
      return frames.length;
    },
    cancelAnimationFrame() {
      frames = [];
    },
    // fires the resize listeners and runs the debounced callback they left
    resize() {
      for (const [type, fn] of listeners) if (type === 'resize') fn();
      pending?.();
      pending = null;
    },
    // runs the queued frames at 60 Hz until none is requested, and returns their count
    run() {
      let now = 0, count = 0;
      while (frames.length && count < 10000) {
        const due = frames;
        frames = [];
        now += 1000 / 60;
        for (const fn of due) fn(now);
        count += 1;
      }
      return count;
    },
  };
  return { ctx, canvas, win };
}

// a mulberry32 generator, which makes a visit reproducible
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// on a phone, scrolling hides the browser's toolbar, which changes innerHeight and fires resize while
// the canvas keeps its box, since it is sized in lvh
test('traceOrbits does not start over when the toolbar of a phone hides', () => {
  const { ctx, canvas, win } = fakes();
  traceOrbits(canvas, win);
  assert.equal(ctx.starts, 1);
  win.innerHeight = HEIGHT;
  win.resize();
  assert.equal(ctx.starts, 1);
});

test('traceOrbits starts over when the canvas changes size', () => {
  const { ctx, canvas, win } = fakes();
  traceOrbits(canvas, win);
  canvas.clientWidth = 800;
  win.innerWidth = 800;
  win.resize();
  assert.equal(ctx.starts, 2);
});

// the first random draw picks the scene, which pins each one in turn, and the rest of the visit comes
// from a seeded generator. a scene ends by itself after about twelve seconds of frames, and keeps
// within the budget of segments that the page draws once
test('every scene is traced in about twelve seconds within the segment budget', () => {
  const random = Math.random;
  try {
    for (let scene = 0; scene < SCENES; scene++) {
      for (const seed of [1, 2, 3]) {
        const draw = seeded(seed * 7919);
        let first = true;
        Math.random = () => {
          if (first) {
            first = false;
            return (scene + 0.5) / SCENES;
          }
          return draw();
        };
        const { ctx, canvas, win } = fakes(1440, 900);
        traceOrbits(canvas, win);
        const frames = win.run();
        assert.ok(ctx.segments >= 2000 && ctx.segments <= 15000, `scene ${scene} seed ${seed} drew ${ctx.segments} segments`);
        assert.ok(frames >= 700 && frames <= 740, `scene ${scene} seed ${seed} took ${frames} frames`);
      }
    }
  } finally {
    Math.random = random;
  }
});
