// Interface strings, SL (default) and EN. Content texts live in content/*.json.
export type Lang = 'sl' | 'en';

const KEY = 'nmvpp-lang';
let current: Lang = 'sl';
const listeners: Array<(l: Lang) => void> = [];

export function initLang(): Lang {
  const q = new URLSearchParams(location.search).get('lang');
  let l: Lang = 'sl';
  if (q === 'en' || q === 'sl') l = q;
  else {
    try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'sl') l = v; } catch { /* storage blocked */ }
  }
  current = l;
  document.documentElement.lang = l;
  return l;
}
export const lang = () => current;
export function setLang(l: Lang) {
  current = l;
  document.documentElement.lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* storage blocked */ }
  listeners.forEach((f) => f(l));
}
export const onLang = (f: (l: Lang) => void) => { listeners.push(f); };

const T: Record<Lang, Record<string, string>> = {
  sl: {
    'nav.story': 'Potek dela', 'nav.atlas': 'Atlas', 'nav.compare': 'Primerjava', 'nav.exhibition': 'Razstava',
    'nav.protocol': 'Protokol', 'nav.about': 'O predmetu',
    'demo.tag': 'Demo', 'demo.bar': 'Podatki na strani so umetni in prikazujejo samo ogrodje. Končni izdelki študentov še niso oddani.',
    'footer.course': 'Napredno modeliranje in vizualizacija prostorskih podatkov', 'footer.lead': 'Nosilec: doc. dr. Tomaž Berčič',
    'mark.vnesi': 'vnesi', 'mark.preveri': 'preveri',
    'hero.kicker': 'NMVPP // UL FA 2026/27', 'hero.title': 'Prostor kot podatek.',
    'hero.lead': 'Študenti zajamejo notranje prostore s telefonom in jih pretvorijo v generalizirane, merljive 3D modele. Stran prikazuje njihove zajeme, poskuse in modele za razstavo.',
    'hero.scroll': 'Pomaknite se navzdol', 'hero.scene': 'Prizor: umetni demo oblak stopnišča, ne referenčni zajem FA',
    'step.label': 'Korak', 'step.tools': 'Orodja', 'step.time': 'Čas', 'step.fail': 'Kaj ni delovalo',
    'course.year': 'Šolsko leto', 'course.holder': 'Nosilec predmeta', 'course.page': 'Spletna stran predmeta', 'course.code': 'Predmet',
    'uni.ul': 'Univerza v Ljubljani', 'uni.fa': 'Fakulteta za arhitekturo',
    'motion.label': 'Gibanje', 'motion.on': 'vklop', 'motion.off': 'izklop', 'motion.title': 'Animacije in vrtenje prizorov',
    'scene.drag': 'Povlecite za vrtenje', 'scene.dragTouch': 'Povlecite vodoravno za vrtenje',
    'step.live': 'Prizor v živo', 'step.soon': 'Prizor v0.2', 'step.plan': 'Tloris +1,00, demo',
    'work.title': 'Študentska dela', 'work.lead': 'Zajemi, poskusi in modeli vsakega študenta. Končni izdelki bodo dodani po oddaji.',
    'work.atlas': 'Odpri atlas', 'work.compare': 'Primerjaj dva zajema', 'work.exhibition': 'Razstava: pregled modelov',
    'atlas.title': 'Atlas', 'atlas.lead': 'Lokacije in zajemi študentov. Izberite zajem za podrobnosti.',
    'f.location': 'Lokacija', 'f.device': 'Naprava', 'f.phase': 'Faza', 'f.status': 'Status', 'f.all': 'Vse',
    'f.lidar': 'LiDAR', 'f.nolidar': 'Brez LiDAR-ja', 'phase.1': 'Faza 1: isti prostor', 'phase.2': 'Faza 2: lastna lokacija',
    'status.in_progress': 'V delu', 'status.final': 'Oddano', 'status.exhibition': 'Za razstavo',
    'atlas.count': 'zajemov', 'atlas.none': 'Ni zadetkov za izbrane filtre.', 'atlas.open': 'Odpri',
    'card.step': 'Korak',
    'st.layers': 'Plasti', 'layer.cloud': 'Oblak točk', 'layer.splat': 'Gaussian splat', 'layer.mesh': 'Mreža',
    'layer.model': 'Generaliziran model', 'layer.deviation': 'Odstopanja', 'nodata': 'ni podatkov',
    'st.section': 'Prerez', 'st.off': 'brez', 'st.measure': 'Merjenje', 'st.measureHint': 'Kliknite dve točki.', 'st.clear': 'Počisti',
    'st.desc': 'Opis', 'st.data': 'Podatki', 'st.measurements': 'Meritve', 'st.attempts': 'Poskusi', 'st.sheets': 'Tedenski listi',
    'st.outputs': 'Končni izdelki', 'st.worklog': 'Dnevnik dela', 'st.ai': 'AI modeli in kako daleč so prišli',
    'st.upto': 'do koraka', 'st.week': 'Teden', 'st.missing': 'manjka', 'st.exhibition': 'Razstava', 'st.selected': 'Izbran za razstavo',
    'st.print': 'Tisk', 'st.yourMeas': 'Vaše meritve v pregledovalniku', 'st.compareWith': 'Primerjaj',
    'st.prev': 'Prejšnji', 'st.next': 'Naslednji', 'st.notFound': 'Zajem ne obstaja.',
    'st.noConsentLoc': 'Za to lokacijo ni soglasja za objavo. Prikazan je samo generaliziran model.',
    'el.element': 'Element', 'el.tape': 'Trak', 'el.cloud': 'Oblak', 'el.diff': 'Razlika',
    'el.door_width': 'Širina vrat', 'el.ceiling_height': 'Višina stropa', 'el.wall_length': 'Dolžina stene',
    'm.points': 'Točke', 'm.median': 'Mediana odstopanja', 'm.within': 'Znotraj 5 cm', 'm.scale': 'Napaka merila',
    'm.device': 'Naprava', 'm.app': 'Aplikacija', 'm.phase': 'Faza', 'm.location': 'Lokacija', 'm.status': 'Status', 'm.step': 'Doseženi korak',
    'dev.legend': 'Odstopanje od modela',
    'cmp.title': 'Primerjava', 'cmp.lead': 'Dva zajema s sinhronizirano kamero. Najbolj povedna je faza 1, ko so vsi študenti zajeli isti prostor z različnimi napravami.',
    'cmp.phase1': 'Faza 1: isti prostor, različne naprave', 'cmp.side': 'Vzporedno', 'cmp.swipe': 'Drsnik',
    'cmp.colour': 'Barva', 'cmp.height': 'Po višini', 'cmp.ab': 'A / B', 'cmp.a': 'Zajem A', 'cmp.b': 'Zajem B', 'cmp.metric': 'Podatek',
  },
  en: {
    'nav.story': 'Workflow', 'nav.atlas': 'Atlas', 'nav.compare': 'Compare', 'nav.exhibition': 'Exhibition',
    'nav.protocol': 'Protocol', 'nav.about': 'About',
    'demo.tag': 'Demo', 'demo.bar': 'The data on this site is synthetic and only shows the framework. Final student outputs have not been submitted yet.',
    'footer.course': 'Advanced modelling and visualisation of spatial data', 'footer.lead': 'Course lead: doc. dr. Tomaž Berčič',
    'mark.vnesi': 'to enter', 'mark.preveri': 'to verify',
    'hero.kicker': 'NMVPP // UL FA 2026/27', 'hero.title': 'Space as data.',
    'hero.lead': 'Students capture interior spaces with a phone and turn them into generalised, measurable 3D models. The site shows their captures, attempts and the models for the exhibition.',
    'hero.scroll': 'Scroll down', 'hero.scene': 'Scene: synthetic demo stair hall, not the FA reference capture',
    'step.label': 'Step', 'step.tools': 'Tools', 'step.time': 'Time', 'step.fail': 'What did not work',
    'course.year': 'Academic year', 'course.holder': 'Course holder', 'course.page': 'Course page', 'course.code': 'Course',
    'uni.ul': 'University of Ljubljana', 'uni.fa': 'Faculty of Architecture',
    'motion.label': 'Motion', 'motion.on': 'on', 'motion.off': 'off', 'motion.title': 'Animation and scene rotation',
    'scene.drag': 'Drag to rotate', 'scene.dragTouch': 'Swipe sideways to rotate',
    'step.live': 'Live scene', 'step.soon': 'Scene in v0.2', 'step.plan': 'Plan +1.00, demo',
    'work.title': 'Student work', 'work.lead': 'Captures, attempts and models of each student. Final outputs will be added after submission.',
    'work.atlas': 'Open the atlas', 'work.compare': 'Compare two captures', 'work.exhibition': 'Exhibition: model lineup',
    'atlas.title': 'Atlas', 'atlas.lead': 'Student sites and captures. Select a capture for details.',
    'f.location': 'Location', 'f.device': 'Device', 'f.phase': 'Phase', 'f.status': 'Status', 'f.all': 'All',
    'f.lidar': 'LiDAR', 'f.nolidar': 'No LiDAR', 'phase.1': 'Phase 1: same space', 'phase.2': 'Phase 2: own site',
    'status.in_progress': 'In progress', 'status.final': 'Submitted', 'status.exhibition': 'For the exhibition',
    'atlas.count': 'captures', 'atlas.none': 'No captures match the filters.', 'atlas.open': 'Open',
    'card.step': 'Step',
    'st.layers': 'Layers', 'layer.cloud': 'Point cloud', 'layer.splat': 'Gaussian splat', 'layer.mesh': 'Mesh',
    'layer.model': 'Generalised model', 'layer.deviation': 'Deviation', 'nodata': 'no data',
    'st.section': 'Section', 'st.off': 'off', 'st.measure': 'Measure', 'st.measureHint': 'Click two points.', 'st.clear': 'Clear',
    'st.desc': 'Description', 'st.data': 'Data', 'st.measurements': 'Measurements', 'st.attempts': 'Attempts', 'st.sheets': 'Weekly sheets',
    'st.outputs': 'Final outputs', 'st.worklog': 'Work log', 'st.ai': 'AI models and how far each got',
    'st.upto': 'up to step', 'st.week': 'Week', 'st.missing': 'missing', 'st.exhibition': 'Exhibition', 'st.selected': 'Selected for the exhibition',
    'st.print': 'Print', 'st.yourMeas': 'Your measurements in the viewer', 'st.compareWith': 'Compare',
    'st.prev': 'Previous', 'st.next': 'Next', 'st.notFound': 'This capture does not exist.',
    'st.noConsentLoc': 'There is no consent to publish this site. Only the generalised model is shown.',
    'el.element': 'Element', 'el.tape': 'Tape', 'el.cloud': 'Cloud', 'el.diff': 'Difference',
    'el.door_width': 'Door width', 'el.ceiling_height': 'Ceiling height', 'el.wall_length': 'Wall length',
    'm.points': 'Points', 'm.median': 'Median deviation', 'm.within': 'Within 5 cm', 'm.scale': 'Scale error',
    'm.device': 'Device', 'm.app': 'App', 'm.phase': 'Phase', 'm.location': 'Location', 'm.status': 'Status', 'm.step': 'Step reached',
    'dev.legend': 'Deviation from the model',
    'cmp.title': 'Compare', 'cmp.lead': 'Two captures with synced cameras. Phase 1 is the most meaningful: all students captured the same space with different devices.',
    'cmp.phase1': 'Phase 1: same space, different devices', 'cmp.side': 'Side by side', 'cmp.swipe': 'Swipe',
    'cmp.colour': 'Colour', 'cmp.height': 'By height', 'cmp.ab': 'A / B', 'cmp.a': 'Capture A', 'cmp.b': 'Capture B', 'cmp.metric': 'Metric',
  },
};

export const t = (key: string) => T[current][key] ?? T.sl[key] ?? key;

// Numbers: decimal comma in SL, point in EN.
export function num(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  const s = v.toLocaleString(current === 'sl' ? 'sl-SI' : 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return s;
}
export const int = (v: number) => v.toLocaleString(current === 'sl' ? 'sl-SI' : 'en-GB');
