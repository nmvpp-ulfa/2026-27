// Viewer for student pages and comparison: point cloud, generalised model, deviation,
// horizontal section plane and a two-point measuring tool.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { fetchJson, loadStudentCloud, srgb, viewerMaterial } from './cloud';
import { buildModel, setModelOpacity, type ModelJson } from './model';

export type ColorMode = 'height' | 'flat' | 'deviation';
export interface MeasureResult { a: THREE.Vector3; b: THREE.Vector3; d: number }

export class Viewer {
  el: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.05, 300);
  controls: OrbitControls;
  points: THREE.Points | null = null;
  model: THREE.Group | null = null;
  mesh: THREE.Object3D | null = null;
  clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e4);
  bounds = new THREE.Box3();
  onCamera: (() => void) | null = null;
  onStart: (() => void) | null = null;
  private auto = false;
  private lastUser = -1e9;
  private sweep: { from: number; to: number | null; t0: number; ms: number } | null = null;
  private syncing = false;
  private raf = 0;
  private measuring = false;
  private pending: THREE.Vector3 | null = null;
  private marks: { line: THREE.Line; label: HTMLElement; mid: THREE.Vector3 }[] = [];
  private onMeasure: ((r: MeasureResult) => void) | null = null;
  private fmt: (m: number) => string = (m) => `${m.toFixed(2)} m`;
  private down = { x: 0, y: 0 };
  private ro: ResizeObserver;

  constructor(el: HTMLElement) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0c0d0e, 1);
    this.renderer.localClippingEnabled = true;
    el.appendChild(this.renderer.domElement);
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.addEventListener('change', () => { if (!this.syncing && this.onCamera) this.onCamera(); });
    this.controls.addEventListener('start', () => { this.pauseAuto(); this.onStart?.(); });
    this.controls.autoRotateSpeed = 0.8;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
    const cvs = this.renderer.domElement;
    cvs.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY }; });
    cvs.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 5) this.pick(e);
    });
    const loop = () => { this.raf = requestAnimationFrame(loop); this.tick(); };
    loop();
  }

  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.points) (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = h * this.renderer.getPixelRatio() * 0.5;
  }

  async loadCloud(path: string, count: number) {
    const g = await loadStudentCloud(path, count);
    const bb = g.boundingBox!;
    const mat = viewerMaterial(bb.min.z, bb.max.z);
    mat.clippingPlanes = [this.clip];
    this.points = new THREE.Points(g, mat);
    this.scene.add(this.points);
    this.bounds.union(bb);
    this.resize();
  }

  async loadModel(path: string) {
    const json = await fetchJson<ModelJson>(path);
    this.model = buildModel(json, [this.clip]);
    this.scene.add(this.model);
    const bb = new THREE.Box3().setFromObject(this.model);
    this.bounds.union(bb);
  }

  // slow turntable until the visitor takes over; resumes after 8 s without input
  setAutoRotate(on: boolean) { this.auto = on; this.controls.autoRotate = on && !this.measuring; }
  pauseAuto() { this.lastUser = performance.now(); this.controls.autoRotate = false; }

  // the section plane rises from the floor to t (0..1 of the height range) on load
  sweepSection(t: number | null, ms = 1600) {
    if (this.bounds.isEmpty()) { this.setSection(t); return; }
    this.sweepZ(t === null ? null : this.bounds.min.z + t * (this.bounds.max.z - this.bounds.min.z), ms);
  }
  sweepZ(z: number | null, ms = 1600) {
    if (this.bounds.isEmpty()) { this.setSectionZ(z); return; }
    this.sweep = { from: this.bounds.min.z, to: z, t0: performance.now(), ms };
  }

  // Textured scan mesh or student model (GLB, Y up by spec) shown unlit so baked colours read as captured.
  async loadMesh(path: string, onProgress?: (f: number) => void) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(path, (e) => { if (onProgress && e.total) onProgress(e.loaded / e.total); });
    if (this.mesh) { this.scene.remove(this.mesh); this.disposeObject(this.mesh); }
    const root = gltf.scene;
    root.rotation.x = Math.PI / 2; // glTF Y up -> site Z up
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const src = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
      m.material = new THREE.MeshBasicMaterial({
        map: src?.map ?? null, color: src?.map ? 0xffffff : (src?.color ?? new THREE.Color('#8A8D8F')),
        vertexColors: !!m.geometry.getAttribute('color'), side: THREE.DoubleSide, clippingPlanes: [this.clip],
      });
    });
    // put the lowest point on z = 0 like the clouds and models
    const bb = new THREE.Box3().setFromObject(root);
    if (this.bounds.isEmpty()) { root.position.z -= bb.min.z; root.updateMatrixWorld(true); }
    this.mesh = root;
    this.scene.add(root);
    this.bounds.union(new THREE.Box3().setFromObject(root));
  }
  setMeshVisible(on: boolean) { if (this.mesh) this.mesh.visible = on; }
  private disposeObject(o: THREE.Object3D) {
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.map?.dispose(); mat.dispose();
    });
  }

  setCloudVisible(on: boolean) { if (this.points) this.points.visible = on; }
  setModelVisible(on: boolean, surf = 0.5) { if (this.model) setModelOpacity(this.model, on ? surf : 0, on ? 0.95 : 0); }

  setColor(mode: ColorMode, hex = '#FF5A1F') {
    if (!this.points) return;
    const u = (this.points.material as THREE.ShaderMaterial).uniforms;
    u.uMode.value = mode === 'height' ? 0 : mode === 'flat' ? 1 : 2;
    u.uColor.value = srgb(hex);
  }

  // t in 0..1 of the height range; null switches the section off
  setSection(t: number | null) {
    this.sweep = null;
    if (t === null || this.bounds.isEmpty()) { this.clip.constant = 1e4; return; }
    this.clip.constant = this.bounds.min.z + t * (this.bounds.max.z - this.bounds.min.z);
  }
  setSectionZ(z: number | null) { this.sweep = null; this.clip.constant = z === null ? 1e4 : z; }
  sectionHeight() { return this.clip.constant > 1e3 ? null : this.clip.constant; }

  fit() {
    if (this.bounds.isEmpty()) return;
    const c = this.bounds.getCenter(new THREE.Vector3());
    const size = this.bounds.getSize(new THREE.Vector3()).length();
    this.controls.target.copy(c);
    this.camera.position.set(c.x + size * 0.5, c.y - size * 0.66, c.z + size * 0.5);
    this.camera.near = size / 200; this.camera.far = size * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  copyCameraFrom(other: Viewer) {
    this.syncing = true;
    this.camera.position.copy(other.camera.position);
    this.controls.target.copy(other.controls.target);
    this.camera.updateMatrixWorld();
    this.controls.update();
    this.syncing = false;
  }

  setMeasure(on: boolean, cb?: (r: MeasureResult) => void, fmt?: (m: number) => string) {
    this.measuring = on;
    this.pending = null;
    if (cb) this.onMeasure = cb;
    if (fmt) this.fmt = fmt;
    this.el.style.cursor = on ? 'crosshair' : '';
    this.controls.autoRotate = this.auto && !on;
  }
  clearMeasures() {
    for (const m of this.marks) { this.scene.remove(m.line); m.label.remove(); }
    this.marks = [];
    this.pending = null;
  }
  refreshLabels(fmt: (m: number) => string) {
    this.fmt = fmt;
    for (const m of this.marks) m.label.textContent = fmt(Number(m.label.dataset.d));
  }

  private pick(e: PointerEvent) {
    if (!this.measuring) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.params.Points = { threshold: 0.03 };
    ray.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    if (this.points?.visible) targets.push(this.points);
    if (this.model?.visible) this.model.traverse((c) => { if ((c as THREE.Mesh).isMesh) targets.push(c); });
    if (this.mesh?.visible) this.mesh.traverse((c) => { if ((c as THREE.Mesh).isMesh) targets.push(c); });
    const hits = ray.intersectObjects(targets, false).filter((h) => this.clip.distanceToPoint(h.point) >= 0);
    if (!hits.length) return;
    const p = hits[0].point.clone();
    if (!this.pending) { this.pending = p; return; }
    const a = this.pending, b = p, d = a.distanceTo(b);
    this.pending = null;
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#FF5A1F', depthTest: false }));
    line.renderOrder = 10;
    this.scene.add(line);
    const label = document.createElement('div');
    label.className = 'mlabel';
    label.dataset.d = String(d);
    label.textContent = this.fmt(d);
    this.el.appendChild(label);
    this.marks.push({ line, label, mid: a.clone().add(b).multiplyScalar(0.5) });
    this.onMeasure?.({ a, b, d });
  }

  private tick() {
    if (this.sweep) {
      const k = Math.min(1, (performance.now() - this.sweep.t0) / this.sweep.ms);
      const e = 1 - Math.pow(1 - k, 3);
      const top = this.sweep.to ?? this.bounds.max.z + 0.05;
      this.clip.constant = this.sweep.from + (top - this.sweep.from) * e;
      if (k >= 1) { this.clip.constant = this.sweep.to ?? 1e4; this.sweep = null; }
    }
    if (this.auto && !this.measuring && !this.controls.autoRotate && performance.now() - this.lastUser > 8000) this.controls.autoRotate = true;
    this.controls.update();
    const w = this.el.clientWidth, h = this.el.clientHeight;
    for (const m of this.marks) {
      const v = m.mid.clone().project(this.camera);
      m.label.style.left = `${((v.x + 1) / 2) * w}px`;
      m.label.style.top = `${((1 - v.y) / 2) * h}px`;
      m.label.style.display = v.z < 1 ? '' : 'none';
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
