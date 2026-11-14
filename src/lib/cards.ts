// Student card used on the story page and in the Atlas.
import { avatarSvg } from './avatar';
import { label, locName, url, type Student } from './data';
import { lang, t } from './i18n';

export function deviceLabel(s: Student) {
  const dev = s.devices.length ? s.devices.join(', ') + ', ' : '';
  const l = s.lidar === null ? t('notStated') : s.lidar ? t('f.lidar') : t('f.nolidar');
  return `${dev}${l}${s.demo ? ' (demo)' : ''}`;
}
export function appLabel(s: Student) {
  return s.apps.map((a) => (lang() === 'en' ? a.replace('fotogrametrija', 'photogrammetry') : a)).join(', ');
}
export function stepsBar(n: number) {
  return `<div class="steps-bar" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
}

// Without a plan drawing yet: the nine steps, the ones covered by the exercises lit.
function thumbSteps(s: Student) {
  const done = new Set((s.exercises ?? []).flatMap((e) => e.steps));
  return `<div class="thumb-steps" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<span class="${done.has(i + 1) ? 'on' : ''}">${String(i + 1).padStart(2, '0')}</span>`).join('')}</div>`;
}

export function cardHtml(s: Student) {
  const name = label(s);
  return `<a class="card" href="${url('student/?id=' + s.id)}">
    <div class="card-top">
      <span class="label">${s.id.toUpperCase()} // ${t('phase.' + s.phase)}</span>
      ${s.demo ? `<span class="badge badge--demo">${t('demo.tag')}</span>` : ''}
    </div>
    <div class="card-thumb">${s.files.plan_svg ? `<img src="${url(s.files.plan_svg)}" alt="${lang() === 'sl' ? 'Tloris' : 'Plan'}, ${name}" loading="lazy">` : thumbSteps(s)}</div>
    <div class="card-body">
      <div class="card-name">${avatarSvg(s.avatar_seed)}${name}</div>
      <dl class="kv">
        <dt>${t('m.location')}</dt><dd>${locName(s)}</dd>
        <dt>${t('m.device')}</dt><dd>${deviceLabel(s)}</dd>
        <dt>${t('m.status')}</dt><dd class="live">${t('status.' + s.status)}</dd>
      </dl>
      <div><div class="label">${t('card.step')} ${String(s.reached_step).padStart(2, '0')} / 09</div>${stepsBar(s.reached_step)}</div>
    </div>
  </a>`;
}
