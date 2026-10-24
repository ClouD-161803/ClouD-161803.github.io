// orbits of the circular restricted three-body problem traced on a canvas, one scene per visit drawn at
// random from twenty-one, in the Earth–Moon system unless said otherwise: nested Lyapunov families, the
// Moon's neighborhood with its distant retrograde orbits, a manifold wing, halo shells from a slant, the
// center manifold of a libration point, a sheaf of lunar transfers, quasi-periodic ribbons, resonant
// rosettes, horseshoes along the Moon's orbit with the L3 family inside, vertical figure-eights, a halo
// tube, a fan of lunar flybys in the Moon's inertial frame, bundles about Arenstorf's two orbits, Trojan
// tadpoles about L4 and L5, Lissajous boxes, a lace of L1 and L2 tubes, a funnel of near-rectilinear
// halos, the families of the Copenhagen problem of two equal masses, a low-thrust whorl, the Hill
// contours of the Jacobi integral, and the petals of the Sun–Earth tubes about the Earth. a scene is
// set twice, in opposite corners of the window or about the middle, from two views. the orbits are
// computed on the spot by a short propagator and corrector and traced in animation frames at the pace
// of the spacecraft's own flight time, hence a small orbit closes before a large one and a manifold
// strand appears when it has left its orbit. the drawing is made once, and again when the canvas
// changes size, as the plum of antfu.me that it replaces

const COLOR = '#88888825';
// the mass ratio of the system drawn, in the nondimensional rotating frame: the Earth–Moon one to the
// precision of a textbook table, unless a scene sets another through system()
let MU = 0.01215;
// the distance from a body within which step() shortens the step, set with the mass ratio
let NEAR = 0.15;
// a constant acceleration along the inertial velocity, zero unless a scene turns an engine on
let THRUST = 0;
// seconds in which the longest flight of a scene is traced, which sets the pace of every spacecraft in it
const DURATION = 12;
// a scene under this many segments has lost a family to a failed continuation and is replaced
const FEW = 2000;

// the random draw is read at each call, so that a page or a test may replace Math.random before the first scene
const random = () => Math.random();

type Member = { s: Float64Array; path: number[]; times: number[]; t: number };
type Flight = { path: ArrayLike<number>; times: ArrayLike<number> };
type Strand = { pts: Float64Array; times: Float32Array };
type Project = (flight: Flight) => Strand;
// writes the time derivative of the state s, in the order x, y, z, vx, vy, vz, into a. returns the
// smaller of the distance to the Moon and 0.4 times the distance to the Earth, by which step()
// shortens the step so that the chords stay short where the motion is fast
function accel(s: Float64Array, a: Float64Array): number {
  const x = s[0], y = s[1], z = s[2];
  const dx1 = x + MU, dx2 = x - 1 + MU;
  const r1 = Math.sqrt(dx1 * dx1 + y * y + z * z), r2 = Math.sqrt(dx2 * dx2 + y * y + z * z);
  const k1 = (1 - MU) / (r1 * r1 * r1), k2 = MU / (r2 * r2 * r2);
  a[0] = s[3]; a[1] = s[4]; a[2] = s[5];
  a[3] = 2 * s[4] + x - k1 * dx1 - k2 * dx2;
  a[4] = -2 * s[3] + y - k1 * y - k2 * y;
  a[5] = -k1 * z - k2 * z;
  if (THRUST !== 0) {
    const ux = s[3] - y, uy = s[4] + x, u = Math.hypot(ux, uy, s[5]);
    a[3] += (THRUST * ux) / u; a[4] += (THRUST * uy) / u; a[5] += (THRUST * s[5]) / u;
  }
  return r2 < r1 ? r2 : r1 * 0.4;
}

// one RK4 step of s in place, of length h in nondimensional time scaled down near either body.
// returns the step taken
const k1 = new Float64Array(6), k2 = new Float64Array(6), k3 = new Float64Array(6), k4 = new Float64Array(6);
const mid = new Float64Array(6);
function step(s: Float64Array, h: number): number {
  const near = accel(s, k1);
  const dt = h * Math.min(1, near / NEAR);
  for (let i = 0; i < 6; i++) mid[i] = s[i] + 0.5 * dt * k1[i];
  accel(mid, k2);
  for (let i = 0; i < 6; i++) mid[i] = s[i] + 0.5 * dt * k2[i];
  accel(mid, k3);
  for (let i = 0; i < 6; i++) mid[i] = s[i] + dt * k3[i];
  accel(mid, k4);
  for (let i = 0; i < 6; i++) s[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  return dt;
}

// integrates from s0 until the coordinate axis, y unless given, changes sign for the count-th time
// after tmin, or until tmax. the crossing state is moved onto the plane along its velocity, to first
// order. path and times, if given, receive x, y, z and the time of every point
function toCrossing(s0: Float64Array, h: number, tmin: number, tmax: number, path?: number[], times?: number[], count = 1, axis = 1) {
  const s = Float64Array.from(s0);
  let t = 0;
  const record = () => {
    if (path) path.push(s[0], s[1], s[2]);
    if (times) times.push(t);
  };
  record();
  let prev = s[axis], left = count;
  for (let n = 0; n < 100000; n++) {
    t += step(s, h);
    if (t > tmin && (s[axis] === 0 || s[axis] > 0 !== prev > 0) && --left === 0) {
      const dtc = -s[axis] / s[axis + 3];
      const a = new Float64Array(6);
      accel(s, a);
      for (let i = 0; i < 6; i++) s[i] += dtc * a[i];
      t += dtc;
      record();
      return { s, t, hit: true };
    }
    prev = s[axis];
    record();
    if (t > tmax) return { s, t, hit: false };
  }
  return { s, t, hit: false };
}

// integrates from s0 for the time tmax with the step h, recording x, y, z and the time of every point
// in path and times, and stops early when stop(s) holds
function propagate(s0: Float64Array, h: number, tmax: number, path: number[], times: number[], stop?: (s: Float64Array) => boolean): Float64Array {
  const s = Float64Array.from(s0);
  let t = 0;
  path.push(s[0], s[1], s[2]);
  times.push(0);
  while (t < tmax) {
    t += step(s, h);
    path.push(s[0], s[1], s[2]);
    times.push(t);
    if (stop && stop(s)) break;
  }
  return s;
}

// Newton correction of a symmetric orbit. the entries free of s0 are adjusted until the entries target
// of the state at the count-th crossing of the plane axis = 0, y = 0 unless given, vanish within 1e-6,
// with the Jacobian built by forward differences. returns the corrected state with the half orbit's path, times and time, or null when
// no orbit crosses or a Newton step exceeds 0.1, which is how a singular Jacobian shows up
function correct(s0: Float64Array, free: number[], target: number[], h: number, tmin: number, tmax: number, iters: number, count = 1, axis = 1): Member | null {
  const s = Float64Array.from(s0);
  let path: number[] = [], times: number[] = [];
  for (let it = 0; it < iters; it++) {
    path = []; times = [];
    const base = toCrossing(s, h, tmin, tmax, path, times, count, axis);
    if (!base.hit) return null;
    const f = target.map((i) => base.s[i]);
    if (f.every((v) => Math.abs(v) < 1e-6)) return { s, path, times, t: base.t };
    const J: number[][] = [];
    for (let j = 0; j < free.length; j++) {
      const d = 1e-6;
      const sp = Float64Array.from(s);
      sp[free[j]] += d;
      const r = toCrossing(sp, h, tmin, tmax, undefined, undefined, count, axis);
      if (!r.hit) return null;
      J.push(target.map((i, k) => (r.s[i] - f[k]) / d));
    }
    const dx: number[] = [];
    if (free.length === 1) {
      dx.push(f[0] / J[0][0]);
    } else {
      const a = J[0][0], b = J[1][0], c = J[0][1], d = J[1][1];
      const det = a * d - b * c;
      dx.push((d * f[0] - b * f[1]) / det, (-c * f[0] + a * f[1]) / det);
    }
    if (!dx.every((v) => Math.abs(v) < 0.1)) return null;
    for (let j = 0; j < free.length; j++) s[free[j]] -= dx[j];
  }
  path = []; times = [];
  const r = toCrossing(s, h, tmin, tmax, path, times, count, axis);
  return r.hit ? { s, path, times, t: r.t } : null;
}

// a family continued over the parameter values of the state entry p. guess(v) seeds the first two
// members and a linear extrapolation of the free entries from the two previous members seeds the
// rest, falling back to guess(v) when a member does not converge. a member whose half period differs
// from the previous one by more than a third has jumped to another branch and counts as a failure,
// and a member that fails both ways ends the family. the first skip members are the ramp from a safe
// seed and are left out. count and axis, the crossing at which a member closes, go to correct()
function family(guess: (v: number) => Float64Array, p: number, values: number[], free: number[], target: number[], h: number, tmin: (v: number) => number, tmax: (v: number) => number, skip: number, count = 1, axis = 1): Member[] {
  const out: Member[] = [];
  let prev: Member | null = null, prev2: Member | null = null;
  const accept = (r: Member | null) => (r && (!prev || Math.abs(r.t - prev.t) < prev.t / 3) ? r : null);
  for (const v of values) {
    let r: Member | null = null;
    if (prev && prev2) {
      const s0 = Float64Array.from(prev.s);
      s0[p] = v;
      for (const i of free) s0[i] = prev.s[i] + ((prev.s[i] - prev2.s[i]) / (prev.s[p] - prev2.s[p])) * (v - prev.s[p]);
      r = accept(correct(s0, free, target, h, tmin(v), tmax(v), 6, count, axis));
    }
    if (!r) r = accept(correct(guess(v), free, target, h, tmin(v), tmax(v), 8, count, axis));
    if (!r) break;
    out.push(r);
    prev2 = prev;
    prev = r;
  }
  return out.slice(skip);
}

// a geometric ramp from a up to b, which precedes the wanted values of a family so that its
// continuation starts where the seed is accurate
function ramp(a: number, b: number, factor: number): number[] {
  const out: number[] = [];
  for (let x = a; x < b; x *= factor) out.push(x);
  return out;
}

// runs draw in the system of mass ratio mu, with the step shortened within near of a body, and puts
// the Earth–Moon system back
function system<T>(mu: number, near: number, draw: () => T): T {
  const mu0 = MU, near0 = NEAR;
  MU = mu; NEAR = near;
  try {
    return draw();
  } finally {
    MU = mu0; NEAR = near0;
  }
}

// the Jacobi constant of the state s
function jacobi(s: ArrayLike<number>): number {
  const r1 = Math.hypot(s[0] + MU, s[1], s[2]), r2 = Math.hypot(s[0] - 1 + MU, s[1], s[2]);
  return s[0] * s[0] + s[1] * s[1] + (2 * (1 - MU)) / r1 + (2 * MU) / r2 - s[3] * s[3] - s[4] * s[4] - s[5] * s[5];
}

// count values from a to b, crowded toward a by the exponent p, which keeps the inner members of a
// family apart by more than a pixel while the spacing still widens outward
function spaced(a: number, b: number, count: number, p: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(a + (b - a) * Math.pow(i / (count - 1), p));
  return out;
}

// x of the collinear point L1, L2, or L3, by Newton on the force balance along the x axis, seeded by
// the Hill radius cbrt(MU / 3) on either side of the Moon, or by the first-order offset beyond the Earth
function lagrange(n: number): number {
  let x = n === 1 ? 1 - MU - Math.cbrt(MU / 3) : n === 2 ? 1 - MU + Math.cbrt(MU / 3) : -1 - (5 * MU) / 12;
  for (let i = 0; i < 30; i++) {
    const d1 = x + MU, d2 = x - 1 + MU;
    const f = x - ((1 - MU) * Math.sign(d1)) / (d1 * d1) - (MU * Math.sign(d2)) / (d2 * d2);
    const df = 1 + (2 * (1 - MU)) / Math.abs(d1 * d1 * d1) + (2 * MU) / Math.abs(d2 * d2 * d2);
    x -= f / df;
  }
  return x;
}

// the Lyapunov family at L1 or L2 over the amplitudes given from the collinear point, outward from
// the Moon, continued from a tiny amplitude where the linear seed is exact enough for an unstable
// orbit. the seed comes from the coefficient c2 of the potential expanded at the point and the
// in-plane frequency of the linearized motion there. the ramp starts at the amplitude start
function lyapunovFamily(n: number, amplitudes: number[], h: number, start = 0.003): Member[] {
  const xL = lagrange(n);
  const d1 = Math.abs(xL + MU), d2 = Math.abs(xL - 1 + MU);
  const c2 = (1 - MU) / (d1 * d1 * d1) + MU / (d2 * d2 * d2);
  const w2 = (2 - c2 + Math.sqrt(9 * c2 * c2 - 8 * c2)) / 2;
  const guess = (x0: number) => {
    const s = new Float64Array(6);
    s[0] = x0;
    s[4] = ((xL - x0) * (w2 + 1 + 2 * c2)) / 2;
    return s;
  };
  const sign = n === 1 ? -1 : 1;
  const lead = ramp(start, amplitudes[0], 1.2);
  const values = lead.concat(amplitudes).map((A) => xL + sign * A);
  return family(guess, 0, values, [4], [3], h, () => 0.3, () => 6, lead.length);
}

// the family of distant retrograde orbits around the Moon over the distances given of the member's
// crossing on the Earth side, seeded by the Keplerian speed in the rotating frame and continued from
// a close orbit, since the period changes quickly with the distance
function droFamily(distances: number[], h: number): Member[] {
  const guess = (x0: number) => {
    const d = 1 - MU - x0;
    const s = new Float64Array(6);
    s[0] = x0;
    s[4] = Math.sqrt(MU / d) + d;
    return s;
  };
  const tmin = (x0: number) => {
    const d = 1 - MU - x0;
    return (0.4 * Math.PI) / (Math.sqrt(MU / (d * d * d)) + 1);
  };
  const lead = ramp(0.02, distances[0], 1.12);
  const values = lead.concat(distances).map((d) => 1 - MU - d);
  return family(guess, 0, values, [4], [3], h, tmin, (x0) => 10 * tmin(x0), lead.length);
}

// the northern halo family at L1 or L2 over the values of z0 given, continued from a textbook member
// near the bifurcation from the Lyapunov family through a ramp of small steps
function haloFamily(n: number, heights: number[], h: number): Member[] {
  const seed = new Float64Array(6);
  if (n === 1) {
    seed[0] = 0.8234; seed[2] = 0.0224; seed[4] = 0.1343;
  } else {
    seed[0] = 1.1809; seed[2] = 0.005; seed[4] = -0.156;
  }
  const first = correct(seed, [0, 4], [3, 5], h, 0.5, 4, 10);
  if (!first) return [];
  const guess = (z0: number) => {
    const s = Float64Array.from(first.s);
    s[2] = z0;
    return s;
  };
  const lead = ramp(first.s[2], heights[0], 1.15);
  return family(guess, 2, lead.concat(heights), [0, 4], [3, 5], h, () => 0.5, () => 4, lead.length);
}

// the halo family at L1 or L2 continued past its largest members in the crossing of the x axis beyond
// the libration point, from the member of the given height toward the Moon, where the members straighten
// into the near-rectilinear halos. count values are taken down to the crossing end
function nrhoFamily(n: number, height: number, end: number, count: number, h: number): Member[] {
  const start = haloFamily(n, [height], h);
  if (start.length === 0) return [];
  const guess = (x0: number) => {
    const s = Float64Array.from(start[0].s);
    s[0] = x0;
    return s;
  };
  return family(guess, 0, spaced(start[0].s[0], end, count, 1), [2, 4], [3, 5], h, () => 0.3, () => 4, 0);
}

// a family of p:q resonant orbits, p revolutions of the spacecraft about the Earth for q of the Moon,
// over the apoapsis distances given, seeded by the Keplerian ellipse of the resonant semi-major axis
// with its apoapsis on the x axis, on the Moon's side when side is 1 and on the far side when -1, and
// closed at the crossing of y = 0 that the seed reaches at half the resonant period. the Newton
// correction holds only for the resonances listed in INNER and OUTER
function resonantFamily(p: number, q: number, side: number, apoapses: number[], h: number): Member[] {
  const a = Math.pow(q / p, 2 / 3), half = Math.PI * q, tmin = 0.05 * half;
  const guess = (x0: number) => {
    const ra = Math.abs(x0 + MU);
    const v = Math.sqrt((1 - MU) * Math.max(0, 2 / ra - 1 / a));
    const s = new Float64Array(6);
    s[0] = x0;
    s[4] = side * (v - ra);
    return s;
  };
  const values = apoapses.map((ra) => -MU + side * ra);
  const s = guess(values[0]);
  let t = 0, prev = s[1], count = 1;
  while (t < 0.95 * half) {
    t += step(s, h);
    if (t > tmin && s[1] > 0 !== prev > 0) count += 1;
    prev = s[1];
  }
  return family(guess, 0, values, [4], [3], h, () => tmin, () => 1.5 * half, 0, count);
}

// the vertical Lyapunov family at L1 or L2 over the heights given: standing figure-eights seeded by
// the vertical oscillation of the linearized motion at the point, which the saddle there would hide
// from a y = 0 crossing, hence closed where the orbit crosses z = 0 on the x axis, a quarter period
// from the start. a member holds the quarter path, which halfOrbit() extends to the half orbit
function verticalFamily(n: number, heights: number[], h: number): Member[] {
  const xL = lagrange(n);
  const d1 = Math.abs(xL + MU), d2 = Math.abs(xL - 1 + MU);
  const nu = Math.sqrt((1 - MU) / (d1 * d1 * d1) + MU / (d2 * d2 * d2)), quarter = Math.PI / 2 / nu;
  const guess = (z0: number) => {
    const s = new Float64Array(6);
    s[0] = xL; s[2] = z0;
    return s;
  };
  const lead = ramp(0.01, heights[0], 1.3);
  return family(guess, 2, lead.concat(heights), [0, 4], [1, 3], h, () => 0.5 * quarter, () => 3 * quarter, lead.length, 1, 2);
}

// the half orbit of a member corrected at a quarter period, as the path to the second crossing of y = 0
function halfOrbit(m: Member, h: number): Member {
  const path: number[] = [], times: number[] = [];
  const r = toCrossing(m.s, h, 1.2 * m.t, 4 * m.t, path, times);
  return { s: m.s, path, times, t: r.t };
}

// the full closed orbit of a symmetric member, as the half path followed by its mirror image in y and
// closed on its first point, started at a random point of the orbit so that the spacecraft of a family
// are spread in phase
function closed(member: Member): Flight {
  const p = member.path, q = member.times, n = p.length / 3, m = 2 * n;
  const T = 2 * member.t, start = Math.floor(random() * m);
  const timeAt = (k: number) => (k < n ? q[k] : T - q[m - 1 - k]);
  const t0 = timeAt(start);
  const path = new Float64Array(3 * (m + 1)), times = new Float32Array(m + 1);
  for (let i = 0; i <= m; i++) {
    const k = (start + i) % m, j = k < n ? k : m - 1 - k, sign = k < n ? 1 : -1;
    path[3 * i] = p[3 * j]; path[3 * i + 1] = sign * p[3 * j + 1]; path[3 * i + 2] = p[3 * j + 2];
    let rel = timeAt(k) - t0;
    if (rel < 0 || (rel === 0 && i > 0)) rel += T;
    times[i] = i === m ? T : rel;
  }
  return { path, times };
}

// the strands of the unstable manifold of a periodic member: one period's worth of departures spread
// over the multiplier, each propagated for tmax or until it falls onto a body or leaves the
// neighborhood. the unstable eigenvector comes from the monodromy matrix, built by forward differences
// over one period, through power iteration. toEarth selects the branch that first heads toward the
// Earth. a strand is recorded only once its separation from the orbit, eps grown at the rate of the
// multiplier, exceeds visible, so that the strands do not pile up on the orbit itself, and its times
// count from the departure, hence it appears when the spacecraft has left the orbit
function manifold(orbit: Member, h: number, count: number, toEarth: boolean, tmax: number, visible: number, scale = 1, stop?: (s: Float64Array) => boolean): Flight[] {
  const T = 2 * orbit.t;
  const base = propagate(orbit.s, h, T, [], []);
  const M: number[][] = [];
  for (let j = 0; j < 6; j++) {
    const sp = Float64Array.from(orbit.s);
    sp[j] += 1e-6;
    const e = propagate(sp, h, T, [], []);
    M.push(Array.from(e, (v, i) => (v - base[i]) / 1e-6));
  }
  let v = [1, 0.3, -0.2, 0.5, 0.1, -0.4], lam = 1;
  for (let k = 0; k < 40; k++) {
    const w = v.map((_, i) => M.reduce((acc, col, j) => acc + col[i] * v[j], 0));
    lam = Math.hypot(...w);
    v = w.map((x) => x / lam);
  }
  const sign = v[3] < 0 === toEarth ? 1 : -1;
  const growth = Math.log(lam) / T;
  const flights: Flight[] = [];
  for (let i = 0; i < count; i++) {
    const eps = 1e-5 * scale * Math.pow(lam, i / count);
    const s = Float64Array.from(orbit.s);
    for (let j = 0; j < 6; j++) s[j] += sign * eps * v[j];
    const skip = Math.max(0, Math.log(visible / eps) / growth);
    const path: number[] = [], times: number[] = [];
    let t = 0;
    while (t < tmax) {
      t += step(s, h);
      if (t < skip) continue;
      path.push(s[0], s[1], s[2]);
      times.push(t);
      if (stop ? stop(s) : Math.hypot(s[0] + MU, s[1], s[2]) < 0.05 || Math.hypot(s[0] - 1 + MU, s[1], s[2]) < 0.01 || Math.hypot(s[0], s[1]) > 2.2) break;
    }
    if (path.length > 6) flights.push({ path, times });
  }
  return flights;
}

// the mirror image in y of a flight run backward, which by the symmetry of the problem turns a strand
// of an unstable manifold into one of the stable manifold, arriving at the orbit
function reversed({ path, times }: Flight): Flight {
  const n = times.length, end = times[n - 1], p = new Float64Array(3 * n), q = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = n - 1 - i;
    p[3 * i] = path[3 * j]; p[3 * i + 1] = -path[3 * j + 1]; p[3 * i + 2] = path[3 * j + 2];
    q[i] = end - times[j];
  }
  return { path: p, times: q };
}

// a flight turned by a half turn about the z axis, which is a symmetry of the problem of two equal masses
function halfTurned({ path, times }: Flight): Flight {
  const p = Float64Array.from(path);
  for (let i = 0; i < p.length; i += 3) {
    p[i] = -p[i]; p[i + 1] = -p[i + 1];
  }
  return { path: p, times };
}

// the part of the window that traceOrbits reads, so that a test can pass a stand-in
export type OrbitsWindow = Pick<
  Window,
  | 'devicePixelRatio'
  | 'addEventListener'
  | 'setTimeout'
  | 'clearTimeout'
  | 'requestAnimationFrame'
  | 'cancelAnimationFrame'
>;

export function traceOrbits(canvas: HTMLCanvasElement, win: OrbitsWindow = window) {
  const ctx = canvas.getContext('2d')!;
  let width = 0;
  let height = 0;
  let narrow = false;
  let cornerIndex = 0;
  let strands: Strand[] = [];
  let drawn: number[] = [];
  let rate = 1;
  let started = 0;
  let running = 0;


  // a view of the rotating frame: the point (ax, ay) goes to the pixel (px, py), the frame is turned by
  // theta about z and seen from the elevation phi, negative when seen from below, with scale pixels per
  // unit. returns the projection of a flight to a strand of pixel coordinates with its times
  function view(ax: number, ay: number, px: number, py: number, theta: number, phi: number, scale: number): Project {
    const c = Math.cos(theta), s = Math.sin(theta);
    const se = Math.sin(Math.abs(phi)), ce = Math.cos(phi) * Math.sign(phi);
    return ({ path, times }) => {
      const n = path.length / 3, pts = new Float64Array(2 * n);
      for (let i = 0; i < n; i++) {
        const x = path[3 * i] - ax, y = path[3 * i + 1] - ay, z = path[3 * i + 2];
        pts[2 * i] = px + (x * c - y * s) * scale;
        pts[2 * i + 1] = py - ((x * s + y * c) * se + z * ce) * scale;
      }
      return { pts, times: Float32Array.from(times) };
    };
  }

  // a pixel set in from a corner of the window by the fractions fx and fy of its sides: the corner drawn
  // for the visit for the first placement of a scene and the opposite one for the second. a narrow screen
  // keeps every scene in a bottom corner, below the heading of the page
  function corner(placement: number, fx: number, fy: number) {
    const c = placement === 0 ? cornerIndex : cornerIndex ^ 3;
    const right = (c & 1) === 1, bottom = (c & 2) === 2;
    return { x: right ? width * (1 - fx) : width * fx, y: bottom ? height * (1 - fy) : height * fy };
  }

  // pixels per nondimensional unit, from the window's diagonal, tightened on a narrow screen when the
  // scene reaches far from its anchor
  function pixels(low: number, high: number, far: boolean): number {
    return (low + random() * (high - low)) * Math.hypot(width, height) * (far && narrow ? 0.7 : 1);
  }

  // a random turn of the frame about z, and a slant seen from above or below between the elevations given
  const turn = () => random() * Math.PI * 2;
  const slant = (low: number, high: number) => (low + random() * (high - low)) * (random() < 0.5 ? 1 : -1);

  // a view shared by the two placements of a scene set about the Earth near the middle of the window,
  // seen from above: the anchor is shifted toward the corner drawn for the visit, and the turn follows
  // from that corner, so that the placements agree. scale is in units of the window's shorter side
  function middle(scale: number): Project {
    const dx = (cornerIndex & 1 ? 1 : -1) * 0.12, dy = (cornerIndex & 2 ? 1 : -1) * 0.12;
    return view(-MU, 0, width * (0.5 + dx), height * (0.5 + dy), cornerIndex * 1.7 + 0.4, Math.PI / 2, scale * Math.min(width, height));
  }

  // A. the planar Lyapunov families of L1 and L2 nested around a Moon near a corner
  function lyapunovNest(placement: number): Strand[] {
    const h = 0.03, k = corner(placement, 0.08 + random() * 0.1, 0.1 + random() * 0.15);
    const proj = view(1 - MU, 0, k.x, k.y, turn(), Math.PI / 2 - random() * 0.5, pixels(0.73, 1.0, false));
    return lyapunovFamily(1, spaced(0.012, 0.13, 18, 1.15), h).concat(lyapunovFamily(2, spaced(0.012, 0.17, 18, 1.15), h)).map((m) => proj(closed(m)));
  }

  // B. the Moon's neighborhood seen whole: both Lyapunov families and the distant retrograde orbits,
  // with the Moon set in from the middle of a side, or in a bottom corner on a narrow screen
  function neighborhood(placement: number): Strand[] {
    const h = 0.03, left = (cornerIndex & 1) === placement;
    const theta = (left ? 0 : Math.PI) + (random() - 0.5) * 0.8;
    const px = left ? width * 0.12 : width * 0.88, py = narrow ? height * (0.75 + random() * 0.1) : height * (0.3 + random() * 0.4);
    const proj = view(1 - MU, 0, px, py, theta, Math.PI / 2 - random() * 0.4, pixels(0.73, 1.0, true));
    const members = lyapunovFamily(1, spaced(0.012, 0.12, 12, 1.15), h).concat(lyapunovFamily(2, spaced(0.012, 0.16, 12, 1.15), h), droFamily(spaced(0.05, 0.5, 12, 1.15), h));
    return members.map((m) => proj(closed(m)));
  }

  // C. the unstable manifold of an L1 Lyapunov orbit set near a corner: one branch sweeps out across
  // the window around the hidden Earth, the other knots around the Moon
  function manifoldWing(placement: number): Strand[] {
    const h = 0.02, k = corner(placement, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const proj = view(lagrange(1), 0, k.x, k.y, turn(), Math.PI / 2 - random() * 0.5, pixels(0.64, 0.92, false));
    const fam = lyapunovFamily(1, [0.03 + random() * 0.04], h);
    if (fam.length === 0) return [];
    const orbit = fam[0];
    const flights = manifold(orbit, h, 16, true, 5.5, 0.008).concat(manifold(orbit, h, 8, false, 4, 0.008));
    return [proj(closed(orbit))].concat(flights.map(proj));
  }

  // D. the northern halo families of L1 and L2 seen from a slant, nested like two shells either side of
  // a Moon near a corner
  function haloShells(placement: number): Strand[] {
    const h = 0.02, k = corner(placement, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const proj = view(1 - MU, 0, k.x, k.y, turn(), slant(0.3, 0.9), pixels(0.82, 1.19, false));
    return haloFamily(1, spaced(0.03, 0.17, 18, 1.2), h).concat(haloFamily(2, spaced(0.03, 0.19, 18, 1.2), h)).map((m) => proj(closed(m)));
  }

  // E. the center manifold of a collinear point from a slant: the planar Lyapunov nest with the halo
  // shell rising from the member it bifurcates from, set near a corner, L1 in one placement and L2 in
  // the other
  function centerManifold(placement: number): Strand[] {
    const h = 0.02, k = corner(placement, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const n = (placement + cornerIndex) % 2 === 0 ? 1 : 2;
    const proj = view(lagrange(n), 0, k.x, k.y, turn(), slant(0.35, 0.85), pixels(0.7, 1.0, false));
    const members = lyapunovFamily(n, spaced(0.015, n === 1 ? 0.13 : 0.17, 16, 1.1), h).concat(haloFamily(n, spaced(0.04, n === 1 ? 0.17 : 0.19, 16, 1.1), h));
    return members.map((m) => proj(closed(m)));
  }

  // F. a sheaf of lunar transfers: ellipses from a low Earth orbit whose apogees fall about the Moon,
  // launched together with a spread of apogee heights and departure angles. in the rotating frame the
  // sheaf arrives from one edge as a bundle and is scattered by the Moon near a corner
  function transferSheaf(placement: number): Strand[] {
    const h = 0.02, k = corner(placement, 0.12 + random() * 0.1, 0.15 + random() * 0.15);
    const proj = view(1 - MU, 0, k.x, k.y, turn(), Math.PI / 2 - random() * 0.5, pixels(0.55, 0.8, true));
    const rp = 0.02, out: Strand[] = [];
    for (let i = 0; i < 24; i++) {
      const ra = 0.92 + random() * 0.2, a = (rp + ra) / 2;
      const v = Math.sqrt((1 - MU) * (2 / rp - 1 / a));
      const alpha = -2.0 + (random() - 0.5) * 0.4;
      const s = new Float64Array(6);
      s[0] = -MU + rp * Math.cos(alpha); s[1] = rp * Math.sin(alpha);
      s[3] = -(v - rp) * Math.sin(alpha); s[4] = (v - rp) * Math.cos(alpha);
      const path: number[] = [], times: number[] = [];
      propagate(s, h, 3.5, path, times, (q) => Math.hypot(q[0] + MU, q[1]) < 0.015 || Math.hypot(q[0] - 1 + MU, q[1]) < 0.005 || Math.hypot(q[0], q[1]) > 2);
      out.push(proj({ path, times }));
    }
    return out;
  }

  // G. quasi-periodic strands hugging distant retrograde orbits: each is the orbit with a small in-plane
  // and out-of-plane perturbation followed for many revolutions, which winds a narrow torus around it,
  // seen from a slant with the Moon near a corner
  function ribbons(placement: number): Strand[] {
    const h = 0.03, k = corner(placement, 0.08 + random() * 0.1, 0.1 + random() * 0.15);
    const proj = view(1 - MU, 0, k.x, k.y, turn(), slant(0.5, 1.3), pixels(0.5, 0.75, true));
    const out: Strand[] = [];
    for (const m of droFamily(spaced(0.07, 0.42, 25, 1.2), h).filter((_, i) => i % 6 === 0)) {
      const s = Float64Array.from(m.s);
      s[4] *= 1 + 0.003 + random() * 0.006;
      s[2] = (random() - 0.5) * 0.03;
      const path: number[] = [], times: number[] = [];
      propagate(s, h, 2 * m.t * (8 + random() * 5), path, times);
      out.push(proj({ path, times }));
    }
    return out;
  }

  // H. resonant rosettes: a family of interior resonant orbits about an Earth near the middle of the
  // window, whose lobes turn with the apoapsis, in one placement, and a family of exterior ones sweeping
  // around them in the other, or both in the one placement of a narrow screen. the resonances are those
  // the corrector closes, as p, q, side, and the apoapsis range, and the visit's corner picks one of each
  const INNER = [[3, 1, 1, 0.52, 0.78], [4, 1, -1, 0.44, 0.7], [5, 1, 1, 0.4, 0.65], [5, 2, 1, 0.6, 0.8], [7, 2, 1, 0.5, 0.75]];
  const OUTER = [[1, 3, -1, 2.3, 3.0], [1, 4, 1, 2.6, 3.6], [2, 5, 1, 1.9, 2.8], [3, 5, 1, 1.5, 2.2]];
  function rosettes(placement: number): Strand[] {
    const h = 0.03, proj = middle(0.72);
    const inner = INNER[cornerIndex % INNER.length], outer = OUTER[cornerIndex % OUTER.length];
    const picks = narrow ? [inner, outer] : [placement === 0 ? inner : outer];
    return picks.flatMap(([p, q, side, lo, hi]) => resonantFamily(p, q, side, spaced(lo, hi, side === inner[2] && p === inner[0] ? 7 : 5, 1), h).map((m) => proj(closed(m))));
  }

  // I. horseshoes: co-orbital motion along the Moon's orbit about an Earth near the middle of the window,
  // each a circular orbit just inside the Moon's started at the crossing near L3, which drifts ahead to
  // the Moon, is thrown outside, and drifts back past L3, closer ones in one placement and farther in
  // the other, where the planar Lyapunov family of L3 nests inside them. the ring surrounds the text,
  // and a flight is cut short at the Moon
  function horseshoes(placement: number): Strand[] {
    const h = 0.05, proj = middle(0.46), out: Strand[] = [];
    for (const d of placement === 0 ? spaced(0.04, 0.07, 4, 1) : spaced(0.08, 0.12, 3, 1)) {
      const r = 1 - d;
      const s = new Float64Array(6);
      s[0] = -MU - r; s[4] = -(Math.sqrt((1 - MU) / r) - r);
      const path: number[] = [], times: number[] = [];
      propagate(s, h, 2.6 / d + 10, path, times, (q) => Math.hypot(q[0] - 1 + MU, q[1]) < 0.03);
      out.push(proj({ path, times }));
    }
    if (placement === 1) for (const m of lyapunovFamily(3, spaced(0.05, 0.5, 5, 1), 0.03)) out.push(proj(closed(m)));
    return out;
  }

  // J. vertical figure-eights: the vertical Lyapunov family of L1 in one placement and of L2 in the
  // other, standing eights that lean over as they grow, seen from a low slant near a corner
  function eights(placement: number): Strand[] {
    const h = 0.02, k = corner(placement, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const n = (placement + cornerIndex) % 2 === 0 ? 1 : 2;
    const proj = view(lagrange(n), 0, k.x, k.y, turn(), slant(0.15, 0.6), pixels(0.3, 0.45, false));
    return verticalFamily(n, spaced(0.05, 0.6, 16, 1.1), h).map((m) => proj(closed(halfOrbit(m, h))));
  }

  // K. a halo tube: the unstable manifold of an L1 or L2 halo orbit, one tube leaving toward the Moon
  // and one away, seen from a slant with the orbit near a corner
  function haloTube(placement: number): Strand[] {
    const h = 0.02, k = corner(placement, 0.12 + random() * 0.1, 0.15 + random() * 0.15);
    const n = (placement + cornerIndex) % 2 === 0 ? 1 : 2;
    const proj = view(lagrange(n), 0, k.x, k.y, turn(), slant(0.3, 0.9), pixels(0.6, 0.9, false));
    const fam = haloFamily(n, [0.08 + random() * 0.08], h);
    if (fam.length === 0) return [];
    const orbit = fam[0];
    const flights = manifold(orbit, h, 14, true, 5, 0.01).concat(manifold(orbit, h, 10, false, 4, 0.01));
    return [proj(closed(orbit))].concat(flights.map(proj));
  }

  // L. a fan of lunar flybys in the Moon-centered inertial frame: spacecraft arriving on parallel paths
  // at the same speed with a spread of offsets, bent by the Moon through angles that grow as the offset
  // shrinks. each point is turned by its time, which takes the rotating frame out, and the Moon sits
  // near a corner
  function flybyFan(placement: number): Strand[] {
    const h = 0.01, k = corner(placement, 0.15 + random() * 0.1, 0.2 + random() * 0.15);
    const scale = pixels(1.3, 1.9, true), theta = turn(), ct = Math.cos(theta), st = Math.sin(theta);
    const se = Math.sin(Math.PI / 2 - random() * 0.6);
    const speed = 0.4 + random() * 0.3, ang = random() * Math.PI * 2, out: Strand[] = [];
    const ux = Math.cos(ang), uy = Math.sin(ang);
    for (const b of spaced(-0.1, 0.1, 21, 1)) {
      const s = new Float64Array(6);
      s[0] = 1 - MU - 0.4 * ux - b * uy; s[1] = -0.4 * uy + b * ux;
      s[3] = speed * ux + s[1]; s[4] = speed * uy - (s[0] - 1 + MU);
      const path: number[] = [], times: number[] = [];
      propagate(s, h, 2.5, path, times, (q) => Math.hypot(q[0] - 1 + MU, q[1]) < 0.006 || Math.hypot(q[0] - 1 + MU, q[1]) > 0.5);
      const n = path.length / 3, pts = new Float64Array(2 * n);
      for (let i = 0; i < n; i++) {
        const t = times[i], c = Math.cos(t), sn = Math.sin(t);
        const x = path[3 * i] - 1 + MU, y = path[3 * i + 1];
        const xi = x * c - y * sn, yi = x * sn + y * c;
        pts[2 * i] = k.x + (xi * ct - yi * st) * scale;
        pts[2 * i + 1] = k.y - (xi * st + yi * ct) * se * scale;
      }
      out.push({ pts, times: Float32Array.from(times) });
    }
    return out;
  }

  // M. Arenstorf bundles: the two periodic orbits of the Earth–Moon problem that Arenstorf found and
  // that textbooks on integrators test on, corrected from their published initial conditions to this
  // mass ratio, each with neighbors started a little faster or slower and followed for one period, which
  // fray where the orbit passes close to the Earth. one orbit in each placement, about the middle of
  // the window
  function arenstorf(placement: number): Strand[] {
    const h = 0.02, proj = middle(0.42), out: Strand[] = [];
    const [vy, count, half] = placement === 0 ? [-2.0015851, 3, 8.53] : [-2.0317326, 2, 5.56];
    const s = new Float64Array(6);
    s[0] = 0.994; s[4] = vy;
    const m = correct(s, [4], [3], h, 0.3, 1.3 * half, 10, count);
    if (!m) return out;
    out.push(proj(closed(m)));
    for (const d of [-0.004, -0.002, 0.002, 0.004]) {
      const p = Float64Array.from(m.s);
      p[4] *= 1 + d;
      const path: number[] = [], times: number[] = [];
      propagate(p, h, 2 * m.t, path, times, (q) => Math.hypot(q[0] + MU, q[1]) < 0.017);
      out.push(proj({ path, times }));
    }
    return out;
  }

  // N. Trojan tadpoles: orbits librating about L4 in one placement and L5 in the other, each started at
  // the triangular point on a circle a little inside the Moon's orbit, which sets how far the libration
  // reaches along it, and followed for a few librations, over which the fast epicycles fill a banana-shaped
  // band along the Moon's orbit. the point sits near a corner, hence the band curves along a side
  function tadpoles(placement: number): Strand[] {
    const h = 0.1, k = corner(placement, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const sign = (placement + cornerIndex) % 2 === 0 ? 1 : -1, ang = (sign * Math.PI) / 3;
    const proj = view(0.5 - MU, (sign * Math.sqrt(3)) / 2, k.x, k.y, turn(), Math.PI / 2 - random() * 0.4, pixels(0.4, 0.6, true));
    const out: Strand[] = [];
    for (const d of spaced(0.03, 0.105, 4, 1)) {
      const r = 1 - d, v = Math.sqrt(1 / r) - r;
      const s = new Float64Array(6);
      s[0] = r * Math.cos(ang); s[1] = r * Math.sin(ang);
      s[3] = -v * Math.sin(ang); s[4] = v * Math.cos(ang);
      const path: number[] = [], times: number[] = [];
      propagate(s, h, 100 + random() * 20, path, times, (q) => Math.hypot(q[0] - 1 + MU, q[1]) < 0.05);
      out.push(proj({ path, times }));
    }
    return out;
  }

  // O. Lissajous boxes: quasi-periodic motion about L1 in one placement and L2 in the other from the
  // linearized equations, an in-plane and a vertical oscillation at the two frequencies of the point,
  // which do not close and weave a box around it over a few periods. a few amplitudes and phases, seen
  // from a slant with the point near a corner
  function lissajous(placement: number): Strand[] {
    const k = corner(placement, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const n = (placement + cornerIndex) % 2 === 0 ? 1 : 2, xL = lagrange(n);
    const d1 = Math.abs(xL + MU), d2 = Math.abs(xL - 1 + MU);
    const c2 = (1 - MU) / (d1 * d1 * d1) + MU / (d2 * d2 * d2);
    const w = Math.sqrt((2 - c2 + Math.sqrt(9 * c2 * c2 - 8 * c2)) / 2), nu = Math.sqrt(c2), kappa = (w * w + 1 + 2 * c2) / (2 * w);
    const proj = view(xL, 0, k.x, k.y, turn(), slant(0.3, 0.9), pixels(0.6, 0.9, false));
    const out: Strand[] = [];
    for (let i = 0; i < 7; i++) {
      const A = 0.02 + random() * 0.06, B = A * (0.6 + random() * 1.2), phi = turn(), psi = turn();
      const T = ((2 * Math.PI) / w) * (5 + random() * 3), dt = 0.05;
      const path: number[] = [], times: number[] = [];
      for (let t = 0; t <= T; t += dt) {
        path.push(xL - A * Math.cos(w * t + phi), kappa * A * Math.sin(w * t + phi), B * Math.sin(nu * t + psi));
        times.push(t);
      }
      out.push(proj({ path, times }));
    }
    return out;
  }

  // P. a lace of tubes: the unstable tube of an L1 Lyapunov orbit and the stable tube of an L2 one, the
  // mirror image of its unstable tube, interlace around the Moon between the two orbits. the Moon sits
  // near a corner, and the stable strands are traced toward their orbit, hence arrive as the unstable
  // ones leave
  function tubeLace(placement: number): Strand[] {
    const h = 0.02, k = corner(placement, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const proj = view(1 - MU, 0, k.x, k.y, turn(), Math.PI / 2 - random() * 0.5, pixels(0.8, 1.2, false));
    const one = lyapunovFamily(1, [0.04 + random() * 0.05], h), two = lyapunovFamily(2, [0.04 + random() * 0.06], h);
    if (one.length === 0 || two.length === 0) return [];
    const out = [proj(closed(one[0])), proj(closed(two[0]))];
    for (const f of manifold(one[0], h, 14, false, 4, 0.008)) out.push(proj(f));
    for (const f of manifold(two[0], h, 14, true, 4, 0.008)) out.push(proj(reversed(f)));
    return out;
  }

  // Q. a funnel of near-rectilinear halos: the L2 halo family continued past the largest halos of D in
  // the crossing beyond the Moon, down toward it, where the members straighten into tall loops over a
  // lunar pole, seen from a low slant with the Moon near a corner. the L1 family in the other placement,
  // as far as it leans over the Moon
  function nrhoFunnel(placement: number): Strand[] {
    const h = 0.01, k = corner(placement, 0.12 + random() * 0.1, 0.15 + random() * 0.15);
    const n = (placement + cornerIndex) % 2 === 0 ? 2 : 1;
    const proj = view(1 - MU, 0, k.x, k.y, turn(), slant(0.1, 0.45), pixels(0.9, 1.3, false));
    const members = n === 2 ? nrhoFamily(2, 0.16, 1.02 + random() * 0.01, 22, h) : nrhoFamily(1, 0.15, 0.93, 16, h);
    return members.map((m) => proj(closed(m)));
  }

  // R. the Copenhagen problem, two equal masses: the retrograde families about both nest in one
  // placement, and the Lyapunov families of the three collinear points, L1 between the masses and L2 and
  // L3 beyond them, in the other, each family about one mass the half turn of that about the other,
  // which is a symmetry of this problem. the barycenter sits off the middle of the window
  function copenhagen(placement: number): Strand[] {
    return system(0.5, 0.3, () => {
      const h = 0.02, dx = (cornerIndex & 1 ? 1 : -1) * 0.1, dy = (cornerIndex & 2 ? 1 : -1) * 0.1;
      const proj = view(0, 0, width * (0.5 + dx), height * (0.5 + dy), cornerIndex * 1.7 + 0.4, Math.PI / 2, (0.3 + random() * 0.1) * Math.min(width, height));
      const members = placement === 0
        ? droFamily(spaced(0.06, 0.42, 14, 1.2), h)
        : lyapunovFamily(1, spaced(0.02, 0.42, 12, 1.2), h).concat(lyapunovFamily(2, spaced(0.02, 0.5, 10, 1.2), h));
      const out: Strand[] = [];
      for (const m of members) {
        const f = closed(m);
        out.push(proj(f));
        if (!(placement === 1 && m.s[0] < 0.01 && m.s[0] > -0.01)) out.push(proj(halfTurned(f)));
      }
      return out;
    });
  }

  // S. a thrust whorl: four spacecraft spiralling out from a low orbit about the Earth under a small
  // constant thrust along their velocity until they reach the energy of L1, where the engines stop and
  // they drift through the neck. the Earth sits near a corner, the whorl is drawn only from where its
  // loops come apart, and the second placement is left empty. a whorl about the Moon under thrust against
  // the velocity was tried and dropped, since its loops filled a ring too dense for the page
  function whorl(placement: number): Strand[] {
    if (placement === 1) return [];
    const k = corner(0, 0.12 + random() * 0.1, 0.15 + random() * 0.15);
    const h = 0.02, out: Strand[] = [], phase = turn();
    const proj = view(-MU, 0, k.x, k.y, turn(), Math.PI / 2 - random() * 0.5, pixels(0.5, 0.75, true));
    const xL = lagrange(1), C1 = xL * xL + (2 * (1 - MU)) / (xL + MU) + (2 * MU) / (1 - MU - xL);
    const thrust = 0.14 + random() * 0.1, r0 = 0.1 + random() * 0.04, v = Math.sqrt((1 - MU) / r0) - r0;
    for (let i = 0; i < 4; i++) {
      const ang = phase + (i * Math.PI) / 2, s = new Float64Array(6), path: number[] = [], times: number[] = [];
      s[0] = -MU + r0 * Math.cos(ang); s[1] = r0 * Math.sin(ang); s[3] = -v * Math.sin(ang); s[4] = v * Math.cos(ang);
      THRUST = thrust;
      try {
        let t = 0, off = 0;
        path.push(s[0], s[1], s[2]); times.push(0);
        while (t < 80) {
          t += step(s, h);
          if (Math.hypot(s[0] + MU, s[1]) > 0.2) {
            path.push(s[0], s[1], s[2]); times.push(t);
          }
          if (THRUST !== 0 && jacobi(s) < C1 - 0.004) {
            THRUST = 0; off = t;
          }
          if (THRUST === 0 && (t - off > 7 || Math.hypot(s[0] - 1 + MU, s[1]) < 0.01 || Math.hypot(s[0], s[1]) > 1.8)) break;
        }
      } finally {
        THRUST = 0;
      }
      out.push(proj({ path, times }));
    }
    return out;
  }

  // T. Hill contours: the zero-velocity curves of the Jacobi integral at a dozen energies, ovals closing
  // around the Moon and the Earth that merge at L1, open at L2 and L3, and shrink to teardrops about L4
  // and L5, each traced along its length from both sides of a crossing of an axis. the Moon sits near a
  // corner, the Earth near the opposite one, and the second placement is left empty
  function hillContours(placement: number): Strand[] {
    if (placement === 1) return [];
    const k = corner(0, 0.1 + random() * 0.1, 0.15 + random() * 0.15);
    const proj = view(1 - MU, 0, k.x, k.y, (cornerIndex & 1 ? Math.PI : 0) + (random() - 0.5) * 0.4, Math.PI / 2 - random() * 0.3, pixels(0.55, 0.7, true));
    const level = (x: number, y: number) => x * x + y * y + (2 * (1 - MU)) / Math.hypot(x + MU, y) + (2 * MU) / Math.hypot(x - 1 + MU, y);
    const grad = (x: number, y: number) => {
      const r1 = Math.hypot(x + MU, y), r2 = Math.hypot(x - 1 + MU, y);
      const k1 = (2 * (1 - MU)) / (r1 * r1 * r1), k2 = (2 * MU) / (r2 * r2 * r2);
      return [2 * x - k1 * (x + MU) - k2 * (x - 1 + MU), 2 * y - k1 * y - k2 * y];
    };
    // one side of a curve from (x0, y0), stepped along the tangent and pulled back onto the level, until
    // it crosses the axis it started from again, comes back to its start, or leaves the drawing
    const half = (c: number, x0: number, y0: number, dir: number, axis: number): number[] => {
      let x = x0, y = y0;
      const pts: number[] = [x, y, 0];
      for (let i = 0; i < 1500; i++) {
        const g = grad(x, y), gn = Math.hypot(g[0], g[1]);
        x += (dir * 0.012 * -g[1]) / gn; y += (dir * 0.012 * g[0]) / gn;
        for (let j = 0; j < 2; j++) {
          const f = level(x, y) - c, q = grad(x, y), qn = q[0] * q[0] + q[1] * q[1];
          x -= (f * q[0]) / qn; y -= (f * q[1]) / qn;
        }
        pts.push(x, y, 0);
        const p = axis === 1 ? y : x - (0.5 - MU);
        if ((i > 3 && p * dir * (axis === 1 ? 1 : -1) < 0) || Math.hypot(x, y) > 2.4) break;
      }
      return pts;
    };
    const strand = (pts: number[]) => {
      const times = pts.filter((_, i) => i % 3 === 0).map((_, i) => i * 0.012);
      return proj({ path: pts, times });
    };
    const xL1 = lagrange(1), c1 = level(xL1, 0), c3 = level(lagrange(3), 0), c4 = level(0.5 - MU, Math.sqrt(3) / 2);
    const levels = [c4 + 0.004, c3 - 0.004, c3 + 0.004, c1 - 0.008, c1 + 0.006, c1 + 0.03, c1 + 0.08, c1 + 0.16, c1 + 0.3, c1 + 0.55, c1 + 0.9];
    const out: Strand[] = [];
    for (const c of levels) {
      // crossings of the x axis, each the root of a sign change, start a curve on each side of the axis
      let prev = level(-2.2, 0) - c;
      for (let x = -2.2 + 0.004; x < 2.2; x += 0.004) {
        const f = level(x, 0) - c;
        if (f > 0 !== prev > 0 && Math.abs(f) < 50) {
          const x0 = x - (0.004 * f) / (f - prev);
          out.push(strand(half(c, x0, 0, 1, 1)), strand(half(c, x0, 0, -1, 1)));
        }
        prev = f;
      }
      // teardrops about the triangular points, on the line through them, from each root in y
      if (c < c3) {
        for (const sign of [1, -1]) {
          let pv = level(0.5 - MU, sign * 0.3) - c;
          for (let y = 0.3 + 0.004; y < 1.6; y += 0.004) {
            const f = level(0.5 - MU, sign * y) - c;
            if (f > 0 !== pv > 0) {
              const y0 = sign * (y - (0.004 * f) / (f - pv));
              out.push(strand(half(c, 0.5 - MU, y0, 1, 0)), strand(half(c, 0.5 - MU, y0, -1, 0)));
            }
            pv = f;
          }
        }
      }
    }
    return out;
  }

  // U. Sun–Earth petals: the Sun–Earth problem at the scale of the Earth's neighborhood, where the
  // Lyapunov orbits about L1 and L2 sit four lunar distances out, and the strands of their unstable tubes
  // that head for the Earth swing around it and out again as petals, the paths of the low-energy lunar
  // transfers. L1 in one placement and L2 in the other, with the Earth near a corner
  function petals(placement: number): Strand[] {
    return system(3.0e-6, 0.012, () => {
      const h = 0.02, k = corner(placement, 0.12 + random() * 0.1, 0.15 + random() * 0.15);
      const n = (placement + cornerIndex) % 2 === 0 ? 1 : 2;
      const proj = view(1 - MU, 0, k.x, k.y, turn(), Math.PI / 2 - random() * 0.5, pixels(11, 17, true));
      const fam = lyapunovFamily(n, [0.0025 + random() * 0.003], h, 0.00015);
      if (fam.length === 0) return [];
      const orbit = fam[0];
      const stop = (q: Float64Array) => {
        const r2 = Math.hypot(q[0] - 1 + MU, q[1]);
        return r2 < 0.00006 || r2 > 0.03;
      };
      const flights = manifold(orbit, h, 18, n === 2, 7, 0.0003, 0.01, stop);
      return [proj(closed(orbit))].concat(flights.map(proj));
    });
  }

  const scenes = [lyapunovNest, neighborhood, manifoldWing, haloShells, centerManifold, transferSheaf, ribbons, rosettes, horseshoes, eights, haloTube, flybyFan, arenstorf, tadpoles, lissajous, tubeLace, nrhoFunnel, copenhagen, whorl, hillContours, petals];

  // the box of the canvas is set in src/styles/global.css to the width of the window and to the large
  // viewport height, which stays put while the browser of a phone hides or shows its toolbar
  function size() {
    const dpr = win.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    narrow = width < 500;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR;
  }

  // lays out one visit: a scene drawn at random, set in a corner drawn at random and, unless the screen
  // is narrow, in the opposite one, with the center manifold in place of a scene that lost a family.
  // the pace is set so that the longest flight of the scene lasts DURATION seconds
  function layout() {
    const pick = Math.floor(random() * scenes.length);
    cornerIndex = Math.floor(random() * 4) | (narrow ? 2 : 0);
    const place = (scene: (placement: number) => Strand[]) => (narrow ? scene(0) : scene(0).concat(scene(1)));
    strands = place(scenes[pick]);
    const segments = strands.reduce((n, s) => n + s.pts.length / 2 - 1, 0);
    if (segments < FEW) strands = place(centerManifold);
    drawn = strands.map(() => 0);
    const longest = strands.reduce((t, s) => Math.max(t, s.times[s.times.length - 1]), 0);
    rate = longest / DURATION;
    started = 0;
  }

  // each frame advances every strand to the spacecraft's time, stroking only the new chords, and the
  // loop ends once the last strand is complete
  function tick(now: number) {
    if (!started) started = now;
    const t = ((now - started) / 1000) * rate;
    let pending = false;
    for (let i = 0; i < strands.length; i++) {
      const { pts, times } = strands[i], count = times.length;
      if (drawn[i] >= count) continue;
      pending = true;
      let to = drawn[i];
      while (to < count && times[to] <= t) to += 1;
      if (to <= Math.max(drawn[i], 1)) continue;
      const from = Math.max(drawn[i], 1);
      ctx.beginPath();
      ctx.moveTo(pts[2 * (from - 1)], pts[2 * (from - 1) + 1]);
      for (let j = from; j < to; j++) ctx.lineTo(pts[2 * j], pts[2 * j + 1]);
      ctx.stroke();
      drawn[i] = to;
    }
    if (pending) running = win.requestAnimationFrame(tick);
  }

  function start() {
    win.cancelAnimationFrame(running);
    size();
    ctx.clearRect(0, 0, width, height);
    layout();
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
