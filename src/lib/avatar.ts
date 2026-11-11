// EXT v0.1: seeded geometric avatar for anonymous students. 5 x 5 mirrored grid, no faces.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function avatarSvg(seed: string, cls = 'avatar'): string {
  const r = rng(hash(seed));
  const cells: string[] = [];
  const signal = Math.floor(r() * 15);
  let k = 0;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      const on = r() > 0.5;
      const isSignal = k++ === signal;
      if (!on && !isSignal) continue;
      const fill = isSignal ? '#FF5A1F' : '#E4E6E1';
      cells.push(`<rect x="${x * 4 + 2}" y="${y * 4 + 2}" width="4" height="4" fill="${fill}"/>`);
      if (x < 2) cells.push(`<rect x="${(4 - x) * 4 + 2}" y="${y * 4 + 2}" width="4" height="4" fill="${fill}"/>`);
    }
  }
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="#1A1B1D"/>${cells.join('')}<rect x=".5" y=".5" width="23" height="23" fill="none" stroke="#2E3032"/></svg>`;
}
