import studentsData from '../../content/students.json';
import stepsData from '../../content/steps.json';
import courseData from '../../content/course.json';
import { lang, t } from './i18n';

export interface Measurement { element: string; tape_cm: number; cloud_cm: number }
export interface Student {
  id: string; demo?: boolean; display_name: string; consent_name: boolean; avatar_seed: string;
  phase: number; status: string; reached_step: number; scene: string;
  location: { name: string; lat: number; lon: number; type: string };
  consent_location_publication: boolean; devices: string[]; lidar: boolean; apps: string[];
  ai_models: { name: string; reached_step: number }[];
  metrics: { points: number; median_dev_cm: number; within_5cm_pct: number; scale_err_cm: number };
  measurements: Measurement[];
  files: {
    pointcloud: string | null; pointcloud_count: number; splat: string | null; mesh: string | null;
    model_glb: string | null; model_json: string | null; plan_svg: string | null;
    sheets: { week: number; file: string | null }[]; downloads: { type: string; file: string | null }[];
  };
  worklog: { date: string; text_sl: string; text_en: string }[];
  exhibition: { selected: boolean | null; print: string | null };
  text_sl: string; text_en: string;
}

export const students: Student[] = (studentsData as { students: Student[] }).students;
export const steps = stepsData as any;
export const course = courseData as {
  code: string; name: { sl: string; en: string }; year: string; holder: string;
  faculty: { sl: string; en: string }; faculty_url: string; course_url: string | null;
};
export const isDemo = (studentsData as { demo?: boolean }).demo === true;

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

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// Escape text and turn [vnesi] / [preveri: ...] markers from the draft into visible tags.
export function rich(s: string | null | undefined): string {
  if (!s) return '';
  return esc(s).replace(/\[(vnesi|preveri)(?::\s*([^\]]*))?\]/g, (_m, kind: string, note?: string) =>
    `<span class="mark mark--${kind}" title="${note ? esc(note) : ''}">${t('mark.' + kind)}${note ? ': ' + note : ''}</span>`);
}
