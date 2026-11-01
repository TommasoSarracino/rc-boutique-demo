// RC Boutique — two real-time scenes: the gem-set crown (hero) and the night galleria walk.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 720px)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}
if (!webglOK()) { root.classList.add('no-webgl'); throw new Error('no webgl'); }
root.classList.add('has-webgl');

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 4);

/* ---------- shared materials and textures ---------- */
function makeRenderer(host, label) {
  const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(DPR);
  r.setSize(host.clientWidth, host.clientHeight);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(0x070605, 1);
  r.domElement.setAttribute('role', 'img');
  r.domElement.setAttribute('aria-label', label);
  host.appendChild(r.domElement);
  return r;
}
function envFor(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.035).texture;
  pm.dispose();
  return env;
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,240,200,1)');
  grd.addColorStop(0.25, 'rgba(255,214,140,.55)');
  grd.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const DOT = dotTexture();

function goldMat(rough = 0.2) {
  return new THREE.MeshPhysicalMaterial({ color: 0xe0ad55, metalness: 1, roughness: rough, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 1.5 });
}
function crystalMat() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, ior: 2.4, thickness: 0.35,
    envMapIntensity: 3.2, specularIntensity: 1, dispersion: 4, iridescence: 0.4, iridescenceIOR: 1.6
  });
}
function sparkleMat() {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.04, envMapIntensity: 3 });
}

function dust(count, spread, height) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = Math.random() * height;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    seed[i] = Math.random() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.userData.seed = seed;
  geo.userData.base = pos.slice();
  const mat = new THREE.PointsMaterial({ size: small ? 0.05 : 0.04, map: DOT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd58a, opacity: 0.9 });
  const pts = new THREE.Points(geo, mat);
  pts.userData.tick = (t) => {
    const p = geo.attributes.position.array, b = geo.userData.base, s = geo.userData.seed;
    for (let i = 0; i < count; i++) {
      const k = s[i];
      p[i * 3] = b[i * 3] + Math.sin(t * 0.25 + k) * 0.25;
      p[i * 3 + 1] = (b[i * 3 + 1] + t * 0.06 * (0.4 + (k % 1))) % height;
      p[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.2 + k) * 0.25;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

/* ---------- the crown ---------- */
function buildCrown() {
  const crown = new THREE.Group();
  const gold = goldMat(0.18), crystal = crystalMat(), sparkle = sparkleMat();
  const R = 1, H0 = 0.44, TALL = 0.78, SHORT = 0.36;
  const tallAt = (k) => (k / 5) * Math.PI * 2;
  const shortAt = (k) => tallAt(k) + Math.PI / 5;
  const angDist = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
  const peak = (th) => {
    let v = 0;
    for (let k = 0; k < 5; k++) {
      v = Math.max(v, TALL * Math.pow(Math.max(0, 1 - angDist(th, tallAt(k)) / 0.34), 1.5));
      v = Math.max(v, SHORT * Math.pow(Math.max(0, 1 - angDist(th, shortAt(k)) / 0.24), 1.3));
    }
    return v;
  };

  // band with the crenellated top edge
  const band = new THREE.CylinderGeometry(R, R * 1.03, 1, 220, 6, true);
  const p = band.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(x, z);
    const f = y + 0.5; // 0 bottom .. 1 top
    p.setY(i, f * (H0 + peak(th)));
  }
  band.computeVertexNormals();
  const bandMat = gold.clone(); bandMat.side = THREE.DoubleSide;
  crown.add(new THREE.Mesh(band, bandMat));

  // rounded lip along the top edge
  const lipPts = [];
  for (let i = 0; i < 400; i++) {
    const th = (i / 400) * Math.PI * 2;
    lipPts.push(new THREE.Vector3(Math.sin(th) * R * 1.004, H0 + peak(th), Math.cos(th) * R * 1.004));
  }
  crown.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts, true), 600, 0.022, 10, true), gold));

  // base and band rings
  [[0.0, 0.05, 1.035], [0.1, 0.022, 1.012], [0.34, 0.022, 1.006]].forEach(([y, r, s]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(R * s, r, 16, 160), gold);
    t.rotation.x = Math.PI / 2; t.position.y = y; crown.add(t);
  });

  // rows of small stones along the two rings
  const bead = new THREE.IcosahedronGeometry(0.018, 0);
  const rows = [0.1, 0.34];
  const beads = new THREE.InstancedMesh(bead, sparkle, 72 * rows.length);
  const m = new THREE.Matrix4();
  let n = 0;
  rows.forEach((y) => {
    for (let i = 0; i < 72; i++) {
      const th = (i / 72) * Math.PI * 2;
      m.makeTranslation(Math.sin(th) * R * 1.035, y, Math.cos(th) * R * 1.035);
      beads.setMatrixAt(n++, m);
    }
  });
  crown.add(beads);

  // set stones around the band
  const big = new THREE.OctahedronGeometry(0.075, 0); big.scale(0.8, 1.15, 0.5);
  const round = new THREE.IcosahedronGeometry(0.048, 1);
  for (let i = 0; i < 20; i++) {
    const th = (i / 20) * Math.PI * 2 + Math.PI / 20;
    const g = new THREE.Mesh(i % 2 ? round : big, crystal);
    g.position.set(Math.sin(th) * R * 1.05, 0.22, Math.cos(th) * R * 1.05);
    g.lookAt(Math.sin(th) * 3, 0.22, Math.cos(th) * 3);
    crown.add(g);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(i % 2 ? 0.052 : 0.07, 0.011, 8, 32), gold);
    seat.position.copy(g.position).multiplyScalar(0.985); seat.position.y = 0.22; seat.lookAt(g.position.x * 3, 0.22, g.position.z * 3);
    crown.add(seat);
  }

  // finials: orbs and crosses on the tall points, stones on the short ones
  const orb = new THREE.SphereGeometry(0.065, 32, 16);
  const armV = new THREE.BoxGeometry(0.03, 0.2, 0.03), armH = new THREE.BoxGeometry(0.13, 0.03, 0.03);
  for (let k = 0; k < 5; k++) {
    const th = tallAt(k), y = H0 + TALL;
    const o = new THREE.Mesh(orb, gold); o.position.set(Math.sin(th) * R, y + 0.05, Math.cos(th) * R); crown.add(o);
    const cross = new THREE.Group();
    cross.add(new THREE.Mesh(armV, gold));
    const h = new THREE.Mesh(armH, gold); h.position.y = 0.035; cross.add(h);
    const cg = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), crystal); cg.position.y = 0.035; cg.position.z = 0.02; cross.add(cg);
    cross.position.set(Math.sin(th) * R, y + 0.2, Math.cos(th) * R); cross.rotation.y = th; crown.add(cross);
    const ts = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), crystal);
    ts.position.set(Math.sin(th) * R * 1.03, H0 + TALL * 0.5, Math.cos(th) * R * 1.03); ts.lookAt(Math.sin(th) * 3, ts.position.y, Math.cos(th) * 3);
    crown.add(ts);
  }
  for (let k = 0; k < 5; k++) {
    const th = shortAt(k);
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), crystal);
    s.position.set(Math.sin(th) * R, H0 + SHORT + 0.04, Math.cos(th) * R); crown.add(s);
  }
  return crown;
}

/* ---------- scene 1: hero crown ---------- */
function heroScene() {
  const host = document.getElementById('crown-stage');
  const section = host.closest('section');
  const renderer = makeRenderer(host, 'Corona dorata 3D di RC Boutique tempestata di cristalli. Trascina per ruotarla.');
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  const camera = new THREE.PerspectiveCamera(32, host.clientWidth / host.clientHeight, 0.1, 100);

  const crown = buildCrown();
  const holder = new THREE.Group(); holder.add(crown); scene.add(holder);

  // warm key lights for glints
  const key = new THREE.PointLight(0xffd9a0, 18, 20); key.position.set(2.5, 3, 3); scene.add(key);
  const rim = new THREE.PointLight(0xfff2dc, 18, 20); rim.position.set(-3, 2, -2); scene.add(rim);
  const under = new THREE.PointLight(0xffb15a, 6, 6); under.position.set(0, -0.3, 1.6); scene.add(under);

  // black lacquer floor with a soft mirror
  const floor = new Reflector(new THREE.CircleGeometry(9, 64), {
    color: 0x4a4a4a, textureWidth: Math.round(host.clientWidth * DPR * 0.5), textureHeight: Math.round(host.clientHeight * DPR * 0.5)
  });
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.42; scene.add(floor);
  const veil = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: vignette(), transparent: true, depthWrite: false }));
  veil.rotation.x = -Math.PI / 2; veil.position.y = -0.415; scene.add(veil);

  const motes = dust(small ? 260 : 520, 9, 5); motes.position.y = -0.4; scene.add(motes);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.32, 0.45, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function frame() {
    const w = host.clientWidth, h = host.clientHeight, a = w / h;
    camera.aspect = a;
    camera.fov = a < 0.8 ? 44 : 28;
    camera.position.set(0, 0.8, a < 0.8 ? 9.2 : 8.8);
    camera.lookAt(0, a < 0.8 ? 0.05 : 0.3, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h); composer.setSize(w, h);
    floor.getRenderTarget().setSize(Math.round(w * DPR * 0.5), Math.round(h * DPR * 0.5));
    floor.material.uniforms.color.value.setHex(a < 0.8 ? 0x1c1c1c : 0x4a4a4a);
  }
  frame();

  // drag with inertia, pointer tilt
  let dragging = false, lastX = 0, vel = 0, spin = 0;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  host.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; host.setPointerCapture(e.pointerId); document.body.classList.add('dragging'); });
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    tilt.tx = ((e.clientY - r.top) / r.height - 0.5) * 0.35;
    tilt.ty = ((e.clientX - r.left) / r.width - 0.5) * 0.25;
    if (!dragging) return;
    vel = (e.clientX - lastX) * 0.006; lastX = e.clientX;
  });
  const end = () => { dragging = false; document.body.classList.remove('dragging'); };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);

  const t0 = performance.now();
  return {
    host, section, resize: frame,
    render(t) {
      const r = section.getBoundingClientRect();
      const p = clamp01(-r.top / r.height);
      const intro = reduce ? 1 : easeOut(clamp01((performance.now() - t0) / 2600));
      if (!dragging) vel *= 0.95;
      spin += vel + (reduce ? 0 : 0.0028);
      tilt.x += (tilt.tx - tilt.x) * 0.05; tilt.y += (tilt.ty - tilt.y) * 0.05;
      crown.rotation.y = spin + (1 - intro) * 2.4;
      holder.rotation.x = 0.16 + tilt.x;
      holder.rotation.z = -tilt.y * 0.4;
      holder.position.y = (1 - intro) * 1.6 + Math.sin(t * 0.9) * 0.035 + p * 0.9;
      holder.scale.setScalar(0.7 + intro * 0.3);
      key.position.x = Math.sin(t * 0.4) * 3; key.position.z = Math.cos(t * 0.4) * 3;
      renderer.toneMappingExposure = 0.92 * (1 - p * 0.7);
      motes.userData.tick(t);
      composer.render();
    }
  };
}
function vignette() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grd.addColorStop(0, 'rgba(7,6,5,0)');
  grd.addColorStop(0.45, 'rgba(7,6,5,.35)');
  grd.addColorStop(1, 'rgba(7,6,5,1)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- scene 2: the galleria walk ---------- */
const PANELS = [
  'assets/img/donna-1949.jpg', 'assets/img/cappotto-1951.jpg', 'assets/img/bambina-tulle.jpg',
  'assets/img/bambini.webp', 'assets/img/cerimonia.jpg', 'assets/img/battesimo.jpg'
];
const GAP = 6;
function galleryScene() {
  const host = document.getElementById('gal-stage');
  const section = document.getElementById('galleria');
  const caps = [...section.querySelectorAll('.cap')];
  const capsBox = section.querySelector('.gal__captions');
  const bar = document.getElementById('gal-bar');
  const renderer = makeRenderer(host, 'Galleria 3D notturna: le collezioni di RC Boutique appese come vetrine illuminate su un pavimento a specchio.');
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  scene.fog = new THREE.Fog(0x070605, 8, 30);
  const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 80);
  const loader = new THREE.TextureLoader();
  const gold = goldMat(0.28);
  const len = PANELS.length * GAP + 10;

  const floor = new Reflector(new THREE.PlaneGeometry(9, len + 20), {
    color: 0x5c5c5c, textureWidth: Math.round(host.clientWidth * DPR * 0.5), textureHeight: Math.round(host.clientHeight * DPR * 0.5)
  });
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -len / 2 + 6); scene.add(floor);
  const stone = new THREE.Mesh(new THREE.PlaneGeometry(9, len + 20), new THREE.MeshBasicMaterial({ color: 0x070605, transparent: true, opacity: 0.5, depthWrite: false }));
  stone.rotation.x = -Math.PI / 2; stone.position.set(0, 0.003, -len / 2 + 6); scene.add(stone);

  // arches with lamps
  const lampGeo = new THREE.SphereGeometry(0.05, 12, 8);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.0), toneMapped: false });
  for (let i = 0; i <= PANELS.length + 1; i++) {
    const z = -i * GAP + 1;
    const arch = new THREE.Group();
    const arc = new THREE.Mesh(new THREE.TorusGeometry(3, 0.04, 10, 90, Math.PI), gold); arc.position.y = 3; arch.add(arc);
    [-3, 3].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3, 12), gold); leg.position.set(x, 1.5, 0); arch.add(leg);
    });
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 13);
    const mm = new THREE.Matrix4();
    for (let k = 0; k < 13; k++) { const a = (k / 12) * Math.PI; mm.makeTranslation(Math.cos(a) * 3, 3 + Math.sin(a) * 3, 0); lamps.setMatrixAt(k, mm); }
    arch.add(lamps);
    arch.position.z = z; scene.add(arch);
  }

  // the collections, hung as lit windows
  const panels = [];
  PANELS.forEach((src, i) => {
    const side = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x777777, toneMapped: false }));
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.06), gold);
    frame.position.z = -0.04;
    g.add(frame, photo);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: DOT, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, -1.38, 0.9); g.add(pool);
    g.userData = { side, z: -i * GAP - 3, photo, frame, glow: 0 };
    scene.add(g); panels.push(g);
    loader.load(src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const a = tex.image.width / tex.image.height;
      const h = 2.3, w = Math.min(2.6, h * a);
      photo.scale.set(w, h, 1); frame.scale.set(w + 0.12, h + 0.12, 1);
      photo.material.map = tex; photo.material.needsUpdate = true;
    });
  });

  // the far wall: the galleria at night
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ color: 0x8a8a8a, toneMapped: false }));
  wall.position.set(0, 3, -PANELS.length * GAP - 4); scene.add(wall);
  loader.load('assets/img/galleria-notte.jpg', (tex) => { tex.colorSpace = THREE.SRGBColorSpace; wall.material.map = tex; wall.material.needsUpdate = true; });

  const motes = dust(small ? 200 : 420, 8, 4.5); motes.position.z = -len / 2; motes.scale.z = len / 8; scene.add(motes);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.6, 0.5, 0.95));
  composer.addPass(new OutputPass());

  let portrait = false;
  function frame() {
    const w = host.clientWidth, h = host.clientHeight;
    portrait = w / h < 0.9;
    camera.aspect = w / h; camera.fov = portrait ? 62 : 46; camera.updateProjectionMatrix();
    renderer.setSize(w, h); composer.setSize(w, h);
    floor.getRenderTarget().setSize(Math.round(w * DPR * 0.5), Math.round(h * DPR * 0.5));
    panels.forEach((g) => {
      const x = g.userData.side * (portrait ? 1.15 : 1.9);
      g.position.set(x, 1.45, g.userData.z);
      g.rotation.y = -g.userData.side * (portrait ? 0.62 : 0.5);
    });
  }
  frame();

  // isolate on pick
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(9, 9);
  let hovered = -1;
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });
  host.addEventListener('pointerleave', () => mouse.set(9, 9));

  const cam = new THREE.Vector3(), look = new THREE.Vector3(), lookNow = new THREE.Vector3(0, 1.4, -3);
  const stop = (i) => {
    const g = panels[Math.max(0, Math.min(panels.length - 1, i))].userData;
    const sx = g.side * (portrait ? 1.15 : 1.9);
    return {
      pos: new THREE.Vector3(-g.side * (portrait ? 0.2 : 0.45), 1.5, g.z + (portrait ? 4.2 : 3.6)),
      look: new THREE.Vector3(sx * 0.8, 1.4, g.z)
    };
  };
  let lastCap = -1;
  return {
    host, section, resize: frame,
    render(t) {
      const r = section.getBoundingClientRect();
      const p = clamp01(-r.top / (r.height - innerHeight));
      const seg = p * (panels.length - 1 + 0.6) - 0.3;
      const i0 = Math.floor(seg), f = seg - i0;
      const hold = smooth(clamp01((f - 0.18) / 0.64));
      const a = stop(i0), b = stop(i0 + 1);
      if (seg < 0) { cam.copy(a.pos).add(new THREE.Vector3(0, 0.2, 5 * -seg / 0.3)); look.copy(a.look); }
      else { cam.lerpVectors(a.pos, b.pos, hold); look.lerpVectors(a.look, b.look, hold); }
      if (seg > panels.length - 1) { const k = clamp01((seg - (panels.length - 1)) / 0.3); cam.z -= k * 3; look.set(0, 2.6, wall.position.z); }
      camera.position.lerp(cam, 0.12);
      lookNow.lerp(look, 0.1);
      camera.lookAt(lookNow.x, lookNow.y, lookNow.z);

      const ci = Math.max(0, Math.min(panels.length - 1, Math.round(seg)));
      if (ci !== lastCap) {
        caps.forEach((c, k) => c.classList.toggle('is-on', k === ci));
        capsBox.classList.toggle('is-right', panels[ci].userData.side < 0);
        lastCap = ci;
      }
      bar.style.transform = `scaleX(${p.toFixed(4)})`;

      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(panels.map((g) => g.userData.photo))[0];
      hovered = hit ? panels.findIndex((g) => g.userData.photo === hit.object) : -1;
      host.style.cursor = hovered >= 0 ? 'pointer' : '';
      panels.forEach((g, k) => {
        const focus = hovered >= 0 ? (k === hovered ? 1 : 0.28) : (k === ci ? 1 : 0.55);
        g.userData.glow += (focus - g.userData.glow) * 0.08;
        g.userData.photo.material.color.setScalar(0.22 + g.userData.glow * 0.66);
      });
      motes.userData.tick(t);
      composer.render();
    },
    click() { if (hovered >= 0) document.getElementById('listino').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  };
}

/* ---------- loop, visibility, resize ---------- */
const scenes = [];
try { scenes.push(heroScene()); } catch (e) { console.warn(e); }
try { const g = galleryScene(); scenes.push(g); g.host.addEventListener('click', g.click); } catch (e) { console.warn(e); }
if (!scenes.length) root.classList.replace('has-webgl', 'no-webgl');

const live = new Set();
const io = new IntersectionObserver((es) => es.forEach((e) => {
  const s = scenes.find((x) => x.section === e.target);
  if (s) e.isIntersecting ? live.add(s) : live.delete(s);
}), { rootMargin: '100px' });
scenes.forEach((s) => io.observe(s.section));

let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => scenes.forEach((s) => s.resize()), 120); });

const clock = new THREE.Clock();
renderer_loop();
function renderer_loop() {
  const t = clock.getElapsedTime();
  if (!document.hidden) live.forEach((s) => s.render(t));
  requestAnimationFrame(renderer_loop);
}
