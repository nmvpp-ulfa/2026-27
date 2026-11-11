// "/student/?id=.." one page per capture: hero viewer, data, measurements, attempts, sheets, final outputs.
import '../styles/base.css';
import '../styles/pages.css';
import { mountChrome } from '../lib/chrome';
import { lang, num, int, onLang, t } from '../lib/i18n';
import { byId, label, rich, students, textOf, url, type Student } from '../lib/data';
import { avatarSvg } from '../lib/avatar';
import { appLabel, deviceLabel, stepsBar } from '../lib/cards';
import { Viewer, type MeasureResult } from '../three/viewer';
import { motionOn, onMotion } from '../lib/motion';

mountChrome('student');
const main = document.getElementById('main')!;
const id = new URLSearchParams(location.search).get('id') || students[0]?.id || null;
const st = byId(id);
const fmtM = (m: number) => `${num(m, 2)} m`;

let viewer: Viewer | null = null;
const layers = { cloud: true, model: false, deviation: false };
let measuring = false;
let section = 62; // default cutaway removes the ceiling so the interior is visible
const myMeasures: number[] = [];

function demoBadge(s: Student) { return s.demo ? `<span class="badge badge--demo">${t('demo.tag')}</span>` : ''; }

function chip(key: string, pressed: boolean, disabled = false) {
  return `<button type="button" class="chip" data-layer="${key}" aria-pressed="${pressed}"${disabled ? ' disabled' : ''}>${t('layer.' + key)}${disabled ? ` <span class="chip-note">${t('nodata')}</span>` : ''}</button>`;
}

function renderPage(s: Student) {
  const hasCloud = !!s.files.pointcloud && s.consent_location_publication;
  const i = students.indexOf(s);
  const prev = students[(i - 1 + students.length) % students.length];
  const next = students[(i + 1) % students.length];
  const other = students.find((o) => o.id !== s.id && o.phase === s.phase && o.lidar !== s.lidar) || next;
  const measRows = s.measurements.map((m) => {
    const d = m.cloud_cm - m.tape_cm;
    return `<tr><td>${t('el.' + m.element)}</td><td class="num">${num(m.tape_cm)} cm</td><td class="num">${num(m.cloud_cm)} cm</td><td class="num${Math.abs(d) > 3 ? ' warn' : ''}">${d >= 0 ? '+' : ''}${num(d)} cm</td></tr>`;
  }).join('');

  main.innerHTML = `<div class="wrap">
    <div class="st-head">
      ${avatarSvg(s.avatar_seed, 'avatar avatar--lg')}
      <div>
        <a class="backlink" href="${url('explore/')}">← ${t('nav.atlas')}</a>
        <h1>${label(s)}</h1>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><span class="label">${s.id.toUpperCase()} // Index_Code: NMVPP_${s.id}</span>${demoBadge(s)}</div>
      </div>
      <dl class="kv">
        <dt>${t('m.phase')}</dt><dd>${t('phase.' + s.phase)}</dd>
        <dt>${t('m.location')}</dt><dd>${s.location.name}</dd>
        <dt>${t('m.device')}</dt><dd>${deviceLabel(s)}</dd>
        <dt>${t('m.app')}</dt><dd>${appLabel(s)}</dd>
        <dt>${t('m.status')}</dt><dd class="live">${t('status.' + s.status)}</dd>
        <dt>${t('m.step')}</dt><dd>${String(s.reached_step).padStart(2, '0')} / 09</dd>
      </dl>
    </div>

    <div class="viewer-tools">
      <div class="group"><span class="label">${t('st.layers')}</span>
        ${chip('cloud', hasCloud && layers.cloud, !hasCloud)}
        ${chip('splat', false, !s.files.splat)}
        ${chip('mesh', false, !s.files.mesh)}
        ${chip('model', !hasCloud || layers.model, !s.files.model_json)}
        ${chip('deviation', hasCloud && layers.deviation, !hasCloud)}
      </div>
      <div class="group range"><span class="label">${t('st.section')}</span>
        <input type="range" min="0" max="100" value="${section}" id="section" aria-label="${t('st.section')}">
        <span class="data" id="sectionVal"></span>
      </div>
      <div class="group">
        <button type="button" class="chip" id="measure" aria-pressed="${measuring}">${t('st.measure')}</button>
        <button type="button" class="chip" id="clear">${t('st.clear')}</button>
        <span class="label" id="mhint">${measuring ? t('st.measureHint') : ''}</span>
      </div>
      <div class="group legend dev-legend" id="devLegend" style="display:${layers.deviation ? 'flex' : 'none'}">
        <span class="label">${t('dev.legend')}</span><span class="data">0</span><span class="bar"></span><span class="data">5 cm</span>
      </div>
    </div>
    <div class="viewer st-viewer" id="viewer"><div class="viewer-poster">${lang() === 'sl' ? 'Nalaganje' : 'Loading'}</div></div>
    ${hasCloud ? '' : `<p class="notice" style="margin-top:12px">${t('st.noConsentLoc')}</p>`}

    <div class="st-grid">
      <section class="sec">
        <div class="sec-head"><span class="label"><b>01</b> // ${t('st.desc')}</span></div>
        <p>${rich(textOf(s))}</p>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>02</b> // ${t('st.data')} ${demoBadge(s)}</span></div>
        <div class="metrics">
          <div class="metric"><span class="label">${t('m.points')}</span><span class="v">${int(s.metrics.points)}</span></div>
          <div class="metric"><span class="label">${t('m.median')}</span><span class="v">${num(s.metrics.median_dev_cm)}<small>cm</small></span></div>
          <div class="metric"><span class="label">${t('m.within')}</span><span class="v">${num(s.metrics.within_5cm_pct)}<small>%</small></span></div>
          <div class="metric"><span class="label">${t('m.scale')}</span><span class="v">${s.metrics.scale_err_cm >= 0 ? '+' : ''}${num(s.metrics.scale_err_cm)}<small>cm</small></span></div>
        </div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>03</b> // ${t('st.measurements')} ${demoBadge(s)}</span></div>
        <table class="tbl"><thead><tr><th>${t('el.element')}</th><th class="num">${t('el.tape')}</th><th class="num">${t('el.cloud')}</th><th class="num">${t('el.diff')}</th></tr></thead><tbody>${measRows}</tbody></table>
        <div style="margin-top:16px"><span class="label">${t('st.yourMeas')}</span><ol class="data" id="myMeas" style="margin:6px 0 0;padding-left:20px"></ol></div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>04</b> // ${t('st.attempts')}</span></div>
        <div class="label" style="margin-bottom:6px">${t('st.ai')}</div>
        ${s.ai_models.map((m) => `<div class="ai-row"><span>${m.name}</span>${stepsBar(m.reached_step)}<span class="label">${t('st.upto')} ${String(m.reached_step).padStart(2, '0')}</span></div>`).join('')}
        <div class="label" style="margin:18px 0 6px">${t('st.worklog')}</div>
        <dl class="kv">${s.worklog.map((w) => `<dt>${rich(w.date)}</dt><dd>${rich(lang() === 'sl' ? w.text_sl : w.text_en)}</dd>`).join('')}</dl>
      </section>
      <section class="sec wide">
        <div class="sec-head"><span class="label"><b>05</b> // ${t('st.sheets')}</span></div>
        <div class="sheets">${s.files.sheets.map((sh) => `<div class="sheet"><span class="label">${t('st.week')} ${String(sh.week).padStart(2, '0')}</span><div class="bar"></div><span class="badge badge--missing">${sh.file ? 'PDF' : t('st.missing')}</span></div>`).join('')}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>06</b> // ${t('st.outputs')}</span></div>
        <div class="downloads">${s.files.downloads.map((d) => d.file
          ? `<a class="dl-row" href="${url(d.file)}" download><span>${d.type}</span><span class="label label--signal">↓</span></a>`
          : `<div class="dl-row"><span>${d.type}</span><span class="badge badge--missing">${t('st.missing')}</span></div>`).join('')}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>07</b> // ${t('st.exhibition')}</span></div>
        <dl class="kv">
          <dt>${t('st.selected')}</dt><dd>${s.exhibition.selected === null ? rich('[vnesi]') : s.exhibition.selected ? 'DA' : 'NE'}</dd>
          <dt>${t('st.print')}</dt><dd>${rich(s.exhibition.print ?? '[vnesi]')}</dd>
        </dl>
      </section>
    </div>

    <nav class="st-nav">
      <a class="btn btn--ghost" href="${url('student/?id=' + prev.id)}">← ${t('st.prev')}: ${label(prev)}</a>
      <a class="btn" href="${url(`compare/?a=${s.id}&b=${other.id}`)}">${t('st.compareWith')}: ${label(s)} / ${label(other)}</a>
      <a class="btn btn--ghost" href="${url('student/?id=' + next.id)}">${t('st.next')}: ${label(next)} →</a>
    </nav>
  </div>`;
  document.title = `NMVPP · ${label(s)}`;
  bindTools(s, hasCloud);
  renderMyMeasures();
}

function sectionText() {
  const z = viewer?.sectionHeight();
  return z === null || z === undefined ? t('st.off') : `+${num(z, 2)} m`;
}

function applyLayers(hasCloud: boolean) {
  if (!viewer) return;
  viewer.setCloudVisible(hasCloud && layers.cloud);
  viewer.setModelVisible(!hasCloud || layers.model, hasCloud && layers.cloud ? 0.25 : 0.55);
  viewer.setColor(layers.deviation ? 'deviation' : 'height');
}

function bindTools(s: Student, hasCloud: boolean) {
  const vEl = document.getElementById('viewer')!;
  if (viewer) {
    // re-render after a language switch: keep the 3D viewer, move it into the new container
    vEl.innerHTML = '';
    vEl.appendChild(viewer.renderer.domElement);
    viewer.el = vEl;
    viewer.refreshLabels(fmtM);
  }
  document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.layer as keyof typeof layers;
    if (!(k in layers)) return;
    layers[k] = !layers[k];
    if (k === 'deviation' && layers.deviation) layers.cloud = true;
    if (k === 'cloud' && !layers.cloud) layers.deviation = false;
    document.querySelectorAll<HTMLButtonElement>('[data-layer]').forEach((c) => {
      const kk = c.dataset.layer as keyof typeof layers;
      if (kk in layers && !c.disabled) c.setAttribute('aria-pressed', String(layers[kk]));
    });
    document.getElementById('devLegend')!.style.display = layers.deviation ? 'flex' : 'none';
    applyLayers(hasCloud);
  }));
  const range = document.getElementById('section') as HTMLInputElement;
  const val = document.getElementById('sectionVal')!;
  range.addEventListener('input', () => {
    section = Number(range.value);
    viewer?.setSection(section >= 100 ? null : section / 100);
    val.textContent = sectionText();
  });
  val.textContent = sectionText();
  const mBtn = document.getElementById('measure')!;
  mBtn.addEventListener('click', () => {
    measuring = !measuring;
    mBtn.setAttribute('aria-pressed', String(measuring));
    document.getElementById('mhint')!.textContent = measuring ? t('st.measureHint') : '';
    viewer?.setMeasure(measuring, onMeasure, fmtM);
  });
  document.getElementById('clear')!.addEventListener('click', () => { viewer?.clearMeasures(); myMeasures.length = 0; renderMyMeasures(); });
}

function onMeasure(r: MeasureResult) { myMeasures.push(r.d); renderMyMeasures(); }
function renderMyMeasures() {
  const ol = document.getElementById('myMeas');
  if (ol) ol.innerHTML = myMeasures.map((d) => `<li>${fmtM(d)}</li>`).join('') || `<li style="list-style:none;margin-left:-20px;color:var(--fg-3)">${t('st.measureHint')}</li>`;
}

async function initViewer(s: Student) {
  const hasCloud = !!s.files.pointcloud && s.consent_location_publication;
  const vEl = document.getElementById('viewer')!;
  viewer = new Viewer(vEl);
  try {
    if (hasCloud) await viewer.loadCloud(url(s.files.pointcloud!), s.files.pointcloud_count);
    if (s.files.model_json) await viewer.loadModel(url(s.files.model_json));
  } catch (e) { console.error(e); }
  vEl.querySelector('.viewer-poster')?.remove();
  applyLayers(hasCloud);
  viewer.fit();
  if (motionOn()) viewer.sweepSection(section >= 100 ? null : section / 100);
  else viewer.setSection(section >= 100 ? null : section / 100);
  viewer.setAutoRotate(motionOn());
  onMotion((on) => viewer?.setAutoRotate(on));
  const val = document.getElementById('sectionVal');
  if (val) val.textContent = sectionText();
  viewer.setMeasure(measuring, onMeasure, fmtM);
}

if (!st) {
  main.innerHTML = `<div class="wrap"><div class="page-title"><h1>404</h1><p>${t('st.notFound')}</p><p><a href="${url('explore/')}">← ${t('nav.atlas')}</a></p></div></div>`;
} else {
  renderPage(st);
  initViewer(st);
  onLang(() => renderPage(st));
}
