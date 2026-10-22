// =====================================================================
// UI
// =====================================================================
const $ = (id) => document.getElementById(id);
const fields = [
  ["h", "vH", (v) => v + " mm"], ["b", "vB", (v) => v + " mm"], ["a", "vA", (v) => v + " mm"],
  ["sy", "vSy", (v) => v + " MPa"], ["var", "vVar", (v) => "±" + v + " %"], ["E", "vE", (v) => v + " GPa"],
  ["cap", "vCap", (v) => fmtF(v)], ["clamp", "vClamp", (v) => fmtF(v)], ["straight", "vStraight", (v) => v + " %"],
  ["e0", "vE0", (v) => v + " µm"], ["indT", "vIndT", (v) => v + " °C"], ["quenchT", "vQuenchT", (v) => v + " s"], ["tol", "vTol", (v) => "±" + v + " µm"], ["exag", "vExag", (v) => "×" + v], ["speed", "vSpeed", (v) => v + "×"],
];
function readUI(rebuild) {
  for (const [id, out, f] of fields) { const v = Number($(id).value); $(out).textContent = f(v); P[id] = id === "E" ? v * 1000 : v; }
  P.sensor = $("sensor").value;
  P.finish = $("finish").value;
  const fin = UP.FINISH[P.finish]; dummyMat.color.set(fin.color); dummyMat.metalness = fin.metal; dummyMat.roughness = fin.rough;
  if (rebuild) { rebuildLimas(); layoutModule(); layoutBins(); for (const p of pads) p.rails.forEach((r, i) => (r.position.z = (i ? 1 : -1) * (P.h / 2 + 3))); }
  renderResults();
}
for (const [id] of fields) $(id).addEventListener("input", () => readUI(["h", "b", "a"].includes(id)));
$("sensor").addEventListener("change", () => readUI(false));
$("finish").addEventListener("change", () => readUI(false));
const needCap = () => Math.ceil(Math.max(forceFor(P.e0 / 1000, "B"), forceFor(P.e0 / 1000, "C")) * 1.15 / 100) * 100;
const setVal = (id, v) => { $(id).value = v; };
$("capNeed").onclick = () => { setVal("cap", Math.min(40000, needCap())); readUI(false); };
$("cap250").onclick = () => { setVal("cap", 250); readUI(false); };
$("preSaccli").onclick = () => { setVal("tol", 50); setVal("e0", 500); setVal("exag", 15); setVal("sensor", "ljs"); readUI(false); setVal("cap", Math.min(40000, needCap())); readUI(false); };
$("preMicro").onclick = () => { setVal("tol", 0.5); setVal("e0", 8); setVal("exag", 700); setVal("sensor", "hp"); readUI(false); setVal("cap", Math.min(40000, needCap())); readUI(false); };

function renderResults() {
  const e = P.e0 / 1000, rows = [];
  for (const [pt, name] of [["B", "Torta em B · segura A+C, corrige B"], ["C", "Torta em A ou C · segura 2 pares, corrige a ponta"]]) {
    const F = forceFor(e, pt), R = reactions(F, pt), d = bend(F, pt);
    rows.push([`<span class="sec">${tr(name)}</span>`, null]);
    rows.push(["Início da cedência", fmtF(Fy(pt))]);
    rows.push([`Força p/ corrigir ${P.e0} µm`, `<span class="hl">${fmtF(F)}</span>`]);
    rows.push(["Reacção no par que segura (bloqueado)", fmtF(R.near)]);
    rows.push(["Curso do actuador sob carga", d.loaded.toFixed(3) + " mm"]);
    rows.push(["Actuador de " + fmtF(P.cap), F <= P.cap ? '<span class="good"><b>chega</b></span>' : `<span class="bad"><b>não chega (×${(F / P.cap).toFixed(1)})</b></span>`]);
  }
  const s = sigma();
  rows.push([`<span class="sec">${tr("Medição")}</span>`, null]);
  rows.push(["Sensor", SENSORS[P.sensor].name]);
  rows.push(["Repetibilidade vs tolerância", `${s} µm vs ±${P.tol} µm`]);
  rows.push(["O sensor resolve a tolerância?", s <= P.tol / 3 ? '<span class="good"><b>sim</b></span>' : '<span class="bad"><b>não</b></span>']);
  rows.push([`<span class="sec">${tr("Força elástica (volta ao sítio)")}</span>`, null]);
  rows.push(["3 pontos: 0,5 µm / 5 µm", fmtF(Kof("B") * 0.0005) + " / " + fmtF(Kof("B") * 0.005)]);
  rows.push(["Consola: 0,5 µm / 5 µm", fmtF(Kof("C") * 0.0005) + " / " + fmtF(Kof("C") * 0.005)]);
  $("res").innerHTML = rows.map(([a, b]) => (b === null ? tr(a) : `<span>${tr(a)}</span><span>${tr(b)}</span>`)).join("");
  const Fc = Math.max(forceFor(e, "B"), forceFor(e, "C"));
  const notes = [];
  if (Fc > P.cap) notes.push(`<span class="bad">O actuador de correção precisa de ~${fmtF(Fc)}. Com ${fmtF(P.cap)} a lima só flete de forma elástica e volta torta.</span>`);
  if (s > P.tol / 3) notes.push(`<span class="bad">O ${SENSORS[P.sensor].name} tem repetibilidade de ${s} µm: não consegue garantir ±${P.tol} µm. Para 0,5 µm é preciso um sensor de deslocamento/confocal de alta precisão.</span>`);
  notes.push(`Os pares que seguram fecham com ${fmtF(P.clamp)} (guia linear) e depois ficam bloqueados (fuso auto-bloqueante/travão), porque a reacção chega a ${fmtF(2 * forceFor(e, "C"))}.`);
  notes.push(`O scanner 2 mede a flecha δ e a força F em tempo real e pára quando δ − F/K = erro; assim a variação de ±${P.var}% na dureza não estraga a correção.`);
  $("explain").innerHTML = notes.map(tr).join("<br>");
}

const trace = [];
function drawFD(j) {
  const cv = $("fd"), g = cv.getContext("2d"), W = cv.width, H = cv.height, pad = 34;
  g.clearRect(0, 0, W, H);
  if (!j || !j.Fneed) return;
  const fy = Fy(j.pt, j.lima.syTrue);
  const fMax = Math.max(j.Fneed * 1.15, Math.min(P.cap * 1.05, j.Fneed * 2), 1);
  const dMax = Math.max(bend(Math.min(fMax, fy * 1.49), j.pt, j.lima.syTrue).loaded, 1e-6) * 1.1;
  const X = (d) => pad + (d / dMax) * (W - pad - 10), Yf = (f) => H - pad + 6 - (f / fMax) * (H - pad - 16);
  g.strokeStyle = "rgba(143,163,192,.35)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(pad, 8); g.lineTo(pad, H - pad + 6); g.lineTo(W - 6, H - pad + 6); g.stroke();
  g.setLineDash([5, 5]); g.beginPath(); g.moveTo(pad, Yf(fy)); g.lineTo(W - 10, Yf(fy)); g.stroke();
  if (P.cap < fMax) { g.strokeStyle = "rgba(239,83,80,.7)"; g.beginPath(); g.moveTo(pad, Yf(P.cap)); g.lineTo(W - 10, Yf(P.cap)); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = "#8fa3c0"; g.font = "17px system-ui";
  g.fillText("F", 8, 22); g.fillText("δ", W - 22, H - 8); g.fillText(tr("cedência"), W - 92, Yf(fy) - 6); g.fillText(fmtF(fMax), pad + 4, 22);
  if (P.cap < fMax) { g.fillStyle = "#ef5350"; g.fillText(tr("limite actuador"), W - 140, Yf(P.cap) - 6); }
  g.strokeStyle = "#f59e42"; g.lineWidth = 3; g.beginPath();
  trace.forEach(([d, f], i) => (i ? g.lineTo(X(d), Yf(f)) : g.moveTo(X(d), Yf(f))));
  g.stroke();
  const last = trace[trace.length - 1];
  if (last) { g.fillStyle = "#fff"; g.beginPath(); g.arc(X(last[0]), Yf(last[1]), 6, 0, Math.PI * 2); g.fill(); }
}
function drawProfile(l, label, progress = 1) {
  const cv = $("prof"), g = cv.getContext("2d"), W = cv.width, H = cv.height, pad = 30;
  g.clearRect(0, 0, W, H);
  const span = Math.max(P.e0, P.tol * 3) * 1.15;
  const Yu = (u) => H / 2 - (u / span) * (H / 2 - 16);
  g.fillStyle = "rgba(59,130,246,.18)"; g.fillRect(pad, Yu(P.tol), W - pad - 8, Yu(-P.tol) - Yu(P.tol));
  g.strokeStyle = "rgba(143,163,192,.35)"; g.beginPath(); g.moveTo(pad, H / 2); g.lineTo(W - 8, H / 2); g.stroke();
  g.fillStyle = "#8fa3c0"; g.font = "17px system-ui";
  g.fillText("+" + span.toFixed(span >= 10 ? 0 : 1) + " µm", 4, 18);
  for (const [pt, s] of [["A", 0], ["B", 0.5], ["C", 1]]) g.fillText(pt, pad + s * (W - pad - 20), H - 6);
  g.fillText(tr(label), W - 200, 18);
  if (!l) return;
  g.strokeStyle = Math.abs(um(l.e)) <= P.tol ? "#3b82f6" : "#ef5350"; g.lineWidth = 3; g.beginPath();
  const n = Math.max(1, Math.round(80 * progress));
  for (let i = 0; i <= n; i++) {
    const s = i / 80, z = (s * 2 - 1) * P.a;
    const x = pad + s * (W - pad - 20), y = Yu(um(l.e) * errShape(z, l.pt));
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
}
function renderMotors() {
  $("mgrid").innerHTML = acts.map((a) => {
    const cls = a.role === "push" && a.force > P.cap + 1e-6 ? "over" : a.role;
    const role = tr(a.role === "push" ? "corrige" : a.role === "hold" ? "segura" : "livre");
    return `<div class="m ${cls}"><b>${a.name} (${a.motor}) · ${role}</b>${a.role === "hold" && a.force ? tr("reacção ") : ""}${fmtF(a.force)}</div>`;
  }).join("");
}
function drawHMI() {
  const g = hmiC.getContext("2d");
  g.fillStyle = "#0e1a30"; g.fillRect(0, 0, 512, 320);
  g.fillStyle = "#16284a"; g.fillRect(0, 0, 512, 42);
  g.fillStyle = "#e6edf7"; g.font = "bold 22px system-ui"; g.fillText("SACCLI 1.0.7", 14, 29);
  g.font = "14px system-ui"; g.fillStyle = "#8fa3c0"; g.fillText("Tomé Feteira", 410, 27);
  g.fillStyle = "#e6edf7"; g.font = "15px system-ui"; g.fillText($("phase").textContent.slice(0, 46), 14, 68);
  g.font = "bold 30px system-ui"; g.fillStyle = "#f59e42"; g.fillText($("force").textContent, 14, 108);
  acts.forEach((a, i) => {
    const x = 14 + (i % 2) * 150, y = 124 + Math.floor(i / 2) * 62;
    g.strokeStyle = a.role === "push" ? "#f59e42" : a.role === "hold" ? "#6aa8ff" : "#3a8f5c"; g.lineWidth = 3; g.strokeRect(x, y, 138, 52);
    g.fillStyle = "#e6edf7"; g.font = "bold 15px system-ui"; g.fillText(a.name + " · " + a.motor, x + 8, y + 21);
    g.fillStyle = "#6aa8ff"; g.font = "15px system-ui"; g.fillText(fmtF(a.force), x + 8, y + 42);
  });
  g.font = "bold 24px system-ui"; g.fillStyle = "#4ade80"; g.fillText("OK  " + okCount, 330, 160);
  g.fillStyle = "#ef5350"; g.fillText("NOK " + nokCount, 330, 200);
  g.fillStyle = "#8fa3c0"; g.font = "13px system-ui"; g.fillText(tr("tol ±") + P.tol + " µm", 330, 236);
  g.fillText(tr("paletes ") + shipped, 330, 258);
  hmiTex.needsUpdate = true;
}

// =====================================================================
// Ciclo: indexar → (robô entrada | scanner 1 | módulo corrige na esteira | robô saída)
// =====================================================================
const DUR = { index: 1.2, scan: 1.2, approach: 0.6, hold: 0.35, release: 0.7, verify: 0.6, pass: 0.7, retract: 0.4, end: 0.3 };   // ciclo SACCLI ≈ ritmo da linha a montante
const measure = (l) => l.e + gauss() * sigma() / 1000;
// lado (z do mundo) para onde a lima está curvada: +lateral local = −z no mundo
const bulgeSide = (meas) => -(Math.sign(meas) || 1);

function startWork() {
  startRobots();
  const c = limaAt(0);
  job = null; trace.length = 0;
  if (!c) return;
  if (c.meas1 === undefined) c.meas1 = measure(c);
  job = { lima: c, step: "decide", t: 0, pass: 1 };
}
function orderFor(j, meas) {
  const l = j.lima;
  j.pt = l.pt;
  j.dir = Math.sign(meas) || 1;
  j.push = bulgeSide(meas);                  // o actuador do lado da barriga empurra
  j.target = Math.abs(meas);
  j.Fneed = forceFor(Math.abs(l.e), j.pt, l.syTrue);
  j.Fol = forceFor(j.target, j.pt, P.sy);
  j.eOpen = um(Math.abs(l.e) - bend(Math.min(j.Fol, P.cap), j.pt, l.syTrue).residual) * Math.sign(l.e);
  j.K = Kof(j.pt);
  j.F = 0; j.d = 0; j.pred = 0; j.predF = 0; j.capped = false;
  for (const a of acts) {
    a.role = "idle";
    if (a.pt === j.pt) { if (a.side === j.push) a.role = "push"; }
    else a.role = "hold";
  }
}
function update(dt) {
  if (paused) return;
  dt *= P.speed;
  updateCrates(dt);
  runTask(packer, dt); packStep();
  runTask(cobot, dt, "T");
  if (!cobot.task || cobot.task.i >= cobot.task.wps.length) { cobot.task = null; startCobot(); }
  runAMR(dt);
  if (!amr.task && station.pallet && station.pallet.crates.length >= SLOTS.length) startAMR();
  t += dt;
  if (phase === "index") {
    const s = Math.min(1, t / DUR.index);
    shift = ease(s);
    if (s >= 1) {
      shift = 0; t = 0;
      for (const p of pads) { p.k += 1; if (p.k > K_MAX) p.k = K_MIN; }
      for (const l of limas) if (l.state === "belt") { l.k += 1; if (l.k > K_MAX) { l.state = "pool"; l.k = null; } }
      phase = "work"; startWork();
    }
    return;
  }
  const sl = limaAt(SCAN1_K);
  if (sl && t >= DUR.scan * 0.7 && sl.meas1 === undefined) sl.meas1 = measure(sl);
  const jobDone = job ? stepJob(dt) : true;
  const inDone = runTask(robotIn, dt), outDone = runTask(robotOut, dt);
  if (t >= DUR.scan && jobDone && inDone && outDone) { phase = "index"; t = 0; for (const a of acts) { a.role = "idle"; a.force = 0; } }
}
function stepJob(dt) {
  const j = job, l = j.lima;
  j.t += dt;
  if (j.step === "decide") {
    if (Math.abs(um(l.meas1)) <= P.tol) { j.step = "pass"; j.result = "ok"; j.t = 0; }
    else { j.meas = l.meas1; j.step = "order"; j.t = 0; }
  }
  if (j.step === "pass") { l.result = "ok"; return j.t >= DUR.pass; }
  if (j.step === "order") { orderFor(j, j.meas); j.step = "approach"; j.t = 0; }
  if (j.step === "approach") {
    const s = Math.min(1, j.t / DUR.approach);
    for (const a of acts) a.ext = a.role === "idle" ? Math.max(0, a.ext - dt / DUR.approach) : Math.max(a.ext, s);
    if (s >= 1) { j.step = "press"; j.t = 0; }
  } else if (j.step === "press") {
    // rápido na zona elástica; depois devagar, proporcional ao que falta para o alvo
    const fyNom = Fy(j.pt, P.sy);
    const left = Math.max(0, (j.target - j.predF) / j.target);
    const rate = j.F < 0.92 * fyNom ? fyNom / 0.7 : fyNom * 0.16 * Math.max(0.12, Math.min(1, left * 1.5));
    j.F = Math.min(P.cap, j.F + rate * dt);
    const truth = bend(j.F, j.pt, l.syTrue, 90);
    j.d = truth.loaded + gauss() * sigma() / 1000;
    j.pred = j.d - j.F / j.K;
    j.predF += (j.pred - j.predF) * Math.min(1, dt * 15);
    l.load = truth.loaded; l.loadDir = -j.dir; l.loadPt = j.pt;
    l.stress = Math.min(1, j.F / Fy(j.pt, l.syTrue));
    trace.push([j.d, j.F]);
    if (j.F > 0.9 * fyNom && j.predF >= j.target) { j.step = "hold"; j.t = 0; }
    else if (j.F >= P.cap) { j.capped = true; j.step = "hold"; j.t = 0; }
  } else if (j.step === "hold") {
    if (j.t >= DUR.hold) {
      const bb = bend(j.F, j.pt, l.syTrue);
      Object.assign(j, { step: "release", t: 0, res: bb.residual, dPeak: bb.loaded, eBefore: l.e, Fpeak: j.F });
    }
  } else if (j.step === "release") {
    const e = ease(Math.min(1, j.t / DUR.release));
    j.F = j.Fpeak * (1 - e);
    j.d = j.res + (j.dPeak - j.res) * (1 - e);
    l.e = j.eBefore - j.dir * j.res * e;
    l.load = j.dPeak * (1 - e);
    l.stress = (1 - e) * Math.min(1, j.Fpeak / Fy(j.pt, l.syTrue));
    trace.push([j.d, j.F]);
    if (e >= 1) { l.load = 0; l.stress = 0; j.F = 0; j.step = "verify"; j.t = 0; }
  } else if (j.step === "verify") {
    for (const a of acts) if (a.role === "push") a.ext = Math.max(0, a.ext - dt / DUR.verify);
    if (j.t >= DUR.verify) {
      j.meas2 = measure(l);
      if (Math.abs(um(j.meas2)) <= P.tol) j.result = "ok";
      else if (j.capped) j.result = "weak";
      else if (j.pass < 3) { j.pass++; j.meas = j.meas2; j.step = "order"; trace.length = 0; j.t = 0; return false; }
      else j.result = "nok";
      j.step = "retract"; j.t = 0;
    }
  } else if (j.step === "retract") {
    for (const a of acts) a.ext = Math.max(0, a.ext - dt / DUR.retract);
    if (j.t >= DUR.retract) { j.step = "end"; j.t = 0; }
  } else if (j.step === "end") {
    if (!j.logged) { j.logged = true; if (j.dir) runLog.push({ e0: um(l.e0), meas1: um(l.meas1), final: um(l.e), meas2: um(j.meas2), pass: j.pass, result: j.result, pt: j.pt }); }
    l.result = j.result;
    return j.t >= DUR.end;
  }
  return false;
}

// =====================================================================
// Desenho por frame
// =====================================================================
let lastResult = null, blink = 0;
function frameScene(dt) {
  for (const p of pads) p.g.position.set((p.k + shift) * PITCH, TOP, 0);
  for (const l of limas) {
    l.group.visible = l.state !== "pool";
    if (l.state === "belt") l.group.position.set((l.k + shift) * PITCH, TOP, 0);
    else if (l.state === "carry") { const r = robotIn.carrying === l ? robotIn : robotOut; l.group.position.set(r.E.x, r.E.y - 12 - (8 + P.b), r.E.z); }
    shapeLima(l);
  }
  solveDelta(robotIn); solveDelta(robotOut); solveDelta(packer); solveCobot(); drawAMR(); drawForklift();
  if (packer.carry) { packer.carry.position.copy(packer.E).add(V(0, -12 - P.b / 2, 0)); }
  const j = job;
  const inModule = j && ["order", "approach", "press", "hold", "release", "verify", "retract"].includes(j.step);
  const c = inModule ? j.lima : null;
  for (const a of acts) {
    const rest = a.side * (P.h / 2 + GAP);
    const surface = c ? -lateral(c, zOf(a.pt)) + a.side * P.h / 2 : rest;
    setActuator(a, rest + (surface - rest) * Math.min(1, a.ext));
    a.force = 0;
    if (j && j.F > 0 && ["press", "hold", "release"].includes(j.step)) {
      if (a.role === "push") a.force = j.F;
      if (a.role === "hold") {
        const R = reactions(j.F, j.pt);
        if (j.pt === "B") a.force = a.side === -j.push ? R.near : 0;
        else {
          const near = Math.abs(Math.abs(zOf(a.pt) - zOf(j.pt)) - P.a) < 1;
          a.force = near ? (a.side === -j.push ? R.near : 0) : (a.side === j.push ? R.far : 0);
        }
      }
    }
    a.led.material = a.role === "push" && a.force > P.cap ? mat.ledR : a.role === "push" ? mat.ledO : a.role === "hold" ? mat.ledB : mat.ledG;
  }
  // scanner 1: cabeça fixa, centrada; um disparo lê a lima inteira
  const sl = limaAt(SCAN1_K);
  const scanning = phase === "work" && sl && t > 0.15 && t < DUR.scan;
  const topY = TOP + 8 + P.b + 0.5, hx = limaLen() / 2 + 70;
  const area = [V(SCAN1_X - hx, topY, -70), V(SCAN1_X + hx, topY, -70), V(SCAN1_X + hx, topY, 70), V(SCAN1_X - hx, topY, 70)];
  fr1.set(V(SCAN1_X - 75, S1_LENS + 10, 0), area, !!scanning, 0.75 + 0.25 * Math.sin(t * 30));
  fr1cam.set(V(SCAN1_X + 75, S1_LENS + 8, 0), area, !!scanning, 1);
  // scanner 2: duas áreas (metade A–B e metade B–C) vistas de cima, em tempo real durante a correção
  const live = j && ["approach", "press", "hold", "release", "verify"].includes(j.step);
  const hz = P.h / 2 + 30;
  heads2.forEach((h, i) => {
    fr2[i].set(V(h.x - 32, S2_Y - 36, 0), [V(h.span[0], topY, -hz), V(h.span[1], topY, -hz), V(h.span[1], topY, hz), V(h.span[0], topY, hz)], !!live, 0.75 + 0.25 * Math.sin(blink * 25 + i));
  });
  if (j && j.step === "end") lastResult = j.result;
  blink += dt;
  const pressing = j && ["press", "hold", "release"].includes(j.step);
  const red = lastResult && lastResult !== "ok" && j && j.step === "end";
  tower[0].material.emissiveIntensity = red ? (Math.sin(blink * 10) > 0 ? 2.5 : 0.1) : 0.1;
  tower[1].material.emissiveIntensity = pressing ? 2.5 : 0.1;
  tower[2].material.emissiveIntensity = !pressing && !red ? 2.2 : 0.1;
}
function renderHUD() {
  const j = job, l = j ? j.lima : null;
  const names = {
    index: "Esteira avança uma lima", decide: "Scanner 1 manda a ordem", order: "Scanner 1 manda a ordem",
    approach: "Fechar os pares que seguram", press: "A corrigir na esteira — scanner 2 a medir",
    hold: "Parar: retorno previsto = erro", release: "Aliviar — retorno elástico", verify: "Scanner 2 confirma",
    retract: "", end: "", pass: "OK no scanner 1 — passa sem correção",
  };
  const key = phase === "index" ? "index" : j ? j.step : "index";
  let label = names[key];
  if (key === "retract" || key === "end") label = j.result === "ok" ? "OK — corrigida, segue na esteira" : j.result === "weak" ? "NOK — actuador sem força para passar a cedência" : "NOK — rejeitar";
  if (j && j.step === "hold" && j.capped) label = "Parar: limite do actuador atingido";
  $("phase").textContent = tr(label);
  $("phaseDot").style.background = (key === "end" || key === "retract" || key === "pass") ? (j.result === "ok" ? "#4ade80" : "#ef5350") : key === "press" || key === "hold" ? "#f59e42" : "#6aa8ff";
  if (j && j.dir) {
    const holds = acts.filter((a) => a.role === "hold").map((a) => a.name).join(" ");
    const push = acts.find((a) => a.role === "push");
    $("order").innerHTML = tr(`Torta em <b>${j.pt}</b> · ${fmtUm(um(j.meas ?? l.meas1))} → segurar <b>${holds}</b> · corrigir com <b>${push ? push.name : "—"}</b>`);
  } else if (j && j.step === "decide") $("order").textContent = tr("A ler o scanner 1…");
  else if (j && j.step === "pass") $("order").innerHTML = tr(`Lima direita (${fmtUm(um(l.meas1))}, dentro de ±${P.tol} µm) → <b>segue sem correção</b>`);
  $("limaId").textContent = l ? tr(`#${l.id} · σy real ${l.syTrue.toFixed(0)} MPa`) : "—";
  $("eMeas").textContent = l && l.meas1 !== undefined ? fmtUm(um(l.meas1)) : "—";
  $("force").textContent = j && j.F ? fmtF(j.F) : "0 N";
  $("defl").textContent = j && j.d ? j.d.toFixed(3) + " mm" : "—";
  if (j && j.F && l && j.pt) {
    const sig = Math.min(l.syTrue, cOf(j.pt) * j.F * P.a * (P.h / 2) / I());
    $("stress").textContent = sig.toFixed(0) + " MPa" + tr(j.F > Fy(j.pt, l.syTrue) ? " · plástico" : " · elástico");
  } else $("stress").textContent = "—";
  const tgt = j && j.target ? um(j.target) : 0, pred = j && j.predF ? Math.max(0, um(j.predF)) : 0;
  const full = Math.max(tgt * 1.25, 0.01);
  $("mFill").style.width = Math.min(100, (pred / full) * 100) + "%";
  $("mTarget").style.left = Math.min(100, (tgt / full) * 100) + "%";
  $("pred").textContent = j && j.target ? fmtUm(pred).replace("+", "") : "—";
  $("target").textContent = tgt ? fmtUm(tgt).replace("+", "") : "—";
  $("pass").textContent = j && j.dir ? j.pass + " / 3" : "—";
  $("eFinal").textContent = j && j.meas2 !== undefined ? fmtUm(um(j.meas2)) : "—";
  $("eTrue").textContent = l ? fmtUm(um(l.e)) : "—";
  $("eOpen").textContent = j && j.dir ? fmtUm(j.eOpen) : "—";
  $("counts").textContent = `${okCount} / ${nokCount} / ${shipped}`;
  drawFD(j && j.dir ? j : null);
  const live = j && ["approach", "press", "hold", "release", "verify", "retract", "end"].includes(j.step) && j.dir;
  if (live) drawProfile(l, "scanner 2 · ao vivo");
  else drawProfile(limaAt(SCAN1_K) || (j && j.lima), "scanner 1", phase === "work" ? Math.min(1, t / DUR.scan) : 1);
  renderMotors();
}
const v3 = new THREE.Vector3();
function renderTags() {
  for (const tg of World.tags) {
    const at = tg.at();
    const dist = camera.position.distanceTo(at);
    v3.copy(at).project(camera);
    const show = v3.z < 1 && dist >= tg.min && dist <= tg.max && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 && (!tg.when || tg.when());
    tg.el.style.display = show ? "block" : "none";
    if (!show) continue;
    tg.el.textContent = tr(typeof tg.text === "function" ? tg.text() : tg.text);
    tg.el.style.left = ((v3.x + 1) / 2) * innerWidth + "px";
    tg.el.style.top = ((1 - v3.y) / 2) * innerHeight + "px";
  }
}

// =====================================================================
// Câmaras
// =====================================================================
const VIEWS = {
  fab: [[-6200, 5200, 6300], [1200, -300, -300]],
  cell: [[-2600, 2300, 2300], [-200, 80, 0]],
  mod: [[420, 520, 760], [0, 30, 0]],
  exp: [[1600, 2700, 3900], [5200, -400, 200]],
  top: [[-200, 3600, 1], [-200, 0, 0]],
};
function view(name) { const [p, tg] = VIEWS[name]; camera.position.set(...p); controls.target.set(...tg); controls.update(); }
for (const v of World.views) VIEWS[v.key] = [v.pos, v.target];
// botões grandes, por ordem do processo, para ver cada área (as vistas das estações vêm dos ficheiros 55-*)
VIEWS.feed = [[-10500, 1500, 1500], [-9650, 0, -420]];
VIEWS.pack = [[2500, 2000, 2100], [3600, -150, -150]];
VIEWS.crates = [[-2400, 1900, 2300], [-900, -200, 200]];
const AREAS = [
  ["feed", "0 · Alimentação"], ["lam", "1 · Laminagem"], ["pic", "2 · Picagem"], ["ind", "3 · Têmpera"], ["indHmi", "3 · Painel da têmpera"],
  ["dur", "4 · Dureza"], ["jato", "5 · Jateamento"], ["cell", "6 · SACCLI"], ["mod", "6 · Módulos A–C"], ["crates", "6 · Caixas e robôs"],
  ["pack", "7 · Embalagem e palete"], ["exp", "8 · Expedição (AMR)"], ["kmf", "8 · Armário (KMF 1500P)"],
];
for (const [key, label] of AREAS) {
  if (!VIEWS[key]) continue;
  const b = document.createElement("button"); b.className = "area"; b.textContent = label; b.onclick = () => view(key); $("stationViews").appendChild(b);   // texto traduzido por i18nInit()
}
$("viewFab").onclick = () => view("fab");
$("viewCell").onclick = () => view("cell");
$("viewMod").onclick = () => view("mod");
$("viewExp").onclick = () => view("exp");
$("viewTop").onclick = () => view("top");
$("panels").onclick = () => ["ctrl", "charts", "motors"].forEach((id) => $(id).classList.toggle("hidden"));
$("play").onclick = () => { paused = !paused; $("play").textContent = tr(paused ? "▶ Continuar" : "❚❚ Pausa"); };
// velocidade da linha: botões 0,5×…6× no painel de parâmetros
function setSpeed(v) {
  setVal("speed", v); readUI();
  for (const b of $("speedBtns").querySelectorAll("button")) b.classList.toggle("active", Number(b.dataset.speed) === v);
}
for (const b of $("speedBtns").querySelectorAll("button")) b.onclick = () => setSpeed(Number(b.dataset.speed));
$("speed").addEventListener("input", () => { for (const b of $("speedBtns").querySelectorAll("button")) b.classList.toggle("active", Number(b.dataset.speed) === Number($("speed").value)); });
addEventListener("keydown", (e) => { if (e.code === "Space" && !["INPUT", "SELECT"].includes(e.target.tagName)) { e.preventDefault(); $("play").click(); } });
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

for (let k = K_MIN + 1; k <= K_MAX; k++) {
  const l = makeLima("belt", k);
  if (k > 0) { l.e = (Math.random() * 2 - 1) * P.tol * 0.6 / 1000; l.result = "ok"; }
  if (k > SCAN1_K) l.meas1 = l.e + gauss() * sigma() / 1000;
}
makeLima("pool"); makeLima("pool");
// caixas no arranque: entrada (descarga, fila, enchimento, retorno), verdes e vermelhas
newInCrate(BIN_IN.x, BIN_IN.z, CAP_IN, "atInput");
newInCrate(BIN_IN.x - BIN_IN.w - 40, BIN_IN.z, CAP_IN, "toInput");
newInCrate(BIN_IN.x - 2 * (BIN_IN.w + 40), BIN_IN.z, CAP_IN, "toInput");   // mais 2 caixas em circulação para a linha a montante não parar à espera de caixa vazia
newInCrate(FILL_X + BIN_IN.w + 40, RET_Z, 0, "returning");
newInCrate(FILL_X, BIN_IN.z, 3, "filling");
newInCrate(FILL_X, RET_Z, 0, "waitFill");
newOutCrate(OK_X, 4);
newOutCrate(PACK_X, CAP_CRATE, "waiting");
newOutCrate(GREEN_START, 0, "lowWait", LOW_Y);
newNokCrate(NOK_POS.x, ROLLER_Y, 2, "active");
newNokCrate(NOK_POS.x, LOW_Y, 0, "lowWait");
newNokCrate(NOK_END, LOW_Y, 0, "lowReturn");
cartons.push(makeCarton(PACK_X, CART_Z, "open"));
for (let i = 0; i < 20; i++) { const k = makeCarton(0, 0, "pallet", true, station.pallet.g); k.g.position.set(SLOTS[i][0], 140 + SLOTS[i][2] * CART.h, SLOTS[i][1]); station.pallet.crates.push(k); }
// duas paletes já arrumadas no armário
for (const s of rackSlots.slice(0, 2)) {
  const p = makePallet(s.x, -6100); p.g.position.set(s.x, FLOOR + s.y + 60, RACK.z); p.g.rotation.y = Math.PI / 2;
  for (let i = 0; i < SLOTS.length; i++) { const k = makeCarton(0, 0, "pallet", true, p.g); k.g.position.set(SLOTS[i][0], 140 + SLOTS[i][2] * CART.h, SLOTS[i][1]); }
  s.pallet = p;
}
setVal("cap", Math.min(40000, needCap()));
readUI(true);
view("cell");
startWork();

let last = performance.now(), hudTick = 0;
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  frameScene(paused ? 0 : dt * P.speed);
  for (const s of World.systems) { if (!paused && s.update) s.update(dt * P.speed); if (s.draw) s.draw(paused ? 0 : dt * P.speed); }
  controls.update();
  camera.position.x = Math.max(-HALL.x + 300, Math.min(HALL.x - 300, camera.position.x));
  camera.position.z = Math.max(-HALL.z + 300, Math.min(HALL.z - 300, camera.position.z));
  camera.position.y = Math.max(FLOOR + 150, Math.min(FLOOR + HALL.h - 1300, camera.position.y));
  renderer.render(scene, camera);
  renderTags();
  if ((hudTick += dt) > 0.05) { hudTick = 0; renderHUD(); }
  if ((drawHMI.t = (drawHMI.t || 0) + dt) > 0.25) { drawHMI.t = 0; drawHMI(); }
});
LANG.hooks.push(() => { renderResults(); renderHUD(); renderMotors(); $("play").textContent = tr(paused ? "▶ Continuar" : "❚❚ Pausa"); setSpeed(P.speed); });
i18nInit();
window.__saccli = { tags: World.tags, FL, rackSlots, cartons, packer, runLog, P, limas, get job() { return job; }, bend, forceFor, robotIn, robotOut, camera, controls, amr, station, outCrates, cobot };
