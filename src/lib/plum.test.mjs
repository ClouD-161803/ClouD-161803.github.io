// run with `node --test`. the window and the canvas are stand-ins whose timers and frames the test
// runs by hand, and the context counts how often the drawing was started over
import test from 'node:test';
import assert from 'node:assert/strict';
import { growPlum } from './plum.ts';

// a phone's viewport in portrait, with the browser's toolbar hiding the bottom 80 px of the canvas
const WIDTH = 390;
const HEIGHT = 744;
const TOOLBAR = 80;

function fakes() {
  const ctx = {
    starts: 0,
    lineWidth: 0,
    strokeStyle: '',
    setTransform() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    clearRect() {
      this.starts += 1;
    },
  };
  const canvas = { clientWidth: WIDTH, clientHeight: HEIGHT, width: 0, height: 0, getContext: () => ctx };
  const listeners = [];
  let pending = null;
  const win = {
    innerWidth: WIDTH,
    innerHeight: HEIGHT - TOOLBAR,
    devicePixelRatio: 2,
    addEventListener: (type, fn) => listeners.push([type, fn]),
    setTimeout: (fn) => {
      pending = fn;
      return 1;
    },
    clearTimeout: () => {
      pending = null;
    },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    // fires the resize listeners and runs the debounced callback they left
    resize() {
      for (const [type, fn] of listeners) if (type === 'resize') fn();
      pending?.();
      pending = null;
    },
  };
  return { ctx, canvas, win };
}

// on a phone, scrolling hides the browser's toolbar, which changes innerHeight and fires resize while
// the canvas keeps its box, since it is sized in lvh
test('growPlum does not start over when the toolbar of a phone hides', () => {
  const { ctx, canvas, win } = fakes();
  growPlum(canvas, win);
  assert.equal(ctx.starts, 1);
  win.innerHeight = HEIGHT;
  win.resize();
  assert.equal(ctx.starts, 1);
});

test('growPlum starts over when the canvas changes size', () => {
  const { ctx, canvas, win } = fakes();
  growPlum(canvas, win);
  canvas.clientWidth = 800;
  win.innerWidth = 800;
  win.resize();
  assert.equal(ctx.starts, 2);
});
