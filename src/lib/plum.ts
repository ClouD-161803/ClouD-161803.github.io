// branching lines that grow in from the edges of a canvas, after the ArtPlum component of antfu.me
// (MIT, github.com/antfu/antfu.me). the drawing is made once, and again when the canvas changes size

const r90 = Math.PI / 2;
const r180 = Math.PI;
const r15 = Math.PI / 12;
const MIN_BRANCH = 30;
const LENGTH = 6;
const COLOR = '#88888825';

const random = Math.random;
const randomMiddle = () => random() * 0.6 + 0.2;

// the part of the window that growPlum reads, so that a test can pass a stand-in
export type PlumWindow = Pick<
  Window,
  | 'devicePixelRatio'
  | 'addEventListener'
  | 'setTimeout'
  | 'clearTimeout'
  | 'requestAnimationFrame'
  | 'cancelAnimationFrame'
>;

export function growPlum(canvas: HTMLCanvasElement, win: PlumWindow = window) {
  const ctx = canvas.getContext('2d')!;
  let width = 0;
  let height = 0;
  let steps: (() => void)[] = [];
  let frame = 0;
  let running = 0;

  // the box of the canvas is set in src/styles/global.css to the width of the window and to the large
  // viewport height, which stays put while the browser of a phone hides or shows its toolbar
  function size() {
    const dpr = win.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR;
  }

  // one segment of a branch, which then queues up to two children at a small angle from its own
  function step(x: number, y: number, rad: number, counter = { value: 0 }) {
    const length = random() * LENGTH;
    counter.value += 1;
    const nx = x + Math.cos(rad) * length;
    const ny = y + Math.sin(rad) * length;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    if (nx < -100 || nx > width + 100 || ny < -100 || ny > height + 100) return;
    // a young branch almost always continues, an old one splits or dies at even odds
    const rate = counter.value <= MIN_BRANCH ? 0.8 : 0.5;
    if (random() < rate) steps.push(() => step(nx, ny, rad + random() * r15, counter));
    if (random() < rate) steps.push(() => step(nx, ny, rad - random() * r15, counter));
  }

  // every other frame, each pending segment is drawn or held back at even odds, which paces the growth
  function tick() {
    frame += 1;
    if (frame % 2 === 0) {
      const previous = steps;
      steps = [];
      for (const fn of previous) {
        if (random() < 0.5) steps.push(fn);
        else fn();
      }
    }
    if (steps.length > 0) running = win.requestAnimationFrame(tick);
  }

  function start() {
    win.cancelAnimationFrame(running);
    size();
    ctx.clearRect(0, 0, width, height);
    steps = [
      () => step(randomMiddle() * width, -5, r90),
      () => step(randomMiddle() * width, height + 5, -r90),
      () => step(-5, randomMiddle() * height, 0),
      () => step(width + 5, randomMiddle() * height, r180),
    ];
    // a narrow screen grows two branches, from the top and the bottom
    if (width < 500) steps = steps.slice(0, 2);
    running = win.requestAnimationFrame(tick);
  }

  // the browser of a phone fires resize whenever its toolbar hides or shows on scroll, hence the
  // drawing is started over only when the box of the canvas changed
  let resizeTimer = 0;
  win.addEventListener('resize', () => {
    win.clearTimeout(resizeTimer);
    resizeTimer = win.setTimeout(() => {
      if (canvas.clientWidth !== width || canvas.clientHeight !== height) start();
    }, 200);
  });
  start();
}
