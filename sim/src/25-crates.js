// =====================================================================
// Caixas e transportadores de rolos (limas sempre ao longo de x)
//   Entrada (azul):  enche no fim da linha a montante → fila → descarga (KR DELTA) → vazia sai
//                    de lado para o corredor de retorno → volta ao enchimento.
//   OK (verde):      enche na saída → embalagem → vazia desce no elevador → volta por baixo → sobe.
//   NOK (vermelha):  enche na saída → sai para o retrabalho → esvaziada, desce → volta por baixo → sobe.
// =====================================================================
const ROLLER_Y = -72, LOW_Y = -440;                  // nível dos rolos e do corredor de retorno inferior
const BIN_IN = { x: K_MIN * PITCH, z: -420, w: 340, d: 220 };
const FILL_X = -2060, RET_Z = -760, CAP_IN = 6;     // enchimento no fim da linha a montante; corredor de retorno
const OUT_Z = 450, OK_X = 800, GREEN_START = 440, CAP_CRATE = 6, CR_W = 340, CR_D = 180;
const PACK_X = 2150, GREEN_END = 2420, CART_Z = 820, CART_END = 2850, CART = { w: 360, d: 200, h: 120 }, CAP_CARTON = 6;
const NOK_POS = { x: 1250, z: 145 }, NOK_END = 2300, CAP_NOK = 8;
const binFloor = ROLLER_Y + 6;
function crate(spec, m, parent = scene) {
  const g = new THREE.Group(); g.position.set(spec.x, ROLLER_Y, spec.z); parent.add(g);
  const H = 120, t = 6;
  box(spec.w, t, spec.d, m, 0, t / 2, 0, g);
  box(spec.w, H, t, m, 0, H / 2, -spec.d / 2 + t / 2, g); box(spec.w, H, t, m, 0, H / 2, spec.d / 2 - t / 2, g);
  box(t, H, spec.d, m, -spec.w / 2 + t / 2, H / 2, 0, g); box(t, H, spec.d, m, spec.w / 2 - t / 2, H / 2, 0, g);
  box(spec.w * 0.3, 20, 4, mat.label, 0, H - 30, spec.d / 2 + 1, g);
  return g;
}
function rollerConveyor(x0, x1, z, width = 360, y = ROLLER_Y) {
  const g = new THREE.Group(); scene.add(g);
  const cy = y - 22;
  for (const s of [-1, 1]) box(x1 - x0, 60, 20, mat.alu, (x0 + x1) / 2, cy - 10, z + s * width / 2, g);
  const n = Math.floor((x1 - x0) / 90);
  const rollers = new THREE.InstancedMesh(new THREE.CylinderGeometry(22, 22, width - 20, 14), mat.chrome, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(XAXIS, Math.PI / 2);
  for (let i = 0; i < n; i++) { m4.compose(V(x0 + 45 + i * 90, cy, z), q, V(1, 1, 1)); rollers.setMatrixAt(i, m4); }
  rollers.castShadow = rollers.receiveShadow = true; g.add(rollers);
  for (let x = x0 + 100; x < x1; x += 1000) for (const s of [-1, 1]) box(40, cy - 40 - FLOOR, 40, mat.alu, x, (cy - 40 + FLOOR) / 2, z + s * (width / 2 - 10), g);
  return g;
}
// elevador de caixas: quatro colunas e uma plataforma que acompanha a caixa
function crateLift(x, z, w, d) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(40, ROLLER_Y + 260 - FLOOR, 40, mat.yellow, x + sx * (w / 2 + 40), (ROLLER_Y + 260 + FLOOR) / 2, z + sz * (d / 2 + 40));
  box(w + 120, 30, 40, mat.yellow, x, ROLLER_Y + 260, z - d / 2 - 40); box(w + 120, 30, 40, mat.yellow, x, ROLLER_Y + 260, z + d / 2 + 40);
  return box(w + 40, 14, d + 40, mat.aluDark, x, LOW_Y - 30, z);
}
const DUMMY_GEO = new THREE.BoxGeometry(1, 1, 1);
const dummyMat = M(0x8f969e, 0.85, 0.35, { map: teeth });     // lima acabada (cinza do jateamento)
function dummyLima(parent) { const m = new THREE.Mesh(DUMMY_GEO, dummyMat); m.castShadow = true; parent.add(m); return m; }
function layDummy(m, x, y, z) { m.scale.set(limaLen(), P.b, P.h); m.position.set(x, y, z); }   // comprimento em x, de cutelo
const crateSlot = (i, gap = 30) => V(0, 6 + P.b / 2 + Math.floor(i / 4) * P.b, ((i % 4) - 1.5) * gap);
function layoutCrateDummies(c) { c.dummies.forEach((m, i) => { const v = crateSlot(i, c.gap || 30); layDummy(m, v.x, v.y, v.z); }); }
function addDummy(c) { c.dummies.push(dummyLima(c.g)); c.n = c.dummies.length; layoutCrateDummies(c); }
function takeDummy(c) { const m = c.dummies.pop(); if (m) c.g.remove(m); c.n = c.dummies.length; return m; }
function clearCrate(c) { while (c.dummies.length) takeDummy(c); }
// aproxima um valor do alvo a velocidade constante; devolve true quando chega
function approach(o, key, target, speed, dt) { const d = target - o[key]; o[key] += Math.sign(d) * Math.min(Math.abs(d), speed * dt); return Math.abs(target - o[key]) < 0.5; }

// --- transportadores
rollerConveyor(FILL_X - 190, BIN_IN.x + 180, BIN_IN.z);                 // entrada: enchimento → fila → descarga
rollerConveyor(FILL_X - 190, BIN_IN.x + 180, RET_Z, 260);               // retorno das caixas de entrada vazias
rollerConveyor(380, GREEN_END + 60, OUT_Z);                              // verdes: saída → embalagem
rollerConveyor(380, GREEN_END + 60, OUT_Z, 360, LOW_Y);                  // verdes vazias: retorno por baixo
rollerConveyor(1660, CART_END + 220, CART_Z, 280);                       // caixas de cartão
rollerConveyor(NOK_POS.x - 190, NOK_END + 200, NOK_POS.z, 220);          // rejeitadas: saída → retrabalho
rollerConveyor(NOK_POS.x - 190, NOK_END + 200, NOK_POS.z, 220, LOW_Y);   // rejeitadas vazias: retorno por baixo
const liftPlates = {
  greenUp: crateLift(GREEN_START, OUT_Z, CR_W, CR_D), greenDown: crateLift(GREEN_END, OUT_Z, CR_W, CR_D),
  nokUp: crateLift(NOK_POS.x, NOK_POS.z, CR_W, CR_D), nokDown: crateLift(NOK_END, NOK_POS.z, CR_W, CR_D),
};
// bancada de retrabalho junto ao fim do corredor NOK
box(700, 40, 500, mat.wood, NOK_END + 520, 260, NOK_POS.z, scene); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(40, 880, 40, mat.aluDark, NOK_END + 520 + sx * 320, (240 + FLOOR) / 2, NOK_POS.z + sz * 220);

// --- caixas
const inCrates = [], outCrates = [], nokCrates = [];
let okCount = 0, nokCount = 0, shipped = 0;
function newInCrate(x, z, n, state) { const c = { kind: "in", g: crate({ x, z, ...BIN_IN, x, z }, mat.crate), x, y: ROLLER_Y, z, n: 0, dummies: [], state, gap: 40 }; for (let i = 0; i < n; i++) addDummy(c); inCrates.push(c); return c; }
function newOutCrate(x, n = 0, state = "filling", y = ROLLER_Y) { const c = { kind: "ok", g: crate({ x, z: OUT_Z, w: CR_W, d: CR_D }, mat.crateGreen), x, y, z: OUT_Z, n: 0, dummies: [], state }; for (let i = 0; i < n; i++) addDummy(c); outCrates.push(c); return c; }
function newNokCrate(x, y, n, state) { const c = { kind: "nok", g: crate({ x, z: NOK_POS.z, w: CR_W, d: CR_D }, mat.crateRed), x, y, z: NOK_POS.z, n: 0, dummies: [], state, wait: 0 }; for (let i = 0; i < n; i++) addDummy(c); nokCrates.push(c); return c; }

// caixa de entrada que o robô está a descarregar / a que recebe as limas da linha a montante
const inputCrate = () => inCrates.find((c) => c.state === "atInput" && c.n > 0);
const fillCrate = () => inCrates.find((c) => c.state === "filling");
// a linha a montante entrega uma lima acabada: devolve false se não houver caixa com espaço (a linha espera)
function depositUp() {
  const c = fillCrate();
  if (!c || c.n >= CAP_IN) return false;
  addDummy(c);
  if (c.n >= CAP_IN) c.state = "toInput";
  return true;
}
const okTarget = () => outCrates.find((o) => o.state === "filling") || outCrates.find((o) => o.state === "arriving" || o.state === "lifting");
const nokTarget = () => nokCrates.find((o) => o.state === "active") || nokCrates.find((o) => o.state === "lifting");
function dropOk() {
  const c = okTarget() || newOutCrate(OK_X);
  addDummy(c); okCount++;
  if (c.n >= CAP_CRATE) c.state = "moving";
}
function dropNok() {
  const c = nokTarget() || newNokCrate(NOK_POS.x, ROLLER_Y, 0, "active");
  addDummy(c); nokCount++;
  if (c.n >= CAP_NOK) c.state = "out";
}

function updateCrateLoops(dt) {
  // --- entrada: fila até à descarga; as vazias saem de lado e voltam pelo corredor de retorno
  const queue = inCrates.filter((c) => ["toInput", "atInput"].includes(c.state)).sort((a, b) => b.x - a.x);
  queue.forEach((c, i) => {
    const target = BIN_IN.x - i * (BIN_IN.w + 40);
    const reached = approach(c, "x", target, 600, dt);
    if (c.state === "toInput" && reached && i === 0) c.state = "atInput";
  });
  for (const c of inCrates) {
    if (c.state === "atInput" && c.n === 0 && !(robotIn.task && robotIn.task.i < robotIn.task.wps.length && robotIn.task.src === c)) c.state = "toReturn";
    else if (c.state === "toReturn") { if (approach(c, "z", RET_Z, 450, dt)) c.state = "returning"; }
    else if (c.state === "returning") {
      const ahead = inCrates.filter((o) => (o.state === "returning" || o.state === "waitFill") && o !== c && o.x < c.x).length;
      if (approach(c, "x", FILL_X + ahead * (BIN_IN.w + 40), 600, dt) && ahead === 0) c.state = "waitFill";
    } else if (c.state === "waitFill") {
      const laneBusy = inCrates.some((o) => o !== c && Math.abs(o.z - BIN_IN.z) < 5 && o.x < FILL_X + BIN_IN.w + 40);
      if (!fillCrate() && !laneBusy && !inCrates.some((o) => o.state === "toFill")) c.state = "toFill";
    }
    else if (c.state === "toFill") { if (approach(c, "z", BIN_IN.z, 450, dt)) c.state = "filling"; }
    c.g.position.set(c.x, c.y, c.z);
  }
  // --- verdes: fila da embalagem; vazias descem no fim, voltam por baixo e sobem no início
  queueTo(outCrates.filter((o) => ["moving", "waiting", "unloading"].includes(o.state)), PACK_X, CR_W + 40, 700, dt, "waiting");
  for (const c of outCrates) {
    if (c.state === "returning") { if (approach(c, "x", GREEN_END, 600, dt)) c.state = "lowering"; }
    else if (c.state === "lowering") { if (approach(c, "y", LOW_Y, 350, dt)) c.state = "lowReturn"; }
    else if (c.state === "lowReturn") {
      const ahead = outCrates.filter((o) => (o.state === "lowReturn" || o.state === "lowWait") && o !== c && o.x < c.x).length;
      if (approach(c, "x", GREEN_START + ahead * (CR_W + 40), 600, dt) && ahead === 0) c.state = "lowWait";
    } else if (c.state === "lowWait") { if (!okTarget()) c.state = "lifting"; }
    else if (c.state === "lifting") { if (approach(c, "y", ROLLER_Y, 350, dt)) c.state = "arriving"; }
    else if (c.state === "arriving") { if (approach(c, "x", OK_X, 400, dt)) c.state = "filling"; }
    c.g.position.set(c.x, c.y, OUT_Z);
  }
  // --- rejeitadas: cheias saem para o retrabalho; esvaziadas descem, voltam por baixo e sobem
  for (const c of nokCrates) {
    if (c.state === "out") { if (approach(c, "x", NOK_END, 500, dt)) { c.state = "rework"; c.wait = 0; } }
    else if (c.state === "rework") { c.wait += dt; if (c.wait > 3) { clearCrate(c); c.state = "lowering"; } }
    else if (c.state === "lowering") { if (approach(c, "y", LOW_Y, 350, dt)) c.state = "lowReturn"; }
    else if (c.state === "lowReturn") {
      const ahead = nokCrates.filter((o) => (o.state === "lowReturn" || o.state === "lowWait") && o !== c && o.x < c.x).length;
      if (approach(c, "x", NOK_POS.x + ahead * (CR_W + 40), 500, dt) && ahead === 0) c.state = "lowWait";
    } else if (c.state === "lowWait") { if (!nokTarget()) c.state = "lifting"; }
    else if (c.state === "lifting") { if (approach(c, "y", ROLLER_Y, 350, dt)) c.state = "active"; }
    c.g.position.set(c.x, c.y, NOK_POS.z);
  }
  // plataformas dos elevadores seguem a caixa que estão a mover
  const plate = (p, list, x) => { const c = list.find((o) => Math.abs(o.x - x) < 5 && o.y < ROLLER_Y - 1 && o.y > LOW_Y + 1); p.position.y = (c ? c.y : LOW_Y) - 10; };
  plate(liftPlates.greenUp, outCrates, GREEN_START); plate(liftPlates.greenDown, outCrates, GREEN_END);
  plate(liftPlates.nokUp, nokCrates, NOK_POS.x); plate(liftPlates.nokDown, nokCrates, NOK_END);
}
function layoutBins() {
  for (const c of [...inCrates, ...outCrates, ...nokCrates]) layoutCrateDummies(c);
  if (typeof station !== "undefined" && station.pallet) for (const c of station.pallet.crates) layoutCarton(c);
}
