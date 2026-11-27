import studentsData from '../../content/students.json';
import stepsData from '../../content/steps.json';
import courseData from '../../content/course.json';
import { lang, t } from './i18n';

export interface Exercise {
  n: number; date: string | null; steps: number[];
  title_sl?: string; title_en?: string;
  summary_sl: string[]; summary_en: string[];
  images: { file: string; caption_sl?: string; caption_en?: string }[];
  video: string | null; mesh: string | null; sheet: string | null;
  videos?: { file: string; poster?: string; caption_sl?: string; caption_en?: string }[];
}
export interface Measurement { element: string; tape_cm: number | null; cloud_cm: number; model_cm?: number | null }
export interface Student {
  id: string; demo?: boolean; cover?: string; display_name: string; consent_name: boolean; avatar_seed: string;
  phase: number; status: string; reached_step: number; scene: string;
  location: { name: string; name_en?: string; lat: number | null; lon: number | null; type: string };
  // further capture sites (own location for the final work); planned = from the sign-up sheet, not captured yet
  sites?: { name: string; name_en?: string; lat: number; lon: number; status: 'captured' | 'planned' }[];
  consent_location_publication: boolean; devices: string[]; lidar: boolean | null; apps: string[];
  ai_models: { name: string; reached_step: number }[];
  metrics: { points: number | null; median_dev_cm: number | null; within_5cm_pct: number | null; scale_err_cm: number | null };
  measurements: Measurement[];
  files: {
    pointcloud: string | null; pointcloud_count: number; pointcloud_rgb?: boolean; splat: string | null; mesh: string | null;
    pointcloud_caption_sl?: string; pointcloud_caption_en?: string;
    clouds_extra?: { file: string; count: number; rgb?: boolean; caption_sl: string; caption_en: string; model_json?: string | null }[];
    model_glb: string | null; model_json: string | null; plan_svg: string | null;
    sheets: { week: number; file: string | null }[]; downloads: { type: string; file: string | null }[];
  };
  worklog: { date: string; text_sl: string; text_en: string }[];
  exhibition: { selected: boolean | null; print: string | null };
  exercises?: Exercise[];
  text_sl: string; text_en: string;
}

export const students: Student[] = (studentsData as { students: Student[] }).students;
export const steps = stepsData as any;
export const course = courseData as {
  code: string; name: { sl: string; en: string }; year: string; holder: string;
  faculty: { sl: string; en: string }; faculty_url: string; course_url: string | { sl: string; en: string } | null;
};
export const isDemo = (studentsData as { demo?: boolean }).demo === true;
// date of the last data update (YYYY-MM-DD), shown in the status bar
export const generated = (studentsData as { generated?: string }).generated ?? null;

// Path from the current page to the site root ("." or ".."), set on <html data-root>.
export const root = () => document.documentElement.dataset.root || '.';
export const url = (rel: string) => `${root()}/${rel.replace(/^\//, '')}`;

export const byId = (id: string | null) => students.find((s) => s.id === id) || null;

// Name shown on the site. Anonymous unless consent_name is true.
export function label(s: Student): string {
  if (s.consent_name) return s.display_name;
  const n = s.id.replace(/\D/g, '').padStart(2, '0');
  return lang() === 'sl' ? `Študent ${n}` : `Student ${n}`;
}

export const pick = (obj: any, key: string) => obj?.[lang()]?.[key] ?? obj?.sl?.[key] ?? '';
export const textOf = (s: Student) => (lang() === 'sl' ? s.text_sl : s.text_en);
export const locName = (s: Student) => (lang() === 'en' && s.location.name_en) || s.location.name;
export const hasCoords = (s: Student) => typeof s.location.lat === 'number' && typeof s.location.lon === 'number';

// All published clouds of a student (main cloud first) with their generalised model, if the student uploaded one.
export interface CloudInfo { file: string; count: number; rgb: boolean; caption: string; model: string | null }
export function cloudsOf(s: Student): CloudInfo[] {
  if (!s.files.pointcloud || !s.consent_location_publication) return [];
  const cap = (o: { caption_sl?: string; caption_en?: string }) => (lang() === 'en' ? o.caption_en : o.caption_sl) ?? o.caption_sl ?? '';
  const main: CloudInfo = { file: s.files.pointcloud, count: s.files.pointcloud_count, rgb: !!s.files.pointcloud_rgb,
    caption: cap({ caption_sl: s.files.pointcloud_caption_sl, caption_en: s.files.pointcloud_caption_en }) || t('layer.cloud'), model: s.files.model_json };
  return [main, ...(s.files.clouds_extra || []).map((c) => ({ file: c.file, count: c.count, rgb: c.rgb !== false, caption: cap(c), model: c.model_json ?? null }))];
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// Escape text and turn [vnesi] / [preveri: ...] markers from the draft into visible tags.
export function rich(s: string | null | undefined): string {
  if (!s) return '';
  return esc(s).replace(/\[(vnesi|preveri)(?::\s*([^\]]*))?\]/g, (_m, kind: string, note?: string) =>
    `<span class="mark mark--${kind}" title="${note ? esc(note) : ''}">${t('mark.' + kind)}${note ? ': ' + note : ''}</span>`);
}
