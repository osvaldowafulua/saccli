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
VIEWS.molde = [[-8300, 650, 500], [-8950, 100, -380]];
AREAS.splice(2, 0, ["molde", "1 · Molde de corte"]);
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
  tourTick(dt);
  controls.update();
  camera.position.x = Math.max(-HALL.x + 300, Math.min(HALL.x - 300, camera.position.x));
  camera.position.z = Math.max(-HALL.z + 300, Math.min(HALL.z - 300, camera.position.z));
  camera.position.y = Math.max(FLOOR + 150, Math.min(FLOOR + HALL.h - 1300, camera.position.y));
  renderer.render(scene, camera);
  renderTags();
  if ((hudTick += dt) > 0.05) { hudTick = 0; renderHUD(); }
  if ((drawHMI.t = (drawHMI.t || 0) + dt) > 0.25) { drawHMI.t = 0; drawHMI(); }
});
// =====================================================================
// Documentação 3D: visita guiada por todo o processo — a câmara voa até cada área e o painel explica (PT/EN)
// =====================================================================
const TOUR = [
  ["feed", "0 · Alimentação de barras de aço", "O processo começa com barras chatas de aço-carbono (secção rectangular — a lima nunca é redonda). Um alimentador coloca uma barra de cada vez na esteira da linha a montante, que avança por passos: pára em cada estação, a estação trabalha, e a esteira avança para o passo seguinte.",
    "The process starts with flat carbon-steel bars (rectangular section — a file is never round). A feeder places one bar at a time on the upstream conveyor, which indexes step by step: it stops at each station, the station works, and the conveyor moves to the next step."],
  ["lam", "1 · Laminagem — rolo de aço giratório", "Um laminador duo com dois cilindros de aço Ø330 mm, accionados por motor, redutor e veios cardã, aperta a barra: o aperto hidráulico (AGC) fecha a folga e os cilindros giratórios puxam a barra, reduzindo a espessura até à cota final. A barra sai como uma tira chata, direita e calibrada.",
    "A two-high rolling mill with two Ø330 mm steel rolls, driven by a motor, gearbox and cardan shafts, squeezes the bar: the hydraulic screw-down (AGC) closes the gap and the rotating rolls pull the bar through, reducing its thickness to the final size. The bar leaves as a flat, straight, sized strip."],
  ["molde", "1 · Molde de corte — a forma da lima", "Logo a seguir, uma prensa hidráulica fecha o molde de corte: a matriz inferior está embutida na esteira e o punção superior tem a silhueta da lima em negativo. O punção desce, corta na tira a lâmina afunilada com o espigão, e as aparas caem pela calha para o contentor. A partir daqui a peça já tem a forma de lima.",
    "Right after, a hydraulic press closes the blanking die: the lower die is embedded in the conveyor and the upper punch carries the file outline in negative. The punch comes down, cuts the tapered blade with its tang out of the strip, and the scrap slides down the chute into the bin. From here on the part has the shape of a file."],
  ["pic", "2 · Picagem dos dentes", "A máquina de picar prende a lima e um cinzel, accionado a alta cadência, pica os dentes ao longo de todo o comprimento, do espigão até à ponta. A HMI mostra os golpes por minuto, os dentes por centímetro e o avanço da picagem.",
    "The cutting machine clamps the file and a high-cadence chisel cuts the teeth along the whole length, from the tang to the tip. The HMI shows strokes per minute, teeth per centimetre and the cutting progress."],
  ["ind", "3 · Têmpera por indução → choque em água", "Uma pinça eleva a lima até ao eixo da bobina de cobre (arrefecida a água). O gerador de média frequência faz passar corrente na bobina e a lima aquece por indução até 1200 °C em segundos. De seguida cai no tanque de água: o choque térmico em fracções de segundo endurece o aço (martensite). Um revenido por indução a ~200 °C alivia tensões.",
    "A gripper lifts the file to the axis of the water-cooled copper coil. The medium-frequency generator drives current through the coil and the file heats by induction to 1200 °C in seconds. It then drops into the water tank: the thermal shock within fractions of a second hardens the steel (martensite). An induction temper at ~200 °C relieves stresses."],
  ["indHmi", "3 · Painel do gerador de indução", "O armário do gerador (fonte AC, 120 kW, 10–30 kHz) tem a HMI, a paragem de emergência, o interruptor geral e a coluna luminosa virados para o corredor do operador; do lado da máquina só entram os cabos e as mangueiras de água. O refrigerador de circuito fechado mantém a água da bobina a ~21 °C.",
    "The generator cabinet (AC source, 120 kW, 10–30 kHz) has its HMI, emergency stop, main switch and light column facing the operator aisle; only the cables and water hoses enter on the machine side. The closed-loop chiller keeps the coil water at ~21 °C."],
  ["dur", "4 · Medição de dureza / rigidez", "Um durómetro Rockwell C ensaia cada lima: o indentador de diamante penetra o aço com uma força de ensaio de 1471 N e a profundidade dá a dureza (58–62 HRC esperados). As limas abaixo de 55 HRC são empurradas pela rampa para a caixa vermelha de rejeição; as aprovadas recebem a marca verde no espigão.",
    "A Rockwell C tester checks every file: the diamond indenter penetrates the steel with a 1471 N test force and the depth gives the hardness (58–62 HRC expected). Files below 55 HRC are pushed down the ramp into the red reject crate; approved ones get a green mark on the tang."],
  ["jato", "5 · Jateamento — cinza especial", "Na cabina de jateamento a lima recebe o acabamento: granalha seca projectada por turbina dá o cinza mate especial; o jato húmido (líquido abrasivo) dá o cinza metálico. O acabamento escolhe-se no painel de parâmetros. No fim da linha a lima cai na caixa azul.",
    "In the blasting cabinet the file gets its finish: dry shot thrown by a turbine gives the special matte grey; wet blasting (abrasive slurry) gives the metallic grey. The finish is chosen in the parameters panel. At the end of the line the file drops into the blue crate."],
  ["cell", "6 · SACCLI — correcção automática", "Um KUKA KR DELTA tira as limas da caixa azul e deita-as na esteira de rolos. O scanner 1 Keyence LJ-S (fixo, 2D/3D) lê a lima inteira num disparo e decide: se está direita dentro da tolerância, passa OK sem correcção; se está torta, diz onde (A, B ou C) e dá a ordem aos módulos.",
    "A KUKA KR DELTA takes the files from the blue crate and lays them on the roller conveyor. Scanner 1, a fixed Keyence LJ-S (2D/3D), reads the whole file in one shot and decides: if it is straight within tolerance it passes OK without correction; if it is bent it says where (A, B or C) and issues the order to the modules."],
  ["mod", "6 · Módulos A1–C2 e scanner 2", "Seis módulos, três de cada lado da esteira. Dois pares seguram a lima com guias lineares de 250 N e ficam bloqueados; o par do ponto torto corrige com o actuador de kN. O scanner 2 lê metade da lima em cada cabeça e controla em tempo real: a força sobe até o retorno elástico previsto (δ − F/K) igualar o erro — e pára. A lima sai direita (azul = dentro da tolerância, vermelho = fora).",
    "Six modules, three on each side of the conveyor. Two pairs clamp the file with 250 N linear guides and lock; the pair at the bent point corrects with the kN actuator. Scanner 2 reads half the file with each head and controls in real time: the force rises until the predicted spring-back (δ − F/K) equals the error — then stops. The file leaves straight (blue = within tolerance, red = out)."],
  ["crates", "6 · Caixas e robôs", "Um segundo KR DELTA coloca cada lima na caixa verde (OK) ou vermelha (NOK). As caixas azuis, verdes e vermelhas circulam em ciclo fechado: enchem, avançam na fila, esvaziam e voltam vazias pelos corredores de retorno e elevadores. As NOK vão para a bancada de retrabalho.",
    "A second KR DELTA places each file in the green (OK) or red (NOK) crate. Blue, green and red crates run in closed loops: they fill, queue, empty and return empty along the return lanes and lifts. NOK files go to the rework bench."],
  ["pack", "7 · Embalagem em cartão e paletização", "Um robô delta passa as limas da caixa verde para caixas de cartão de 6; as abas fecham e a caixa segue para o fim do transportador. O cobot KUKA LBR iisy pega em cada caixa e paletiza 3 × 4 por camada, 2 camadas: 24 caixas por palete.",
    "A delta robot moves the files from the green crate into cartons of 6; the flaps close and the carton travels to the end of the conveyor. The KUKA LBR iisy cobot picks each carton and palletises 3 × 4 per layer, 2 layers: 24 cartons per pallet."],
  ["exp", "8 · Expedição — AMR", "Quando a palete está completa, o AMR entra por baixo, levanta-a e leva-a até ao posto de expedição, seguindo as faixas no chão. Uma palete vazia é reposta no posto de paletização.",
    "When the pallet is complete, the AMR drives underneath, lifts it and carries it to the shipping stand, following the floor markings. An empty pallet is put back at the palletising stand."],
  ["kmf", "8 · Armário de paletes — KUKA KMF 1500P", "O KUKA KMF 1500P, empilhador autónomo de 1500 kg com navegação laser, vai buscar a palete ao posto de expedição e arruma-a no armário de paletes, no primeiro lugar livre dos três níveis. Quando o armário está cheio, a palete mais antiga sai para o camião.",
    "The KUKA KMF 1500P, a 1500 kg autonomous forklift with laser navigation, collects the pallet from the shipping stand and stores it in the pallet rack, in the first free slot of the three levels. When the rack is full, the oldest pallet leaves for the truck."],
];
const fly = { on: false, t: 0, p0: new THREE.Vector3(), t0: new THREE.Vector3(), p1: new THREE.Vector3(), t1: new THREE.Vector3() };
function flyTo(key, dur = 1.8) {
  const [p, tg] = VIEWS[key];
  fly.p0.copy(camera.position); fly.t0.copy(controls.target); fly.p1.set(...p); fly.t1.set(...tg); fly.t = 0; fly.dur = dur; fly.on = true;
}
const tour = { i: 0, open: false, auto: false, t: 0, STEP: 11 };
function renderTour() {
  const [, title, pt, en] = TOUR[tour.i];
  $("docStep").textContent = tr("Documentação 3D · passo") + ` ${tour.i + 1} / ${TOUR.length}`;
  $("docTitle").textContent = tr(title);
  $("docText").textContent = LANG.cur === "en" ? en : pt;
  $("docPrev").textContent = tr("◀ Anterior"); $("docNext").textContent = tr(tour.i === TOUR.length - 1 ? "↺ Recomeçar" : "Seguinte ▶");
  $("docAuto").textContent = tr(tour.auto ? "⏸ Parar automático" : "⏵ Automático"); $("docClose").textContent = tr("✕ Fechar");
  $("docBtn").textContent = tr("📖 Documentação 3D");
}
function tourGo(i) { tour.i = (i + TOUR.length) % TOUR.length; tour.t = 0; flyTo(TOUR[tour.i][0]); renderTour(); }
function tourOpen(open) {
  tour.open = open; $("doc").classList.toggle("hidden", !open);
  for (const id of ["ctrl", "charts", "motors"]) $(id).classList.toggle("hidden", open);   // durante a visita só fica o painel principal e a documentação
  if (open) tourGo(tour.i); else tour.auto = false;
}
$("docBtn").onclick = () => tourOpen(!tour.open);
$("docClose").onclick = () => tourOpen(false);
$("docPrev").onclick = () => tourGo(tour.i - 1);
$("docNext").onclick = () => tourGo(tour.i + 1);
$("docAuto").onclick = () => { tour.auto = !tour.auto; tour.t = 0; renderTour(); };
function tourTick(dt) {
  if (fly.on) {
    fly.t += dt; const k = ease(Math.min(1, fly.t / fly.dur));
    camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= fly.dur) fly.on = false;
  }
  if (tour.open && tour.auto) { tour.t += dt; $("docBar").style.width = Math.min(100, (100 * tour.t) / tour.STEP) + "%"; if (tour.t >= tour.STEP) tourGo(tour.i + 1); }
  else $("docBar").style.width = "0";
}
LANG.hooks.push(() => { renderTour(); });
LANG.hooks.push(() => { renderResults(); renderHUD(); renderMotors(); $("play").textContent = tr(paused ? "▶ Continuar" : "❚❚ Pausa"); setSpeed(P.speed); });
i18nInit();
window.__saccli = { tags: World.tags, FL, rackSlots, cartons, packer, runLog, P, limas, get job() { return job; }, bend, forceFor, robotIn, robotOut, camera, controls, amr, station, outCrates, cobot };
