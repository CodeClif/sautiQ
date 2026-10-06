/* Procedural 3D acetate sunglasses (chunky, glossy, foldable) + a drag-to-rotate viewer. Needs ./three-lite.js */
import * as T from './three-lite.js';

const V2 = (x, y) => new T.Vector2(x, y);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

/* ---------- lens contours (right lens, local coords, +x = temple side) ---------- */
function superellipse(n, a, b, N = 160) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
  }
  return pts;
}
export const STYLES = {
  round:    { a: 22.5, b: 22.5, make: () => superellipse(2, 22.5, 22.5) },
  rect:     { a: 31, b: 15, make: () => superellipse(5, 31, 15).map(([x, y]) => [x, y + 1.2 * (x + 31) / 62 - 0.8]) },
  wayfarer: { a: 27, b: 19.5, make: () => superellipse(3.2, 27, 19.5).map(([x, y]) => { const u = (x + 27) / 54; return [x * (1 + 0.1 * Math.max(0, y) / 19.5), (y < 0 ? y * .88 : y) + 3 * u]; }) },
  square:   { a: 25.5, b: 22, make: () => superellipse(4.4, 25.5, 22).map(([x, y]) => [x, y - 0.04 * x]) },
  angular:  { a: 27, b: 20, make: () => superellipse(7, 27, 20).map(([x, y]) => { const u = (x + 27) / 54; return [x, y * (y < 0 ? 1 - .18 * u : 1) + 5 * Math.pow(u, 2)]; }) },
  cat:      { a: 28, b: 20, make: () => superellipse(3.0, 28, 19).map(([x, y]) => { const u = (x + 28) / 56, up = Math.pow(u, 2.5) * 14; return [x * (1 + 0.05 * u), y < 0 ? y * (1 - 0.16 * u) + up * .5 : y + up]; }) },
  butterfly:{ a: 31, b: 25, make: () => superellipse(2.7, 31, 25).map(([x, y]) => { const u = (x + 31) / 62, up = Math.pow(u, 2.2) * 9; return [x, y < 0 ? y * (1 - .12 * u) + up * .4 : y + up]; }) },
};

function offsetContour(pts, thick) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = typeof thick === 'function' ? thick(p, i / n) : thick;
    out.push([p[0] + dy * t, p[1] - dx * t]);
  }
  return out;
}

/* ---------- materials ---------- */
const texCache = {};
function canvasTex(key, draw, w = 512, h = 512) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
  return (texCache[key] = t);
}
function tortoiseDraw(base, dark, light, seed0 = 7) {
  return (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    let seed = seed0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 34; i++) {
      const x = rnd() * w, y = rnd() * h, r = 46 + rnd() * 120, isDark = rnd() < .66;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, isDark ? dark : light); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.save(); g.translate(ox, oy); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
    }
  };
}
export function frameMaterial(f) {
  const base = { roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.15, sheen: 0 };
  switch (f.type) {
    case 'tortoise': {
      const t = canvasTex('tort', tortoiseDraw('#7a3f10', 'rgba(26,10,3,.95)', 'rgba(206,138,48,.85)'));
      t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 95, 1 / 95);
      return new T.MeshPhysicalMaterial({ ...base, map: t, color: 0xffffff });
    }
    case 'duo': { /* tortoise on top fading to a smoky translucent look at the bottom */
      const t = canvasTex('duo', (g, w, h) => {
        tortoiseDraw('#7a3f10', 'rgba(26,10,3,.95)', 'rgba(206,138,48,.85)', 11)(g, w, h);
        const grd = g.createLinearGradient(0, h * .34, 0, h * .8);
        grd.addColorStop(0, 'rgba(84,70,64,0)'); grd.addColorStop(1, 'rgba(112,100,98,.96)');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
      });
      t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping; t.repeat.set(1 / 100, 1 / 62); t.offset.set(.5, .5);
      return new T.MeshPhysicalMaterial({ ...base, map: t, color: 0xffffff });
    }
    case 'crystal': return new T.MeshPhysicalMaterial({ ...base, color: f.color, transmission: .9, thickness: 7, ior: 1.5, roughness: .08, attenuationColor: new T.Color(f.deep || f.color), attenuationDistance: 10, envMapIntensity: 1.3 });
    case 'metal': return new T.MeshPhysicalMaterial({ color: f.color, metalness: 1, roughness: f.rough ?? .2, clearcoat: .3, envMapIntensity: 1.4 });
    default: return new T.MeshPhysicalMaterial({ ...base, color: f.color, roughness: f.rough ?? .24 });
  }
}
function templeMaterial(f) {
  if (f.type === 'tortoise') { const t = canvasTex('tortT', tortoiseDraw('#6d3510', 'rgba(24,9,3,.95)', 'rgba(190,124,40,.8)', 3)); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 2); return new T.MeshPhysicalMaterial({ map: t, roughness: .22, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.1 }); }
  if (f.type === 'duo') return new T.MeshPhysicalMaterial({ color: 0x3a2412, roughness: .22, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.1 });
  return frameMaterial(f);
}
function lensMaterial(l) {
  return new T.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, transparent: true, opacity: l.opacity ?? .9, roughness: l.mirror ? .06 : .03,
    metalness: l.mirror ? .9 : 0, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: l.mirror ? 2 : 1.6,
    iridescence: l.mirror ? .7 : .25, iridescenceIOR: 1.6, side: T.DoubleSide, depthWrite: false,
  });
}
const metalMat = (c, r = .2) => new T.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: r, envMapIntensity: 1.4 });

/* ---------- builders ---------- */
function sweepTube(points, sx, sy, r0, r1, radial = 16, segs = 90) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)), false, 'catmullrom', .5);
  const g = new T.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position, R = radial + 1;
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, c = curve.getPointAt(u), k = lerp(r0, r1, smooth(u));
    for (let j = 0; j < R; j++) {
      const idx = i * R + j, v = new T.Vector3().fromBufferAttribute(pos, idx).sub(c);
      pos.setXYZ(idx, c.x + v.x * sx * k, c.y + v.y * sy * k, c.z + v.z * ((sx + sy) / 2) * k);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function buildGlasses(spec) {
  const st = STYLES[spec.shape];
  const group = new T.Group();
  const fm = frameMaterial(spec.frame), tm = templeMaterial(spec.frame);
  const inner = st.make();
  const gap = 8;                                             /* half gap between rims */
  const rimT = spec.rim ?? 7;                                /* rim thickness (mm) */
  const cx = gap + st.a + rimT;                              /* right lens centre x */
  const D = spec.depth ?? 7.6;                               /* frame depth (z) */
  const bev = 1.5;
  const outerFn = (p) => rimT + (spec.brow ? spec.brow * smooth((p[1] / st.b + .15) / 1.15) : 0);
  const outer = offsetContour(inner, outerFn);

  let hinge = new T.Vector3();
  for (const side of [1, -1]) {
    const m = (pts) => (side === 1 ? pts.map(([x, y]) => [x + cx, y]) : pts.map(([x, y]) => [-(x + cx), y]).reverse());
    const inn = m(inner), outP = m(outer);

    /* lens, with a little thickness */
    const lensShape = new T.Shape(offsetContour(inn, -.25).map(([x, y]) => V2(x, y)));
    const lg = new T.ExtrudeGeometry(lensShape, { depth: 1.5, bevelEnabled: false, curveSegments: 1 });
    lg.translate(0, 0, -.75 + 0.2);
    { const lp = lg.attributes.position, lcx = side * cx; for (let i = 0; i < lp.count; i++) { const dx = (lp.getX(i) - lcx) / st.a, dy = lp.getY(i) / st.b, r2 = Math.min(1, dx * dx + dy * dy); lp.setZ(i, lp.getZ(i) + 3.4 * (1 - r2)); } lg.computeVertexNormals(); }
    const ys = inn.map((q) => q[1]), yMin = Math.min(...ys), yMax = Math.max(...ys);
    const col = new T.Color(spec.lens.color), light = col.clone().lerp(new T.Color(0xffffff), spec.lens.mirror ? .08 : .3);
    const cArr = [], pp = lg.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const t = (pp.getY(i) - yMin) / (yMax - yMin);
      const k = (spec.lens.grad === false ? 0 : 1) * Math.pow(1 - t, 1.3);
      const cc = col.clone().lerp(light, k);
      cArr.push(cc.r, cc.g, cc.b);
    }
    lg.setAttribute('color', new T.Float32BufferAttribute(cArr, 3));
    group.add(new T.Mesh(lg, lensMaterial(spec.lens)));

    /* chunky acetate rim */
    const shape = new T.Shape(outP.map(([x, y]) => V2(x, y)));
    shape.holes.push(new T.Path(inn.map(([x, y]) => V2(x, y)).reverse()));
    const geo = new T.ExtrudeGeometry(shape, { depth: D - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .85, bevelSegments: 7, curveSegments: 1 });
    geo.translate(0, 0, -(D - 2 * bev) / 2);
    group.add(new T.Mesh(geo, fm));

    /* hinge point = right-most outer point, nudged to the upper half */
    let best = outP[0]; for (const q of outP) if (side * q[0] > side * best[0]) best = q;
    if (side === 1) hinge.set(best[0], best[1], 0);

    /* gold rivets on the outer corner */
    for (const [dx, dy] of [[-5.4, -1.2], [-8.6, -1.2]]) {
      const rv = new T.Mesh(new T.SphereGeometry(1.15, 24, 16), metalMat(spec.rivet || 0xd8b25a, .16));
      rv.scale.z = .55; rv.position.set(best[0] + side * dx, best[1] + dy, D / 2 + .2); group.add(rv);
    }
  }

  /* acetate bridge: a thick arch between the rims */
  const by = (spec.bridgeY ?? 6.5);
  {
    const A = []; const N = 20, th = 5.2, g0 = gap + 3;
    for (let i = 0; i <= N; i++) { const t = i / N, x = lerp(-g0, g0, t), y = by + 3.8 * Math.sin(Math.PI * t) + 2.5; A.push(V2(x, y)); }
    for (let i = N; i >= 0; i--) { const t = i / N, x = lerp(-g0, g0, t), y = by + 3.8 * Math.sin(Math.PI * t) + 2.5 - th * (.55 + .45 * Math.sin(Math.PI * t)); A.push(V2(x, y)); }
    const bs = new T.Shape(A);
    const bg = new T.ExtrudeGeometry(bs, { depth: D - 2 * bev - 1.2, bevelEnabled: true, bevelThickness: bev * .9, bevelSize: bev * .7, bevelSegments: 5, curveSegments: 1 });
    bg.translate(0, 0, -(D - 2 * bev - 1.2) / 2 - 0.2);
    group.add(new T.Mesh(bg, fm));
  }

  /* temples: pivot groups so they can fold at the hinge */
  const hx = hinge.x, hy = hinge.y, zf = -D / 2 + .8;
  const temples = [];
  for (const side of [1, -1]) {
    const pivot = new T.Group(); pivot.position.set(side * hx, hy, zf);
    const rel = [[0, 0, 0], [side * .8, 0, -8], [side * 3.2, 0, -52], [side * 5.2, -1.2, -96], [side * 5, -10, -130], [side * 4.2, -19, -144]];
    const geo = sweepTube(rel, .92, 1.55, 3.6, 1.55, 18, 100);
    pivot.add(new T.Mesh(geo, tm));
    /* gold rivets on the temple front */
    for (const z of [-7, -14]) {
      const rv = new T.Mesh(new T.SphereGeometry(1, 20, 14), metalMat(spec.rivet || 0xd8b25a, .16));
      rv.scale.set(.5, 1, 1); rv.position.set(side * 3.2, 1.2, z); pivot.add(rv);
    }
    group.add(pivot);
    temples.push({ pivot, side });
    const hb = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, 8, 16), metalMat(spec.hinge || 0xd8b25a, .2));
    hb.position.set(side * (hx - 1.2), hy, zf - 1.4); group.add(hb);
  }

  /* centre on the front frame */
  const box = new T.Box3().setFromObject(group), c = box.getCenter(new T.Vector3());
  group.children.forEach((o) => o.position.sub(new T.Vector3(c.x, c.y, 0)));
  const size = box.getSize(new T.Vector3());
  group.userData.size = size;
  group.userData.openTargetZ = -44;

  /* fold(t): 0 = open, 1 = folded. Right temple folds in over the left one. */
  group.userData.fold = 0;
  group.userData.setFold = (t) => {
    group.userData.fold = t;
    const e = smooth(t);
    temples.forEach(({ pivot, side }) => {
      const base = pivot.userData.base || (pivot.userData.base = pivot.position.clone());
      pivot.rotation.y = side * e * (Math.PI / 2 - (side === 1 ? .04 : .09));
      pivot.position.z = base.z - (side === 1 ? e * 6.4 : 0);
    });
  };
  group.userData.target = new T.Vector3(0, 0, group.userData.openTargetZ);
  return group;
}

/* ---------- studio lighting: soft boxes for crisp acetate highlights ---------- */
function studioEnv() {
  const s = new T.Scene();
  s.background = new T.Color(0.18, 0.18, 0.2);
  const box = (w, h, pos, v, tint = [1, 1, 1]) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(v * tint[0], v * tint[1], v * tint[2]), side: T.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  box(14, 10, [0, 10, 3], 7);               /* big top softbox */
  box(3, 14, [-11, 3, 5], 12);              /* left strip */
  box(3, 14, [11, 3, 3], 8, [1, .96, .9]);  /* right strip, warm */
  box(12, 4, [0, 1, 12], 3.2);              /* front fill */
  box(8, 8, [0, 5, -12], 5);                /* back rim */
  box(24, 24, [0, -10, 0], 1.6, [1, .93, .86]); /* warm floor bounce */
  return s;
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
  renderer.toneMappingExposure = 1.0;
  const scene = new T.Scene();
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(studioEnv(), .02).texture;
  scene.environmentIntensity = 1;
  const key = new T.DirectionalLight(0xffffff, .9); key.position.set(-120, 220, 260); scene.add(key);
  const camera = new T.PerspectiveCamera(24, 1, 20, 3000); camera.position.set(0, 0, 500);
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: .8 }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  return { renderer, scene, camera, shadow, pm };
}

export function fitCamera(stage, size, aspect, margin = 1.14) {
  const fov = (stage.camera.fov * Math.PI) / 180;
  const needW = size.x * margin, needH = size.y * margin * 1.5;
  return Math.max(needW / (2 * Math.tan(fov / 2) * aspect), needH / (2 * Math.tan(fov / 2))) + size.z / 2;
}

export class Viewer {
  constructor(container, spec, { autoRotate = true } = {}) {
    this.container = container;
    this.canvas = document.createElement('canvas'); this.canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
    container.appendChild(this.canvas);
    this.stage = makeStage(this.canvas);
    this.foldVal = 0; this.foldGoal = 0; this.foldFrom = 0; this.foldT0 = 0; this.foldMs = 900;
    this.setSpec(spec, true);
    this.controls = new T.OrbitControls(this.stage.camera, this.canvas);
    const c = this.controls; c.target.copy(this.model.userData.target);
    c.enableDamping = true; c.dampingFactor = .07; c.enablePan = false; c.rotateSpeed = .9; c.zoomSpeed = .8;
    c.minPolarAngle = .18 * Math.PI; c.maxPolarAngle = .82 * Math.PI;
    c.autoRotate = autoRotate; c.autoRotateSpeed = 1.1;
    this.interacted = false; this.idleTimer = null; this.autoRotateAllowed = autoRotate;
    c.addEventListener('start', () => { this.canvas.style.cursor = 'grabbing'; c.autoRotate = false; clearTimeout(this.idleTimer); if (!this.interacted) { this.interacted = true; this.onInteract && this.onInteract(); } });
    c.addEventListener('end', () => { this.canvas.style.cursor = 'grab'; clearTimeout(this.idleTimer); this.idleTimer = setTimeout(() => { if (this.autoRotateAllowed) c.autoRotate = true; }, 3500); });
    this.resize(); this.setPose(-.5, 1.32);
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(container);
    this.running = true; this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    this._vis = () => { this.running = !document.hidden; if (this.running) requestAnimationFrame(this.loop); }; document.addEventListener('visibilitychange', this._vis);
  }
  setSpec(spec) {
    this.spec = spec;
    if (this.model) { this.stage.scene.remove(this.model); this.model.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.model = buildGlasses(spec); this.stage.scene.add(this.model);
    this.model.userData.setFold(this.foldVal);
    this.syncFoldLayout();
    if (this.container && this.controls) this.resize();
  }
  syncFoldLayout() {                                         /* keep the orbit centre and shadow on the glasses as they fold */
    const e = smooth(this.foldVal), s = this.model.userData.size, tg = this.model.userData.target;
    tg.z = lerp(this.model.userData.openTargetZ, -2, e);
    this.stage.shadow.scale.set(s.x * 1.5, lerp(s.z * 1.5, s.z * .5, e), 1);
    this.stage.shadow.position.set(0, -s.y / 2 - 26, tg.z);
    if (this.controls) { const dz = tg.z - this.controls.target.z; if (dz) { this.controls.target.z += dz; this.stage.camera.position.z += dz; } }
  }
  setFolded(f, ms = 950) { this.foldGoal = f ? 1 : 0; this.foldFrom = this.foldVal; this.foldT0 = performance.now(); this.foldMs = ms; }
  get folded() { return this.foldGoal === 1; }
  resize() {
    const w = this.container.clientWidth || 300, h = this.container.clientHeight || 300;
    this.stage.renderer.setSize(w, h, false);
    this.stage.camera.aspect = w / h; this.stage.camera.updateProjectionMatrix();
    this.dist = fitCamera(this.stage, this.model.userData.size, w / h);
    if (this.controls) { this.controls.minDistance = this.dist * .5; this.controls.maxDistance = this.dist * 1.4; }
  }
  setPose(azimuth, polar) {
    const cam = this.stage.camera, d = this.dist || 400, tg = this.model.userData.target;
    cam.position.set(tg.x + d * Math.sin(polar) * Math.sin(azimuth), tg.y + d * Math.cos(polar), tg.z + d * Math.sin(polar) * Math.cos(azimuth));
    cam.lookAt(tg); if (this.controls) { this.controls.target.copy(tg); this.controls.update(); }
  }
  animateTo(azimuth, polar, ms = 800) {
    const cam = this.stage.camera, tg = this.controls.target.clone(), off = cam.position.clone().sub(tg);
    const r = off.length(), a0 = Math.atan2(off.x, off.z), p0 = Math.acos(off.y / r);
    let da = azimuth - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
    const t0 = performance.now(); this.controls.autoRotate = false; this._anim = true;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3), a = a0 + da * e, p = p0 + (polar - p0) * e, g = this.controls.target;
      cam.position.set(g.x + r * Math.sin(p) * Math.sin(a), g.y + r * Math.cos(p), g.z + r * Math.sin(p) * Math.cos(a)); cam.lookAt(g);
      if (k < 1) requestAnimationFrame(step); else this._anim = false;
    };
    requestAnimationFrame(step);
  }
  loop() {
    if (!this.running) return;
    if (this.foldVal !== this.foldGoal) {
      const k = clamp((performance.now() - this.foldT0) / this.foldMs);
      this.foldVal = lerp(this.foldFrom, this.foldGoal, k);
      this.model.userData.setFold(this.foldVal); this.syncFoldLayout();
    }
    if (!this._anim) this.controls.update();
    const cam = this.stage.camera, tg = this.controls.target, rel = cam.position.clone().sub(tg), pol = Math.acos(rel.y / rel.length());
    this.stage.shadow.material.opacity = .8 * clamp((pol - .85) / .55) * clamp((2.3 - pol) / .4);
    this.stage.renderer.render(this.stage.scene, this.stage.camera);
    requestAnimationFrame(this.loop);
  }
  dispose() {
    this.running = false; document.removeEventListener('visibilitychange', this._vis); this._ro.disconnect(); this.controls.dispose();
    this.stage.renderer.dispose(); this.canvas.remove();
  }
}
