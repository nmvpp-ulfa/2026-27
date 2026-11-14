// "/student/?id=.." one page per capture: hero viewer, data, measurements, attempts, sheets, final outputs.
import '../styles/base.css';
import '../styles/pages.css';
import { mountChrome } from '../lib/chrome';
import { lang, num, int, onLang, t } from '../lib/i18n';
import { byId, label, locName, rich, students, textOf, url, type Exercise, type Student } from '../lib/data';
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
const layers = { cloud: true, rgb: true, model: false, deviation: false, mesh: false };
let measuring = false;
let section = 62; // default cutaway removes the ceiling so the interior is visible
const myMeasures: number[] = [];

// Textured meshes, photos and videos show the place itself: only with consent for the location.
const media = (s: Student) => s.consent_location_publication;
const meshOf = (s: Student) => (media(s) ? s.files.mesh || [...(s.exercises ?? [])].reverse().find((e) => e.mesh)?.mesh || null : null);
const L = (o: any, k: string) => (lang() === 'sl' ? o[k + '_sl'] : o[k + '_en']) ?? o[k + '_sl'];

function exerciseCard(s: Student, e: Exercise) {
  const steps = Array.from({ length: 9 }, (_, k) => `<i class="${e.steps.includes(k + 1) ? 'on' : ''}" title="${String(k + 1).padStart(2, '0')}"></i>`).join('');
  const sum = (L(e, 'summary') as string[] | undefined) ?? [];
  const imgs = media(s) ? e.images : [];
  const vids = media(s) ? [...(e.videos ?? []), ...(e.video ? [{ file: e.video }] : [])] : [];
  return `<article class="ex" id="ex${e.n}">
    <header class="ex-head">
      <span class="ex-n">${String(e.n).padStart(2, '0')}</span>
      <div class="ex-meta">
        <span class="label">${t('st.ex')} ${String(e.n).padStart(2, '0')}${e.date ? ' // ' + e.date : ''}</span>
        ${L(e, 'title') ? `<b>${rich(L(e, 'title'))}</b>` : ''}
      </div>
      <div class="ex-steps"><span class="label">${t('st.steps')}</span><div class="steps-bar">${steps}</div></div>
    </header>
    ${sum.length ? `<ul class="ex-sum">${sum.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>` : ''}
    ${vids.length ? `<div class="ex-videos${vids.length === 1 ? ' one' : ''}">${vids.map((v: any) => `<figure class="ex-vid"><video controls preload="none" playsinline${v.poster ? ` poster="${url(v.poster)}"` : ''} src="${url(v.file)}"></video>${L(v, 'caption') ? `<figcaption class="label">${rich(L(v, 'caption'))}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
    ${imgs.length ? `<div class="ex-gallery">${imgs.map((im, k) => `<button type="button" class="ex-img" data-ex="${e.n}" data-k="${k}" title="${rich(L(im, 'caption') || '')}"><img src="${url(im.file)}" alt="${rich(L(im, 'caption') || t('st.ex') + ' ' + e.n)}" loading="lazy">${L(im, 'caption') ? `<span class="ex-cap">${rich(L(im, 'caption'))}</span>` : ''}</button>`).join('')}</div>` : ''}
    <div class="ex-actions">
      ${media(s) && e.mesh ? `<button type="button" class="btn btn--sm" data-mesh="${e.mesh}">${t('st.open3d')}</button>` : ''}
      ${e.sheet ? `<a class="btn btn--sm btn--ghost" href="${url(e.sheet)}" target="_blank" rel="noopener">${t('st.workmap')} ↗</a>` : ''}
    </div>
  </article>`;
}

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
  const cm = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${num(v)} cm`);
  const measRows = s.measurements.map((m) => {
    const ref = m.tape_cm ?? m.model_cm ?? null;
    const d = ref === null ? null : Math.round((m.cloud_cm - ref) * 10) / 10;
    return `<tr><td>${t('el.' + m.element)}</td><td class="num">${cm(m.tape_cm)}</td><td class="num">${cm(m.cloud_cm)}</td><td class="num">${cm(m.model_cm)}</td><td class="num${d !== null && Math.abs(d) > 3 ? ' warn' : ''}">${d === null ? '—' : (d >= 0 ? '+' : '') + num(d) + ' cm'}</td></tr>`;
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
        <dt>${t('m.location')}</dt><dd>${locName(s)}</dd>
        <dt>${t('m.device')}</dt><dd>${deviceLabel(s)}</dd>
        <dt>${t('m.app')}</dt><dd>${appLabel(s)}</dd>
        <dt>${t('m.status')}</dt><dd class="live">${t('status.' + s.status)}</dd>
        <dt>${t('m.step')}</dt><dd>${String(s.reached_step).padStart(2, '0')} / 09</dd>
      </dl>
    </div>

    <div class="viewer-tools">
      <div class="group"><span class="label">${t('st.layers')}</span>
        ${chip('cloud', hasCloud && layers.cloud, !hasCloud)}
        ${chip('rgb', hasCloud && layers.rgb, !hasCloud || !s.files.pointcloud_rgb)}
        ${chip('splat', false, !s.files.splat)}
        ${chip('mesh', layers.mesh, !meshOf(s))}
        ${chip('model', !hasCloud || layers.model, !s.files.model_json)}
        ${chip('deviation', hasCloud && layers.deviation, !hasCloud || !s.files.model_json)}
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
      <section class="sec wide">
        <div class="sec-head"><span class="label"><b>02</b> // ${t('st.exercises')}</span></div>
        ${s.exercises?.length ? `<div class="ex-list">${s.exercises.map((e) => exerciseCard(s, e)).join('')}</div>` : `<p class="notice">${t('st.noEx')}</p>`}
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>03</b> // ${t('st.data')} ${demoBadge(s)}</span></div>
        <div class="metrics">
          <div class="metric"><span class="label">${t('m.points')}</span><span class="v">${s.metrics.points === null ? '—' : int(s.metrics.points)}</span></div>
          <div class="metric"><span class="label">${t('m.median')}</span><span class="v">${s.metrics.median_dev_cm === null ? '—' : num(s.metrics.median_dev_cm, 2) + '<small>cm</small>'}</span></div>
          <div class="metric"><span class="label">${t('m.within')}</span><span class="v">${s.metrics.within_5cm_pct === null ? '—' : num(s.metrics.within_5cm_pct) + '<small>%</small>'}</span></div>
          <div class="metric"><span class="label">${t('m.scale')}</span><span class="v">${s.metrics.scale_err_cm === null ? '—' : (s.metrics.scale_err_cm >= 0 ? '+' : '') + num(s.metrics.scale_err_cm) + '<small>cm</small>'}</span></div>
        </div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>04</b> // ${t('st.measurements')} ${demoBadge(s)}</span></div>
        ${s.measurements.length ? `<table class="tbl"><thead><tr><th>${t('el.element')}</th><th class="num">${t('el.tape')}</th><th class="num">${t('el.cloud')}</th><th class="num">${t('el.model')}</th><th class="num">${t('el.diff')}</th></tr></thead><tbody>${measRows}</tbody></table><p class="label" style="margin-top:8px">${t('el.diffNote')}</p>` : `<p class="notice">${t('notStated')}</p>`}
        <div style="margin-top:16px"><span class="label">${t('st.yourMeas')}</span><ol class="data" id="myMeas" style="margin:6px 0 0;padding-left:20px"></ol></div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>05</b> // ${t('st.attempts')}</span></div>
        <div class="label" style="margin-bottom:6px">${t('st.ai')}</div>
        ${s.ai_models.length ? s.ai_models.map((m) => `<div class="ai-row"><span>${m.name}</span>${stepsBar(m.reached_step)}<span class="label">${t('st.upto')} ${String(m.reached_step).padStart(2, '0')}</span></div>`).join('') : `<p class="data" style="color:var(--fg-3)">${t('notStated')}</p>`}
        ${s.worklog.length ? `<div class="label" style="margin:18px 0 6px">${t('st.worklog')}</div>
        <dl class="kv">${s.worklog.map((w) => `<dt>${rich(w.date)}</dt><dd>${rich(lang() === 'sl' ? w.text_sl : w.text_en)}</dd>`).join('')}</dl>` : ''}
      </section>
      <section class="sec wide">
        <div class="sec-head"><span class="label"><b>06</b> // ${t('st.sheets')}</span></div>
        ${s.files.sheets.length ? '' : `<p class="notice">${t('st.notPublished')}</p>`}<div class="sheets">${s.files.sheets.map((sh) => `<div class="sheet"><span class="label">${t('st.week')} ${String(sh.week).padStart(2, '0')}</span><div class="bar"></div><span class="badge badge--missing">${sh.file ? 'PDF' : t('st.missing')}</span></div>`).join('')}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>07</b> // ${t('st.outputs')}</span></div>
        ${s.files.downloads.length ? '' : `<p class="notice">${t('st.notPublished')}</p>`}<div class="downloads">${s.files.downloads.map((d) => d.file
          ? `<a class="dl-row" href="${url(d.file)}" download><span>${d.type}</span><span class="label label--signal">↓</span></a>`
          : `<div class="dl-row"><span>${d.type}</span><span class="badge badge--missing">${t('st.missing')}</span></div>`).join('')}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><span class="label"><b>08</b> // ${t('st.exhibition')}</span></div>
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
  viewer.setColor(layers.deviation ? 'deviation' : layers.rgb && viewer.hasRgb() ? 'rgb' : 'height');
  viewer.setMeshVisible(layers.mesh);
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
    if (k === 'deviation' && layers.deviation) { layers.cloud = true; layers.rgb = false; }
    if (k === 'rgb' && layers.rgb) { layers.cloud = true; layers.deviation = false; }
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
  document.querySelectorAll<HTMLButtonElement>('[data-mesh]').forEach((b) => b.addEventListener('click', () => openMesh(s, b.dataset.mesh!, b)));
  document.querySelectorAll<HTMLButtonElement>('.ex-img').forEach((b) => b.addEventListener('click', () => openLightbox(s, Number(b.dataset.ex), Number(b.dataset.k))));
}

let meshLoaded: string | null = null;
async function openMesh(s: Student, file: string, btn?: HTMLButtonElement) {
  if (!viewer) return;
  document.getElementById('viewer')!.scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto', block: 'center' });
  if (meshLoaded !== file) {
    const label0 = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = t('st.loading3d'); }
    try {
      await viewer.loadMesh(url(file), (f) => { if (btn) btn.textContent = `${t('st.loading3d')} ${Math.round(f * 100)} %`; });
      meshLoaded = file;
      document.getElementById('viewer')!.querySelector('.viewer-poster')?.remove();
      if (!s.files.pointcloud && !s.files.model_json) viewer.fit();
    } catch (e) { console.error(e); }
    if (btn) { btn.disabled = false; btn.textContent = label0 ?? t('st.open3d'); }
  }
  layers.mesh = true;
  document.querySelectorAll<HTMLButtonElement>('[data-layer="mesh"]').forEach((c) => { c.disabled = false; c.setAttribute('aria-pressed', 'true'); });
  applyLayers(!!s.files.pointcloud && s.consent_location_publication);
}

// simple lightbox over the exercise images (arrow keys, Esc)
function openLightbox(s: Student, n: number, k: number) {
  const e = s.exercises?.find((x) => x.n === n);
  if (!e || !e.images.length) return;
  let i = k;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const draw = () => {
    const im = e.images[i];
    box.innerHTML = `<figure><img src="${url(im.file)}" alt=""><figcaption class="label">${t('st.ex')} ${String(n).padStart(2, '0')} // ${i + 1} / ${e.images.length}${L(im, 'caption') ? ' // ' + rich(L(im, 'caption')) : ''}</figcaption></figure>
      <button type="button" class="lb-prev" aria-label="prev">←</button><button type="button" class="lb-next" aria-label="next">→</button>
      <button type="button" class="lb-close">${t('st.close')} ✕</button>`;
    box.querySelector('.lb-prev')!.addEventListener('click', (ev) => { ev.stopPropagation(); i = (i - 1 + e.images.length) % e.images.length; draw(); });
    box.querySelector('.lb-next')!.addEventListener('click', (ev) => { ev.stopPropagation(); i = (i + 1) % e.images.length; draw(); });
    box.querySelector('.lb-close')!.addEventListener('click', close);
  };
  const key = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') close();
    if (ev.key === 'ArrowRight') { i = (i + 1) % e.images.length; draw(); }
    if (ev.key === 'ArrowLeft') { i = (i - 1 + e.images.length) % e.images.length; draw(); }
  };
  function close() { box.remove(); document.removeEventListener('keydown', key); }
  box.addEventListener('click', (ev) => { if (ev.target === box) close(); });
  document.addEventListener('keydown', key);
  draw();
  document.body.appendChild(box);
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
    // no cloud and no generalised model yet: start with the latest scan mesh
    const m = meshOf(s);
    if (!hasCloud && !s.files.model_json && m) { await viewer.loadMesh(url(m)); meshLoaded = m; layers.mesh = true; }
  } catch (e) { console.error(e); }
  if (viewer.bounds.isEmpty()) {
    // nothing to show yet: a short placeholder instead of an empty viewer with tools
    const p = vEl.querySelector('.viewer-poster'); if (p) p.textContent = t('st.no3d');
    vEl.classList.add('is-empty');
    document.querySelector<HTMLElement>('.viewer-tools')?.style.setProperty('display', 'none');
    return;
  }
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
