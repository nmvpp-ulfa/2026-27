// "/compare/?a=..&b=.." two viewers with synced cameras, plus a single-stage swipe mode.
import '../styles/base.css';
import '../styles/pages.css';
import { mountChrome } from '../lib/chrome';
import { num, int, onLang, t } from '../lib/i18n';
import { byId, label, students, url, type Student, locName } from '../lib/data';
import { appLabel, deviceLabel } from '../lib/cards';
import { Viewer } from '../three/viewer';
import { motionOn, onMotion } from '../lib/motion';

mountChrome('compare');
const main = document.getElementById('main')!;
const q = new URLSearchParams(location.search);
const phase1 = students.filter((s) => s.phase === 1);
const p1a = phase1.find((s) => s.lidar) || students[0];
const p1b = phase1.find((s) => !s.lidar && s.id !== p1a?.id) || students[1] || students[0];
let A: Student = byId(q.get('a')) || p1a;
let B: Student = byId(q.get('b')) || p1b;
let mode: 'side' | 'swipe' = q.get('mode') === 'swipe' ? 'swipe' : 'side';
let colour: 'height' | 'ab' = 'ab';
let split = 50;
let section = 62; // shared cutaway, % of the combined height range; 100 = off
let zRange: [number, number] = [0, 1];
let va: Viewer | null = null, vb: Viewer | null = null;

main.innerHTML = `<div class="wrap">
  <div class="page-title"><span class="label"><b class="label--signal">03</b> // Index_Code: NMVPP_compare</span><h1 id="ttl"></h1><p id="lead"></p></div>
  <div class="cmp-controls" id="controls"></div>
  <p class="notice" id="noCloud" style="display:none;margin-bottom:12px"></p>
  <div class="cmp-stage" id="stage">
    <div class="viewer" id="va"></div>
    <div class="viewer" id="vb"></div>
    <div class="swipe-handle" id="handle" role="slider" aria-valuemin="0" aria-valuemax="100" tabindex="0"></div>
  </div>
  <section class="sec"><div class="sec-head"><span class="label"><b>01</b> // ${''}<span id="mt"></span></span></div><div id="metrics"></div></section>
</div>`;

const stage = document.getElementById('stage')!;

function opt(sel: Student) {
  return students.map((s) => `<option value="${s.id}"${s.id === sel.id ? ' selected' : ''}>${s.id.toUpperCase()} // ${label(s)} · ${t('phase.' + s.phase).split(':')[0]}</option>`).join('');
}
function renderControls() {
  document.getElementById('ttl')!.textContent = t('cmp.title');
  document.getElementById('lead')!.textContent = t('cmp.lead');
  document.getElementById('mt')!.textContent = t('st.data');
  document.getElementById('controls')!.innerHTML = `
    <label><span class="label">${t('cmp.a')}</span><select class="select" id="selA">${opt(A)}</select></label>
    <label><span class="label">${t('cmp.b')}</span><select class="select" id="selB">${opt(B)}</select></label>
    <button type="button" class="btn" id="p1">${t('cmp.phase1')}</button>
    <div class="group" style="display:flex;gap:6px;align-items:center">
      <button type="button" class="chip" data-mode="side" aria-pressed="${mode === 'side'}">${t('cmp.side')}</button>
      <button type="button" class="chip" data-mode="swipe" aria-pressed="${mode === 'swipe'}">${t('cmp.swipe')}</button>
    </div>
    <div class="group" style="display:flex;gap:6px;align-items:center"><span class="label">${t('cmp.colour')}</span>
      <button type="button" class="chip" data-col="ab" aria-pressed="${colour === 'ab'}">${t('cmp.ab')}</button>
      <button type="button" class="chip" data-col="height" aria-pressed="${colour === 'height'}">${t('cmp.height')}</button>
    </div>
    <div class="range"><span class="label">${t('st.section')}</span>
      <input type="range" min="0" max="100" value="${section}" id="section" aria-label="${t('st.section')}">
      <span class="data" id="sectionVal">${sectionText()}</span>
    </div>`;
  const range = document.getElementById('section') as HTMLInputElement;
  range.addEventListener('input', () => { section = Number(range.value); applySection(); document.getElementById('sectionVal')!.textContent = sectionText(); });
  (document.getElementById('selA') as HTMLSelectElement).addEventListener('change', (e) => { A = byId((e.target as HTMLSelectElement).value)!; reload(); });
  (document.getElementById('selB') as HTMLSelectElement).addEventListener('change', (e) => { B = byId((e.target as HTMLSelectElement).value)!; reload(); });
  document.getElementById('p1')!.addEventListener('click', () => { A = p1a; B = p1b; reload(); });
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode as typeof mode; applyMode(); renderControls(); syncUrl(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-col]').forEach((b) => b.addEventListener('click', () => { colour = b.dataset.col as typeof colour; applyColour(); renderControls(); }));
}

function tag(s: Student, letter: string, col: string) {
  return `<div class="cmp-tag"><i style="background:${col}"></i>${letter} // ${label(s)} · ${deviceLabel(s)}</div>`;
}

// No published point cloud on either side: say so instead of showing two empty viewers.
function noCloudNotice() {
  const pub = (s: Student) => !!s.files.pointcloud && s.consent_location_publication;
  const el = document.getElementById('noCloud')!;
  const none = !pub(A) && !pub(B);
  el.style.display = none ? '' : 'none';
  el.textContent = t('cmp.noCloud');
  stage.style.display = none ? 'none' : '';
  document.getElementById('handle')!.style.display = none ? 'none' : '';
}

function renderMetrics() {
  noCloudNotice();
  const row = (k: string, a: string, b: string, d = '') => `<tr><td>${k}</td><td class="num">${a}</td><td class="num">${b}</td><td class="num">${d}</td></tr>`;
  const dn = (x: number | null, y: number | null, digits = 1, unit = '') => (x === null || y === null ? '—' : `${y - x >= 0 ? '+' : ''}${num(y - x, digits)}${unit}`);
  const v = (x: number | null, unit: string, digits = 1) => (x === null ? '—' : `${num(x, digits)}${unit}`);
  const iv = (x: number | null) => (x === null ? '—' : int(x));
  const ma = A.metrics, mb = B.metrics;
  document.getElementById('metrics')!.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:10px">${A.demo || B.demo ? `<span class="badge badge--demo">${t('demo.tag')}</span>` : ''}</div>
    <table class="tbl"><thead><tr><th>${t('cmp.metric')}</th><th class="num">A // ${label(A)}</th><th class="num">B // ${label(B)}</th><th class="num">B − A</th></tr></thead><tbody>
      ${row(t('m.points'), iv(ma.points), iv(mb.points), ma.points === null || mb.points === null ? '—' : `${mb.points - ma.points >= 0 ? '+' : ''}${int(mb.points - ma.points)}`)}
      ${row(t('m.median'), v(ma.median_dev_cm, ' cm', 2), v(mb.median_dev_cm, ' cm', 2), dn(ma.median_dev_cm, mb.median_dev_cm, 2, ' cm'))}
      ${row(t('m.within'), v(ma.within_5cm_pct, ' %'), v(mb.within_5cm_pct, ' %'), dn(ma.within_5cm_pct, mb.within_5cm_pct, 1, ' %'))}
      ${row(t('m.scale'), v(ma.scale_err_cm, ' cm'), v(mb.scale_err_cm, ' cm'), dn(ma.scale_err_cm, mb.scale_err_cm, 1, ' cm'))}
      ${row(t('m.step'), String(A.reached_step).padStart(2, '0') + ' / 09', String(B.reached_step).padStart(2, '0') + ' / 09')}
      ${row(t('m.device'), deviceLabel(A), deviceLabel(B))}
      ${row(t('m.app'), appLabel(A), appLabel(B))}
      ${row(t('m.phase'), t('phase.' + A.phase), t('phase.' + B.phase))}
      ${row(t('m.location'), locName(A), locName(B))}
    </tbody></table>
    <p style="margin-top:14px;display:flex;gap:12px;flex-wrap:wrap">
      <a class="btn btn--ghost" href="${url('student/?id=' + A.id)}">A // ${label(A)} →</a>
      <a class="btn btn--ghost" href="${url('student/?id=' + B.id)}">B // ${label(B)} →</a>
    </p>`;
}

function sectionZ() { return section >= 100 ? null : zRange[0] + (section / 100) * (zRange[1] - zRange[0]); }
function sectionText() { const z = sectionZ(); return z === null ? t('st.off') : `+${num(z, 2)} m`; }
function applySection() { const z = sectionZ(); va?.setSectionZ(z); vb?.setSectionZ(z); }

function applyMode() {
  stage.classList.toggle('swipe', mode === 'swipe');
  stage.style.setProperty('--split', `${split}%`);
  requestAnimationFrame(() => { va?.resize(); vb?.resize(); });
}
function applyColour() {
  if (colour === 'ab') { va?.setColor('flat', '#FF5A1F'); vb?.setColor('flat', '#E4E6E1'); }
  else { va?.setColor('height'); vb?.setColor('height'); }
}
function syncUrl() {
  const p = new URLSearchParams({ a: A.id, b: B.id });
  if (mode === 'swipe') p.set('mode', 'swipe');
  history.replaceState(null, '', `?${p}`);
}

async function load(v: Viewer, s: Student) {
  const hasCloud = !!s.files.pointcloud && s.consent_location_publication;
  if (hasCloud) await v.loadCloud(url(s.files.pointcloud!), s.files.pointcloud_count);
  if (s.files.model_json) await v.loadModel(url(s.files.model_json));
  v.setModelVisible(!hasCloud, 0.55);
}

async function reload() {
  va?.dispose(); vb?.dispose();
  const ea = document.getElementById('va')!, eb = document.getElementById('vb')!;
  ea.innerHTML = tag(A, 'A', '#FF5A1F');
  eb.innerHTML = tag(B, 'B', '#E4E6E1');
  va = new Viewer(ea); vb = new Viewer(eb);
  const a = va, b = vb;
  a.onCamera = () => b.copyCameraFrom(a);
  b.onCamera = () => a.copyCameraFrom(b);
  a.onStart = b.onStart = () => { a.pauseAuto(); b.pauseAuto(); };
  renderControls();
  renderMetrics();
  syncUrl();
  try { await Promise.all([load(a, A), load(b, B)]); } catch (e) { console.error(e); }
  a.bounds.union(b.bounds);
  if (!a.bounds.isEmpty()) zRange = [a.bounds.min.z, a.bounds.max.z];
  a.fit();
  b.copyCameraFrom(a);
  applySection();
  if (motionOn()) { const z = sectionZ(); a.sweepZ(z); b.sweepZ(z); }
  a.setAutoRotate(motionOn());
  const sv = document.getElementById('sectionVal');
  if (sv) sv.textContent = sectionText();
  applyColour();
  applyMode();
}

// swipe handle
const handle = document.getElementById('handle')!;
let dragging = false;
const setSplit = (clientX: number) => {
  const r = stage.getBoundingClientRect();
  split = Math.min(98, Math.max(2, ((clientX - r.left) / r.width) * 100));
  stage.style.setProperty('--split', `${split}%`);
  handle.setAttribute('aria-valuenow', String(Math.round(split)));
};
handle.addEventListener('pointerdown', (e) => { dragging = true; handle.setPointerCapture(e.pointerId); });
handle.addEventListener('pointermove', (e) => { if (dragging) setSplit(e.clientX); });
handle.addEventListener('pointerup', () => { dragging = false; });
handle.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    split = Math.min(98, Math.max(2, split + (e.key === 'ArrowLeft' ? -5 : 5)));
    stage.style.setProperty('--split', `${split}%`);
  }
});

onMotion((on) => va?.setAutoRotate(on));
reload();
onLang(() => {
  renderControls();
  renderMetrics();
  document.getElementById('va')!.querySelector('.cmp-tag')!.outerHTML = tag(A, 'A', '#FF5A1F');
  document.getElementById('vb')!.querySelector('.cmp-tag')!.outerHTML = tag(B, 'B', '#E4E6E1');
});
