// =====================================================================
// Resto da fábrica
// =====================================================================
function fence(x0, z0, x1, z1, gaps = []) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), H = 1800;
  const g = new THREE.Group(); g.position.set(x0, FLOOR, z0); g.rotation.y = -ang; scene.add(g);
  const n = Math.ceil(len / 1000), w = len / n;
  for (let i = 0; i <= n; i++) box(50, H, 50, mat.yellow, i * w, H / 2, 0, g, false);
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * w;
    if (gaps.some(([a, b]) => cx > a && cx < b)) continue;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 50, H - 300), M(0x3a3f46, 0.6, 0.5, { map: meshTex(w, H), transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    p.position.set(cx, (H + 150) / 2 + 75, 0); g.add(p);
    box(w - 50, 30, 20, mat.dark, cx, 230, 0, g, false); box(w - 50, 30, 20, mat.dark, cx, H - 40, 0, g, false);
  }
}
fence(-1800, -1000, 1800, -1000);
fence(-1800, 1000, 1800, 1000);
fence(-1800, -1000, -1800, 1000, [[150, 800]]);
fence(1800, -1000, 1800, 1000, [[1250, 1850]]);

const hmiC = document.createElement("canvas"); hmiC.width = 512; hmiC.height = 320;
const hmiTex = new THREE.CanvasTexture(hmiC); hmiTex.colorSpace = THREE.SRGBColorSpace;
const cab = new THREE.Group(); cab.position.set(300, FLOOR, -1380); cab.rotation.y = Math.PI; scene.add(cab);   // frente para o corredor (−z), acessível ao operador
box(900, 2000, 420, mat.cabinet, 0, 1100, 0, cab);
box(900, 100, 420, mat.dark, 0, 50, 0, cab);
box(4, 1900, 4, mat.dark, 0, 1100, 211, cab, false);
for (const s of [-1, 1]) box(16, 120, 30, mat.dark, s * 60, 1150, 220, cab, false);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(380, 238), new THREE.MeshBasicMaterial({ map: hmiTex, toneMapped: false }));
screen.position.set(-220, 1450, 212); cab.add(screen);
box(400, 260, 10, mat.dark, -220, 1450, 207, cab, false);
box(110, 110, 12, mat.yellow, 220, 1450, 212, cab, false);
const estop = cyl(36, 30, M(0xd62828, 0.1, 0.4), cab, 24); estop.rotation.x = Math.PI / 2; estop.position.set(220, 1450, 228);
cyl(12, 260, mat.aluDark, cab, 12).position.set(330, 2230, 0);
const tower = [mat.ledR, mat.ledO, mat.ledG].map((m, i) => { const c = cyl(45, 90, m.clone(), cab, 24); c.position.set(330, 2400 + (2 - i) * 95, 0); return c; });
stripe(-300, -1640, 900, -1640, 60);

// (o forno e a picagem antigos foram substituídos pelas estações da linha a montante: src/55-*.js)
function stackLoad(parent, x, y0, z, h, m) {
  if (m === mat.wrap) { box(1150, h, 950, m, x, y0 + h / 2, z, parent, false); return; }
  const cw = m === mat.crate ? 380 : 560, cd = m === mat.crate ? 300 : 460, ch = m === mat.crate ? 220 : 300;
  const nx = Math.floor(1150 / cw), nz = Math.floor(950 / cd), ny = Math.max(1, Math.floor(h / ch));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++)
    box(cw - 14, ch - 8, cd - 14, m, x + (i - (nx - 1) / 2) * cw, y0 + j * ch + ch / 2, z + (k - (nz - 1) / 2) * cd, parent, false);
}
for (const [x, z] of [[-4600, 1600], [-3200, 1600]]) { const g = new THREE.Group(); g.position.set(x, FLOOR, z); scene.add(g); box(1200, 140, 1000, mat.wood, 0, 70, 0, g); stackLoad(g, 0, 140, 0, 700, mat.crate); }
for (let i = 0; i < 6; i++) {
  const x = -7000 + i * 2800;
  for (const z of [-6600, -5600]) box(90, 4400, 90, mat.rackBlue, x, FLOOR + 2200, z);
  if (i < 5) for (const y of [150, 1700, 3250]) {
    for (const z of [-6600, -5600]) box(2800, 120, 70, mat.rackOrange, x + 1400, FLOOR + y, z);
    if (i >= 3) continue;   // vãos 3 e 4: lugares livres que o KMF 1500P vai ocupando
    for (const s of [-1, 1]) {
      const px = x + 1400 + s * 680, py = FLOOR + y + 60;
      box(1200, 140, 1000, mat.wood, px, py + 70, -6100, scene, false);
      const loads = [mat.carton, mat.crate, mat.wrap, mat.carton];
      stackLoad(scene, px, py + 140, -6100, 900, loads[((i + s + y / 1550) % 4 + 4) % 4 | 0] || mat.carton);
    }
  }
}

