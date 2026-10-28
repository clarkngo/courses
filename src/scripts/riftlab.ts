// Shared helpers for the Rift Analytics interactive labs: seeded random data,
// small statistics routines, and a dependency-free SVG chart renderer.

// ── Lifecycle ─────────────────────────────────────────────────────────────

/** Run `init` once per matching element on every page load (view transitions included). */
export function onLab(name: string, init: (root: HTMLElement) => void) {
  const run = () => {
    document.querySelectorAll<HTMLElement>(`[data-rl="${name}"]`).forEach((root) => {
      if (root.dataset.rlReady) return;
      root.dataset.rlReady = 'true';
      init(root);
    });
  };
  document.addEventListener('astro:page-load', run);
}

/** Read every `[data-in]` control into a record and keep `[data-out]` labels in sync. */
export function bindInputs(root: HTMLElement, render: (v: Record<string, number>) => void) {
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-in]'));
  const read = () => {
    const v: Record<string, number> = {};
    inputs.forEach((el) => {
      const key = el.dataset.in!;
      v[key] = Number(el.value);
      const out = root.querySelector<HTMLElement>(`[data-out="${key}"]`);
      if (out) out.textContent = el.dataset.fmt === 'pct' ? `${Math.round(Number(el.value) * 100)}%` : el.value;
    });
    return v;
  };
  const update = () => render(read());
  inputs.forEach((el) => el.addEventListener('input', update));
  update();
  return update;
}

export function setText(root: HTMLElement, key: string, text: string) {
  const el = root.querySelector<HTMLElement>(`[data-stat="${key}"]`);
  if (el) el.textContent = text;
}

export const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');
export const pct = (x: number, d = 1) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—');

// ── Random numbers ────────────────────────────────────────────────────────

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randn(r: () => number) {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

// ── Descriptive statistics ────────────────────────────────────────────────

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : NaN);

export function quantile(xs: number[], q: number) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const median = (xs: number[]) => quantile(xs, 0.5);

/** Sample variance (n − 1 denominator). */
export function variance(xs: number[]) {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1);
}

export const sd = (xs: number[]) => Math.sqrt(variance(xs));

/** Most frequent value(s) after rounding to `bin`. */
export function modes(xs: number[], bin = 1) {
  const counts = new Map<number, number>();
  xs.forEach((x) => {
    const k = Math.round(x / bin) * bin;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const top = Math.max(...counts.values());
  if (top <= 1) return { values: [] as number[], count: top };
  return { values: [...counts].filter(([, c]) => c === top).map(([k]) => k).sort((a, b) => a - b), count: top };
}

// ── Distributions ─────────────────────────────────────────────────────────

function logGamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

export function binomPmf(k: number, n: number, p: number) {
  if (k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  const lc = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  return Math.exp(lc + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

export function normCdf(z: number) {
  // Abramowitz–Stegun 7.1.26 erf approximation (max error ~1.5e-7).
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Inverse standard normal CDF (Acklam's rational approximation). */
export function normInv(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) return -normInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ── Linear algebra & models ───────────────────────────────────────────────

export const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
export const norm = (a: number[]) => Math.sqrt(dot(a, a));
export const cosine = (a: number[], b: number[]) => dot(a, b) / (norm(a) * norm(b) || 1);

/** Solve A x = b by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Ordinary least squares with an intercept. Returns [b0, b1, ...] or null. */
export function ols(X: number[][], y: number[]) {
  const rows = X.map((r) => [1, ...r]);
  const p = rows[0].length;
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => sum(rows.map((r) => r[i] * r[j]))));
  const Xty = Array.from({ length: p }, (_, i) => sum(rows.map((r, k) => r[i] * y[k])));
  return solve(XtX, Xty);
}

export const predictLinear = (beta: number[], x: number[]) => beta[0] + dot(beta.slice(1), x);

export function rSquared(y: number[], yhat: number[]) {
  const m = mean(y);
  const ssTot = sum(y.map((v) => (v - m) ** 2));
  const ssRes = sum(y.map((v, i) => (v - yhat[i]) ** 2));
  return 1 - ssRes / ssTot;
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

// ── SVG charts ────────────────────────────────────────────────────────────

export interface ChartSpec {
  xMin: number; xMax: number; yMin: number; yMax: number;
  xLabel?: string; yLabel?: string;
  width?: number; height?: number;
  xFmt?: (v: number) => string; yFmt?: (v: number) => string;
  lines?: { pts: [number, number][]; cls?: string; dash?: boolean }[];
  points?: { x: number; y: number; cls?: string; r?: number; title?: string }[];
  bars?: { x0: number; x1: number; y: number; cls?: string }[];
  segments?: { x1: number; y1: number; x2: number; y2: number; cls?: string; dash?: boolean }[];
  vlines?: { x: number; cls?: string; label?: string }[];
  hlines?: { y: number; cls?: string; label?: string }[];
  areas?: { pts: [number, number][]; cls?: string }[];
}

export function niceTicks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 0.5) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) ticks.push(+t.toFixed(10));
  return ticks;
}

const NS = 'http://www.w3.org/2000/svg';
function el(tag: string, attrs: Record<string, string | number>, text?: string) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}

const defaultFmt = (v: number) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toFixed(2)}`);

export function chart(svg: SVGSVGElement, s: ChartSpec) {
  const W = s.width ?? 560;
  const H = s.height ?? 280;
  const m = { l: 52, r: 14, t: 12, b: 40 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const sx = (x: number) => m.l + ((x - s.xMin) / (s.xMax - s.xMin || 1)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - s.yMin) / (s.yMax - s.yMin || 1)) * (H - m.t - m.b);
  const clipX = (x: number) => Math.max(m.l, Math.min(W - m.r, x));
  const clipY = (y: number) => Math.max(m.t, Math.min(H - m.b, y));
  const xf = s.xFmt ?? defaultFmt;
  const yf = s.yFmt ?? defaultFmt;

  const grid = el('g', { class: 'rl-grid' });
  niceTicks(s.yMin, s.yMax).forEach((t) => {
    grid.append(el('line', { x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t) }));
    grid.append(el('text', { x: m.l - 6, y: sy(t) + 4, 'text-anchor': 'end' }, yf(t)));
  });
  niceTicks(s.xMin, s.xMax, 6).forEach((t) => {
    grid.append(el('line', { x1: sx(t), x2: sx(t), y1: m.t, y2: H - m.b, class: 'rl-grid-v' }));
    grid.append(el('text', { x: sx(t), y: H - m.b + 16, 'text-anchor': 'middle' }, xf(t)));
  });
  svg.append(grid);
  svg.append(el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'rl-axis' }));
  svg.append(el('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: 'rl-axis' }));
  if (s.xLabel) svg.append(el('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'rl-label' }, s.xLabel));
  if (s.yLabel) svg.append(el('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'rl-label', transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})` }, s.yLabel));

  s.areas?.forEach((a) => {
    const d = a.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x)},${clipY(sy(y))}`).join('');
    svg.append(el('path', { d: `${d}Z`, class: `rl-area ${a.cls ?? 'c1'}` }));
  });
  s.bars?.forEach((b) => {
    const x = sx(b.x0);
    const w = Math.max(1, sx(b.x1) - x - 1);
    const y = clipY(sy(b.y));
    svg.append(el('rect', { x, y, width: w, height: Math.max(0, sy(Math.max(s.yMin, 0)) - y), class: `rl-bar ${b.cls ?? 'c1'}` }));
  });
  s.lines?.forEach((l) => {
    const d = l.pts.filter(([, y]) => Number.isFinite(y)).map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x)},${clipY(sy(y))}`).join('');
    svg.append(el('path', { d, class: `rl-line ${l.cls ?? 'c1'}${l.dash ? ' dash' : ''}` }));
  });
  s.segments?.forEach((g) => {
    svg.append(el('line', { x1: clipX(sx(g.x1)), y1: clipY(sy(g.y1)), x2: clipX(sx(g.x2)), y2: clipY(sy(g.y2)), class: `rl-line ${g.cls ?? 'c1'}${g.dash ? ' dash' : ''}` }));
  });
  s.vlines?.forEach((v) => {
    svg.append(el('line', { x1: sx(v.x), x2: sx(v.x), y1: m.t, y2: H - m.b, class: `rl-ref ${v.cls ?? ''}` }));
    if (v.label) svg.append(el('text', { x: sx(v.x) + 4, y: m.t + 12, class: 'rl-ref-label' }, v.label));
  });
  s.hlines?.forEach((h) => {
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: sy(h.y), y2: sy(h.y), class: `rl-ref ${h.cls ?? ''}` }));
    if (h.label) svg.append(el('text', { x: W - m.r - 4, y: sy(h.y) - 4, 'text-anchor': 'end', class: 'rl-ref-label' }, h.label));
  });
  s.points?.forEach((p) => {
    const c = el('circle', { cx: sx(p.x), cy: clipY(sy(p.y)), r: p.r ?? 3.5, class: `rl-pt ${p.cls ?? 'c1'}` });
    if (p.title) c.append(el('title', {}, p.title));
    svg.append(c);
  });

  return {
    invert(clientX: number, clientY: number) {
      const box = svg.getBoundingClientRect();
      const px = ((clientX - box.left) / box.width) * W;
      const py = ((clientY - box.top) / box.height) * H;
      return {
        x: s.xMin + ((px - m.l) / (W - m.l - m.r)) * (s.xMax - s.xMin),
        y: s.yMin + ((H - m.b - py) / (H - m.t - m.b)) * (s.yMax - s.yMin),
      };
    },
  };
}

export const range = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

// ── Teaching dataset ──────────────────────────────────────────────────────
// Ratings and stats are illustrative teaching values chosen to make the math
// readable, not official game data. Real numbers change every patch.

export const ATTRS = ['Engage', 'Burst', 'Poke', 'Sustain', 'CC', 'Scaling'] as const;

export interface Champ { name: string; role: string; v: number[]; hp: number; armor: number; mr: number }

export const CHAMPS: Champ[] = [
  { name: 'Malphite', role: 'Top', v: [9, 6, 2, 3, 8, 5], hp: 2300, armor: 140, mr: 60 },
  { name: 'Garen', role: 'Top', v: [5, 6, 1, 7, 3, 5], hp: 2100, armor: 100, mr: 55 },
  { name: 'Amumu', role: 'Jungle', v: [8, 4, 1, 3, 9, 5], hp: 2250, armor: 110, mr: 65 },
  { name: 'Master Yi', role: 'Jungle', v: [4, 8, 0, 6, 1, 9], hp: 1850, armor: 80, mr: 45 },
  { name: 'Ahri', role: 'Mid', v: [5, 8, 5, 3, 6, 6], hp: 1600, armor: 60, mr: 45 },
  { name: 'Yasuo', role: 'Mid', v: [6, 7, 2, 3, 5, 8], hp: 1800, armor: 75, mr: 45 },
  { name: 'Orianna', role: 'Mid', v: [5, 7, 6, 2, 7, 8], hp: 1550, armor: 60, mr: 40 },
  { name: 'Lux', role: 'Mid', v: [2, 8, 9, 1, 7, 6], hp: 1500, armor: 55, mr: 40 },
  { name: 'Jinx', role: 'Duo', v: [0, 6, 5, 1, 3, 10], hp: 1600, armor: 60, mr: 40 },
  { name: 'Ezreal', role: 'Duo', v: [1, 6, 9, 2, 2, 8], hp: 1550, armor: 60, mr: 40 },
  { name: 'Leona', role: 'Support', v: [9, 3, 1, 4, 9, 3], hp: 2200, armor: 120, mr: 70 },
  { name: 'Soraka', role: 'Support', v: [0, 1, 4, 10, 4, 6], hp: 1500, armor: 55, mr: 40 },
];

export const ARCHETYPES = [
  { name: 'Dive', v: [9, 8, 1, 3, 7, 5] },
  { name: 'Poke & siege', v: [2, 6, 10, 2, 4, 6] },
  { name: 'Protect the carry', v: [3, 4, 3, 9, 7, 9] },
];

export function champOptions(select: HTMLSelectElement, selected: string) {
  select.replaceChildren(...CHAMPS.map((c) => new Option(`${c.name} (${c.role})`, c.name, false, c.name === selected)));
}

export const champ = (name: string) => CHAMPS.find((c) => c.name === name) ?? CHAMPS[0];

export interface Match {
  g10: number; kd10: number; dragons: number; towers: number; barons: number;
  skins: number; g20: number; win: number;
}

/** Simulated matches with a hidden "team strength" that drives every stat, so features correlate the way real ones do. */
export function simulateMatches(seed: number, n: number): Match[] {
  const r = rng(seed);
  const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
  return Array.from({ length: n }, () => {
    const s = randn(r);
    const g10 = Math.round(1500 * (0.6 * s + 0.8 * randn(r)));
    const kd10 = clamp(Math.round(g10 / 650 + randn(r) * 1.3), -6, 6);
    const dragons = clamp(Math.round(1.1 * s + randn(r) * 0.9), -4, 4);
    const towers = clamp(Math.round(2.3 * s + randn(r) * 1.4), -7, 7);
    const barons = clamp(Math.round(0.7 * s + randn(r) * 0.6), -2, 2);
    const skins = Math.floor(r() * 25);
    const g20 = Math.round(1.6 * g10 + 350 * kd10 + 900 * dragons + randn(r) * 2200);
    const win = r() < sigmoid(0.55 * towers + 0.45 * dragons + 1.1 * barons + 0.2 * randn(r)) ? 1 : 0;
    return { g10, kd10, dragons, towers, barons, skins, g20, win };
  });
}
