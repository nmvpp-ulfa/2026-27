// Motion preference. The site is animated by default; visitors switch motion off in the header.
// ?motion=off (or reduced) and ?motion=full override the stored choice for review.
const KEY = 'nmvpp-motion';
type Cb = (on: boolean) => void;
const cbs: Cb[] = [];

function initial(): boolean {
  const q = new URLSearchParams(location.search).get('motion');
  if (q === 'full' || q === 'on') return true;
  if (q === 'off' || q === 'reduced') return false;
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'on' || v === 'off') return v === 'on';
  } catch { /* storage blocked */ }
  return true;
}

let on = initial();
document.documentElement.dataset.motion = on ? 'on' : 'off';

export const motionOn = () => on;
export function setMotion(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* storage blocked */ }
  document.documentElement.dataset.motion = v ? 'on' : 'off';
  cbs.forEach((cb) => cb(v));
}
export const onMotion = (cb: Cb) => { cbs.push(cb); };
