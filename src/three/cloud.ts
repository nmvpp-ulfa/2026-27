// Point cloud loading and shaders. Coordinates are metres, z up.
import * as THREE from 'three';

export async function fetchBuffer(path: string): Promise<ArrayBuffer> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.arrayBuffer();
}
export async function fetchJson<T = any>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

// sRGB values written straight to the canvas (ShaderMaterial does no colour conversion).
export const RAMP_GLSL = /* glsl */ `
vec3 rampHeight(float h) {
  vec3 c0 = vec3(0.180, 0.188, 0.196);
  vec3 c1 = vec3(0.357, 0.369, 0.376);
  vec3 c2 = vec3(0.725, 0.741, 0.718);
  vec3 c3 = vec3(1.000, 0.353, 0.122);
  if (h < 0.45) return mix(c0, c1, h / 0.45);
  if (h < 0.85) return mix(c1, c2, (h - 0.45) / 0.40);
  return mix(c2, c3, (h - 0.85) / 0.15);
}
vec3 rampDev(float d) {
  vec3 a = vec3(0.420, 0.431, 0.439);
  vec3 b = vec3(0.894, 0.902, 0.882);
  vec3 c = vec3(1.000, 0.353, 0.122);
  if (d < 0.03) return mix(a, b, d / 0.03);
  return mix(b, c, clamp((d - 0.03) / 0.02, 0.0, 1.0));
}
`;

export const srgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// ---------------------------------------------------------------- story cloud
export interface StoryMeta {
  count: number; maxOrder: number;
  bounds: { min: number[]; max: number[] };
  scanB: { rotDeg: number; pivot: number[]; t: number[] };
  model: string; plan: string;
  demo?: boolean;
  // geometry-specific story set-up (scanner positions, video path, check dimensions, slice heights)
  scene?: { scanA: number[]; scanB: number[]; path: number[][]; dims: { key: string; a: number[]; b: number[]; tick: number[] }[]; slices: number[] };
}

export async function loadStoryCloud(path: string, meta: StoryMeta, stride = 1) {
  const buf = await fetchBuffer(path);
  const n = meta.count;
  const pos = new Int16Array(buf, 0, 3 * n);
  const tgt = new Int16Array(buf, 6 * n, 3 * n);
  const attr = new Uint8Array(buf, 12 * n, n);
  const order = new Uint8Array(buf, 13 * n, n);
  const m = Math.floor(n / stride);
  const P = new Float32Array(3 * m), Tg = new Float32Array(3 * m), A = new Float32Array(m), O = new Float32Array(m);
  for (let i = 0, j = 0; j < m; i += stride, j++) {
    for (let k = 0; k < 3; k++) { P[3 * j + k] = pos[3 * i + k] * 0.001; Tg[3 * j + k] = tgt[3 * i + k] * 0.001; }
    A[j] = attr[i]; O[j] = order[i];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aTarget', new THREE.BufferAttribute(Tg, 3));
  g.setAttribute('aAttr', new THREE.BufferAttribute(A, 1));
  g.setAttribute('aOrder', new THREE.BufferAttribute(O, 1));
  g.computeBoundingSphere();
  return g;
}

export function storyMaterial(meta: StoryMeta) {
  const b = meta.bounds;
  const center = new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSize: { value: 0.016 }, uScale: { value: 400 },
      uZmin: { value: b.min[2] }, uZmax: { value: b.max[2] },
      uAlign: { value: 0 }, uRot: { value: THREE.MathUtils.degToRad(meta.scanB.rotDeg) }, uSearch: { value: 0 },
      uPivot: { value: new THREE.Vector3(...meta.scanB.pivot) }, uShift: { value: new THREE.Vector3(...meta.scanB.t) },
      uCenter: { value: center },
      uScanTint: { value: 1 }, uSlice: { value: -10 }, uSliceOn: { value: 0 }, uSliceX: { value: -10 }, uSliceXOn: { value: 0 },
      uReveal: { value: 0 }, uRevealOn: { value: 0 }, uCollapse: { value: 0 }, uClutter: { value: 0 }, uClutterHi: { value: 0 },
      uTime: { value: 0 }, uAspect: { value: 1 }, uMouse: { value: new THREE.Vector2(9, 9) }, uMouseOn: { value: 0 },
      uWaveOn: { value: 0 }, uCapHide: { value: 0 }, uCapR: { value: 99 }, uCapOn: { value: 0 },
      uScanA: { value: new THREE.Vector3() }, uScanB: { value: new THREE.Vector3() },
      uTilt: { value: 0 }, uNoise: { value: 0 }, uOutHi: { value: 0 }, uOutRemove: { value: 0 }, uVoxel: { value: 0 },
      uProbe: { value: new THREE.Vector3() }, uProbeOn: { value: 0 }, uFade: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aTarget;
      attribute float aAttr;
      attribute float aOrder;
      uniform float uSize, uScale, uZmin, uZmax, uAlign, uRot, uSearch, uScanTint, uSlice, uSliceOn, uSliceX, uSliceXOn;
      uniform float uReveal, uRevealOn, uCollapse, uClutter, uClutterHi;
      uniform float uTime, uAspect, uMouseOn, uWaveOn, uCapHide, uCapR, uCapOn, uTilt, uNoise, uOutHi, uOutRemove, uVoxel, uProbeOn, uFade;
      uniform vec2 uMouse;
      uniform vec3 uPivot, uShift, uCenter, uScanA, uScanB, uProbe;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vVox;
      ${RAMP_GLSL}
      float hash(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        float scan = mod(aAttr, 2.0);
        float layer = mod(floor(aAttr / 2.0), 8.0);
        float isLine = floor(aAttr / 16.0);
        float isClutter = step(4.5, layer);
        float r1 = hash(position.xy + position.z);
        float stagger = hash(position.xy) * 0.35;
        float c = clamp((uCollapse - stagger) / 0.65, 0.0, 1.0);
        c = c * c * (3.0 - 2.0 * c);
        vec3 p = mix(position, aTarget, c);
        // raw scans carry a few outliers that cleaning removes (step 02)
        float isOut = step(r1, 0.025) * (1.0 - isLine);
        vec3 jit = vec3(hash(position.yz), hash(position.zx), hash(position.xy * 1.7)) - 0.5;
        p += jit * 1.6 * uNoise * isOut;
        // scan B is misaligned until step 03; the search turns it once around
        if (scan > 0.5) {
          float k = 1.0 - uAlign;
          float a = uRot * k + uSearch;
          vec3 q = p - uPivot;
          p = vec3(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a), q.z) + uPivot + uShift * k;
        }
        // the raw cloud is not level until step 02
        vec3 q = p - uCenter;
        float ct = cos(uTilt), st = sin(uTilt);
        p = vec3(q.x, q.y * ct - q.z * st, q.y * st + q.z * ct) + uCenter;
        // voxel grid (exaggerated for legibility)
        p = mix(p, floor(p / 0.12 + 0.5) * 0.12, uVoxel);

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        vec3 cO = vec3(1.0, 0.353, 0.122);
        vec3 cW = vec3(0.894, 0.902, 0.882);
        vec3 cY = vec3(1.0, 0.761, 0.239);
        float h = clamp((position.z - uZmin) / (uZmax - uZmin), 0.0, 1.0);
        vec3 col = rampHeight(h);
        col = mix(col, scan > 0.5 ? cO : cW * 0.8, uScanTint);
        float alpha = 0.92;

        // step 01: the scene dissolves, two scanners capture it again; rings run out from each scanner
        float dScan = distance(position, scan > 0.5 ? uScanB : uScanA);
        float seen = 1.0 - smoothstep(uCapR - 0.3, uCapR, dScan);
        alpha *= mix(1.0, mix(0.04, 1.0, seen), uCapHide);
        float front = mod(uTime * 2.2 + scan * 2.5, 9.0);
        float ring = uCapOn * exp(-pow((dScan - front) / 0.16, 2.0)) * (1.0 - front / 9.0);
        ring += uCapHide * exp(-pow((dScan - uCapR) / 0.22, 2.0));
        col = mix(col, scan > 0.5 ? vec3(1.0, 0.78, 0.62) : vec3(1.0), clamp(ring, 0.0, 1.0));

        // step 02: outliers and loose objects are flagged, then removed
        col = mix(col, cY, isOut * uOutHi);
        alpha *= 1.0 - isOut * uOutRemove;
        col = mix(col, cY, isClutter * uClutterHi);
        col = mix(col, cW, uVoxel * 0.45);

        // step 04: points seen from the current video frame light up
        float pr = uProbeOn * (1.0 - smoothstep(0.5, 1.9, distance(p, uProbe)));
        col = mix(col, cW, pr);

        // step 06: horizontal and vertical slices
        float sl = 1.0 - smoothstep(0.0, 0.05, abs(position.z - uSlice));
        col = mix(col, cO, sl * uSliceOn);
        float sx = 1.0 - smoothstep(0.0, 0.05, abs(position.x - uSliceX));
        col = mix(col, cW, sx * uSliceXOn);
        // step 06: detected planes light up one after another, the rest stays dim
        float rev = step(0.5, aOrder) * step(aOrder, uReveal);
        float fresh = rev * (1.0 - smoothstep(2.0, 14.0, uReveal - aOrder));
        vec3 revCol = rev > 0.5 ? mix(cW * 0.75, cO, fresh) : col * 0.3;
        col = mix(col, revCol, uRevealOn);

        alpha *= 1.0 - isClutter * uClutter;
        if (isLine > 0.5) { col = mix(col, cW, c); alpha = mix(alpha, 1.0, c * (1.0 - isClutter)); }
        else { alpha *= mix(1.0, 0.10, c); }
        alpha *= uFade;

        // scanning wave (hero and step 09)
        float wz = uZmin - 0.6 + mod(uTime * 0.85, uZmax - uZmin + 1.2);
        float wave = uWaveOn * exp(-pow((p.z - wz) / 0.09, 2.0));
        col = mix(col, cO, wave);
        alpha = min(1.0, alpha * (1.0 + wave * 0.6));

        // pointer: points near the cursor glow and step aside
        vec2 ndc = gl_Position.xy / gl_Position.w;
        vec2 dm = (ndc - uMouse) * vec2(uAspect, 1.0);
        float md = length(dm);
        float hov = uMouseOn * (1.0 - smoothstep(0.0, 0.17, md)) * step(0.0, gl_Position.w);
        gl_Position.xy += (dm / max(md, 1e-4)) / vec2(uAspect, 1.0) * hov * 0.035 * gl_Position.w;
        col = mix(col, cO, hov * 0.9);

        vColor = col;
        vAlpha = alpha * mix(1.0, 0.55, uVoxel);
        float sz = uSize * uScale / max(0.1, -mvPosition.z);
        sz *= 1.0 + hov * 1.3 + wave * 0.9 + ring * 0.8 + isOut * uOutHi * (1.0 - uOutRemove) * 1.5;
        // voxel grid: square points about one cell wide
        sz = mix(sz, 0.1 * uScale / max(0.1, -mvPosition.z), uVoxel);
        vVox = uVoxel;
        gl_PointSize = clamp(sz, 1.0, mix(12.0, 28.0, uVoxel));
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vVox;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        if (vVox < 0.5 && dot(d, d) > 0.25) discard;
        // voxels: square with a darker rim so single cells read
        float rim = vVox > 0.5 ? step(0.38, max(abs(d.x), abs(d.y))) : 0.0;
        gl_FragColor = vec4(vColor * (1.0 - 0.45 * rim), vAlpha);
      }`,
  });
}

// ---------------------------------------------------------------- student cloud
// Layout: int16 mm xyz, uint8 deviation (mm), then optional uint8 rgb (captured colour).
export async function loadStudentCloud(path: string, count: number) {
  const buf = await fetchBuffer(path);
  const pos = new Int16Array(buf, 0, 3 * count);
  const dev = new Uint8Array(buf, 6 * count, count);
  const hasRgb = buf.byteLength >= 10 * count;
  const P = new Float32Array(3 * count), D = new Float32Array(count), C = new Float32Array(3 * count).fill(0.6);
  for (let i = 0; i < 3 * count; i++) P[i] = pos[i] * 0.001;
  for (let i = 0; i < count; i++) D[i] = dev[i] * 0.001;
  if (hasRgb) { const rgb = new Uint8Array(buf, 7 * count, 3 * count); for (let i = 0; i < 3 * count; i++) C[i] = rgb[i] / 255; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aDev', new THREE.BufferAttribute(D, 1));
  g.setAttribute('aRgb', new THREE.BufferAttribute(C, 3));
  g.userData.rgb = hasRgb;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export function viewerMaterial(zmin: number, zmax: number) {
  return new THREE.ShaderMaterial({
    clipping: true,
    uniforms: {
      uSize: { value: 0.018 }, uScale: { value: 400 }, uZmin: { value: zmin }, uZmax: { value: zmax },
      uMode: { value: 0 }, uColor: { value: srgb('#FF5A1F') },
    },
    vertexShader: /* glsl */ `
      #include <clipping_planes_pars_vertex>
      attribute float aDev;
      attribute vec3 aRgb;
      uniform float uSize, uScale, uZmin, uZmax, uMode;
      uniform vec3 uColor;
      varying vec3 vColor;
      ${RAMP_GLSL}
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
        float h = clamp((position.z - uZmin) / (uZmax - uZmin), 0.0, 1.0);
        vec3 col = rampHeight(h);
        if (uMode > 0.5 && uMode < 1.5) col = mix(uColor * 0.55, uColor, h * 0.7 + 0.3);
        if (uMode > 1.5 && uMode < 2.5) col = rampDev(aDev);
        if (uMode > 2.5) col = aRgb;
        vColor = col;
        gl_PointSize = clamp(uSize * uScale / max(0.1, -mvPosition.z), 1.0, 8.0);
      }`,
    fragmentShader: /* glsl */ `
      #include <clipping_planes_pars_fragment>
      varying vec3 vColor;
      void main() {
        #include <clipping_planes_fragment>
        vec2 d = gl_PointCoord - 0.5;
        if (dot(d, d) > 0.25) discard;
        gl_FragColor = vec4(vColor, 1.0);
      }`,
  });
}
