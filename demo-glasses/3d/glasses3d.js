/* Procedural 3D sunglasses + a small drag-to-rotate viewer. Needs ./three-lite.js */
import * as T from './three-lite.js';

const V2 = (x, y) => new T.Vector2(x, y);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

/* ---------- lens contours (right lens, local coords, +x = temple side) ---------- */
function superellipse(n, a, b, N = 140) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
  }
  return pts;
}
export const STYLES = {
  round:    { a: 24, b: 24, make: () => superellipse(2, 24, 24) },
  panto:    { a: 25, b: 22, make: () => superellipse(2, 25, 22).map(([x, y]) => [x, y + 0.5 * Math.max(0, x) / 25]) },
  square:   { a: 27, b: 20, make: () => superellipse(3.6, 27, 20).map(([x, y]) => [x * (1 + 0.06 * y / 20), y - 0.06 * x]) },
  wayfarer: { a: 28, b: 20, make: () => superellipse(3.0, 28, 20).map(([x, y]) => { const u = (x + 28) / 56; return [x * (1 + 0.1 * Math.max(0, y) / 20), y * (y < 0 ? 0.9 : 1) + 2.5 * u]; }) },
  cat:      { a: 28, b: 20, make: () => superellipse(3.2, 28, 19).map(([x, y]) => { const u = (x + 28) / 56, up = Math.pow(u, 2.6) * 15; return [x * (1 + 0.05 * u), y < 0 ? y * (1 - 0.2 * u) + up * .55 : y + up]; }) },
  aviator:  { a: 29, b: 24, make: () => superellipse(2.5, 29, 24).map(([x, y]) => [x * (1 - 0.2 * Math.max(0, -y / 24)) + 1, y < 0 ? y * 1.12 : y]) },
  oversize: { a: 31, b: 27, make: () => superellipse(3.0, 31, 27).map(([x, y]) => [x, y + 2.5 * (x + 31) / 62]) },
};

function offsetContour(pts, thick) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const t = typeof thick === 'function' ? thick(p, i / n) : thick;
    out.push([p[0] + dy * t, p[1] - dx * t]);
  }
  return out;
}

/* ---------- materials ---------- */
let tortoiseTex = null;
function tortoiseTexture() {
  if (tortoiseTex) return tortoiseTex;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#8c4c15'; g.fillRect(0, 0, 512, 512);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 18 + rnd() * 60;
    const dark = rnd() < .62;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, dark ? 'rgba(30,12,4,.95)' : 'rgba(214,150,56,.8)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
  }
  tortoiseTex = new T.CanvasTexture(c);
  tortoiseTex.wrapS = tortoiseTex.wrapT = T.RepeatWrapping;
  tortoiseTex.repeat.set(1 / 70, 1 / 70);
  tortoiseTex.colorSpace = T.SRGBColorSpace;
  tortoiseTex.anisotropy = 4;
  return tortoiseTex;
}
export function frameMaterial(f) {
  const base = { roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1 };
  switch (f.type) {
    case 'tortoise': return new T.MeshPhysicalMaterial({ ...base, map: tortoiseTexture(), color: 0xffffff });
    case 'crystal': return new T.MeshPhysicalMaterial({ ...base, color: f.color, transmission: .92, thickness: 5, ior: 1.49, roughness: .12, attenuationColor: new T.Color(f.deep || f.color), attenuationDistance: 14, envMapIntensity: 1.2 });
    case 'metal': return new T.MeshPhysicalMaterial({ color: f.color, metalness: 1, roughness: f.rough ?? .2, clearcoat: .3, envMapIntensity: 1.4 });
    default: return new T.MeshPhysicalMaterial({ ...base, color: f.color, roughness: f.rough ?? .32 });
  }
}
function lensMaterial(l) {
  const c = new T.Color(l.color);
  return new T.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, transparent: true, opacity: l.opacity ?? .82, roughness: l.mirror ? .08 : .05,
    metalness: l.mirror ? .85 : 0, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: l.mirror ? 1.8 : 1.4, side: T.DoubleSide, depthWrite: false,
    userData: { c },
  });
}

/* ---------- builders ---------- */
function ringCurve(pts, cx, z) { return new T.CatmullRomCurve3(pts.map(([x, y]) => new T.Vector3(x + cx, y, z)), true, 'centripetal'); }

function sweepTube(points, sx, sy, r0, r1, radial = 14, segs = 80, tension = .5) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)), false, 'catmullrom', tension);
  const g = new T.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position, S = segs + 1, R = radial + 1;
  for (let i = 0; i < S; i++) {
    const u = i / segs, c = curve.getPointAt(u), k = lerp(r0, r1, u);
    for (let j = 0; j < R; j++) {
      const idx = i * R + j, v = new T.Vector3().fromBufferAttribute(pos, idx).sub(c);
      v.x *= sx * k; v.y *= sy * k;
      pos.setXYZ(idx, c.x + v.x, c.y + v.y, c.z + v.z * ((sx + sy) / 2) * k);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function buildGlasses(spec) {
  const st = STYLES[spec.shape];
  const group = new T.Group();
  const fm = frameMaterial(spec.frame);
  const wire = spec.build === 'wire';
  const inner = st.make();
  const bridgeGap = wire ? 8 : 9;                           /* half gap between rims */
  const rimT = wire ? 0 : (spec.rim ?? 4.4);
  const cx = bridgeGap + st.a + rimT;                       /* right lens centre x */
  const D = 5.4;                                            /* frame depth (z) */

  const outerFn = (p) => rimT + (spec.brow ? spec.brow * smooth((p[1] / st.b + .1) / 1.1) : 0);
  const outer = wire ? null : offsetContour(inner, outerFn);

  let hinge = new T.Vector3();
  for (const side of [1, -1]) {
    const m = (pts) => (side === 1 ? pts.map(([x, y]) => [x + cx, y]) : pts.map(([x, y]) => [-(x + cx), y]).reverse());
    const inn = m(inner);

    /* lens */
    const lensShape = new T.Shape(offsetContour(inn, -.2).map(([x, y]) => V2(x, y)));
    const lg = new T.ExtrudeGeometry(lensShape, { depth: 1.1, bevelEnabled: false, curveSegments: 1 });
    lg.translate(0, 0, -.55);
    const ys = inn.map((p) => p[1]), yMin = Math.min(...ys), yMax = Math.max(...ys);
    const col = new T.Color(spec.lens.color), light = col.clone().lerp(new T.Color(0xffffff), spec.lens.mirror ? .1 : .22);
    const cArr = [], p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) - yMin) / (yMax - yMin);
      /* top dark -> bottom lighter */
      const cc2 = col.clone().lerp(light, (1 - t) * (spec.lens.grad === false ? 0 : 1));
      cArr.push(cc2.r, cc2.g, cc2.b);
    }
    lg.setAttribute('color', new T.Float32BufferAttribute(cArr, 3));
    group.add(new T.Mesh(lg, lensMaterial(spec.lens)));

    if (!wire) {
      const outP = m(outer);
      const shape = new T.Shape(outP.map(([x, y]) => V2(x, y)));
      shape.holes.push(new T.Path(inn.map(([x, y]) => V2(x, y)).reverse()));
      const geo = new T.ExtrudeGeometry(shape, { depth: D - 2 * .9, bevelEnabled: true, bevelThickness: .9, bevelSize: .8, bevelSegments: 4, curveSegments: 1 });
      geo.translate(0, 0, -(D - 2 * .9) / 2);
      group.add(new T.Mesh(geo, fm));
      /* hinge point: right-most outer point */
      let best = outP[0]; for (const q of outP) if (side * q[0] > side * best[0]) best = q;
      if (side === 1) hinge.set(best[0], best[1], 0);
      /* rivet */
      const rv = new T.Mesh(new T.SphereGeometry(1.25, 20, 14), new T.MeshPhysicalMaterial({ color: spec.rivet || 0xcfcfcf, metalness: 1, roughness: .18 }));
      rv.position.set(best[0] - side * 5.2, best[1] - 1.5, D / 2 + .3); group.add(rv);
    } else {
      const ring = new T.Mesh(new T.TubeGeometry(ringCurve(inn, 0, 0), 220, spec.wireR ?? .95, 12, true), fm);
      group.add(ring);
      let best = inn[0]; for (const q of inn) if (side * q[0] > side * best[0]) best = q;
      if (side === 1) hinge.set(best[0] + .6, best[1] - 1, 0);
      /* nose pad + arm */
      const pad = new T.Mesh(new T.SphereGeometry(2.4, 20, 14), new T.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: .25, transmission: .5, thickness: 2, clearcoat: 1 }));
      pad.scale.set(.6, 1.5, .5); pad.position.set(side * (bridgeGap + 1.6), -8.5, -4.6); pad.rotation.z = side * .2; group.add(pad);
      const arm = new T.Mesh(sweepTube([[side * (bridgeGap + 4), -3, 0], [side * (bridgeGap + 2.6), -6.5, -2.5], [side * (bridgeGap + 1.8), -8.3, -4.2]], 1, 1, .5, .5, 8, 14), fm);
      group.add(arm);
    }
  }

  /* bridge */
  const by = spec.bridgeY ?? (wire ? 6 : 8.5);
  if (wire) {
    group.add(new T.Mesh(sweepTube([[-(bridgeGap + .3), by - 2, 0], [-4, by + 3.4, 0], [0, by + 4.4, 0], [4, by + 3.4, 0], [bridgeGap + .3, by - 2, 0]], 1, 1, spec.wireR ?? .95, spec.wireR ?? .95, 12, 60), fm));
  } else {
    group.add(new T.Mesh(sweepTube([[-(bridgeGap + 2), by - 1, 0], [-4, by + 1.6, 0], [0, by + 2.4, 0], [4, by + 1.6, 0], [bridgeGap + 2, by - 1, 0]], 1, 1.25, 2.1, 2.1, 14, 40), fm));
  }

  /* temples */
  const hx = hinge.x, hy = hinge.y;
  for (const side of [1, -1]) {
    const x0 = side * hx, zf = -D / 2 + .4;
    const pts = [[x0, hy, zf], [x0 + side * .8, hy, zf - 8], [x0 + side * 3.4, hy, -58], [x0 + side * 5.4, hy - 1.5, -102], [x0 + side * 5.2, hy - 12, -135], [x0 + side * 4.4, hy - 22, -146]];
    const tr = wire ? [.62, 1.12] : [1, .8];
    const geo = wire ? sweepTube(pts, 1, 1, (spec.wireR ?? .95) * .85, (spec.wireR ?? .95) * .85, 10, 90) : sweepTube(pts, .95, 1.6, 2.5, 1.7, 14, 90);
    group.add(new T.Mesh(geo, fm));
    if (wire) { /* ear tips */
      const tipPts = pts.slice(3).map((p) => [p[0], p[1], p[2]]);
      const tip = sweepTube([[x0 + side * 4.6, hy - .8, -86], ...tipPts], 1, 1, 1.9, 1.5, 12, 50);
      group.add(new T.Mesh(tip, new T.MeshPhysicalMaterial({ color: spec.tip || 0x1a1410, roughness: .35, clearcoat: .8 })));
    }
    /* hinge barrel */
    const hb = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, wire ? 4 : 6.2, 14), new T.MeshPhysicalMaterial({ color: spec.hinge || 0xc9c9c9, metalness: 1, roughness: .25 }));
    hb.position.set(x0 - side * (wire ? .6 : 1.2), hy, zf - 1.2); group.add(hb);
  }

  /* centre the group on its bounding box */
  const box = new T.Box3().setFromObject(group), c = box.getCenter(new T.Vector3());
  group.children.forEach((o) => o.position.sub(new T.Vector3(c.x, c.y, 0)));
  group.userData.size = box.getSize(new T.Vector3());
  group.userData.target = new T.Vector3(0, 0, -42);
  return group;
}

/* ---------- scene helpers ---------- */
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(.55, 'rgba(0,0,0,.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new T.CanvasTexture(c);
}

export function makeStage(canvas, { alpha = true, preserve = false, dpr = Math.min(2, window.devicePixelRatio || 1) } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new T.Scene();
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new T.RoomEnvironment(), .035).texture;
  scene.environmentIntensity = 1.05;
  const key = new T.DirectionalLight(0xffffff, 1.4); key.position.set(-120, 200, 260); scene.add(key);
  const rim = new T.DirectionalLight(0xfff1e0, .8); rim.position.set(180, 60, -200); scene.add(rim);
  const camera = new T.PerspectiveCamera(24, 1, 20, 3000); camera.position.set(0, 0, 500);
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: .8 }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  return { renderer, scene, camera, shadow, pm };
}

export function fitCamera(stage, size, aspect, margin = 1.02) {
  const { camera } = stage, fov = (camera.fov * Math.PI) / 180;
  const needW = size.x * margin, needH = size.y * margin * 1.5;
  const d = Math.max(needW / (2 * Math.tan(fov / 2) * aspect), needH / (2 * Math.tan(fov / 2)));
  return d + size.z / 2;
}

export class Viewer {
  constructor(container, spec, { autoRotate = true } = {}) {
    this.container = container; this.spec = spec;
    this.canvas = document.createElement('canvas'); this.canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
    container.appendChild(this.canvas);
    this.stage = makeStage(this.canvas);
    this.setSpec(spec, true);
    this.controls = new T.OrbitControls(this.stage.camera, this.canvas);
    const c = this.controls; c.target.copy(this.model.userData.target);
    c.enableDamping = true; c.dampingFactor = .07; c.enablePan = false; c.rotateSpeed = .9; c.zoomSpeed = .8;
    c.minPolarAngle = .18 * Math.PI; c.maxPolarAngle = .82 * Math.PI;
    c.autoRotate = autoRotate; c.autoRotateSpeed = 1.1;
    this.interacted = false; this.idleTimer = null;
    c.addEventListener('start', () => { this.canvas.style.cursor = 'grabbing'; c.autoRotate = false; clearTimeout(this.idleTimer); if (!this.interacted) { this.interacted = true; this.onInteract && this.onInteract(); } });
    c.addEventListener('end', () => { this.canvas.style.cursor = 'grab'; clearTimeout(this.idleTimer); this.idleTimer = setTimeout(() => { if (this.autoRotateAllowed) c.autoRotate = true; }, 3500); });
    this.autoRotateAllowed = autoRotate;
    this.resize(); this.setPose(-.5, 1.32, true);
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(container);
    this.running = true; this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    this._vis = () => { this.running = !document.hidden; if (this.running) requestAnimationFrame(this.loop); }; document.addEventListener('visibilitychange', this._vis);
  }
  setSpec(spec, first) {
    this.spec = spec;
    if (this.model) { this.stage.scene.remove(this.model); this.model.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.model = buildGlasses(spec); this.stage.scene.add(this.model);
    const s = this.model.userData.size;
    this.stage.shadow.scale.set(s.x * 1.5, s.z * 1.5, 1); this.stage.shadow.position.set(0, -s.y / 2 - 26, this.model.userData.target.z);
    if (!first) this.resize();
  }
  resize() {
    const w = this.container.clientWidth || 300, h = this.container.clientHeight || 300;
    this.stage.renderer.setSize(w, h, false);
    this.stage.camera.aspect = w / h; this.stage.camera.updateProjectionMatrix();
    this.dist = fitCamera(this.stage, this.model.userData.size, w / h);
    if (this.controls) { this.controls.minDistance = this.dist * .55; this.controls.maxDistance = this.dist * 1.35; }
    const cur = this.stage.camera.position.length();
    if (!cur || cur < 1) this.setPose(-.5, 1.32, true);
  }
  setPose(azimuth, polar, instant) {
    const cam = this.stage.camera, d = this.dist || 400, tg = this.model.userData.target;
    cam.position.set(tg.x + d * Math.sin(polar) * Math.sin(azimuth), tg.y + d * Math.cos(polar), tg.z + d * Math.sin(polar) * Math.cos(azimuth));
    cam.lookAt(tg); if (this.controls) this.controls.update();
  }
  animateTo(azimuth, polar, ms = 800) {
    const cam = this.stage.camera, tg = this.model.userData.target, off = cam.position.clone().sub(tg);
    const r = off.length(), a0 = Math.atan2(off.x, off.z), p0 = Math.acos(off.y / r);
    let da = azimuth - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
    const t0 = performance.now(); this.controls.autoRotate = false; this._anim = true;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      const a = a0 + da * e, p = p0 + (polar - p0) * e;
      cam.position.set(tg.x + r * Math.sin(p) * Math.sin(a), tg.y + r * Math.cos(p), tg.z + r * Math.sin(p) * Math.cos(a)); cam.lookAt(tg);
      if (k < 1) requestAnimationFrame(step); else this._anim = false;
    };
    requestAnimationFrame(step);
  }
  loop() {
    if (!this.running) return;
    if (!this._anim) this.controls.update();
    const cam = this.stage.camera, tg = this.model.userData.target, rel = cam.position.clone().sub(tg), pol = Math.acos(rel.y / rel.length());
    this.stage.shadow.material.opacity = .8 * Math.max(0, Math.min(1, (pol - .85) / .55)) * Math.max(0, Math.min(1, (2.3 - pol) / .4));
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
    requestAnimationFrame(this.loop);
  }
  dispose() {
    this.running = false; document.removeEventListener('visibilitychange', this._vis); this._ro.disconnect(); this.controls.dispose();
    this.stage.renderer.dispose(); this.canvas.remove();
  }
}
