#!/usr/bin/env node
// make_demo_data.mjs, v1, 2026-11-11. Author: Tomaž Berčič.
//
// Generates SYNTHETIC demo data for the NMVPP website prototype (v0.1).
// Nothing produced here is a real capture or a real student result.
// Every file name starts with "demo_" and every record carries demo: true.
// Real data replaces this in v0.2 (reference capture) and v0.3 (scripts/build_manifest.py).
//
// Run: node scripts/make_demo_data.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATE = '2026-11-11';
const PUB = path.join(ROOT, 'public', 'data');

// ---------------------------------------------------------------- helpers
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (r) => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
const r3 = (x) => Math.round(x * 1000) / 1000;
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];

// Layer names follow the course prompt (step 8).
const LAYERS = ['01_FLOORS', '02_WALLS', '03_CEILING', '04_STAIRS', '05_OPENINGS', 'CLUTTER'];
const L = { floor: 0, wall: 1, ceil: 2, stair: 3, open: 4, clutter: 5 };

// A planar rectangle: origin o, unit axes u, v, extents lu, lv, rectangular holes in (u, v).
function S(layer, o, u, v, lu, lv, holes = []) {
  return { layer, o, u, v, lu, lv, holes, n: norm(cross(u, v)) };
}
function box(x0, y0, z0, x1, y1, z1, layer) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  return [
    S(layer, [x0, y0, z1], X, Y, dx, dy),
    S(layer, [x0, y0, z0], X, Z, dx, dz),
    S(layer, [x0, y1, z0], X, Z, dx, dz),
    S(layer, [x0, y0, z0], Y, Z, dy, dz),
    S(layer, [x1, y0, z0], Y, Z, dy, dz),
  ];
}
const area = (s) => s.lu * s.lv - s.holes.reduce((a, h) => a + (h[2] - h[0]) * (h[3] - h[1]), 0);
const inHole = (s, a, b) => s.holes.some((h) => a > h[0] && a < h[2] && b > h[1] && b < h[3]);
const at = (s, a, b) => [
  s.o[0] + s.u[0] * a + s.v[0] * b,
  s.o[1] + s.u[1] * a + s.v[1] * b,
  s.o[2] + s.u[2] * a + s.v[2] * b,
];

// Nearest point on the boundary of the rectangle or of one of its holes, in (u, v).
function nearestEdge(s, a, b) {
  let best = [a, 0], bd = b;
  if (s.lv - b < bd) { bd = s.lv - b; best = [a, s.lv]; }
  if (a < bd) { bd = a; best = [0, b]; }
  if (s.lu - a < bd) { bd = s.lu - a; best = [s.lu, b]; }
  for (const h of s.holes) {
    const ca = Math.min(Math.max(a, h[0]), h[2]);
    const cb = Math.min(Math.max(b, h[1]), h[3]);
    const d = Math.hypot(a - ca, b - cb);
    if (d < bd) { bd = d; best = [ca, cb]; }
  }
  return best;
}

// ---------------------------------------------------------------- scenes
// Generic stair hall, two storeys. Stand-in for the FA staircase until the reference capture exists.
function stairScene() {
  const W = 6, D = 4, H = 6.4, F = 3.2, h = 0.16, t = 0.3;
  const s = [];
  s.push(S(L.floor, [0, 0, 0], X, Y, W, D));
  s.push(S(L.floor, [0, 2.9, F], X, Y, W, D - 2.9));
  s.push(S(L.floor, [0, 0, F], X, Y, 0.8, 2.9));
  s.push(S(L.floor, [3.5, 0, 1.6], X, Y, 1.8, 2.9));
  s.push(S(L.floor, [0.8, 2.9, F - 0.2], X, Z, W - 0.8, 0.2));
  s.push(S(L.ceil, [0.8, 2.9, F - 0.2], X, Y, W - 0.8, D - 2.9));
  s.push(S(L.ceil, [3.5, 0, 1.42], X, Y, 1.8, 2.9));
  s.push(S(L.ceil, [0, 0, H], X, Y, W, D));
  s.push(S(L.wall, [0, 0, 0], X, Z, W, H, [[2.0, 4.0, 4.0, 5.6]]));
  s.push(S(L.wall, [0, D, 0], X, Z, W, H, [[2.0, 0.9, 3.6, 2.4]]));
  s.push(S(L.wall, [0, 0, 0], Y, Z, D, H));
  s.push(S(L.wall, [W, 0, 0], Y, Z, D, H, [[0.5, 0, 1.5, 2.1], [3.0, F, 3.9, F + 2.1]]));
  for (let k = 0; k < 10; k++) {
    s.push(S(L.stair, [0.8 + k * t, 0, k * h], Y, Z, 1.4, h));
    if (k < 9) s.push(S(L.stair, [0.8 + k * t, 0, (k + 1) * h], X, Y, t, 1.4));
    s.push(S(L.stair, [3.5 - k * t, 1.5, 1.6 + k * h], Y, Z, 1.4, h));
    if (k < 9) s.push(S(L.stair, [3.5 - (k + 1) * t, 1.5, 1.6 + (k + 1) * h], X, Y, t, 1.4));
  }
  const su = norm([2.7, 0, -1.44]);
  s.push(S(L.stair, [0.8, 1.5, F - 0.18], su, Y, Math.hypot(2.7, 1.44), 1.4));
  const openings = [
    S(L.open, [2.0, 0, 4.0], X, Z, 2.0, 1.6),
    S(L.open, [2.0, D, 0.9], X, Z, 1.6, 1.5),
    S(L.open, [W, 0.5, 0], Y, Z, 1.0, 2.1),
    S(L.open, [W, 3.0, F], Y, Z, 0.9, 2.1),
  ];
  const clutter = [
    ...box(5.4, 2.0, 0, 5.95, 2.8, 0.45, L.clutter),
    ...box(2.1, 3.85, 0.15, 3.5, 3.95, 0.75, L.clutter),
  ];
  const pipes = [{ c: [5.9, 3.9], r: 0.045, z0: 0, z1: H }];
  const tape = { door_width: 100, ceiling_height: 640, wall_length: 600 };
  return { type: 'stair', W, D, H, surfaces: s, openings, clutter, pipes, tape };
}

// Generic room with columns. Stand-in for a venue in central Ljubljana (phase 2).
function roomScene() {
  const W = 7, D = 5, H = 3.4;
  const s = [];
  s.push(S(L.floor, [0, 0, 0], X, Y, W, D));
  s.push(S(L.ceil, [0, 0, H], X, Y, W, D));
  s.push(S(L.wall, [0, 0, 0], X, Z, W, H, [[1.0, 0, 2.0, 2.2]]));
  s.push(S(L.wall, [0, D, 0], X, Z, W, H, [[0.8, 1.0, 2.2, 2.6], [2.8, 1.0, 4.2, 2.6], [4.8, 1.0, 6.2, 2.6]]));
  s.push(S(L.wall, [0, 0, 0], Y, Z, D, H));
  s.push(S(L.wall, [W, 0, 0], Y, Z, D, H, [[3.6, 0, 4.5, 2.2]]));
  for (const [cx, cy] of [[2.4, 2.5], [4.6, 2.5]]) {
    const r = 0.2;
    s.push(S(L.wall, [cx - r, cy - r, 0], X, Z, 2 * r, H));
    s.push(S(L.wall, [cx - r, cy + r, 0], X, Z, 2 * r, H));
    s.push(S(L.wall, [cx - r, cy - r, 0], Y, Z, 2 * r, H));
    s.push(S(L.wall, [cx + r, cy - r, 0], Y, Z, 2 * r, H));
  }
  const openings = [
    S(L.open, [1.0, 0, 0], X, Z, 1.0, 2.2),
    S(L.open, [0.8, D, 1.0], X, Z, 1.4, 1.6),
    S(L.open, [2.8, D, 1.0], X, Z, 1.4, 1.6),
    S(L.open, [4.8, D, 1.0], X, Z, 1.4, 1.6),
    S(L.open, [W, 3.6, 0], Y, Z, 0.9, 2.2),
  ];
  const clutter = [
    ...box(0.6, 3.2, 0, 2.0, 4.0, 0.75, L.clutter),
    ...box(5.0, 0.6, 0, 6.4, 1.4, 0.75, L.clutter),
    ...box(3.2, 1.0, 0, 3.7, 1.5, 0.45, L.clutter),
  ];
  const tape = { door_width: 100, ceiling_height: 340, wall_length: 700 };
  return { type: 'room', W, D, H, surfaces: s, openings, clutter, pipes: [], tape };
}

// ---------------------------------------------------------------- sampling
// opt: sigma (m), bulge (m), scale, gaps [{c, r}], story (adds scans, targets, reveal order)
function sample(scene, N, seed, opt) {
  const rnd = mulberry32(seed);
  const entries = [
    ...scene.surfaces.map((s, i) => ({ s, i })),
    ...scene.clutter.map((s) => ({ s, i: -1 })),
  ];
  const pipeArea = scene.pipes.reduce((a, p) => a + 2 * Math.PI * p.r * (p.z1 - p.z0), 0);
  const total = entries.reduce((a, e) => a + area(e.s), 0) + pipeArea;

  // reveal order for step 06: floors, walls, ceilings, stairs
  const order = new Array(scene.surfaces.length).fill(0);
  scene.surfaces
    .map((s, i) => ({ i, k: s.layer * 1000 + i }))
    .sort((a, b) => a.k - b.k)
    .forEach((e, rank) => { order[e.i] = Math.min(255, rank + 1); });

  const P = [], T = [], A = [], O = [], DEV = [];
  const cx = scene.W / 2, cy = scene.D / 2, sc = opt.scale || 1;
  const pushPoint = (ideal, nrm, layer, surfIdx, s, a, b) => {
    for (const g of opt.gaps || []) {
      if (Math.hypot(ideal[0] - g.c[0], ideal[1] - g.c[1], ideal[2] - g.c[2]) < g.r) return;
    }
    let e = gauss(rnd) * opt.sigma;
    if (opt.bulge) e += opt.bulge * Math.sin(ideal[0] * 1.3 + 0.4) * Math.cos(ideal[1] * 1.1) * Math.sin(ideal[2] * 0.9 + 1.0);
    const tq = opt.sigma * 0.3;
    let p = [
      ideal[0] + nrm[0] * e + gauss(rnd) * tq,
      ideal[1] + nrm[1] * e + gauss(rnd) * tq,
      ideal[2] + nrm[2] * e + gauss(rnd) * tq,
    ];
    if (sc !== 1) p = [cx + (p[0] - cx) * sc, cy + (p[1] - cy) * sc, p[2] * sc];
    P.push(p[0], p[1], p[2]);
    DEV.push(Math.min(255, Math.round(Math.abs(e) * 1000)));
    let isLine = 0, tgt = ideal;
    if (opt.story) {
      if (layer === L.clutter) {
        tgt = [p[0], p[1], Math.max(0, p[2] - 0.15)];
      } else if (rnd() < (layer === L.stair ? 0.55 : 0.42)) {
        const [ea, eb] = nearestEdge(s, a, b);
        tgt = at(s, ea, eb);
        isLine = 1;
      }
      const z = ideal[2];
      const pA = z < 2.6 ? 0.88 : z < 3.8 ? 0.5 : 0.1;
      const scan = rnd() < pA ? 0 : 1;
      T.push(tgt[0], tgt[1], tgt[2]);
      A.push(scan | (layer << 1) | (isLine << 4));
      O.push(surfIdx >= 0 ? order[surfIdx] : 0);
    }
  };

  for (const { s, i } of entries) {
    const n = Math.round((N * area(s)) / total);
    for (let k = 0; k < n; k++) {
      let a = 0, b = 0, tries = 0;
      do { a = rnd() * s.lu; b = rnd() * s.lv; tries++; } while (inHole(s, a, b) && tries < 30);
      if (tries >= 30) continue;
      pushPoint(at(s, a, b), s.n, s.layer, i, s, a, b);
    }
  }
  for (const p of scene.pipes) {
    const n = Math.round((N * 2 * Math.PI * p.r * (p.z1 - p.z0)) / total);
    for (let k = 0; k < n; k++) {
      const ang = rnd() * Math.PI * 2, z = p.z0 + rnd() * (p.z1 - p.z0);
      const nrm = [Math.cos(ang), Math.sin(ang), 0];
      const ideal = [p.c[0] + nrm[0] * p.r, p.c[1] + nrm[1] * p.r, z];
      const fake = { o: ideal, u: X, v: Y, lu: 0, lv: 0, holes: [] };
      pushPoint(ideal, nrm, L.clutter, -1, fake, 0, 0);
    }
  }
  const maxOrder = order.reduce((m, v) => Math.max(m, v), 0);
  return { P, T, A, O, DEV, count: P.length / 3, maxOrder };
}

const toI16 = (arr) => Int16Array.from(arr, (v) => Math.round(v * 1000));

function bounds(P) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
    if (P[i + k] < mn[k]) mn[k] = P[i + k];
    if (P[i + k] > mx[k]) mx[k] = P[i + k];
  }
  return { min: mn.map(r3), max: mx.map(r3) };
}

function median(a) {
  const s = Float64Array.from(a).sort();
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

function writeBin(file, parts) {
  const total = parts.reduce((a, p) => a + p.byteLength, 0);
  const out = Buffer.alloc(total);
  let off = 0;
  for (const p of parts) { Buffer.from(p.buffer, p.byteOffset, p.byteLength).copy(out, off); off += p.byteLength; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  return total;
}

// ---------------------------------------------------------------- model + plan
function modelJson(scene) {
  const surf = (s) => ({
    layer: LAYERS[s.layer], o: s.o.map(r3), u: s.u.map(r3), v: s.v.map(r3),
    lu: r3(s.lu), lv: r3(s.lv), holes: s.holes.map((h) => h.map(r3)),
  });
  return {
    demo: true,
    note: 'Synthetic generalised model for the v0.1 prototype. Not a student result.',
    scene: scene.type, units: 'm', layers: LAYERS.slice(0, 5),
    surfaces: scene.surfaces.map(surf), openings: scene.openings.map(surf),
  };
}

function planSvg(scene) {
  const m = 80, W = scene.W, D = scene.D;
  const px = (x) => (m + x * 100).toFixed(1);
  const py = (y) => (m + (D - y) * 100).toFixed(1);
  const C = { cut: '#E4E6E1', thin: '#8A8D8F', hid: '#5B5E60', sig: '#FF5A1F' };
  const out = [];
  const ln = (x1, y1, x2, y2, cls, col, w) =>
    out.push(`<path class="ln ${cls}" pathLength="1" d="M${px(x1)} ${py(y1)}L${px(x2)} ${py(y2)}" stroke="${col}" stroke-width="${w}" fill="none"/>`);
  const poly = (pts, cls, col, w, close = false) =>
    out.push(`<path class="ln ${cls}" pathLength="1" d="M${pts.map(([x, y]) => `${px(x)} ${py(y)}`).join('L')}${close ? 'Z' : ''}" stroke="${col}" stroke-width="${w}" fill="none"/>`);
  const arc = (hx, hy, sx, sy, ex, ey, r, sweep) =>
    out.push(`<path class="ln ln-thin" pathLength="1" d="M${px(sx)} ${py(sy)}A${r * 100} ${r * 100} 0 0 ${sweep} ${px(ex)} ${py(ey)}" stroke="${C.thin}" stroke-width="1" fill="none"/>`);
  const txt = (x, y, s, col, anchor = 'middle', rot = 0) =>
    out.push(`<text class="lbl" x="${px(x)}" y="${py(y)}" fill="${col}" font-family="JetBrains Mono, monospace" font-size="16" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${px(x)} ${py(y)})"` : ''}>${s}</text>`);
  const dim = (x1, y1, x2, y2, label, vertical) => {
    ln(x1, y1, x2, y2, 'ln-dim', C.sig, 1);
    for (const [x, y] of [[x1, y1], [x2, y2]]) ln(x - 0.06, y - 0.06, x + 0.06, y + 0.06, 'ln-dim', C.sig, 1.5);
    if (vertical) txt(x1 - 0.12, (y1 + y2) / 2, label, C.sig, 'middle', -90);
    else txt((x1 + x2) / 2, y1 - 0.22, label, C.sig);
  };

  if (scene.type === 'stair') {
    ln(0, 0, 6, 0, 'ln-cut', C.cut, 3);
    ln(0, 4, 2.0, 4, 'ln-cut', C.cut, 3); ln(3.6, 4, 6, 4, 'ln-cut', C.cut, 3);
    ln(2.0, 4, 3.6, 4, 'ln-thin', C.thin, 1); ln(2.0, 3.94, 3.6, 3.94, 'ln-thin', C.thin, 1);
    ln(0, 0, 0, 4, 'ln-cut', C.cut, 3);
    ln(6, 0, 6, 0.5, 'ln-cut', C.cut, 3); ln(6, 1.5, 6, 4, 'ln-cut', C.cut, 3);
    ln(6, 1.5, 5.0, 1.5, 'ln-thin', C.thin, 1); arc(6, 1.5, 5.0, 1.5, 6, 0.5, 1.0, 0);
    for (let k = 0; k <= 6; k++) ln(0.8 + k * 0.3, 0, 0.8 + k * 0.3, 1.4, 'ln-thin', C.thin, 1);
    ln(0.8, 1.4, 2.6, 1.4, 'ln-thin', C.thin, 1);
    poly([[2.55, 0], [2.75, 0.6], [2.6, 0.78], [2.85, 1.4]], 'ln-thin', C.thin, 1);
    poly([[0.95, 0.7], [2.4, 0.7]], 'ln-sig', C.sig, 1.5);
    poly([[2.28, 0.6], [2.42, 0.7], [2.28, 0.8]], 'ln-sig', C.sig, 1.5);
    poly([[0.8, 1.5], [3.5, 1.5], [3.5, 2.9], [0.8, 2.9]], 'ln-hid', C.hid, 1, true);
    for (let k = 1; k < 9; k++) ln(3.5 - k * 0.3, 1.5, 3.5 - k * 0.3, 2.9, 'ln-hid', C.hid, 1);
    poly([[3.5, 0], [5.3, 0], [5.3, 2.9], [3.5, 2.9]], 'ln-hid', C.hid, 1, true);
    ln(0.8, 2.9, 6, 2.9, 'ln-hid', C.hid, 1);
    ln(0.8, 0, 0.8, 1.5, 'ln-hid', C.hid, 1);
    dim(0, -0.45, 6, -0.45, '600', false);
    dim(-0.45, 0, -0.45, 4, '400', true);
  } else {
    ln(0, 0, 1.0, 0, 'ln-cut', C.cut, 3); ln(2.0, 0, 7, 0, 'ln-cut', C.cut, 3);
    ln(1.0, 0, 1.0, 1.0, 'ln-thin', C.thin, 1); arc(1.0, 0, 1.0, 1.0, 2.0, 0, 1.0, 1);
    ln(0, 5, 0.8, 5, 'ln-cut', C.cut, 3); ln(2.2, 5, 2.8, 5, 'ln-cut', C.cut, 3);
    ln(4.2, 5, 4.8, 5, 'ln-cut', C.cut, 3); ln(6.2, 5, 7, 5, 'ln-cut', C.cut, 3);
    for (const [a, b] of [[0.8, 2.2], [2.8, 4.2], [4.8, 6.2]]) {
      ln(a, 5, b, 5, 'ln-thin', C.thin, 1); ln(a, 4.94, b, 4.94, 'ln-thin', C.thin, 1);
    }
    ln(0, 0, 0, 5, 'ln-cut', C.cut, 3);
    ln(7, 0, 7, 3.6, 'ln-cut', C.cut, 3); ln(7, 4.5, 7, 5, 'ln-cut', C.cut, 3);
    ln(7, 3.6, 6.1, 3.6, 'ln-thin', C.thin, 1); arc(7, 3.6, 6.1, 3.6, 7, 4.5, 0.9, 1);
    for (const [cx, cy] of [[2.4, 2.5], [4.6, 2.5]]) {
      poly([[cx - 0.2, cy - 0.2], [cx + 0.2, cy - 0.2], [cx + 0.2, cy + 0.2], [cx - 0.2, cy + 0.2]], 'ln-cut', C.cut, 3, true);
    }
    dim(0, -0.45, 7, -0.45, '700', false);
    dim(-0.45, 0, -0.45, 5, '500', true);
  }
  const vw = W * 100 + 2 * m, vh = D * 100 + 2 * m;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" stroke-linecap="square">\n` +
    `<!-- DEMO: synthetic plan for the v0.1 prototype, section at +1.00 m. Not a student result. -->\n` +
    out.join('\n') + '\n</svg>\n';
}

// ---------------------------------------------------------------- run
const scenes = { stair: stairScene(), room: roomScene() };
const sceneDir = path.join(PUB, 'demo', 'scenes');
fs.mkdirSync(sceneDir, { recursive: true });
for (const [k, sc] of Object.entries(scenes)) {
  fs.writeFileSync(path.join(sceneDir, `demo_${k}_model_v1_${DATE}.json`), JSON.stringify(modelJson(sc)));
  fs.writeFileSync(path.join(sceneDir, `demo_${k}_plan_v1_${DATE}.svg`), planSvg(sc));
}

// Story cloud: two scans of the stair hall, with targets for "points to lines".
{
  const sc = scenes.stair;
  const r = sample(sc, 180000, 7, { sigma: 0.006, story: true });
  const file = path.join(PUB, 'demo', 'story', `demo_story_cloud_v1_${DATE}.bin`);
  const bytes = writeBin(file, [toI16(r.P), toI16(r.T), Uint8Array.from(r.A), Uint8Array.from(r.O)]);
  const meta = {
    demo: true,
    note: 'Synthetic stair hall for the v0.1 prototype. Not the FA reference capture.',
    count: r.count, bytes, units: 'mm (int16)',
    layout: ['pos int16 x3', 'target int16 x3', 'attr uint8 (bit0 scan, bit1-3 layer, bit4 line)', 'order uint8'],
    maxOrder: r.maxOrder, layers: LAYERS,
    bounds: bounds(r.P),
    scanB: { rotDeg: 6, pivot: [sc.W / 2, sc.D / 2, 0], t: [0.42, -0.26, 0.1] },
    model: `data/demo/scenes/demo_stair_model_v1_${DATE}.json`,
    plan: `data/demo/scenes/demo_stair_plan_v1_${DATE}.svg`,
  };
  fs.writeFileSync(path.join(PUB, 'demo', 'story', `demo_story_meta_v1_${DATE}.json`), JSON.stringify(meta, null, 1));
  console.log(`story: ${r.count} points, ${(bytes / 1e6).toFixed(2)} MB`);
}

// Demo students. All anonymous, all values computed from synthetic data, all marked demo.
const FA = { name: 'UL FA, Zoisova 12', lat: 46.0446, lon: 14.5003, type: 'fa' };
const profiles = [
  { id: 's01', scene: 'stair', phase: 1, lidar: true, N: 110000, sigma: 0.005, scale: 1.0015, gaps: [], reached: 7, loc: FA },
  { id: 's02', scene: 'stair', phase: 1, lidar: true, N: 100000, sigma: 0.007, scale: 0.998, gaps: [{ c: [1.0, 3.5, 5.6], r: 1.4 }], reached: 6, loc: FA },
  { id: 's03', scene: 'stair', phase: 1, lidar: false, N: 75000, sigma: 0.014, bulge: 0.022, scale: 1.012, gaps: [{ c: [5.5, 0.4, 5.8], r: 1.2 }, { c: [3.0, 2.0, 6.4], r: 1.6 }], reached: 5, loc: FA },
  { id: 's04', scene: 'stair', phase: 1, lidar: false, N: 65000, sigma: 0.018, bulge: 0.03, scale: 0.991, gaps: [{ c: [0.3, 0.3, 4.5], r: 1.5 }, { c: [6, 4, 1], r: 1.2 }], reached: 3, loc: FA },
  { id: 's05', scene: 'room', phase: 2, lidar: true, N: 90000, sigma: 0.006, scale: 1.003, gaps: [], reached: 6, loc: { name: 'Demo lokacija 01', lat: 46.0514, lon: 14.5060, type: 'venue' } },
  { id: 's06', scene: 'room', phase: 2, lidar: false, N: 70000, sigma: 0.015, bulge: 0.02, scale: 1.009, gaps: [{ c: [6.5, 0.5, 3.0], r: 1.3 }], reached: 4, consentLoc: false, loc: { name: 'Demo lokacija 02', lat: 46.0497, lon: 14.5021, type: 'venue' } },
];

const students = [];
profiles.forEach((pr, idx) => {
  const sc = scenes[pr.scene];
  const r = sample(sc, pr.N, 100 + idx, { sigma: pr.sigma, bulge: pr.bulge || 0, scale: pr.scale, gaps: pr.gaps });
  const rel = `data/${pr.id}/demo_${pr.id}_pointcloud_v1_${DATE}.bin`;
  const consentLoc = pr.consentLoc !== false;
  if (consentLoc) writeBin(path.join(ROOT, 'public', rel), [toI16(r.P), Uint8Array.from(r.DEV)]);
  const devCm = r.DEV.map((d) => d / 10);
  const within = r.DEV.filter((d) => d <= 50).length / r.DEV.length;
  const rnd = mulberry32(500 + idx);
  const meas = Object.entries(sc.tape).map(([element, tape]) => ({
    element, tape_cm: tape,
    cloud_cm: Math.round((tape * pr.scale + gauss(rnd) * (pr.lidar ? 0.3 : 0.8)) * 10) / 10,
  }));
  const wall = meas.find((m) => m.element === 'wall_length');
  const num = String(idx + 1).padStart(2, '0');
  students.push({
    id: pr.id,
    demo: true,
    display_name: `Študent ${num}`,
    consent_name: false,
    avatar_seed: `demo-${pr.id}`,
    phase: pr.phase,
    status: 'in_progress',
    reached_step: pr.reached,
    scene: pr.scene,
    location: pr.loc,
    consent_location_publication: consentLoc,
    devices: [pr.lidar ? 'demo: telefon z LiDAR-jem' : 'demo: telefon brez LiDAR-ja'],
    lidar: pr.lidar,
    apps: [pr.lidar ? 'Scaniverse' : 'demo: fotogrametrija'],
    ai_models: [
      { name: 'Model A (demo)', reached_step: pr.reached },
      { name: 'Model B (demo)', reached_step: Math.max(1, pr.reached - 3) },
    ],
    metrics: {
      points: r.count,
      median_dev_cm: Math.round(median(devCm) * 10) / 10,
      within_5cm_pct: Math.round(within * 1000) / 10,
      scale_err_cm: Math.round((wall.cloud_cm - wall.tape_cm) * 10) / 10,
    },
    measurements: meas,
    files: {
      pointcloud: consentLoc ? rel : null,
      pointcloud_count: consentLoc ? r.count : 0,
      splat: null,
      mesh: null,
      model_glb: null,
      model_json: `data/demo/scenes/demo_${pr.scene}_model_v1_${DATE}.json`,
      plan_svg: `data/demo/scenes/demo_${pr.scene}_plan_v1_${DATE}.svg`,
      sheets: Array.from({ length: 6 }, (_, w) => ({ week: w + 1, file: null })),
      downloads: ['DXF', 'PDF', 'OBJ', '3DM'].map((type) => ({ type, file: null })),
    },
    worklog: [{ date: '[vnesi]', text_sl: '[vnesi]', text_en: '[vnesi]' }],
    exhibition: { selected: null, print: null },
    text_sl: '[vnesi] Kratek opis zajema, poskusov in modela.',
    text_en: '[vnesi] Short description of the capture, attempts and model.',
  });
  console.log(`${pr.id}: ${r.count} points, median ${median(devCm).toFixed(1)} cm, within 5 cm ${(within * 100).toFixed(1)} %`);
});

fs.mkdirSync(path.join(ROOT, 'content'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'content', 'students.json'),
  JSON.stringify({ demo: true, generated: DATE, note: 'Demo records from scripts/make_demo_data.mjs. Replaced by scripts/build_manifest.py in v0.3.', students }, null, 1),
);
console.log('content/students.json written');
