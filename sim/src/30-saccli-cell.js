// =====================================================================
// Scanners Keyence (área inteira, cabeça fixa)
// =====================================================================
function frustum(color, opacity = 0.14) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(36), 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18), 3));
  const patch = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  m.frustumCulled = patch.frustumCulled = false;
  scene.add(m, patch); m.visible = patch.visible = false;
  return { set(apex, c, on, k = 1) {
    m.visible = patch.visible = on; if (!on) return;
    const p = geo.attributes.position; let i = 0;
    for (let s = 0; s < 4; s++) { const a = c[s], b = c[(s + 1) % 4]; p.setXYZ(i++, apex.x, apex.y, apex.z); p.setXYZ(i++, a.x, a.y, a.z); p.setXYZ(i++, b.x, b.y, b.z); }
    p.needsUpdate = true;
    const q = pgeo.attributes.position; [0, 1, 2, 0, 2, 3].forEach((o, j) => q.setXYZ(j, c[o].x, c[o].y, c[o].z)); q.needsUpdate = true;
    m.material.opacity = opacity * k; patch.material.opacity = 0.5 * k;
  } };
}
const keyenceLogo = new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (g) => {
  g.fillStyle = "#111317"; g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#f2f2f2"; g.font = "bold 40px Arial, sans-serif"; g.fillText("KEYENCE", 30, 46);
}) });
const projGlow = M(0x3b82f6, 0, 0.3, { emissive: 0x2f7bff, emissiveIntensity: 2.5 });
const camGlass = M(0x0b1d33, 0.6, 0.05);
function keyenceHead(w, h, d, parent) {
  const g = new THREE.Group(); parent.add(g);
  box(w, h * 0.75, d, mat.black, 0, -h * 0.125, 0, g);
  box(w * 1.01, h * 0.25, d * 1.01, M(0xc3c8ce, 0.85, 0.3), 0, h * 0.375, 0, g);
  box(w * 0.35, h * 0.3, d * 0.6, M(0xc3c8ce, 0.85, 0.3), w * 0.3, h * 0.42, 0, g);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, w * 0.1), keyenceLogo); logo.position.set(w * 0.1, 0, d / 2 + 1); g.add(logo);
  box(w * 0.32, 4, d * 0.55, projGlow, -w * 0.25, -h / 2 - 1, 0, g, false);
  const lens = cyl(Math.min(w, d) * 0.16, 8, camGlass, g, 24); lens.position.set(w * 0.25, -h / 2 - 3, 0);
  for (const s of [-1, 1]) cyl(Math.min(12, w * 0.05), 30, mat.chrome, g, 12).position.set(s * w * 0.25, h / 2 + 15, 0);
  return g;
}
// Scanner 1: Keyence LJ-S fixo, centrado sobre a lima, logo antes do módulo (1 passo = 400 mm), a 620 mm: um disparo lê a lima inteira
const SCAN1_K = -1, SCAN1_X = SCAN1_K * PITCH, S1_LENS = 620;
const g1 = new THREE.Group(); g1.position.set(SCAN1_X, 0, 0); scene.add(g1);
for (const z of [-(BELT_W / 2 + 190), BELT_W / 2 + 190]) { box(60, 900 - FLOOR, 60, mat.alu, 0, (900 + FLOOR) / 2, z, g1); box(140, 12, 140, mat.dark, 0, FLOOR + 6, z, g1); }
box(70, 60, BELT_W + 440, mat.alu, 0, 900, 0, g1);
box(60, 110, 60, mat.alu, 0, 815, 0, g1);
keyenceHead(380, 160, 250, g1).position.set(0, S1_LENS + 80, 0);
const fr1 = frustum(0x3b82f6, 0.24), fr1cam = frustum(0xdbeafe, 0.07);

// =====================================================================
// Módulos A1–C2: dois blocos, um de cada lado da esteira, com a lima a passar ao meio
// =====================================================================
const MOD_X = 0, GAP = 26, HOUSE_IN = BELT_W / 2 + 50, HOUSE_D = 130;
const yLima = () => TOP + 8 + P.b / 2;
const housings = [-1, 1].map((s) => ({ s, base: unitMesh(mat.blue), body: unitMesh(mat.black), legs: [0, 1].map(() => unitMesh(mat.alu)) }));
const MODS = [
  { name: "A1", motor: "M1-R", side: -1, pt: "A" }, { name: "A2", motor: "M2-L", side: 1, pt: "A" },
  { name: "B1", motor: "M3-R", side: -1, pt: "B" }, { name: "B2", motor: "M4-L", side: 1, pt: "B" },
  { name: "C1", motor: "M5-R", side: -1, pt: "C" }, { name: "C2", motor: "M6-L", side: 1, pt: "C" },
];
const acts = MODS.map((m) => {
  const g = new THREE.Group(); scene.add(g);
  const rod = cyl(6, 1, mat.chrome, g); rod.rotation.x = Math.PI / 2;
  const tip = cyl(11, 7, mat.brass, g); tip.rotation.x = Math.PI / 2;
  const boss = cyl(20, 14, mat.blue, g); boss.rotation.x = Math.PI / 2;
  const led = unitMesh(mat.ledG); led.scale.set(12, 4, 12);
  return { ...m, g, rod, tip, boss, led, ext: 0, role: "idle", force: 0 };
});
// Scanner 2: duas cabeças por cima do módulo; cada uma lê metade da lima (A–B e B–C), sobrepostas em B
const s2 = new THREE.Group(); scene.add(s2);
for (const z of [-(BELT_W / 2 + 260), BELT_W / 2 + 260]) { box(50, 520 - FLOOR, 50, mat.alu, MOD_X, (520 + FLOOR) / 2, z, s2); box(120, 12, 120, mat.dark, MOD_X, FLOOR + 6, z, s2); }
box(60, 50, BELT_W + 580, mat.alu, MOD_X, 520, 0, s2);
const s2Beam = unitMesh(mat.alu);
const heads2 = [0, 1].map(() => { const g = new THREE.Group(); scene.add(g); keyenceHead(130, 70, 100, g); return { g, x: 0, span: [0, 0] }; });
const fr2 = [frustum(0xb07aff, 0.12), frustum(0xb07aff, 0.12)];
const S2_Y = 400;
function layoutModule() {
  const L = 2 * P.a + 170;
  for (const hs of housings) {
    const zc = hs.s * (HOUSE_IN + HOUSE_D / 2);
    hs.base.scale.set(L + 20, 30, HOUSE_D + 20); hs.base.position.set(MOD_X, -25, zc);
    hs.body.scale.set(L, 100, HOUSE_D); hs.body.position.set(MOD_X, 40, zc);
    hs.legs.forEach((lg, i) => { lg.scale.set(50, -40 - FLOOR, 50); lg.position.set(MOD_X + (i ? 1 : -1) * (L / 2 - 30), (FLOOR - 40) / 2, zc); });
  }
  for (const a of acts) {
    a.g.position.set(MOD_X + zOf(a.pt), yLima(), 0);
    a.boss.position.z = a.side * (HOUSE_IN + 7);
    a.led.position.set(MOD_X + zOf(a.pt), 92, a.side * (HOUSE_IN + HOUSE_D / 2));
  }
  s2Beam.scale.set(2 * P.a + 160, 40, 40); s2Beam.position.set(MOD_X, 470, 0);
  heads2.forEach((h, i) => {
    h.x = MOD_X + (i ? P.a / 2 : -P.a / 2);
    h.g.position.set(h.x, S2_Y, 0);
    h.span = i ? [MOD_X - 22, MOD_X + P.a + 22] : [MOD_X - P.a - 22, MOD_X + 22];
  });
}
function setActuator(a, tipZ) {
  const from = a.side * HOUSE_IN, to = tipZ + a.side * 3.5;
  a.rod.scale.y = Math.max(1, Math.abs(from - to));
  a.rod.position.z = (from + to) / 2;
  a.tip.position.z = to;
}

// =====================================================================
// KUKA KR DELTA (cinemática delta: 3 braços, paralelogramos)
// =====================================================================
const DELTA = { R: 95, r: 34, La: 270, Lb: 560 };
function makeDelta(B, postsX, postsZ) {
  const g = new THREE.Group(); scene.add(g);
  const topY = B.y + 120;
  for (const x of postsX) for (const z of postsZ) { box(60, topY - FLOOR, 60, mat.alu, x, (topY + FLOOR) / 2, z, g); box(140, 14, 140, mat.dark, x, FLOOR + 7, z, g); }
  for (const z of postsZ) box(postsX[1] - postsX[0] + 60, 60, 60, mat.alu, (postsX[0] + postsX[1]) / 2, topY, z, g);
  for (const x of postsX) box(60, 60, postsZ[1] - postsZ[0] + 60, mat.alu, x, topY, (postsZ[0] + postsZ[1]) / 2, g);
  box(postsX[1] - postsX[0], 50, 80, mat.alu, (postsX[0] + postsX[1]) / 2, topY, B.z, g);
  box(320, 20, 320, mat.aluDark, B.x, topY - 35, B.z, g);
  const body = new THREE.Group(); body.position.copy(B); g.add(body);
  cyl(130, 80, mat.kukaWhite, body, 40).position.y = 55;
  cyl(134, 18, mat.kukaOrange, body, 40).position.y = 98;
  cyl(110, 14, mat.carbon, body, 40).position.y = 8;
  const arms = [0, 1, 2].map((i) => {
    const th = Math.PI / 2 + i * 2 * Math.PI / 3;
    const dir = V(Math.cos(th), 0, Math.sin(th)), perp = V(-Math.sin(th), 0, Math.cos(th));
    const pod = new THREE.Group(); pod.position.copy(dir).multiplyScalar(120); pod.position.y = 45; pod.lookAt(dir.clone().multiplyScalar(400).setY(45)); body.add(pod);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(80, 70, 90), mat.kukaWhite); housing.castShadow = true; pod.add(housing);
    const cap = cyl(36, 20, mat.kukaOrange, pod, 24); cap.rotation.x = Math.PI / 2; cap.position.z = 52;
    const upper = new THREE.Mesh(unitBox, mat.carbon); upper.castShadow = true; g.add(upper);
    const lower = [0, 1].map(() => { const m = new THREE.Mesh(unitCyl, mat.carbon); m.castShadow = true; g.add(m); return m; });
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(13, 12, 10), mat.kukaOrange); g.add(elbow);
    return { dir, perp, upper, lower, elbow };
  });
  const eff = new THREE.Group(); g.add(eff);
  cyl(46, 14, mat.kukaWhite, eff, 28);
  cyl(48, 5, mat.kukaOrange, eff, 28).position.y = 9;
  box(70, 16, 44, mat.black, 0, -15, 0, eff);
  const fingers = [-1, 1].map((s) => ({ f: box(60, 24, 6, mat.aluDark, 0, -24, s * 20, eff), s }));   // pinças em z (espessura da lima)
  const r = { B: B.clone(), g, arms, eff, fingers, E: V(B.x, 300, B.z), home: V(B.x, 300, B.z), grip: 0, gripTarget: 0, task: null, carrying: null };
  solveDelta(r);
  return r;
}
function solveDelta(r) {
  const B = r.B, E = r.E;
  for (const arm of r.arms) {
    const A = E.clone().addScaledVector(arm.dir, DELTA.r).sub(B);
    const ua = A.dot(arm.dir), w = A.dot(arm.perp), ya = A.y;
    const Lb = Math.sqrt(Math.max(1, DELTA.Lb ** 2 - w * w));
    const du = ua - DELTA.R, dy = ya, d = Math.max(1e-6, Math.hypot(du, dy));
    const a = (DELTA.La ** 2 - Lb ** 2 + d * d) / (2 * d);
    const hh = Math.sqrt(Math.max(0, DELTA.La ** 2 - a * a));
    const pu = DELTA.R + a * du / d, py = a * dy / d;
    const e1 = [pu - hh * dy / d, py + hh * du / d], e2 = [pu + hh * dy / d, py - hh * du / d];
    const el = e1[0] > e2[0] ? e1 : e2;
    const shoulder = B.clone().addScaledVector(arm.dir, DELTA.R);
    const elbow = B.clone().addScaledVector(arm.dir, el[0]); elbow.y += el[1];
    between(arm.upper, shoulder, elbow, 26);
    arm.elbow.position.copy(elbow);
    const attach = E.clone().addScaledVector(arm.dir, DELTA.r);
    arm.lower.forEach((m, j) => { const s = j ? 22 : -22; between(m, elbow.clone().addScaledVector(arm.perp, s), attach.clone().addScaledVector(arm.perp, s), 4.5); });
  }
  r.eff.position.copy(E);
  for (const { f, s } of r.fingers) f.position.z = s * (P.h / 2 + 4 + (1 - r.grip) * 14);
}
const IN_X = K_MIN * PITCH, OUT_PICK_X = K_MAX * PITCH;
const robotIn = makeDelta(V(IN_X, 640, -210), [IN_X - 300, IN_X + 300], [-760, 330]);
const robotOut = makeDelta(V(950, 640, 210), [650, 1250], [-330, 760]);
function runTask(r, dt, key = "E") {
  r.grip += (r.gripTarget - r.grip) * Math.min(1, dt * 10);
  const task = r.task;
  if (!task || task.i >= task.wps.length) return true;
  const wp = task.wps[task.i];
  task.t += dt;
  const s = Math.min(1, task.t / wp.d);
  r[key].lerpVectors(task.from, wp.p, ease(s));
  if (s >= 1) { if (wp.on) wp.on(); task.from = wp.p.clone(); task.i++; task.t = 0; }
  return false;
}
const gripY = (bottom) => bottom + P.b + 12;
function startRobots() {
  const spare = limas.find((l) => l.state === "pool");
  const src = inputCrate();
  robotIn.task = null;
  if (spare && src) {
    const top = src.dummies[src.dummies.length - 1];
    const pick = V(src.x, src.y, src.z).add(top.position).add(V(0, P.b / 2 + 12, 0)), place = V(IN_X, gripY(TOP + 8), 0);
    robotIn.task = { i: 0, t: 0, src, from: robotIn.E.clone(), wps: [
      { p: pick.clone().setY(pick.y + 120), d: 0.45 },
      { p: pick, d: 0.3, on: () => { robotIn.gripTarget = 1; takeDummy(src); randomLima(spare); spare.state = "carry"; robotIn.carrying = spare; } },
      { p: pick.clone().setY(pick.y + 170), d: 0.3 },
      { p: place.clone().setY(place.y + 160), d: 0.55 },
      { p: place, d: 0.3, on: () => { robotIn.gripTarget = 0; spare.state = "belt"; spare.k = K_MIN; robotIn.carrying = null; } },
      { p: robotIn.home.clone(), d: 0.45 },
    ] };
  }
  const done = limas.find((l) => l.state === "belt" && l.k === K_MAX);
  robotOut.task = null;
  if (done) {
    const ok = done.result ? done.result === "ok" : Math.abs(um(done.meas1 ?? done.e)) <= P.tol;
    const pick = V(OUT_PICK_X, gripY(TOP + 8), 0);
    const drop = ok ? V(OK_X, gripY(70), OUT_Z) : V(NOK_POS.x, gripY(70), NOK_POS.z);   // caixa verde (OK) ou vermelha (NOK)
    robotOut.task = { i: 0, t: 0, from: robotOut.E.clone(), wps: [
      { p: pick.clone().setY(pick.y + 140), d: 0.45 },
      { p: pick, d: 0.3, on: () => { robotOut.gripTarget = 1; done.state = "carry"; robotOut.carrying = done; } },
      { p: pick.clone().setY(pick.y + 180), d: 0.3 },
      { p: drop.clone().setY(drop.y + 80), d: 0.6 },
      { p: drop, d: 0.25, on: () => {
        robotOut.gripTarget = 0; robotOut.carrying = null;
        if (ok) dropOk(); else dropNok();
        done.state = "pool"; done.k = null;
      } },
      { p: robotOut.home.clone(), d: 0.45 },
    ] };
  }
}

