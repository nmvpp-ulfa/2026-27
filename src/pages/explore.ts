// "/explore" Atlas: map of FA and central Ljubljana with pins, filters and a card grid.
import '../styles/base.css';
import 'leaflet/dist/leaflet.css';
import '../styles/pages.css';
// Leaflet 1.9 has no "module" field; import its ES build directly.
import * as L from 'leaflet/dist/leaflet-src.esm.js';
import { mountChrome } from '../lib/chrome';
import { lang, onLang, t } from '../lib/i18n';
import { label, students, url, type Student, hasCoords } from '../lib/data';
import { cardHtml } from '../lib/cards';

mountChrome('atlas');
const main = document.getElementById('main')!;
const state: Record<string, string> = { location: 'all', device: 'all', phase: 'all', status: 'all' };
const params = new URLSearchParams(location.search);
for (const k of Object.keys(state)) if (params.get(k)) state[k] = params.get(k)!;

// site = building or place, the part of the location name before the comma (UL FA, klet -> UL FA)
const siteOf = (name: string) => name.split(',')[0].trim();
interface Place { name: string; en: string; lat: number; lon: number; status: 'captured' | 'planned' }
// every place of a student: the main location of the exercises and further capture sites
const places = (s: Student): Place[] => [
  ...(hasCoords(s) ? [{ name: siteOf(s.location.name), en: siteOf(s.location.name_en || s.location.name), lat: s.location.lat as number, lon: s.location.lon as number, status: 'captured' as const }] : []),
  ...(s.sites || []).map((p) => ({ name: siteOf(p.name), en: siteOf(p.name_en || p.name), lat: p.lat, lon: p.lon, status: p.status })),
];
const match = (s: Student) =>
  (state.location === 'all' || places(s).some((p) => p.name === state.location)) &&
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
interface Group { place: Place; entries: { s: Student; status: Place['status'] }[] }
const groups = new Map<string, Group>();
for (const s of students) for (const p of places(s)) {
  const g = groups.get(p.name) || { place: p, entries: [] };
  if (!g.entries.some((e) => e.s === s)) g.entries.push({ s, status: p.status });
  groups.set(p.name, g);
}
const markers: { g: Group; m: L.Marker }[] = [];
for (const g of groups.values()) {
  const m = L.marker([g.place.lat, g.place.lon], { icon: L.divIcon({ className: '', html: '', iconSize: [0, 0] }) }).addTo(map);
  markers.push({ g, m });
}
{
  const pts = [...groups.values()].map((g) => [g.place.lat, g.place.lon] as [number, number]);
  // pin labels run to the right of the pin: keep more room on the right edge
  if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [40, 40], paddingBottomRight: [230, 40] });
  else if (pts.length === 1) map.setView(pts[0], 15);
}

function renderMarkers() {
  for (const { g, m } of markers) {
    const on = g.entries.filter((e) => match(e.s));
    const planned = g.entries.every((e) => e.status === 'planned');
    const name = lang() === 'en' ? g.place.en : g.place.name;
    m.setIcon(L.divIcon({
      className: '', iconAnchor: [13, 13],
      html: `<div class="pin${on.length ? '' : ' dim'}${planned ? ' pin--plan' : ''}"><b>${on.length}</b><span>${name}${planned ? ` // ${t('atlas.planned')}` : ''}</span></div>`,
    }));
    m.bindPopup(`<div class="label">${name}</div>${g.entries.map(({ s, status }) =>
      `<a href="${url('student/?id=' + s.id)}">${s.id.toUpperCase()} // ${label(s)}${status === 'planned' ? ` <span class="pop-tag">${t('atlas.planned')}</span>` : ''}</a>`).join('')}`);
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
