// Shared header, demo bar and footer.
import { initLang, lang, onLang, setLang, t, type Lang } from './i18n';
import { course, isDemo, rich, url } from './data';
import { motionOn, onMotion, setMotion } from './motion';

// Student cards tilt towards the pointer (delegated, works for cards rendered later).
function cardTilt() {
  let cur: HTMLElement | null = null;
  const reset = () => { if (cur) { cur.style.removeProperty('--rx'); cur.style.removeProperty('--ry'); cur = null; } };
  document.addEventListener('pointermove', (e) => {
    const card = (e.target as HTMLElement).closest?.('.card') as HTMLElement | null;
    if (card !== cur) reset();
    if (!card || !motionOn() || e.pointerType === 'touch') return;
    cur = card;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--rx', `${((0.5 - y) * 9).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${((x - 0.5) * 11).toFixed(2)}deg`);
    card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  });
  document.addEventListener('pointerleave', reset);
}

type Page = 'story' | 'atlas' | 'compare' | 'student';

// University logo: official UL FA "znak s pripisom", white horizontal version, SL or EN by page language.
// Source: uni-lj.si, Celostna grafična podoba, Znak s pripisom, package UL-FA-logo.zip.
// If the file is missing the header and footer fall back to text.
const logoSrc = () => `brand/ul_fa_logo_hor_white_${lang() === 'en' ? 'en' : 'sl'}_v1_2026-11-11.png`;
const logoImg = (cls: string) =>
  `<img class="${cls}" src="${url(logoSrc())}" alt="${t('uni.ul')}, ${t('uni.fa')}" hidden onload="this.hidden=false;this.parentElement.classList.add('has-logo')" onerror="this.remove()">`;

// Course facts (name, academic year, holder, course page) from content/course.json.
export function courseBlock(cls = '') {
  const L = lang();
  const page = course.course_url
    ? `<a href="${course.course_url}" target="_blank" rel="noopener">${course.course_url.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗</a>`
    : rich('[vnesi]');
  return `<div class="course ${cls}">
    <div class="course-name"><span class="label label--signal">${course.code}</span><b>${course.name[L]}</b></div>
    <dl class="kv">
      <dt>${t('course.year')}</dt><dd>${course.year}</dd>
      <dt>${t('course.holder')}</dt><dd>${course.holder}</dd>
      <dt>${t('course.page')}</dt><dd>${page}</dd>
    </dl>
  </div>`;
}

export function mountChrome(page: Page) {
  initLang();
  const hdr = document.createElement('header');
  hdr.className = 'hdr';
  const demo = document.createElement('div');
  demo.className = 'demo-bar';
  const ftr = document.createElement('footer');
  ftr.className = 'ftr';
  document.body.prepend(hdr, demo);
  document.body.append(ftr);

  const render = () => {
    const cur = (p: Page) => (p === page || (page === 'student' && p === 'atlas') ? ' aria-current="page"' : '');
    hdr.innerHTML = `<div class="wrap hdr-in">
      <a class="wordmark" href="${url('')}" aria-label="NMVPP, ${course.name[lang()]}">NM<b>VPP</b></a>
      <span class="hdr-year" title="${t('course.year')}">${course.year}</span>
      <nav class="nav" aria-label="Glavni meni">
        <a href="${url('')}"${cur('story')}><span class="num">01</span>${t('nav.story')}</a>
        <a href="${url('explore/')}"${cur('atlas')}><span class="num">02</span>${t('nav.atlas')}</a>
        <a href="${url('compare/')}"${cur('compare')}><span class="num">03</span>${t('nav.compare')}</a>
        <span class="soon"><span class="num">04</span>${t('nav.exhibition')} <i>v0.3</i></span>
        <span class="soon"><span class="num">05</span>${t('nav.protocol')} <i>v0.2</i></span>
        <span class="soon"><span class="num">06</span>${t('nav.about')} <i>v0.2</i></span>
      </nav>
      <div class="lang" role="group" aria-label="Jezik / Language">
        <button type="button" data-l="sl" aria-pressed="${lang() === 'sl'}">SL</button>
        <button type="button" data-l="en" aria-pressed="${lang() === 'en'}">EN</button>
      </div>
      <button type="button" class="motion-tg" aria-pressed="${motionOn()}" title="${t('motion.title')}">
        <i aria-hidden="true"></i>${t('motion.label')} <b>${motionOn() ? t('motion.on') : t('motion.off')}</b>
      </button>
      <a class="ulfa" href="https://www.fa.uni-lj.si/" title="${t('uni.ul')}, ${t('uni.fa')}">${logoImg('ulfa-logo')}<span class="ulfa-txt">UL FA</span></a>
    </div>`;
    hdr.querySelectorAll<HTMLButtonElement>('.lang button').forEach((b) =>
      b.addEventListener('click', () => setLang(b.dataset.l as Lang)));
    hdr.querySelector('.motion-tg')!.addEventListener('click', () => setMotion(!motionOn()));
    demo.innerHTML = isDemo
      ? `<div class="wrap"><strong>${t('demo.tag')} //</strong><span>${t('demo.bar')}</span></div>`
      : `<div class="wrap"><strong>${t('state.tag')} //</strong><span>${t('state.bar')}</span></div>`;
    ftr.innerHTML = `<div class="wrap ftr-uni">
      ${courseBlock('ftr-course')}
      <a class="uni" href="${course.faculty_url}">${logoImg('uni-logo')}<span class="uni-txt"><b>${t('uni.ul')}</b><span>${t('uni.fa')}</span></span></a>
    </div>
    <div class="wrap">
      <span class="label">${course.code} // ${course.name[lang()]} // ${course.year}</span>
      <span class="label">Index_Code: NMVPP_web_v0.1</span>
    </div>`;
  };
  render();
  onLang(render);
  onMotion(render);
  cardTilt();
}
