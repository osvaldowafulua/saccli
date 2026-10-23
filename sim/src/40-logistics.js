// =====================================================================
// Cobot de paletização + AMR
// =====================================================================
const P_ST = { x: 3800, z: -430 }, D_ST = { x: 6600, z: 1500 }, E_ST = { x: 6600, z: -800 }, PARK = { x: 5200, z: -430 }, AMR_STAGE = 5400;
const STAND_Y = FLOOR + 300;
function stand(x, z) {
  for (const s of [-1, 1]) box(1300, 40, 60, mat.aluDark, x, STAND_Y - 20, z + s * 450);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(60, 300, 60, mat.yellow, x + sx * 620, FLOOR + 150, z + sz * 450);
}
stand(P_ST.x, P_ST.z); stand(D_ST.x, D_ST.z); stand(E_ST.x, E_ST.z);
function makePallet(x, z) {
  const g = new THREE.Group(); g.position.set(x, STAND_Y, z); scene.add(g);
  box(1200, 22, 1000, mat.wood, 0, 11, 0, g, false);
  for (const zz of [-440, 0, 440]) box(1200, 96, 120, mat.wood, 0, 70, zz, g);
  for (let x2 = -540; x2 <= 540; x2 += 135) box(100, 22, 1000, mat.wood, x2, 129, 0, g);
  return { g, crates: [] };
}
// 24 caixas de cartão por palete (1200 × 1000): 2 camadas de 12 = 3 (x) × 4 (z)  ([x, z, camada])
const SLOTS = [0, 1].flatMap((layer) => [-360, -120, 120, 360].flatMap((z) => [-390, 0, 390].map((x) => [x, z, layer])));
const station = { pallet: makePallet(P_ST.x, P_ST.z) };
const emptySt = { pallet: makePallet(E_ST.x, E_ST.z), regen: 0 };
const shipping = [];

// cobot de paletização (classe LBR iisy 15 R1300): no meio do lado longo da palete para chegar aos 12 lugares de cada camada
const COB = { base: V(3450, -100, 200), L1: 680, L2: 620, s0: 170, tool: 170 };
const cobot = { T: V(3500, 450, 320), home: V(3500, 450, 320), task: null, carrying: null, grip: 0, gripTarget: 0 };
box(300, COB.base.y - FLOOR, 300, mat.dark, COB.base.x, (COB.base.y + FLOOR) / 2, COB.base.z);
const cb = {
  base: unitMesh(mat.cobot, unitCyl), ring: unitMesh(mat.cobotJoint, unitCyl), sh: unitMesh(mat.cobotJoint, unitCyl), up: unitMesh(mat.cobot, unitCyl),
  el: unitMesh(mat.cobotJoint, unitCyl), fo: unitMesh(mat.cobot, unitCyl), w1: unitMesh(mat.cobotJoint, unitCyl), w2: unitMesh(mat.cobotJoint, unitCyl),
  tool: unitMesh(mat.black, unitCyl), plate: unitMesh(mat.black), f1: unitMesh(mat.aluDark), f2: unitMesh(mat.aluDark),
};
function solveCobot() {
  const B = COB.base, T = cobot.T;
  between(cb.base, B, B.clone().add(V(0, 120, 0)), 95);
  between(cb.ring, B.clone().add(V(0, 110, 0)), B.clone().add(V(0, 125, 0)), 98);
  const S = B.clone().add(V(0, COB.s0, 0));
  const dx = T.x - B.x, dz = T.z - B.z, rho = Math.max(1, Math.hypot(dx, dz));
  const dir = V(dx / rho, 0, dz / rho), perp = V(-dir.z, 0, dir.x);
  const v = T.y + COB.tool + 90 - S.y;
  const D = Math.min(Math.hypot(rho, v), COB.L1 + COB.L2 - 1);
  const q2 = Math.acos(Math.max(-1, Math.min(1, (D * D - COB.L1 ** 2 - COB.L2 ** 2) / (2 * COB.L1 * COB.L2))));
  const q1 = Math.atan2(v, rho) + Math.atan2(COB.L2 * Math.sin(q2), COB.L1 + COB.L2 * Math.cos(q2));
  const El = S.clone().addScaledVector(dir, COB.L1 * Math.cos(q1)); El.y += COB.L1 * Math.sin(q1);
  const Wr = El.clone().addScaledVector(dir, COB.L2 * Math.cos(q1 - q2)); Wr.y += COB.L2 * Math.sin(q1 - q2);
  between(cb.sh, S.clone().addScaledVector(perp, -85), S.clone().addScaledVector(perp, 85), 78);
  between(cb.up, S, El, 56);
  between(cb.el, El.clone().addScaledVector(perp, -75), El.clone().addScaledVector(perp, 75), 64);
  between(cb.fo, El, Wr, 46);
  between(cb.w1, Wr.clone().addScaledVector(perp, -55), Wr.clone().addScaledVector(perp, 55), 46);
  const W2 = Wr.clone().add(V(0, -90, 0));
  between(cb.w2, Wr, W2, 44);
  between(cb.tool, W2, T.clone().add(V(0, 30, 0)), 34);
  cb.plate.scale.set(CART.w + 40, 18, 140); cb.plate.position.copy(T).add(V(0, 20, 0));
  const open = (1 - cobot.grip) * 20;
  cb.f1.scale.set(8, 70, 140); cb.f1.position.copy(T).add(V(-(CART.w / 2 + 4 + open), -20, 0));
  cb.f2.scale.set(8, 70, 140); cb.f2.position.copy(T).add(V(CART.w / 2 + 4 + open, -20, 0));
}
function startCobot() {
  if (cobot.task) return;
  const pal = station.pallet;
  if (!pal || pal.crates.length >= SLOTS.length || amr.pallet === pal) return;
  const k = cartons.filter((o) => o.state === "waiting").sort((a, b) => b.x - a.x)[0];
  if (!k || Math.abs(k.x - CART_END) > 1) return;
  const top = ROLLER_Y + CART.h;
  const pick = V(k.x, top, CART_Z);
  const slot = SLOTS[pal.crates.length];
  const sw = V(slot[0], 0, slot[1]).applyAxisAngle(Y, pal.g.rotation.y).add(pal.g.position);
  const place = V(sw.x, pal.g.position.y + 140 + slot[2] * CART.h + CART.h, sw.z);
  cobot.task = { i: 0, t: 0, from: cobot.T.clone(), wps: [
    { p: pick.clone().setY(top + 300), d: 0.9 },
    { p: pick, d: 0.45, on: () => { k.state = "carried"; cobot.carrying = k; cobot.gripTarget = 1; } },
    { p: pick.clone().setY(top + 450), d: 0.5 },
    { p: place.clone().setY(place.y + 420), d: 1.1 },
    { p: place, d: 0.5, on: () => {
      cobot.carrying = null; cobot.gripTarget = 0; k.state = "pallet";
      pal.g.add(k.g); k.g.position.set(slot[0], 140 + slot[2] * CART.h, slot[1]); k.g.rotation.set(0, 0, 0);
      pal.crates.push(k); cartons.splice(cartons.indexOf(k), 1);
      if (pal.crates.length >= SLOTS.length) startAMR();
    } },
    { p: cobot.home.clone(), d: 0.9 },
  ] };
}
function queueTo(list, head, gap, speed, dt, rest) {
  list.sort((a, b) => b.x - a.x).forEach((c, i) => {
    const target = head - i * gap;
    c.x = Math.min(target, c.x + speed * dt);
    c.state = c.x >= target - 0.5 ? (c.state === "unloading" ? "unloading" : rest) : "moving";
  });
}
function updateCrates(dt) {
  updateCrateLoops(dt);
  const closingHere = cartons.some((k) => k.state === "closing");
  for (const k of cartons) {
    if (k.state === "arriving") { const tgt = closingHere ? PACK_X - CART.w - 60 : PACK_X; k.x = Math.min(tgt, k.x + 400 * dt); if (k.x >= PACK_X - 0.5) k.state = "open"; }
    else if (k.state === "closing") { k.close = Math.min(1, k.close + dt / 1.6); setClose(k, k.close); if (k.close >= 1) k.state = "moving"; }
  }
  queueTo(cartons.filter((k) => ["moving", "waiting"].includes(k.state)), CART_END, CART.w + 40, 600, dt, "waiting");
  for (const k of cartons) {
    if (k.state === "carried") k.g.position.copy(cobot.T).add(V(0, -CART.h, 0));
    else if (k.state !== "pallet") k.g.position.set(k.x, ROLLER_Y, CART_Z);
  }
}

// caixa de cartão final, com abas que fecham e fita
const cartonFlapMat = M(0xc79d6a, 0, 0.9), tapeMat = M(0xd8c39a, 0.1, 0.4, { transparent: true, opacity: 0.85 });
function makeCarton(x, z, state, closed = false, parent = scene) {
  const g = new THREE.Group(); g.position.set(x, ROLLER_Y, z); parent.add(g);
  const { w: W, d: D, h: H } = CART, t = 4;
  box(W, t, D, mat.carton, 0, t / 2, 0, g);
  for (const s of [-1, 1]) { box(W, H, t, mat.carton, 0, H / 2, s * (D / 2 - t / 2), g); box(t, H, D, mat.carton, s * (W / 2 - t / 2), H / 2, 0, g); }
  const longF = [-1, 1].map((s) => { const pv = new THREE.Group(); pv.position.set(0, H, s * D / 2); g.add(pv); box(W - 4, 3, D / 2, cartonFlapMat, 0, 4, -s * D / 4, pv); return { pv, s }; });
  const shortF = [-1, 1].map((s) => { const pv = new THREE.Group(); pv.position.set(s * W / 2, H, 0); g.add(pv); box(90, 3, D - 12, cartonFlapMat, -s * 45, 1, 0, pv); return { pv, s }; });
  const tape = box(W + 8, 2, 50, tapeMat, 0, H + 7, 0, g, false);
  const k = { g, x, state, n: 0, dummies: [], close: closed ? 1 : 0, longF, shortF, tape };
  setClose(k, k.close);
  return k;
}
function setClose(k, c) {
  const a = Math.PI * 2 / 3;
  const cs = Math.min(1, c * 2), cl = Math.max(0, Math.min(1, c * 2 - 1));
  for (const f of k.shortF) f.pv.rotation.z = -f.s * a * (1 - ease(cs));
  for (const f of k.longF) f.pv.rotation.x = f.s * a * (1 - ease(cl));
  k.tape.visible = c >= 1;
}
const cartonSlot = (n) => V(0, 4 + P.b / 2 + Math.floor(n / 4) * P.b, ((n % 4) - 1.5) * 40);
function layoutCarton(k) { k.dummies.forEach((m, i) => { const v = cartonSlot(i); layDummy(m, v.x, v.y, v.z); }); }
const cartons = [];

const packer = makeDelta(V(PACK_X, 640, 620), [PACK_X - 300, PACK_X + 300], [180, 1060]);
packer.carry = null;
function packStep() {
  if (packer.task && packer.task.i < packer.task.wps.length) return;
  packer.task = null;
  if (!cartons.some((k) => k.state === "arriving" || k.state === "open")) cartons.push(makeCarton(1700, CART_Z, "arriving"));
  const cr = outCrates.find((o) => (o.state === "waiting" || o.state === "unloading") && Math.abs(o.x - PACK_X) < 1);
  const k = cartons.find((o) => o.state === "open");
  if (!cr || !k) return;
  if (k.n >= CAP_CARTON) { k.state = "closing"; k.close = 0; return; }
  if (cr.dummies.length === 0) { cr.state = "returning"; return; }   // vazia: desce no elevador e volta por baixo
  cr.state = "unloading";
  const src = cr.dummies[cr.dummies.length - 1];
  const from = V(PACK_X, ROLLER_Y, OUT_Z).add(src.position).add(V(0, P.b / 2 + 12, 0));
  const to = V(PACK_X, ROLLER_Y, CART_Z).add(cartonSlot(k.n)).add(V(0, P.b / 2 + 12, 0));
  packer.task = { i: 0, t: 0, from: packer.E.clone(), wps: [
    { p: from.clone().setY(from.y + 120), d: 0.35 },
    { p: from, d: 0.22, on: () => { cr.dummies.splice(cr.dummies.indexOf(src), 1); cr.n = cr.dummies.length; cr.g.remove(src); scene.add(src); packer.carry = src; packer.gripTarget = 1; } },
    { p: from.clone().setY(from.y + 170), d: 0.22 },
    { p: to.clone().setY(to.y + 170), d: 0.35 },
    { p: to, d: 0.22, on: () => { scene.remove(src); k.g.add(src); k.dummies.push(src); k.n++; layoutCarton(k); packer.carry = null; packer.gripTarget = 0; if (k.n >= CAP_CARTON) { k.state = "closing"; k.close = 0; } } },
    { p: to.clone().setY(to.y + 150), d: 0.2 },
  ] };
}

const amrG = new THREE.Group(); scene.add(amrG);
box(1100, 230, 760, mat.amr, 0, FLOOR + 145, 0, amrG);
box(1110, 34, 770, mat.kukaOrange, 0, FLOOR + 228, 0, amrG);
box(1112, 10, 772, mat.cyan, 0, FLOOR + 70, 0, amrG, false);
box(8, 90, 300, mat.glass, 556, FLOOR + 150, 0, amrG, false);
for (const [x, z] of [[560, 390], [-560, -390]]) { const l = cyl(40, 50, mat.black, amrG, 16); l.position.set(x, FLOOR + 120, z); }
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(42, 30, mat.black, amrG, 16); w.rotation.x = Math.PI / 2; w.position.set(sx * 380, FLOOR + 42, sz * 380); }
const amrPlate = box(980, 20, 660, M(0x9aa3ad, 0.6, 0.4), 0, FLOOR + 280, 0, amrG);
const amr = { x: PARK.x, z: PARK.z, hd: Math.PI, lift: 0, pallet: null, off: 0, task: null };
function startAMR() {
  if (amr.task) return;
  const full = station.pallet;
  amr.task = { i: 0, wps: [
    { to: [P_ST.x, P_ST.z] },
    { lift: 60, attach: () => full, on: () => { station.pallet = null; } },
    { to: [PARK.x, P_ST.z], rev: true },
    { to: [PARK.x, D_ST.z] },
    { waitUntil: () => !FL.waiting.length && !(FL.task && FL.task.i < 4) },   // só entra quando o posto de expedição está livre
    { to: [D_ST.x, D_ST.z] },
    { lift: 0, on: () => { FL.waiting.push(amr.pallet); amr.pallet = null; startForklift(); } },
    { to: [AMR_STAGE, D_ST.z], rev: true },
    { to: [AMR_STAGE, E_ST.z] },
    { to: [E_ST.x, E_ST.z] },
    { lift: 60, attach: () => emptySt.pallet, on: () => { emptySt.pallet = null; emptySt.regen = 4; } },
    { to: [AMR_STAGE, E_ST.z], rev: true },
    { to: [AMR_STAGE, P_ST.z] },
    { to: [P_ST.x, P_ST.z] },
    { lift: 0, on: () => { station.pallet = amr.pallet; amr.pallet = null; } },
    { to: [PARK.x, P_ST.z], rev: true },
  ] };
}
function runAMR(dt) {
  const t = amr.task;
  if (t && t.i < t.wps.length) {
    const wp = t.wps[t.i];
    if (wp.waitUntil) { if (wp.waitUntil()) t.i++; }
    else if (wp.lift !== undefined) {
      if (wp.attach && !wp.started) { const p = wp.attach(); amr.pallet = p; amr.off = p ? p.g.rotation.y + amr.hd : 0; }
      wp.started = true;
      const d = wp.lift - amr.lift;
      amr.lift += Math.sign(d) * Math.min(Math.abs(d), 75 * dt);
      if (Math.abs(wp.lift - amr.lift) < 1e-3) { if (wp.on) wp.on(); t.i++; }
    } else {
      const dx = wp.to[0] - amr.x, dz = wp.to[1] - amr.z, dist = Math.hypot(dx, dz);
      if (dist < 1) { amr.x = wp.to[0]; amr.z = wp.to[1]; if (wp.on) wp.on(); t.i++; }
      else {
        const want = Math.atan2(dz, dx) + (wp.rev ? Math.PI : 0);
        const dh = ((want - amr.hd) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        if (Math.abs(dh) > 0.005) amr.hd += Math.sign(dh) * Math.min(Math.abs(dh), 1.4 * dt);
        else { amr.hd = want; const v = Math.min(dist, 1000 * dt); amr.x += (dx / dist) * v; amr.z += (dz / dist) * v; }
      }
    }
    if (t.i >= t.wps.length) amr.task = null;
  }
  if (emptySt.regen > 0) { emptySt.regen -= dt; if (emptySt.regen <= 0) emptySt.pallet = makePallet(E_ST.x, E_ST.z); }
  runForklift(dt);
}
function drawAMR() {
  amrG.position.set(amr.x, 0, amr.z); amrG.rotation.y = -amr.hd;
  amrPlate.position.y = FLOOR + 280 + amr.lift;
  if (amr.pallet) {
    amr.pallet.g.position.set(amr.x, Math.max(STAND_Y, FLOOR + 290 + amr.lift), amr.z);
    amr.pallet.g.rotation.y = -amr.hd + amr.off;
  }
}


// =====================================================================
// KUKA KMF 1500P: empilhador autónomo (AGV de garfos, 1500 kg) que tira a palete cheia do posto
// de expedição e a arruma no armário de paletes — sem condutor, navega por laser
// =====================================================================
const RACK = { z: -6100, levels: [150, 1700, 3250], xs: [2120, 3480, 4920, 6280] };   // vãos livres do armário (2 vãos × 2 lugares × 3 níveis)
const rackSlots = [];
for (const y of RACK.levels) for (const x of RACK.xs) rackSlots.push({ x, y, pallet: null, t: 0 });
let rackClock = 0;
const FL_FORK_X = 1310, FL_AISLE_Z = -4250, FL_ROUTE_X = 9150, FL_PARK_Z = 3000;
const FL = { x: FL_ROUTE_X, z: FL_PARK_Z, hd: -Math.PI / 2, fork: 150, pallet: null, off: 0, task: null, waiting: [], lift: 0 };
// cais de carga: rampa niveladora de 2,2 m que sobe do chão da nave até ao piso do reboque (+418 mm) na porta (x = HALL.x − 40, z = 2200).
// O camião (68-exterior.js) regista-se em DOCK.truck: { wants(), slotX(k), accept(pal) } — o KMF 1500P vai buscar paletes ao armário e
// carrega-as uma a uma dentro do reboque, da frente para a porta.
const DOCK = { x: HALL.x - 40, z: 2200, rise: 418, ramp: 2200, truck: null, inside: false, reserved: 0 };
const flG = new THREE.Group(); scene.add(flG);
const kukaLogo = new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (g) => {
  g.fillStyle = "#f1f1ee"; g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#ff6a13"; g.font = "bold 46px Arial, sans-serif"; g.fillText("KUKA", 52, 50);
}) });
const kmfHmi = new THREE.MeshBasicMaterial({ map: canvasTex(128, 64, (g) => {
  g.fillStyle = "#0b1420"; g.fillRect(0, 0, 128, 64);
  g.fillStyle = "#22d3ee"; g.font = "bold 13px Arial, sans-serif"; g.fillText("KMF 1500P", 10, 20);
  g.fillStyle = "#9fb3c8"; g.font = "11px Arial, sans-serif"; g.fillText("AUTO · 1500 kg", 10, 40); g.fillText("Nav laser OK", 10, 56);
}) });
{
  const white = mat.kukaWhite, dark = mat.carbon;
  // base preta com os scanners de segurança nos cantos e a faixa de estado em ciano (como no KMP)
  box(1100, 150, 880, dark, -80, FLOOR + 115, 0, flG);
  box(1102, 10, 882, mat.cyan, -80, FLOOR + 192, 0, flG, false);
  for (const [x, z] of [[450, 420], [-610, -420]]) { const l = cyl(36, 44, mat.black, flG, 16); l.position.set(x, FLOOR + 90, z); const w = cyl(26, 10, mat.ledO, flG, 12); w.position.set(x, FLOOR + 118, z); }
  // carroçaria branca: corpo traseiro (baterias, controlador) com tampa inclinada e consola de comando
  box(760, 560, 860, white, -250, FLOOR + 480, 0, flG);                         // corpo
  box(700, 60, 800, white, -270, FLOOR + 790, 0, flG);                          // tampa
  const top = box(560, 160, 800, white, -290, FLOOR + 880, 0, flG); top.rotation.z = -0.18;   // capota inclinada
  box(60, 480, 880, dark, 140, FLOOR + 440, 0, flG);                            // painel frontal do corpo (atrás do mastro)
  const hmi = new THREE.Mesh(new THREE.PlaneGeometry(190, 95), kmfHmi); hmi.rotation.x = -Math.PI / 2 + 0.45; hmi.position.set(-300, FLOOR + 985, 120); flG.add(hmi);   // consola virada para o operador (+z)
  const stop = cyl(26, 24, mat.ledR, flG, 16); stop.position.set(-300, FLOOR + 975, -160);   // paragem de emergência
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(420, 105), kukaLogo);     // logótipo KUKA no lado do operador (+z)
  logo.position.set(-250, FLOOR + 540, 432); flG.add(logo);
  const logo2 = logo.clone(); logo2.rotation.y = Math.PI; logo2.position.z = -432; flG.add(logo2);
  box(70, 70, 70, mat.steel, -200, FLOOR + 1000, 300, flG); const tower = cyl(30, 90, mat.ledG, flG, 16); tower.position.set(-200, FLOOR + 1080, 300);   // torre luminosa
  box(30, 220, 520, dark, -640, FLOOR + 420, 0, flG);                           // painel traseiro (contactos de carga, ligações)
  // rodas: roda motriz/direcção ao centro atrás, apoios laterais
  const drive = cyl(130, 110, mat.black, flG, 24); drive.rotation.x = Math.PI / 2; drive.position.set(-380, FLOOR + 130, 0);
  for (const z of [-400, 400]) { const w = cyl(70, 60, mat.black, flG, 16); w.rotation.x = Math.PI / 2; w.position.set(80, FLOOR + 70, z); }
  // braços de apoio por baixo dos garfos com as rodas de carga na ponta (empilhador de paletes: os garfos sobem sobre eles)
  for (const z of [-210, 210]) {
    box(1150, 60, 150, dark, FL_FORK_X - 20, FLOOR + 50, z, flG);
    const w = cyl(44, 70, mat.black, flG, 16); w.rotation.x = Math.PI / 2; w.position.set(FL_FORK_X + 480, FLOOR + 44, z);
  }
  // mastro duplex: dois montantes exteriores pretos com travessas, sensor de navegação/câmara 3D no topo
  for (const z of [-330, 330]) box(90, 2350, 120, dark, 700, FLOOR + 1275, z, flG);
  for (const y of [FLOOR + 260, FLOOR + 1300, FLOOR + 2400]) box(70, 60, 720, dark, 700, y, 0, flG);
  box(120, 110, 240, M(0x8a9099, 0.4, 0.45), 700, FLOOR + 2500, 0, flG);                     // cabeça de sensores (câmara 3D + laser)
  const lens = cyl(28, 16, mat.glass, flG, 16); lens.rotation.z = Math.PI / 2; lens.position.set(770, FLOOR + 2500, 0);
  const nav = cyl(34, 50, mat.black, flG, 16); nav.position.set(700, FLOOR + 2580, 0);
  const navLed = cyl(30, 8, mat.ledB, flG, 16); navLed.position.set(700, FLOOR + 2585, 0);
  box(10, 140, 500, M(0x111111, 0.2, 0.6), 660, FLOOR + 470, 0, flG);
}
const flInner = new THREE.Group(); flG.add(flInner);
for (const z of [-250, 250]) box(60, 2300, 80, mat.aluDark, 745, FLOOR + 1250, z, flInner);   // mastro interior (sobe com os garfos altos)
const flCar = new THREE.Group(); flG.add(flCar);
box(60, 520, 760, mat.carbon, 780, 260, 0, flCar);                                // porta-garfos
box(24, 640, 760, mat.kukaWhite, 770, 780, 0, flCar);                            // encosto de carga branco (painel KMF)
const carLogo = new THREE.Mesh(new THREE.PlaneGeometry(330, 82), kukaLogo); carLogo.rotation.y = -Math.PI / 2; carLogo.position.set(757, 790, 0); flCar.add(carLogo);
for (const z of [-210, 210]) box(1100, 40, 110, mat.carbon, FL_FORK_X, 0, z, flCar); // garfos
addView("kmf", "KMF 1500P · armário", [8600, 2600, -900], [5200, 700, -4600]);
function drawForklift() {
  flG.position.set(FL.x, FL.lift, FL.z); flG.rotation.y = -FL.hd;
  flCar.position.y = FLOOR + FL.fork;
  flInner.position.y = Math.max(0, FL.fork - 1900);
  if (FL.pallet) {
    FL.pallet.g.position.set(FL.x + Math.cos(FL.hd) * FL_FORK_X, FLOOR + FL.lift + FL.fork - 60, FL.z + Math.sin(FL.hd) * FL_FORK_X);
    FL.pallet.g.rotation.y = -FL.hd + FL.off;
  }
}
// tarefa de carga: palete mais antiga do armário → camião no cais
function startLoadTruck() {
  const tr = DOCK.truck;
  if (!tr || !tr.wants()) return false;
  const full = rackSlots.filter((s) => s.pallet);
  if (!full.length) return false;
  const slot = full.reduce((a, b) => (a.t <= b.t ? a : b));
  const pal = slot.pallet, k = tr.reserve();
  const xIn = tr.slotX(k) - FL_FORK_X, zIn = DOCK.z + tr.slotZ(k);                // posição do KMF com a palete no lugar k do reboque (2 filas)
  FL.task = { i: 0, t: 0, load: true, wps: [
    { fork: 320 },
    { to: [FL_ROUTE_X, FL_AISLE_Z] },
    { to: [slot.x, FL_AISLE_Z] },
    { face: -Math.PI / 2 },
    { fork: slot.y + 50 },                                                          // garfos por baixo da palete
    { to: [slot.x, RACK.z + FL_FORK_X] },
    { call: () => { slot.pallet = null; FL.pallet = pal; FL.off = pal.g.rotation.y + FL.hd; } },
    { fork: slot.y + 190 },                                                         // levanta das longarinas
    { to: [slot.x, FL_AISLE_Z], rev: true },
    { fork: 320 },
    { to: [FL_ROUTE_X, FL_AISLE_Z] },
    { to: [FL_ROUTE_X, zIn] },
    { face: 0 },
    { call: () => { DOCK.inside = true; } },
    { to: [xIn, zIn] },                                                          // sobe a rampa e entra no reboque
    { fork: 60 },                                                                   // pousa no piso do reboque
    { call: () => { FL.pallet = null; tr.accept(pal, k); shipped++; } },
    { to: [FL_ROUTE_X, zIn], rev: true },
    { call: () => { DOCK.inside = false; } },
    { fork: 150 },
    { to: [FL_ROUTE_X, FL_PARK_Z] },
  ] };
  return true;
}
function startForklift() {
  if (FL.task) return;
  if (!FL.waiting.length) { startLoadTruck(); return; }
  const slot = rackSlots.find((s) => !s.pallet);
  if (!slot) { startLoadTruck(); return; }   // armário cheio: espera que o camião volte e leve paletes
  const pal = FL.waiting[0];
  slot.pallet = pal;
  FL.task = { i: 0, t: 0, wps: [
    { fork: STAND_Y - FLOOR + 60 },
    { to: [FL_ROUTE_X, D_ST.z] },
    { to: [D_ST.x + FL_FORK_X, D_ST.z] },                                          // garfos entram na palete
    { call: () => { FL.waiting.shift(); FL.pallet = pal; FL.off = pal.g.rotation.y + FL.hd; } },
    { fork: STAND_Y - FLOOR + 140 },                                                // levanta a palete
    { to: [FL_ROUTE_X, D_ST.z], rev: true },
    { fork: 320 },
    { to: [FL_ROUTE_X, FL_AISLE_Z] },
    { to: [slot.x, FL_AISLE_Z] },
    { face: -Math.PI / 2 },
    { fork: slot.y + 180 },                                                         // sobe ao nível livre
    { to: [slot.x, RACK.z + FL_FORK_X] },
    { fork: slot.y + 120 },                                                         // pousa nas longarinas
    { call: () => { FL.pallet = null; pal.g.position.set(slot.x, FLOOR + slot.y + 60, RACK.z); slot.t = rackClock; } },
    { fork: slot.y + 60 },
    { to: [slot.x, FL_AISLE_Z], rev: true },
    { fork: 150 },
    { to: [FL_ROUTE_X, FL_AISLE_Z] },
    { to: [FL_ROUTE_X, FL_PARK_Z] },
  ] };
}
function dockLift() {   // altura do KMF: sobe a rampa niveladora e fica ao nível do piso do reboque lá dentro
  const u = Math.abs(FL.z - DOCK.z) < 1600 ? Math.max(0, Math.min(1, (FL.x - (DOCK.x - DOCK.ramp)) / DOCK.ramp)) : 0;
  FL.lift = DOCK.rise * u;
}
function runForklift(dt) {
  rackClock += dt;
  const t = FL.task;
  if (!t) { startForklift(); return; }
  const wp = t.wps[t.i];
  if (!wp) { FL.task = null; startForklift(); return; }
  if (wp.call) { wp.call(); t.i++; return; }
  if (wp.fork !== undefined) { if (approach(FL, "fork", wp.fork, 420, dt)) { FL.fork = wp.fork; t.i++; } return; }
  const turnTo = (want) => { const dh = ((want - FL.hd) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; if (Math.abs(dh) > 0.004) { FL.hd += Math.sign(dh) * Math.min(Math.abs(dh), 1.1 * dt); return false; } FL.hd = want; return true; };
  if (wp.face !== undefined) { if (turnTo(wp.face)) t.i++; return; }
  const dx = wp.to[0] - FL.x, dz = wp.to[1] - FL.z, dist = Math.hypot(dx, dz);
  if (dist < 1) { FL.x = wp.to[0]; FL.z = wp.to[1]; t.i++; dockLift(); return; }
  if (!turnTo(Math.atan2(dz, dx) + (wp.rev ? Math.PI : 0))) return;
  const v = Math.min(dist, (FL.pallet ? 900 : 1300) * dt * (FL.lift > 1 ? 0.5 : 1));
  FL.x += (dx / dist) * v; FL.z += (dz / dist) * v;
  dockLift();
}
