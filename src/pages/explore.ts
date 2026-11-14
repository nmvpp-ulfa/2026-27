// "/explore" Atlas: map of FA and central Ljubljana with pins, filters and a card grid.
import '../styles/base.css';
import 'leaflet/dist/leaflet.css';
import '../styles/pages.css';
// Leaflet 1.9 has no "module" field; import its ES build directly.
import * as L from 'leaflet/dist/leaflet-src.esm.js';
import { mountChrome } from '../lib/chrome';
import { onLang, t } from '../lib/i18n';
import { label, students, url, type Student, hasCoords } from '../lib/data';
import { cardHtml } from '../lib/cards';

mountChrome('atlas');
const main = document.getElementById('main')!;
const state: Record<string, string> = { location: 'all', device: 'all', phase: 'all', status: 'all' };
const params = new URLSearchParams(location.search);
for (const k of Object.keys(state)) if (params.get(k)) state[k] = params.get(k)!;

// site = building or place, the part of the location name before the comma (UL FA, klet -> UL FA)
const site = (s: Student) => s.location.name.split(',')[0].trim();
const match = (s: Student) =>
  (state.location === 'all' || site(s) === state.location) &&
  (state.device === 'all' || (state.device === 'lidar') === s.lidar) &&
  (state.phase === 'all' || String(s.phase) === state.phase) &&
  (state.status === 'all' || s.status === state.status);

main.innerHTML = `<div class="wrap">
  <div class="page-title"><span class="label"><b class="label--signal">02</b> // Index_Code: NMVPP_atlas</span><h1></h1><p></p></div>
  <div id="map" class="map" role="region"></div>
  <div class="filters" id="filters"></div>
  <div class="grid-cards" id="grid"></div>
</div>`;

// ---------------------------------------------------------------- map
const map = L.map('map', { scrollWheelZoom: false, zoomControl: true }).setView([46.0486, 14.5034], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
const groups = new Map<string, Student[]>();
for (const s of students.filter(hasCoords)) groups.set(site(s), [...(groups.get(site(s)) || []), s]);
const markers: { name: string; m: L.Marker; list: Student[] }[] = [];
for (const [name, list] of groups) {
  const lat = list[0].location.lat as number, lon = list[0].location.lon as number;
  const m = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: '', iconSize: [0, 0] }) }).addTo(map);
  markers.push({ name, m, list });
}
{
  const uniq = new Map(students.filter(hasCoords).map((s) => [`${s.location.lat},${s.location.lon}`, [s.location.lat, s.location.lon] as [number, number]]));
  const pts = [...uniq.values()];
  if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.6));
  else if (pts.length === 1) map.setView(pts[0], 15);
}

function renderMarkers() {
  for (const { name, m, list } of markers) {
    const on = list.filter(match);
    m.setIcon(L.divIcon({
      className: '', iconAnchor: [13, 13],
      html: `<div class="pin${on.length ? '' : ' dim'}"><b>${on.length}</b><span>${name}</span></div>`,
    }));
    m.bindPopup(`<div class="label">${name}</div>${list.map((s) => `<a href="${url('student/?id=' + s.id)}">${s.id.toUpperCase()} // ${label(s)}</a>`).join('')}`);
  }
}

// ---------------------------------------------------------------- filters + grid
function sel(key: string, opts: [string, string][]) {
  return `<label><span class="label">${t('f.' + key)}</span><select class="select" data-k="${key}">
    ${opts.map(([v, txt]) => `<option value="${v}"${state[key] === v ? ' selected' : ''}>${txt}</option>`).join('')}</select></label>`;
}
function render() {
  main.querySelector('.page-title h1')!.textContent = t('atlas.title');
  main.querySelector('.page-title p')!.textContent = t('atlas.lead');
  const locs = [...groups.keys()];
  const shown = students.filter(match);
  document.getElementById('filters')!.innerHTML =
    sel('location', [['all', t('f.all')], ...locs.map((l) => [l, l] as [string, string])]) +
    sel('device', [['all', t('f.all')], ['lidar', t('f.lidar')], ['nolidar', t('f.nolidar')]]) +
    sel('phase', [['all', t('f.all')], ['1', t('phase.1')], ['2', t('phase.2')]]) +
    sel('status', [['all', t('f.all')], ['in_progress', t('status.in_progress')], ['final', t('status.final')], ['exhibition', t('status.exhibition')]]) +
    `<span class="label count"><b class="label--signal">${shown.length}</b> / ${students.length} ${t('atlas.count')}</span>`;
  document.querySelectorAll<HTMLSelectElement>('#filters select').forEach((s) => s.addEventListener('change', () => {
    state[s.dataset.k!] = s.value;
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v !== 'all'));
    history.replaceState(null, '', q.toString() ? `?${q}` : location.pathname);
    render();
  }));
  document.getElementById('grid')!.innerHTML = shown.length ? shown.map(cardHtml).join('') : `<p class="notice">${t('atlas.none')}</p>`;
  document.getElementById('map')!.setAttribute('aria-label', t('atlas.title'));
  renderMarkers();
}
render();
onLang(render);
