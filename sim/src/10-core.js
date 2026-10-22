
// =====================================================================
// Modelo físico — aço elástico-perfeitamente plástico, secção rectangular
//   Torta em B: segura A e C, corrige B  -> flexão em 3 pontos (vão 2a)
//   Torta em C: segura A e B, corrige C  -> consola de comprimento a
//   Torta em A: segura B e C, corrige A  -> consola de comprimento a
// Flecha no ponto de carga: δ = ∫ κ(c·F·s) · s ds, s de 0 a a  (3 pontos c = 1/2, consola c = 1)
// =====================================================================
const P = { indT: 1200, quenchT: 0.3, finish: "shot", h: 10, b: 25, a: 100, sy: 1800, var: 8, E: 210000, cap: 20000, clamp: 250, sensor: "ljs", straight: 40, e0: 500, tol: 50, exag: 15, speed: 1 };
const SENSORS = { ljs: { name: "Keyence LJ-S640", sigma: 10 }, hp: { name: "sensor de alta precisão", sigma: 0.1 } };
const sigma = () => SENSORS[P.sensor].sigma;
const I = () => P.b * P.h ** 3 / 12;
const My = (sy) => sy * P.b * P.h * P.h / 6;
const cOf = (pt) => (pt === "B" ? 0.5 : 1);
const Kof = (pt) => (pt === "B" ? 48 * P.E * I() / (2 * P.a) ** 3 : 3 * P.E * I() / P.a ** 3);
const Fy = (pt, sy = P.sy) => My(sy) / (cOf(pt) * P.a);
function kappa(Mo, sy) {
  const my = My(sy), EI = P.E * I();
  if (Mo <= my) return Mo / EI;
  return (my / EI) / Math.sqrt(Math.max(1e-9, 3 - 2 * Mo / my));
}
function bend(F, pt, sy = P.sy, n = 160) {
  const c = cOf(pt), ds = P.a / n, EI = P.E * I();
  let loaded = 0, residual = 0;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * ds, Mo = c * F * s, k = kappa(Mo, sy);
    loaded += k * s * ds;
    residual += (k - Mo / EI) * s * ds;
  }
  return { loaded, residual };
}
function forceFor(res, pt, sy = P.sy) {
  const fy = Fy(pt, sy);
  if (res <= 0) return fy;
  let lo = fy, hi = fy * 1.4999999;
  for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; bend(m, pt, sy).residual < res ? (lo = m) : (hi = m); }
  return (lo + hi) / 2;
}
const reactions = (F, pt) => (pt === "B" ? { near: F / 2, far: F / 2 } : { near: 2 * F, far: F });
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const um = (mm) => mm * 1000;
const fmtF = (n) => Math.abs(n) >= 1000 ? (n / 1000).toFixed(2) + " kN" : n.toFixed(1) + " N";
const fmtUm = (u) => { const a = Math.abs(u); return (u >= 0 ? "+" : "−") + (a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a.toFixed(2)) + " µm"; };
const ease = (s) => s * s * (3 - 2 * s);

// =====================================================================
// Renderer, câmara, luz
// =====================================================================
const FLOOR = -620;
const HALL = { x: 11600, z: 7000, h: 7600 };   // nave alongada em x para a bobina/desbobinador no início da linha
const host = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa3abb4);
scene.fog = new THREE.Fog(0xa3abb4, 9000, 26000);
scene.environment = makeEnvironment(renderer);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 10, 40000);
const controls = new Orbit(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 100;
controls.maxDistance = 14000;

scene.add(new THREE.HemisphereLight(0xf1f4f9, 0x4b5058, 1.05));
const sun = new THREE.DirectionalLight(0xfff4e2, 1.5);
sun.position.set(-900, 2800, 1300);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -2400, right: 2400, top: 2400, bottom: -2400, near: 100, far: 7000 });
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.35); fill.position.set(3000, 2000, -2500); scene.add(fill);

const M = (color, metalness = 0.1, roughness = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const mat = {
  alu: M(0xc9d2de, 0.85, 0.32), aluDark: M(0x8892a0, 0.8, 0.45), belt: M(0x1a1e26, 0.1, 0.92),
  slot: M(0x3fcf74, 0, 0.6, { emissive: 0x0c3a1c, emissiveIntensity: 0.6 }), padMat: M(0xf3efe2, 0, 0.85),
  black: M(0x16181d, 0.3, 0.6), blue: M(0x1f5fd6, 0.05, 0.55), chrome: M(0xe8edf2, 1, 0.12), brass: M(0xd8b26a, 0.9, 0.3),
  label: M(0xf2f2f2, 0, 0.7), glass: M(0x0d1a2e, 0.4, 0.1), steel: M(0xaab1ba, 0.85, 0.35),
  ledG: M(0x22ff88, 0, 0.5, { emissive: 0x22ff88, emissiveIntensity: 2 }), ledO: M(0xffa040, 0, 0.5, { emissive: 0xffa040, emissiveIntensity: 2 }),
  ledB: M(0x5aa2ff, 0, 0.5, { emissive: 0x5aa2ff, emissiveIntensity: 2 }), ledR: M(0xff4040, 0, 0.5, { emissive: 0xff4040, emissiveIntensity: 2 }),
  kukaWhite: M(0xf1f1ee, 0.1, 0.35), kukaOrange: M(0xff6a13, 0.1, 0.4), carbon: M(0x1b1c1f, 0.3, 0.45),
  crate: M(0x2b5fb3, 0, 0.55), crateRed: M(0xb23a3a, 0, 0.55), crateGreen: M(0x2f8f53, 0, 0.55),
  wood: M(0xb08a5a, 0, 0.85), carton: M(0xb98d5b, 0, 0.9), yellow: M(0xf2c200, 0.2, 0.5),
  steelBlue: M(0x3e5872, 0.6, 0.5), rackOrange: M(0xe2701c, 0.3, 0.5), rackBlue: M(0x2d4f8f, 0.4, 0.5),
  cabinet: M(0xd8dcdf, 0.3, 0.55), furnace: M(0x5d6a78, 0.6, 0.5), dark: M(0x2a2f36, 0.5, 0.6),
  glow: M(0xff7a1a, 0, 0.4, { emissive: 0xff6a12, emissiveIntensity: 3 }),
  lamp: M(0xfff6e0, 0, 0.3, { emissive: 0xfff3d6, emissiveIntensity: 2.2 }),
  skylight: M(0xe8f1ff, 0, 0.3, { emissive: 0xe4eeff, emissiveIntensity: 1.3 }),
  window: M(0xcfe0f2, 0.2, 0.15, { emissive: 0xbcd3ec, emissiveIntensity: 0.9 }),
  wrap: M(0xf2f4f6, 0, 0.25, { transparent: true, opacity: 0.55 }),
  cobot: M(0xdfe3e7, 0.2, 0.35), cobotJoint: M(0x5b8fc9, 0.2, 0.4), amr: M(0x3b4048, 0.4, 0.5),
  cyan: M(0x22d3ee, 0, 0.5, { emissive: 0x22d3ee, emissiveIntensity: 1.6 }),
};
const box = (w, h, d, m, x = 0, y = 0, z = 0, parent = scene, shadow = true) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.castShadow = o.receiveShadow = shadow; parent.add(o); return o;
};
const cyl = (r, len, m, parent = scene, seg = 24) => {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  o.castShadow = o.receiveShadow = true; parent.add(o); return o;
};
const Y = new THREE.Vector3(0, 1, 0), XAXIS = new THREE.Vector3(1, 0, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 16);
function between(mesh, a, b, thick) {
  const d = new THREE.Vector3().subVectors(b, a), len = Math.max(1e-3, d.length());
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(Y, d.normalize());
  mesh.scale.set(thick, len, thick);
}
function beam(a, b, size, m, parent = scene) { const o = new THREE.Mesh(unitBox, m); o.receiveShadow = true; between(o, a, b, size); parent.add(o); return o; }
function unitMesh(m, geo = unitBox) { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; scene.add(o); return o; }

// =====================================================================
// Texturas procedurais
// =====================================================================
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  LANG.used = false; draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (LANG.used) LANG.canvases.push(() => { g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; });   // placa com texto traduzível: redesenha ao mudar de idioma
  return t;
}
const concrete = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#8a8e92"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 12000; i++) { const v = (100 + Math.random() * 70) | 0; g.fillStyle = `rgba(${v},${v},${v + 3},${Math.random() * 0.22})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 110;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(55,55,58,0.13)"); gr.addColorStop(1, "rgba(55,55,58,0)");
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  g.strokeStyle = "rgba(45,45,48,0.55)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
}, [(2 * HALL.x) / 4000, (2 * HALL.z) / 4000]);
const teeth = canvasTex(64, 256, (g, w, h) => {
  g.fillStyle = "#c7ccd3"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#7d848e"; g.lineWidth = 2;
  for (let y = -64; y < 320; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 26); g.stroke(); }
}, [1, 6]);
const panelTex = (len) => canvasTex(256, 8, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? "#a9b1ba" : "#d3d8de");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, [len / 1600, 1]);
const meshTex = (w, h) => canvasTex(64, 64, (g) => {
  g.clearRect(0, 0, 64, 64); g.strokeStyle = "rgba(40,44,50,0.75)"; g.lineWidth = 1.6;
  for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
}, [w / 200, h / 200]);

// =====================================================================
// Nave industrial
// =====================================================================
const yl = M(0xf2c200, 0, 0.7);
function stripe(x0, z0, x1, z1, w = 80, m = yl) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(len, w), m);
  s.rotation.x = -Math.PI / 2; s.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
  s.position.set((x0 + x1) / 2, FLOOR + 1, (z0 + z1) / 2); s.receiveShadow = true; scene.add(s);
}
function buildHall() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALL.x, 2 * HALL.z), M(0xffffff, 0.05, 0.82, { map: concrete }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; scene.add(floor);
  const top = FLOOR + HALL.h;
  const walls = [
    { len: 2 * HALL.x, pos: [0, -HALL.z], rot: 0 }, { len: 2 * HALL.x, pos: [0, HALL.z], rot: Math.PI },
    { len: 2 * HALL.z, pos: [-HALL.x, 0], rot: Math.PI / 2 }, { len: 2 * HALL.z, pos: [HALL.x, 0], rot: -Math.PI / 2 },
  ];
  for (const w of walls) {
    const g = new THREE.Group(); g.position.set(w.pos[0], FLOOR, w.pos[1]); g.rotation.y = w.rot; scene.add(g);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w.len, HALL.h), M(0xffffff, 0.4, 0.55, { map: panelTex(w.len) }));
    p.position.y = HALL.h / 2; g.add(p);
    box(w.len, 1200, 120, M(0x6f747a, 0, 0.9), 0, 600, 60, g, false);
    box(w.len - 2000, 900, 20, mat.window, 0, 5200, 15, g, false);
    for (let x = -w.len / 2 + 1000; x < w.len / 2 - 900; x += 2000) box(80, 900, 40, mat.steelBlue, x, 5200, 30, g, false);
    box(w.len, 260, 20, M(0x1f4f9e, 0.1, 0.6), 0, 1450, 15, g, false);
  }
  const door = new THREE.Group(); door.position.set(HALL.x - 30, FLOOR, 2200); door.rotation.y = -Math.PI / 2; scene.add(door);
  box(4200, 4800, 30, M(0x9aa3ad, 0.5, 0.5), 0, 2400, 0, door, false);
  for (let y = 400; y < 4800; y += 480) box(4200, 18, 40, M(0x7c858f, 0.5, 0.5), 0, y, 0, door, false);
  box(4400, 200, 60, mat.yellow, 0, 4900, 0, door, false);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALL.x, 2 * HALL.z), M(0x5b6068, 0.3, 0.8));
  roof.rotation.x = Math.PI / 2; roof.position.y = top; scene.add(roof);
  const lo = top - 1100, hi = top - 120;
  for (let x = -8000; x <= 8000; x += 4000) {
    beam(V(x, lo, -HALL.z), V(x, lo, HALL.z), 140, mat.steelBlue);
    beam(V(x, hi, -HALL.z), V(x, hi, HALL.z), 140, mat.steelBlue);
    for (let z = -HALL.z; z < HALL.z; z += 1400) { beam(V(x, lo, z), V(x, hi, z), 70, mat.steelBlue); beam(V(x, lo, z), V(x, hi, z + 1400), 60, mat.steelBlue); }
  }
  for (const x of [-6000, -2000, 2000, 6000]) box(1500, 20, 2 * HALL.z - 2000, mat.skylight, x, top - 15, 0, scene, false);
  for (const x of [-8000, -4000, 0, 4000, 8000]) for (const z of [-HALL.z + 150, HALL.z - 150]) {
    const col = new THREE.Group(); col.position.set(x, FLOOR, z); scene.add(col);
    box(300, HALL.h, 24, mat.steelBlue, 0, HALL.h / 2, 0, col, false);
    box(24, HALL.h, 300, mat.steelBlue, -138, HALL.h / 2, 0, col, false);
    box(24, HALL.h, 300, mat.steelBlue, 138, HALL.h / 2, 0, col, false);
    box(500, 30, 500, mat.dark, 0, 15, 0, col, false);
  }
  for (const x of [-6000, -2000, 2000, 6000]) for (const z of [-5250, -1750, 1750, 5250]) {
    const g = new THREE.Group(); g.position.set(x, lo - 900, z); scene.add(g);
    beam(V(0, 0, 0), V(0, 900, 0), 12, mat.dark, g);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(160, 260, 240, 24, 1, true), M(0x40454c, 0.6, 0.4, { side: THREE.DoubleSide }));
    shade.position.y = -100; g.add(shade);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(250, 24), mat.lamp); disc.rotation.x = Math.PI / 2; disc.position.y = -210; g.add(disc);
  }
  stripe(-2100, -1300, 2100, -1300); stripe(-2100, 1300, 2100, 1300); stripe(-2100, -1300, -2100, 1300); stripe(2100, -1300, 2100, 1300);
  stripe(-9500, 2600, 4400, 2600); stripe(-9500, 3400, 4400, 3400); stripe(-9500, -4700, 9500, -4700);
  const gm = M(0x22c55e, 0, 0.7);
  const lane = [[5200, -430], [5200, 1500], [6600, 1500]];
  for (let i = 0; i < lane.length - 1; i++) {
    const [x0, z0] = lane[i], [x1, z1] = lane[i + 1], n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / 400);
    for (let k = 0; k < n; k += 1) { const t0 = k / n, t1 = (k + 0.5) / n; stripe(x0 + (x1 - x0) * t0, z0 + (z1 - z0) * t0, x0 + (x1 - x0) * t1, z0 + (z1 - z0) * t1, 60, gm); }
  }
}
buildHall();

