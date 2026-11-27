// Generalised model from planar rectangles (model JSON). v0.1 uses JSON; GLB follows in v0.2.
// Each layer (01_FLOORS ... 05_OPENINGS) is its own group, so the story can tint and explode layers.
import * as THREE from 'three';

export interface Surf { layer: string; o: number[]; u: number[]; v: number[]; lu: number; lv: number; holes: number[][] }
// Mesh models (from Rhino): triangles per layer plus outline polylines.
export interface MeshPart { layer: string; pos: number[]; idx: number[] }
// pts = polyline; with segs, pts are independent segments (pairs of points), e.g. sharp edges of a mesh
export interface LinePart { layer: string; pts: number[]; segs?: boolean }
export interface ModelJson { surfaces: Surf[]; openings: Surf[]; meshes?: MeshPart[]; lines?: LinePart[] }

const BASE = new THREE.Color('#3A3D40');
// EXT v0.1b: layer tints for the exploded model
export const LAYER_TINT: Record<string, string> = {
  '01_FLOORS': '#8A8D8F', '02_WALLS': '#4A4C4E', '03_CEILING': '#6B6E70', '04_STAIRS': '#FF5A1F', '05_OPENINGS': '#FF5A1F',
};
// vertical offsets (m) at full explode
const EXPLODE: Record<string, number> = { '01_FLOORS': 0, '04_STAIRS': 1.2, '02_WALLS': 2.4, '05_OPENINGS': 2.4, '03_CEILING': 3.7 };

function outline(s: Surf, out: number[]) {
  const o = new THREE.Vector3(...s.o), u = new THREE.Vector3(...s.u), v = new THREE.Vector3(...s.v);
  const at = (a: number, b: number) => o.clone().addScaledVector(u, a).addScaledVector(v, b);
  const rect = (a0: number, b0: number, a1: number, b1: number) => {
    const c = [at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)];
    for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; out.push(p.x, p.y, p.z, q.x, q.y, q.z); }
  };
  rect(0, 0, s.lu, s.lv);
  for (const h of s.holes) rect(h[0], h[1], h[2], h[3]);
}

function lines(pts: number[], mat: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, mat);
}

export function buildModel(json: ModelJson, clippingPlanes: THREE.Plane[] = []) {
  const group = new THREE.Group();
  const edgeMat = new THREE.LineBasicMaterial({ color: '#E4E6E1', transparent: true, opacity: 0.95, clippingPlanes });
  const openMat = new THREE.LineBasicMaterial({ color: '#FF5A1F', transparent: true, opacity: 0.95, clippingPlanes });
  const layers = new Map<string, { g: THREE.Group; mat: THREE.MeshBasicMaterial; edges: number[] }>();
  const layer = (name: string) => {
    let L = layers.get(name);
    if (!L) {
      const g = new THREE.Group();
      g.userData.layer = name;
      group.add(g);
      const mat = new THREE.MeshBasicMaterial({
        color: BASE.clone(), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, clippingPlanes,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      });
      L = { g, mat, edges: [] };
      layers.set(name, L);
    }
    return L;
  };

  for (const s of json.surfaces) {
    const L = layer(s.layer);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(s.lu, 0); shape.lineTo(s.lu, s.lv); shape.lineTo(0, s.lv); shape.closePath();
    for (const h of s.holes) {
      const p = new THREE.Path();
      p.moveTo(h[0], h[1]); p.lineTo(h[0], h[3]); p.lineTo(h[2], h[3]); p.lineTo(h[2], h[1]); p.closePath();
      shape.holes.push(p);
    }
    const geo = new THREE.ShapeGeometry(shape);
    const u = new THREE.Vector3(...s.u), v = new THREE.Vector3(...s.v);
    const n = new THREE.Vector3().crossVectors(u, v).normalize();
    geo.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, n).setPosition(...(s.o as [number, number, number])));
    const mesh = new THREE.Mesh(geo, L.mat);
    mesh.userData.layer = s.layer;
    L.g.add(mesh);
    outline(s, L.edges);
  }
  for (const m of json.meshes ?? []) {
    const L = layer(m.layer);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
    geo.setIndex(m.idx);
    const mesh = new THREE.Mesh(geo, L.mat);
    mesh.userData.layer = m.layer;
    L.g.add(mesh);
  }
  const openPts: number[] = [];
  for (const l of json.lines ?? []) {
    const out = l.layer === '05_OPENINGS' ? openPts : layer(l.layer).edges;
    if (l.segs) { for (let i = 0; i < l.pts.length; i++) out.push(l.pts[i]); continue; }
    for (let i = 0; i + 5 < l.pts.length; i += 3) out.push(l.pts[i], l.pts[i + 1], l.pts[i + 2], l.pts[i + 3], l.pts[i + 4], l.pts[i + 5]);
  }
  if (openPts.length) layer('05_OPENINGS').g.add(lines(openPts, openMat));
  for (const L of layers.values()) if (L.edges.length) L.g.add(lines(L.edges, edgeMat));

  const op: number[] = [];
  for (const s of json.openings) outline({ ...s, holes: [] }, op);
  if (op.length) layer('05_OPENINGS').g.add(lines(op, openMat));

  group.userData = { surfMats: [...layers.values()].map((L) => L.mat), edgeMat, openMat, layers };
  return group;
}

export function setModelOpacity(group: THREE.Group, surf: number, edge: number) {
  const { surfMats, edgeMat, openMat } = group.userData;
  for (const m of surfMats as THREE.MeshBasicMaterial[]) m.opacity = surf;
  edgeMat.opacity = edge; openMat.opacity = edge;
  group.visible = surf > 0.001 || edge > 0.001;
}

// k = 0 graphite, 1 layer colours
export function setModelTint(group: THREE.Group, k: number) {
  const layers = group.userData.layers as Map<string, { mat: THREE.MeshBasicMaterial }>;
  for (const [name, L] of layers) L.mat.color.copy(BASE).lerp(new THREE.Color(LAYER_TINT[name] ?? '#3A3D40'), k);
}

// e = 0 assembled, 1 fully exploded (layers lifted apart)
export function setModelExplode(group: THREE.Group, e: number) {
  const layers = group.userData.layers as Map<string, { g: THREE.Group }>;
  for (const [name, L] of layers) L.g.position.z = (EXPLODE[name] ?? 0) * e;
}
