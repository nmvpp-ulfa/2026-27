// "/" Workflow story: one continuous 3D scene driven by scroll through steps 01 to 09.
// Every step has its own scene state. The camera keeps moving, follows the pointer and can be dragged.
// Motion can be switched off in the header: the story then shows one still state per step.
import '../styles/base.css';
import '../styles/story.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { courseBlock, mountChrome } from '../lib/chrome';
import { lang, num, onLang, t } from '../lib/i18n';
import { motionOn, onMotion } from '../lib/motion';
import { course, rich, steps, students, url } from '../lib/data';
import { cardHtml } from '../lib/cards';
import { fetchJson, loadStoryCloud, storyMaterial, type StoryMeta } from '../three/cloud';
import { buildModel, setModelExplode, setModelOpacity, setModelTint, LAYER_TINT, type ModelJson } from '../three/model';

gsap.registerPlugin(ScrollTrigger);
mountChrome('story');

let anim = motionOn();
const mobile = matchMedia('(max-width: 760px)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
// Reference capture by the course holder: staircase to the WC, two LiDAR scans and the generalised model.
const META = 'data/story/story_tb_meta_v1_2026-11-14.json';
const BIN = 'data/story/story_tb_cloud_v1_2026-11-14.bin';
// still state shown per step when motion is off
const REP = [0.62, 1.62, 2.96, 3.62, 4.8, 5.9, 6.96, 7.5, 8.7];

const storyEl = document.getElementById('story')!;
const rail = document.createElement('nav');
rail.className = 'rail';
const legend = document.createElement('div');
legend.className = 'scene-legend';
const labelsEl = document.createElement('div');
labelsEl.className = 'scene-labels';
document.body.append(rail, legend, labelsEl);
let planSvg = '';

// ---------------------------------------------------------------- markup
function stepCard(st: any, i: number) {
  const L = st[lang()] ?? st.sl;
  const extra: string[] = [];
  if (L.kv) extra.push(`<dl class="kv">${L.kv.map(([k, v]: string[]) => `<dt>${rich(k)}</dt><dd>${rich(v)}</dd>`).join('')}</dl>`);
  if (L.table) {
    extra.push(`<table class="tbl step-tbl"><thead><tr>${L.table.head.map((h: string, j: number) => `<th${j ? ' class="num"' : ''}>${h}</th>`).join('')}</tr></thead>
      <tbody>${L.table.rows.map((r: string[]) => `<tr>${r.map((c, j) => `<td${j ? ' class="num"' : ''}>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
  }
  if (L.list) extra.push(`<div class="step-list"><div class="label">${L.list_title}</div><ol>${L.list.map((x: string) => `<li>${rich(x)}</li>`).join('')}</ol></div>`);
  if (st.id === 'generalise') extra.push(`<figure class="plan"><div class="plan-svg">${planSvg}</div><figcaption class="label">${t('step.plan')}</figcaption></figure>`);
  const anchor = st.anchor?.[lang()] ?? '';
  return `<section class="step${st.live ? ' is-live' : ''}" id="k${st.n}" data-i="${i}">
    <div class="wrap"><article class="step-card">
      <header class="step-head">
        <span class="step-num" aria-hidden="true">${st.n}</span>
        <div class="step-tags">
          <span class="label">${t('step.label')}_${st.n} / 09</span>
          <span class="badge${st.live ? ' badge--demo' : ''}">${st.live ? t('step.live') : t('step.soon')}</span>
        </div>
      </header>
      <h2>${L.title}</h2>
      <p class="step-text">${rich(L.text)}</p>
      ${extra.join('')}
      <dl class="kv step-meta">
        <dt>${t('step.tools')}</dt><dd>${rich(L.tools)}</dd>
        <dt>${t('step.time')}</dt><dd>${rich(L.time)}</dd>
        <dt>${t('step.fail')}</dt><dd>${rich(L.fail)}</dd>
      </dl>
      <div class="step-anchor"><span class="label">Index_Code: K${st.n}</span><span class="v">${rich(anchor)}</span></div>
    </article></div>
  </section>`;
}

const words = (s: string) => s.split(' ').map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');

function renderStory() {
  const I = steps.intro[lang()];
  storyEl.innerHTML = `
  <section class="hero" id="top">
    <div class="wrap hero-in">
      <div class="hero-top"><span class="label">${t('hero.kicker')}</span><span class="badge badge--demo">${t('ref.tag')} // ${t('hero.scene')}</span></div>
      <p class="hero-course">${course.name[lang()]}</p>
      <h1 class="mega">${words(t('hero.title'))}</h1>
      <div class="hero-cols">
        <div class="hero-left">
          <p class="lead">${t('hero.lead')}</p>
          ${courseBlock('hero-course-block')}
        </div>
        <div class="intro-card">
          <div class="label label--signal">00 // ${I.title}</div>
          <p>${rich(I.text)}</p>
          <dl class="kv">${I.kv.map(([k, v]: string[]) => `<dt>${k}</dt><dd>${rich(v)}</dd>`).join('')}</dl>
        </div>
      </div>
      <a class="label scroll-cue" href="#k01">${t('hero.scroll')} <i aria-hidden="true">↓</i></a>
    </div>
  </section>
  ${steps.steps.map(stepCard).join('')}
  <section class="work" id="dela">
    <div class="wrap">
      <div class="sec-head">
        <span class="label"><b>10</b> // ${t('nav.atlas')}</span>
        <h2>${t('work.title')}</h2>
        <p class="lead-sm">${t('work.lead')}</p>
      </div>
      <div class="grid-cards">${students.map(cardHtml).join('')}</div>
      <div class="work-links">
        <a class="btn" href="${url('explore/')}">${t('work.atlas')}</a>
        <a class="btn btn--ghost" href="${url('compare/')}">${t('work.compare')}</a>
        <span class="btn btn--ghost is-disabled" aria-disabled="true">${t('work.exhibition')} · v0.3</span>
      </div>
    </div>
  </section>`;
  rail.setAttribute('aria-label', t('step.label'));
  rail.innerHTML = steps.steps.map((st: any) => `<a href="#k${st.n}" class="${st.live ? 'live' : ''}">${st.n}</a>`).join('');
  rail.querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href')!)?.scrollIntoView({ behavior: anim ? 'smooth' : 'auto' });
  }));
  observeSteps();
}

// step cards slide in when their section enters the middle of the screen
let io: IntersectionObserver | null = null;
function observeSteps() {
  io?.disconnect();
  io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('in', e.isIntersecting);
  }, { rootMargin: '-18% 0px -18% 0px' });
  storyEl.querySelectorAll('.step').forEach((el) => io!.observe(el));
}

// ---------------------------------------------------------------- scroll position -> s
// s = -1 at the hero, i at the start of step i+1, 9 at the student work section.
let marks: number[] = [];
let sTarget = -1, sView = -1;
function measure() {
  const secs = [storyEl.querySelector('.hero'), ...storyEl.querySelectorAll('.step'), storyEl.querySelector('.work')] as HTMLElement[];
  marks = secs.map((el) => el.getBoundingClientRect().top + window.scrollY);
}
function sFromScroll() {
  if (!marks.length) return -1;
  const y = window.scrollY + window.innerHeight * 0.45;
  if (y <= marks[0]) return -1;
  for (let i = 0; i < marks.length - 1; i++) {
    if (y < marks[i + 1]) return i - 1 + (y - marks[i]) / (marks[i + 1] - marks[i]);
  }
  return 9;
}

document.body.classList.add('js-anim');
renderStory();
measure();
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: () => { sTarget = sFromScroll(); },
  onRefresh: () => { measure(); sTarget = sFromScroll(); },
});
onLang(() => { renderStory(); measure(); ScrollTrigger.refresh(); drawPlan(lastPlan, true); lastLegend = ''; });
onMotion((v) => { anim = v; });

// ---------------------------------------------------------------- scene
const canvas = document.getElementById('scene') as HTMLCanvasElement;
let renderer: THREE.WebGLRenderer | null = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  document.body.classList.add('no-webgl');
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
camera.up.set(0, 0, 1);

// ground grid, 1 m
{
  const g: number[] = [];
  for (let x = -6; x <= 12; x++) g.push(x, -6, 0, x, 10, 0);
  for (let y = -6; y <= 10; y++) g.push(-6, y, 0, 12, y, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g, 3));
  scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#1A1B1D' })));
}

type Key = { s: number; p: [number, number, number]; t: [number, number, number] };
const KEYS: Key[] = [
  { s: -1, p: [14, -11, 10], t: [3, 2, 3.0] },
  { s: 0, p: [12, -8.5, 8.2], t: [3, 2, 3.0] },
  { s: 1, p: [10, -7.5, 6.8], t: [3, 2, 2.8] },
  { s: 2, p: [6, -9, 6.4], t: [3, 2, 2.6] },
  { s: 3, p: [1, -8.5, 6.0], t: [3, 2, 2.6] },
  { s: 4, p: [-3, -6.5, 5.6], t: [3, 2, 2.4] },
  { s: 5, p: [9.2, -5.6, 4.2], t: [3, 2, 1.8] },
  { s: 6, p: [8.5, -6.5, 7.2], t: [3, 2, 1.8] },
  { s: 6.62, p: [3.0, -0.6, 14.5], t: [3, 2, 1.0] },
  { s: 7, p: [11, -10, 10.5], t: [3, 2, 3.6] },
  { s: 7.5, p: [11.5, -12, 11], t: [3, 2, 4.8] },
  { s: 8, p: [-6, -8.5, 8.6], t: [3, 2, 2.8] },
  { s: 9, p: [-7, 6.5, 9.0], t: [3, 2, 2.8] },
];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const sm = (a: number, b: number, x: number) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = THREE.MathUtils.lerp;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// camera movement on top of the keyframes: auto orbit, drag, pointer parallax
let orbit = 0;
let userYaw = 0, userPitch = 0, yawVel = 0, pitchVel = 0, lastUser = -1e9;
let dragging = false, dragId = -1, lx = 0, ly = 0;
const mouse = { x: 9, y: 9, on: 0, sx: 0, sy: 0 };
let hoverOn = 0;

const vA = new THREE.Vector3(), vB = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3(), tgt = new THREE.Vector3(), off = new THREE.Vector3();
function cameraAt(s: number) {
  let i = 0;
  while (i < KEYS.length - 2 && s > KEYS[i + 1].s) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const f = sm(a.s, b.s, s);
  vA.set(...a.p); vB.set(...b.p); tA.set(...a.t); tB.set(...b.t);
  camera.position.lerpVectors(vA, vB, f);
  tgt.lerpVectors(tA, tB, f);
  if (mobile) camera.position.sub(tgt).multiplyScalar(1.3).add(tgt);
  off.copy(camera.position).sub(tgt);
  const r = off.length();
  const az = Math.atan2(off.y, off.x) + orbit + userYaw + mouse.sx * 0.14;
  const el = clamp(Math.asin(off.z / r) + userPitch - mouse.sy * 0.07, -0.05, 1.5);
  camera.position.set(tgt.x + r * Math.cos(el) * Math.cos(az), tgt.y + r * Math.cos(el) * Math.sin(az), tgt.z + r * Math.sin(el));
  camera.lookAt(tgt);
  camera.updateMatrixWorld();
}

const NO_DRAG = 'a,button,input,select,textarea,label,.step-card,.intro-card,.hdr,.work,.rail,.demo-bar,.ftr';
window.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || (e.target as HTMLElement).closest(NO_DRAG)) return;
  dragging = true; dragId = e.pointerId; lx = e.clientX; ly = e.clientY;
  yawVel = pitchVel = 0;
  document.body.classList.add('is-dragging');
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch') { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -((e.clientY / innerHeight) * 2 - 1); mouse.on = 1; }
  if (!dragging || e.pointerId !== dragId) return;
  const dx = e.clientX - lx, dy = e.clientY - ly;
  lx = e.clientX; ly = e.clientY;
  userYaw -= dx * 0.0065; userPitch = clamp(userPitch + dy * 0.004, -0.6, 0.7);
  yawVel = -dx * 0.0065 * 60; pitchVel = dy * 0.004 * 60;
  lastUser = performance.now();
});
const endDrag = (e: PointerEvent) => { if (e.pointerId === dragId) { dragging = false; document.body.classList.remove('is-dragging'); lastUser = performance.now(); } };
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
document.documentElement.addEventListener('pointerleave', () => { mouse.on = 0; });

// ---------------------------------------------------------------- objects
let mat: THREE.ShaderMaterial | null = null;
let model: THREE.Group | null = null;
let meta: StoryMeta | null = null;
const sliceMat = new THREE.LineBasicMaterial({ color: '#FF5A1F', transparent: true, opacity: 0 });
const slices = new THREE.Group();
scene.add(slices);

// step 01: scanner positions (scan A below, scan B on the gallery)
const SCAN_A = new THREE.Vector3(4.8, 3.3, 1.3), SCAN_B = new THREE.Vector3(3.0, 3.5, 4.6); // replaced by meta.scene
const tiltFrame = new THREE.Group(), bFrame = new THREE.Group();
tiltFrame.matrixAutoUpdate = false; bFrame.matrixAutoUpdate = false;
scene.add(tiltFrame); tiltFrame.add(bFrame);
const scannerMats: THREE.LineBasicMaterial[] = [];
const rings: THREE.LineLoop[] = [];
function scanner(p: THREE.Vector3, color: string, parent: THREE.Object3D) {
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthTest: false });
  scannerMats.push(m);
  const g = new THREE.Group();
  g.position.copy(p);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.14)), m));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.14), new THREE.Vector3(0, 0, -p.z + (p.z > 3 ? 3.2 : 0))]), m));
  const circle = Array.from({ length: 49 }, (_, k) => new THREE.Vector3(Math.cos((k / 48) * Math.PI * 2), Math.sin((k / 48) * Math.PI * 2), 0));
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle), m);
  rings.push(ring);
  g.add(ring);
  parent.add(g);
}

// step 04: camera positions from the video (SfM), along a walk up the stairs
const PATH = [[0.2, 0.7, 1.5], [0.8, 0.7, 1.5], [3.5, 0.7, 3.1], [4.4, 0.7, 3.1], [4.4, 2.2, 3.1], [3.5, 2.2, 3.1], [0.8, 2.2, 4.7], [0.4, 3.4, 4.7], [3.0, 3.5, 4.7], [5.5, 3.4, 4.7]]
  .map(([x, y, z]) => new THREE.Vector3(x, y, z));
let pathCurve = new THREE.CatmullRomCurve3(PATH, false, 'centripetal');
const N_FR = 22;
const frMat = new THREE.LineBasicMaterial({ color: '#FF5A1F', transparent: true, opacity: 0, depthTest: false });
const pathMat = new THREE.LineBasicMaterial({ color: '#E4E6E1', transparent: true, opacity: 0, depthTest: false });
function frustumGeo() {
  const v: number[] = [];
  for (let k = 0; k < N_FR; k++) {
    const u = k / (N_FR - 1);
    const p = pathCurve.getPointAt(u);
    const d = pathCurve.getTangentAt(u); d.z = 0; d.normalize();
    // look sideways at the walls, alternating, slightly down
    const side = new THREE.Vector3(-d.y, d.x, 0).multiplyScalar(k % 2 ? 1 : -1);
    const dir = d.clone().multiplyScalar(0.5).add(side).normalize(); dir.z = -0.25; dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    const c = p.clone().addScaledVector(dir, 0.36);
    const cs = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => c.clone().addScaledVector(right, a * 0.17).addScaledVector(up, b * 0.11));
    for (let j = 0; j < 4; j++) {
      v.push(p.x, p.y, p.z, cs[j].x, cs[j].y, cs[j].z);
      const n = cs[(j + 1) % 4];
      v.push(cs[j].x, cs[j].y, cs[j].z, n.x, n.y, n.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}
const frustums = new THREE.LineSegments(frustumGeo(), frMat);
frustums.renderOrder = 5;
const pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathCurve.getSpacedPoints(240)), pathMat);
pathLine.renderOrder = 5;
scene.add(frustums, pathLine);

// step 05: check dimensions of the demo model (door width, clear height under the gallery, wall length)
type Dim = { a: THREE.Vector3; b: THREE.Vector3; tick: THREE.Vector3; key: string; line: THREE.LineSegments; el: HTMLElement };
const dimMat = new THREE.LineBasicMaterial({ color: '#FF5A1F', transparent: true, opacity: 0, depthTest: false });
const dims: Dim[] = [
  { a: [5.95, 0.5, 2.3], b: [5.95, 1.5, 2.3], tick: [0, 0, 0.12], key: 'door' },
  { a: [5.4, 3.5, 0.0], b: [5.4, 3.5, 3.0], tick: [0.12, 0, 0], key: 'height' },
  { a: [0.0, -0.3, 0.0], b: [6.0, -0.3, 0.0], tick: [0, 0.12, 0], key: 'wall' },
].map((d) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(18), 3));
  const line = new THREE.LineSegments(g, dimMat);
  line.renderOrder = 6;
  scene.add(line);
  const el = document.createElement('div');
  el.className = 'slabel';
  labelsEl.appendChild(el);
  return { a: new THREE.Vector3(...(d.a as [number, number, number])), b: new THREE.Vector3(...(d.b as [number, number, number])), tick: new THREE.Vector3(...(d.tick as [number, number, number])), key: d.key, line, el };
});
const DIM_NAME: Record<string, [string, string]> = { door: ['Vrata', 'Door'], height: ['Svetla višina', 'Clear height'], wall: ['Stena', 'Wall'], level: ['Med etažama', 'Floor to floor'] };

function resize() {
  if (!renderer) return;
  const pr = Math.min(window.devicePixelRatio, mobile ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (mat) { mat.uniforms.uScale.value = window.innerHeight * pr * 0.5; mat.uniforms.uAspect.value = camera.aspect; }
}
window.addEventListener('resize', () => { resize(); measure(); });
resize();

// ---------------------------------------------------------------- plan drawing (step 07)
let lastPlan = -1;
function drawPlan(p: number, force = false) {
  if (!force && Math.abs(p - lastPlan) < 0.002) return;
  lastPlan = p;
  storyEl.querySelectorAll<SVGPathElement>('.plan-svg .ln').forEach((el, k, all) => {
    const local = clamp(p * 1.4 - (k / all.length) * 0.4, 0, 1);
    el.style.strokeDashoffset = String(1 - local);
  });
  storyEl.querySelectorAll<SVGTextElement>('.plan-svg .lbl').forEach((el) => { el.style.opacity = String(sm(0.7, 1, p)); });
}

// ---------------------------------------------------------------- legend per step
let lastLegend = '';
function updateLegend(s: number, loading: boolean) {
  const sl = lang() === 'sl';
  const sw = (c: string) => `<i class="sw" style="background:${c}"></i>`;
  const A = `${sw('#E4E6E1')}${sl ? 'Skeniranje A' : 'Scan A'}${sw('#FF5A1F')}${sl ? 'Skeniranje B' : 'Scan B'}`;
  let row = '';
  if (loading) row = sl ? 'Nalaganje oblaka točk' : 'Loading point cloud';
  else if (s < 0) row = `${sw('#FF5A1F')}${sl ? 'Val skeniranja' : 'Scan sweep'}${sw('linear-gradient(90deg,#2E3032,#B9BDB7,#FF5A1F)')}${sl ? 'Višina' : 'Height'}`;
  else if (s < 1) row = A;
  else if (s < 2) row = `${sw('#FFC23D')}${sl ? 'Osamelci in predmeti' : 'Outliers and objects'}${sw('#E4E6E1')}${sl ? 'Vokselska mreža (povečano)' : 'Voxel grid (exaggerated)'}`;
  else if (s < 3) row = `${sl ? 'Iskanje zasuka 0 do 359°' : 'Rotation search 0 to 359°'}${A}`;
  else if (s < 4) row = `${sw('#FF5A1F')}${sl ? 'Položaji kamere iz videa' : 'Camera positions from video'}${sw('#E4E6E1')}${sl ? 'Pot' : 'Path'}`;
  else if (s < 5) row = `${sw('#FF5A1F')}${sl ? 'Kontrolne mere modela' : 'Check dimensions on the model'}`;
  else if (s < 6) row = `${sw('#FF5A1F')}${sl ? `Rez +${num(SLICES[0], 2)} in +${num(SLICES[1], 2)}, ravnine RANSAC` : `Slices +${num(SLICES[0], 2)} and +${num(SLICES[1], 2)}, RANSAC planes`}`;
  else if (s < 7) row = `${sw('#E4E6E1')}${sl ? 'Črte' : 'Lines'}${sw('#3A3D40')}${sl ? 'Ravnine' : 'Planes'}`;
  else if (s < 8) row = ['01_FLOORS', '02_WALLS', '03_CEILING', '04_STAIRS', '05_OPENINGS'].map((k) => `${sw(LAYER_TINT[k])}${k}`).join('');
  else row = `${sw('#E4E6E1')}${sl ? 'Model' : 'Model'}${sw('linear-gradient(90deg,#2E3032,#B9BDB7,#FF5A1F)')}${sl ? 'Oblak točk' : 'Point cloud'}`;
  const hint = coarse ? t('scene.dragTouch') : t('scene.drag');
  const html = `<span class="label">${row}</span><span class="label">${t('ref.tag')} // ${t('hero.scene')}</span><span class="label hint">↔ ${hint}</span>`;
  if (html !== lastLegend) { legend.innerHTML = html; lastLegend = html; }
  const active = Math.floor(s);
  rail.querySelectorAll('a').forEach((a, i) => a.classList.toggle('on', i === active));
}

// ---------------------------------------------------------------- state
const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mC = new THREE.Matrix4();
const pv = new THREE.Vector3();
function apply(s: number, time: number) {
  if (!mat || !meta || !model) return;
  const u = mat.uniforms;
  const T = time * 0.001;
  u.uTime.value = T;

  // hero: aligned cloud in height colours with a scanning wave
  u.uWaveOn.value = (1 - sm(-0.4, 0, s)) + sm(8.2, 8.5, s);
  // step 01: separate scans, the cloud dissolves and is captured again from two scanner positions
  const align = 1 - sm(-0.5, 0.05, s) + sm(2.4, 2.85, s);
  u.uAlign.value = align;
  u.uScanTint.value = sm(-0.5, 0, s) * (1 - sm(2.65, 2.95, s));
  u.uCapHide.value = sm(-0.3, 0, s) * (1 - sm(0.5, 0.62, s));
  u.uCapR.value = lerp(0.3, 14, sm(0.0, 0.52, s));
  u.uCapOn.value = sm(-0.05, 0.15, s) * (1 - sm(0.85, 1.0, s));
  // step 02: outliers and objects flagged then removed, cloud levelled, voxel grid
  const tilt = THREE.MathUtils.degToRad(4) * sm(-0.3, 0, s) * (1 - sm(1.25, 1.7, s));
  u.uTilt.value = tilt;
  u.uNoise.value = sm(-0.3, 0, s);
  u.uOutHi.value = sm(1.02, 1.15, s);
  u.uOutRemove.value = sm(1.3, 1.45, s);
  u.uClutterHi.value = sm(1.02, 1.15, s) * (1 - sm(1.35, 1.5, s));
  u.uClutter.value = 0.6 * sm(1.3, 1.5, s) + 0.4 * sm(6.0, 6.5, s);
  u.uVoxel.value = sm(1.55, 1.75, s) * (1 - sm(1.95, 2.1, s));
  // step 03: scan B turns once around (rotation search), then settles
  u.uSearch.value = Math.PI * 2 * sm(2.05, 2.5, s);
  // step 04: video frames, points seen from the current frame light up
  const fr = sm(3.05, 3.75, s);
  const frOn = sm(3.0, 3.08, s) * (1 - sm(3.85, 3.98, s));
  frMat.opacity = frOn; pathMat.opacity = frOn * 0.5;
  frustums.visible = pathLine.visible = frOn > 0.001;
  frustums.geometry.setDrawRange(0, Math.ceil(fr * N_FR) * 16);
  pathLine.geometry.setDrawRange(0, Math.ceil(fr * 240));
  pathCurve.getPointAt(clamp(fr, 0, 1), pv);
  u.uProbe.value.copy(pv);
  u.uProbeOn.value = frOn * sm(3.06, 3.12, s);
  // step 05: check dimensions draw one after another
  const dimOn = sm(4.02, 4.1, s) * (1 - sm(4.85, 4.98, s));
  dimMat.opacity = dimOn;
  dims.forEach((d, k) => {
    const pr = sm(4.08 + k * 0.14, 4.32 + k * 0.14, s);
    const e = d.a.clone().lerp(d.b, pr);
    const arr = (d.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const set = (i: number, v: THREE.Vector3) => { arr[i] = v.x; arr[i + 1] = v.y; arr[i + 2] = v.z; };
    set(0, d.a); set(3, e);
    set(6, d.a.clone().sub(d.tick)); set(9, d.a.clone().add(d.tick));
    set(12, e.clone().sub(d.tick)); set(15, e.clone().add(d.tick));
    d.line.geometry.attributes.position.needsUpdate = true;
    d.line.visible = dimOn > 0.001 && pr > 0.001;
    const show = d.line.visible && pr > 0.98;
    d.el.style.display = show ? '' : 'none';
    if (show) {
      const mid = d.a.clone().add(d.b).multiplyScalar(0.5).project(camera);
      d.el.style.left = `${((mid.x + 1) / 2) * innerWidth}px`;
      d.el.style.top = `${((1 - mid.y) / 2) * innerHeight}px`;
      d.el.style.opacity = String(dimOn);
      const name = DIM_NAME[d.key][lang() === 'sl' ? 0 : 1];
      const txt = `${name} ${num(d.a.distanceTo(d.b), 2)} m`;
      if (d.el.textContent !== txt) d.el.textContent = txt;
    }
  });
  // step 06: slices, planes light up
  u.uSlice.value = lerp(meta.bounds.min[2] - 0.3, meta.bounds.max[2] + 0.3, sm(5.0, 5.4, s));
  u.uSliceOn.value = sm(4.98, 5.04, s) * (1 - sm(5.4, 5.5, s));
  u.uSliceX.value = lerp(meta.bounds.min[0] - 0.3, meta.bounds.max[0] + 0.3, sm(5.02, 5.38, s));
  u.uSliceXOn.value = sm(5.0, 5.05, s) * (1 - sm(5.38, 5.45, s));
  u.uRevealOn.value = sm(5.38, 5.48, s) * (1 - sm(6.25, 6.55, s));
  u.uReveal.value = (meta.maxOrder + 6) * sm(5.42, 5.95, s);
  sliceMat.opacity = sm(5.32, 5.42, s) * (1 - sm(6.1, 6.3, s));
  slices.visible = sliceMat.opacity > 0.001;
  // step 07: points to lines, model, plan; step 09 returns the cloud around the model
  u.uCollapse.value = sm(6.05, 6.8, s) * (1 - sm(8.1, 8.5, s));
  setModelOpacity(model, 0.5 * sm(6.5, 6.95, s), sm(6.4, 6.85, s));
  drawPlan(anim ? sm(6.1, 6.8, s) : (s >= 6 ? 1 : 0));
  // step 08: layers coloured and lifted apart
  setModelTint(model, sm(7.05, 7.3, s));
  setModelExplode(model, sm(7.1, 7.48, s) * (1 - sm(7.72, 7.97, s)));
  u.uFade.value = 1 - 0.92 * sm(7.0, 7.2, s) + 0.62 * sm(8.15, 8.45, s);

  // scanner markers follow the scans (tilt, misalignment of B)
  const capOn = u.uCapOn.value;
  scannerMats.forEach((m) => { m.opacity = capOn; });
  tiltFrame.visible = capOn > 0.001;
  if (tiltFrame.visible) {
    const c = u.uCenter.value as THREE.Vector3;
    tiltFrame.matrix.copy(mA.makeTranslation(c.x, c.y, c.z)).multiply(mB.makeRotationX(tilt)).multiply(mC.makeTranslation(-c.x, -c.y, -c.z));
    const k = 1 - align, a = u.uRot.value * k + u.uSearch.value;
    const P = u.uPivot.value as THREE.Vector3, S = u.uShift.value as THREE.Vector3;
    bFrame.matrix.copy(mA.makeTranslation(P.x + S.x * k, P.y + S.y * k, P.z + S.z * k)).multiply(mB.makeRotationZ(a)).multiply(mC.makeTranslation(-P.x, -P.y, -P.z));
    rings.forEach((r, i) => { const f = ((T * 0.9 + i * 0.5) % 1); r.scale.setScalar(0.2 + f * 1.4); });
  }

  // pointer glow
  u.uMouse.value.set(mouse.x, mouse.y);
  u.uMouseOn.value = hoverOn;
}

// Geometry-specific set-up from meta.scene: scanners, video path, check dimensions, slices, camera frame.
let SLICES = [1.0, 4.2];
const KEYS0 = KEYS.map((k) => ({ p: [...k.p] as [number, number, number], t: [...k.t] as [number, number, number] }));
function setupScene(m: StoryMeta) {
  const sc = m.scene;
  if (sc) {
    SCAN_A.set(...(sc.scanA as [number, number, number]));
    SCAN_B.set(...(sc.scanB as [number, number, number]));
    pathCurve = new THREE.CatmullRomCurve3(sc.path.map((p) => new THREE.Vector3(...(p as [number, number, number]))), false, 'centripetal');
    frustums.geometry.dispose(); frustums.geometry = frustumGeo();
    pathLine.geometry.dispose(); pathLine.geometry = new THREE.BufferGeometry().setFromPoints(pathCurve.getSpacedPoints(240));
    sc.dims.slice(0, dims.length).forEach((d, k) => {
      dims[k].a.set(...(d.a as [number, number, number])); dims[k].b.set(...(d.b as [number, number, number]));
      dims[k].tick.set(...(d.tick as [number, number, number])); dims[k].key = d.key;
    });
    SLICES = sc.slices;
  }
  scanner(SCAN_A, '#E4E6E1', tiltFrame);
  scanner(SCAN_B, '#FF5A1F', bFrame);
  // camera keyframes were set for the 6 x 4 m demo hall: move and scale them to this scene
  const box = new THREE.Box3();
  if (model) box.setFromObject(model);
  if (box.isEmpty()) box.set(new THREE.Vector3(...(m.bounds.min as [number, number, number])), new THREE.Vector3(...(m.bounds.max as [number, number, number])));
  const c1 = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const c0 = new THREE.Vector3(3, 2, 3.2), k = Math.max(size.x, size.y) / 5.0;
  KEYS.forEach((key, i) => {
    const p = new THREE.Vector3(...KEYS0[i].p).sub(c0).multiplyScalar(k).add(c1);
    const t = new THREE.Vector3(...KEYS0[i].t).sub(c0).multiplyScalar(k).add(c1);
    key.p = [p.x, p.y, p.z]; key.t = [t.x, t.y, t.z];
  });
}

async function init() {
  if (!renderer) return;
  updateLegend(-1, true);
  meta = await fetchJson<StoryMeta>(url(META));
  const geo = await loadStoryCloud(url(BIN), meta, mobile ? 2 : 1);
  mat = storyMaterial(meta);
  // the reference capture is larger and sparser than the demo hall: larger points
  if (meta.demo === false) mat.uniforms.uSize.value = 0.026;
  scene.add(new THREE.Points(geo, mat));
  model = buildModel(await fetchJson<ModelJson>(url(meta.model)));
  setModelOpacity(model, 0, 0);
  scene.add(model);
  const b = meta.bounds;
  setupScene(meta);
  for (const z of SLICES) {
    const pts = [[b.min[0] - 0.3, b.min[1] - 0.3], [b.max[0] + 0.3, b.min[1] - 0.3], [b.max[0] + 0.3, b.max[1] + 0.3], [b.min[0] - 0.3, b.max[1] + 0.3]]
      .map(([x, y]) => new THREE.Vector3(x, y, z));
    slices.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), sliceMat));
  }
  mat.uniforms.uScanA.value.copy(SCAN_A);
  mat.uniforms.uScanB.value.copy(SCAN_B);
  try {
    const r = await fetch(url(meta.plan));
    planSvg = (await r.text()).replace(/<!--[\s\S]*?-->/g, '');
    const holder = storyEl.querySelector('.plan-svg');
    if (holder) holder.innerHTML = planSvg;
  } catch { /* plan is optional */ }
  resize();
  sTarget = sFromScroll();
  sView = sTarget;
}

// read-only hook for checking the scroll mapping in the browser console
let forced: number | null = null;
(window as any).__story = { get s() { return sView; }, get target() { return sTarget; }, get anim() { return anim; }, force(v: number | null) { forced = v; } };

let lastT = performance.now();
function frame(time: number) {
  requestAnimationFrame(frame);
  if (!renderer) return;
  const rawDt = (time - lastT) / 1000;
  const dt = Math.min(0.1, rawDt);
  lastT = time;
  sTarget = sFromScroll(); // read every frame; does not depend on scroll event batching
  if (!anim) sView = sTarget < 0 ? -1 : REP[Math.min(8, Math.floor(sTarget))];
  else if (rawDt > 0.25) sView = sTarget; // after a pause (hidden tab) jump instead of catching up slowly
  else sView += (sTarget - sView) * Math.min(1, dt * 5);
  if (forced !== null) sView = forced;
  updateLegend(anim ? sView : Math.min(8.999, Math.max(-1, sTarget)), !mat);
  labelsEl.style.display = sTarget >= 9 ? 'none' : '';
  if (sTarget >= 9 && sView > 8.98) return;

  if (anim) {
    // hero and step 09 orbit continuously; elsewhere a gentle swing around the keyframe view
    const spin = clamp(1 - sm(-0.45, -0.05, sView) + sm(8.15, 8.45, sView), 0, 1);
    orbit += dt * 0.17 * spin;
    if (spin < 0.99) {
      orbit = wrap(orbit);
      const swing = Math.sin(time * 0.00027) * 0.3 * (1 - 0.8 * sm(6.3, 6.6, sView) * (1 - sm(6.7, 6.95, sView)));
      orbit += (swing - orbit) * Math.min(1, dt * 1.3 * (1 - spin));
    }
    if (!dragging) {
      userYaw += yawVel * dt; userPitch = clamp(userPitch + pitchVel * dt, -0.6, 0.7);
      yawVel *= Math.exp(-dt * 3.2); pitchVel *= Math.exp(-dt * 3.2);
      if (time - lastUser > 3000) { const k = Math.min(1, dt * 0.35); userYaw += -userYaw * k; userPitch += -userPitch * k; }
    }
    const pk = coarse ? 0 : Math.min(1, dt * 3);
    mouse.sx += ((mouse.on ? mouse.x : 0) - mouse.sx) * pk;
    mouse.sy += ((mouse.on ? mouse.y : 0) - mouse.sy) * pk;
    hoverOn += ((mouse.on && !coarse ? 1 : 0) - hoverOn) * Math.min(1, dt * 4);
  } else {
    orbit = 0; mouse.sx = mouse.sy = 0; hoverOn = 0;
  }
  cameraAt(sView);
  apply(sView, anim ? time : 0);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
init().catch((e) => { console.error(e); updateLegend(-1, true); });
