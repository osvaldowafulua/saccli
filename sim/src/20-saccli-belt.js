// =====================================================================
// Esteira rolante: a lima vai deitada de cutelo, no sentido do movimento (x)
// =====================================================================
const PITCH = 400, K_MIN = -3, K_MAX = 2, BELT_W = 200, TOP = 0;
const BX0 = K_MIN * PITCH - PITCH / 2 - 50, BX1 = K_MAX * PITCH + PITCH / 2 + 50, BXC = (BX0 + BX1) / 2, BLEN = BX1 - BX0;
box(BLEN, 40, BELT_W + 40, mat.aluDark, BXC, TOP - 40, 0);
for (const z of [-(BELT_W / 2 + 30), BELT_W / 2 + 30]) {
  box(BLEN + 40, 50, 30, mat.alu, BXC, TOP - 25, z);
  for (let x = BX0 + 60; x <= BX1 - 40; x += 620) { box(40, -FLOOR - 40, 40, mat.alu, x, (FLOOR + TOP - 40) / 2, z); box(90, 12, 90, mat.dark, x, FLOOR + 6, z); }
}
for (const x of [BX0 - 20, BX1 + 20]) { const r = cyl(28, BELT_W, mat.chrome); r.rotation.x = Math.PI / 2; r.position.set(x, TOP - 22, 0); }
box(BLEN + 20, 6, BELT_W, mat.belt, BXC, TOP - 3, 0);
box(90, 90, 120, mat.black, BX0 - 20, TOP - 60, BELT_W / 2 + 110);
box(92, 26, 122, mat.blue, BX0 - 20, TOP - 110, BELT_W / 2 + 110);
// tapete com ranhura: a lima fica de cutelo entre duas réguas baixas
const pads = [];
for (let k = K_MIN; k <= K_MAX; k++) {
  const g = new THREE.Group(); scene.add(g);
  box(PITCH - 30, 4, BELT_W - 40, mat.padMat, 0, 2, 0, g);
  for (const x of [-140, 0, 140]) for (const s of [-1, 1]) box(70, 3, 14, mat.slot, x, 5.5, s * 55, g);
  const rails = [-1, 1].map((s) => box(PITCH - 60, 8, 3, mat.blue, 0, 8, s * 10, g));
  box(6, 10, BELT_W - 40, mat.black, -(PITCH / 2 - 18), 5, 0, g);
  pads.push({ k, g, rails });
}

// =====================================================================
// Limas
// =====================================================================
const ramp = [[0, 0x2f6fdc], [1, 0x3b82f6], [1.3, 0xfacc15], [2, 0xf97316], [3, 0xef4444]];
const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
function rampColor(r, out) {
  r = Math.abs(r);
  for (let i = 1; i < ramp.length; i++) {
    if (r <= ramp[i][0] || i === ramp.length - 1) {
      const t = Math.min(1, Math.max(0, (r - ramp[i - 1][0]) / (ramp[i][0] - ramp[i - 1][0])));
      return out.set(ramp[i - 1][1]).lerp(tmpC2.set(ramp[i][1]), t);
    }
  }
  return out;
}
const PTS = ["A", "B", "C"];
const zOf = (pt) => (pt === "A" ? -P.a : pt === "B" ? 0 : P.a);   // posição ao longo da lima (= x na esteira)
const limaLen = () => 2 * P.a + 70;
const L2 = () => limaLen() / 2 + 30;
const limas = [];
let counter = 1;
function randomLima(l) {
  l.pt = PTS[Math.floor(Math.random() * 3)];
  const straight = Math.random() < P.straight / 100;
  const mag = straight ? Math.random() * 0.6 * P.tol / 1000 : (0.15 + Math.random() * 0.85) * Math.max(P.e0, 1.5 * P.tol) / 1000;
  l.e = (Math.random() < 0.5 ? -1 : 1) * mag;
  l.e0 = l.e;
  l.meas1 = undefined;
  l.syTrue = P.sy * (1 + (Math.random() * 2 - 1) * P.var / 100);
  l.result = null; l.load = 0; l.loadDir = 0; l.stress = 0; l.loadPt = l.pt; l.id = counter++;
}
function errShape(z, pt) {
  const a = P.a;
  if (pt === "B") return 1 - (z / a) ** 2;
  if (pt === "C") return z <= 0 ? 0 : Math.pow(z / a, 1.6);
  return z >= 0 ? 0 : Math.pow(-z / a, 1.6);
}
function loadShape(z, pt) {
  const a = P.a;
  if (pt === "B") { const u = Math.min(1, Math.abs(z) / a), s = 1 - u; return 0.5 * s * (3 - s * s); }
  const x = pt === "C" ? z : -z;
  if (x <= 0) return 0;
  const xi = x / a;
  return xi <= 1 ? xi * xi * (3 - xi) / 2 : 1 + 1.5 * (xi - 1);
}
function newLimaGeometry() {
  const g = new THREE.BoxGeometry(P.h, P.b, limaLen(), 1, 3, 90);
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  g.userData.base = g.attributes.position.array.slice();
  return g;
}
const limaMat = new THREE.MeshStandardMaterial({ map: teeth, vertexColors: true, metalness: 0.75, roughness: 0.38 });
function makeLima(state, k = null) {
  const group = new THREE.Group(); group.rotation.y = Math.PI / 2; scene.add(group);   // comprimento ao longo da esteira
  const mesh = new THREE.Mesh(newLimaGeometry(), limaMat); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  const tang = new THREE.Mesh(new THREE.BoxGeometry(P.h * 0.55, P.b * 0.45, 60), mat.aluDark); tang.castShadow = true; group.add(tang);
  const l = { k, group, mesh, tang, state };
  randomLima(l);
  limas.push(l);
  return l;
}
function rebuildLimas() {
  for (const l of limas) {
    l.mesh.geometry.dispose(); l.mesh.geometry = newLimaGeometry();
    l.tang.geometry.dispose(); l.tang.geometry = new THREE.BoxGeometry(P.h * 0.55, P.b * 0.45, 60);
  }
}
// deslocamento lateral (direção da espessura). Com a lima rodada, +lateral = −z no mundo.
const lateral = (l, z) => l.e * errShape(z, l.pt) * P.exag + l.load * loadShape(z, l.loadPt) * l.loadDir;
function shapeLima(l) {
  const y = 8 + P.b / 2;
  l.mesh.position.set(0, y, 0);
  l.tang.position.set(lateral(l, limaLen() / 2), y, L2());
  const g = l.mesh.geometry, pos = g.attributes.position, base = g.userData.base, col = g.attributes.color;
  const tolMm = P.tol / 1000;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], yy = base[i * 3 + 1], z = base[i * 3 + 2];
    pos.setXYZ(i, x + lateral(l, z), yy, z);
    if (l.stress > 0) rampColor(l.stress * 3 * Math.max(0, 1 - Math.abs(z) / P.a), tmpC);
    else rampColor((l.e * errShape(z, l.pt)) / tolMm, tmpC);
    col.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
  }
  pos.needsUpdate = true; col.needsUpdate = true;
  g.computeVertexNormals();
}

