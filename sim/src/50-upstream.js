// =====================================================================
// Linha a montante: barra → laminagem → picagem → têmpera → dureza → jateamento → caixa azul
// Esteira indexada no corredor z = BIN_IN.z (a mesma linha que entra na célula SACCLI).
// Cada lima é uma peça com o seu aspecto (forma, dentes, calor, acabamento); as estações
// (src/55-*.js) mudam esse aspecto quando a lima pára à frente delas.
// =====================================================================
const UP = {
  X0: -9600, PITCH: 350, FIRST: -1, END: 20, Z: BIN_IN.z, TOP: 0,
  dwell: 5.0, move: 1.2, t: 0, phase: "dwell", shift: 0, waiting: false, made: 0,
  limas: [], stations: [],
  GAPS: [[-6280, -5590]],   // fosso de têmpera: a lima sai da bobina e cai na água
};
UP.xOf = (slot) => UP.X0 + slot * UP.PITCH;
UP.limaAt = (slot) => UP.limas.find((l) => l.slot === slot);
UP.limasIn = (a, b) => UP.limas.filter((l) => l.slot >= a && l.slot <= b);
// estação: { slot, name, onDwell(l, s, dt) } — chamada a cada frame da paragem; s = progresso 0..1 da paragem
UP.addStation = (st) => { UP.stations.push(st); return st; };
// acabamentos (cor, metalizado, rugosidade)
UP.FINISH = {
  raw: { color: 0xb3bac2, metal: 0.85, rough: 0.32 },       // aço laminado brilhante
  scale: { color: 0x2d3034, metal: 0.55, rough: 0.7 },      // escuro depois da têmpera em óleo
  tempered: { color: 0x3b3a3e, metal: 0.6, rough: 0.6 },    // revenido
  shot: { color: 0x6f747a, metal: 0.45, rough: 0.88 },      // granalha: cinza mate especial
  wet: { color: 0x8d949c, metal: 0.92, rough: 0.28 },       // jato húmido: cinza metálico
};
const _fc = new THREE.Color();
// leva o acabamento da lima em direcção a um acabamento predefinido (k = 0..1 por chamada)
UP.blendFinish = (l, name, k) => {
  const f = UP.FINISH[name];
  l.color.lerp(_fc.set(f.color), k); l.metal += (f.metal - l.metal) * k; l.rough += (f.rough - l.rough) * k;
};
// garantia do processo: depois de cada estação a lima tem sempre o estado certo (mesmo sem a animação da estação)
UP.guarantee = (l) => {
  if (l.slot >= 2) l.form = 1;                     // depois da laminagem: tira chata direita, calibrada
  if (l.slot >= 3) l.cut = true;                   // depois do molde de corte: silhueta de lima (afunilada, com espigão)
  if (l.slot >= 6) l.teeth = 1;                    // depois da picagem: dentes em todo o comprimento
  if (l.slot >= 13 && l.finishName === "raw") { l.heat = 0; UP.blendFinish(l, "scale", 1); l.finishName = "scale"; }   // depois da têmpera
  if (l.slot >= 14) l.heat = 0;
  if (l.slot >= 17 && !l.tested) { l.tested = true; l.hrc = 58 + Math.random() * 4.5; }                              // depois da dureza
  if (l.slot >= 20 && l.finishName !== P.finish) { UP.blendFinish(l, P.finish, 1); l.finishName = P.finish; }          // depois do jateamento
};
UP.reset = (l) => {
  l.form = 0; l.cut = false; l.teeth = 0; l.heat = 0; l.tested = false; l.hrc = 0; l.finishName = "raw";
  l.color.set(UP.FINISH.raw.color); l.metal = UP.FINISH.raw.metal; l.rough = UP.FINISH.raw.rough;
};

// --- esteira (malha de aço) e estrutura
{
  const x0 = UP.xOf(UP.FIRST) - 180, x1 = UP.xOf(UP.END) + 150, L = x1 - x0, xc = (x0 + x1) / 2;
  const meshTexUp = canvasTex(64, 64, (g) => { g.fillStyle = "#2b2f35"; g.fillRect(0, 0, 64, 64); g.strokeStyle = "#5b6169"; g.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } }, [L / 120, 2]);
  // a esteira é cortada nos fossos (UP.GAPS): ex. o tanque de têmpera em água da estação de indução
  const segs = []; let a = x0;
  for (const [g0, g1] of UP.GAPS) { segs.push([a, g0]); a = g1; }
  segs.push([a, x1]);
  for (const [s0, s1] of segs) {
    const len = s1 - s0, tex = meshTexUp.clone(); tex.needsUpdate = true; tex.repeat.set(len / 120, 2);
    box(len, 6, 240, M(0xffffff, 0.6, 0.6, { map: tex }), (s0 + s1) / 2, UP.TOP - 3, UP.Z);
    for (const s of [-1, 1]) box(len + 40, 50, 24, mat.alu, (s0 + s1) / 2, UP.TOP - 25, UP.Z + s * 135);
    for (const x of [s0, s1]) { const r = cyl(28, 260, mat.chrome); r.rotation.x = Math.PI / 2; r.position.set(x, UP.TOP - 24, UP.Z); }
  }
  const inGap = (x) => UP.GAPS.some(([g0, g1]) => x > g0 - 40 && x < g1 + 40);
  for (let x = x0 + 80; x < x1; x += 900) if (!inGap(x)) for (const s of [-1, 1]) { box(40, -FLOOR - 50, 40, mat.alu, x, (FLOOR - 50) / 2, UP.Z + s * 130); box(90, 12, 90, mat.dark, x, FLOOR + 6, UP.Z + s * 130); }
  // calha final: a lima cai da esteira para a caixa azul
  const chute = box(220, 8, 200, mat.steel, x1 + 70, UP.TOP - 40, UP.Z); chute.rotation.z = -0.35;
  stripe(x0, UP.Z - 700, x1, UP.Z - 700, 60); stripe(x0, UP.Z + 700, x1, UP.Z + 700, 60);
}

// --- limas da linha a montante (deitadas: comprimento em x, espessura em y, largura em z)
function upBlankGeometry() {
  const len = limaLen(), g = new THREE.BoxGeometry(len, P.h, P.b, 30, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), u = Math.max(0, -x / (len / 2));                 // 0 no meio, 1 na ponta
    const f = 1 - 0.42 * u * u;
    p.setZ(i, p.getZ(i) * f); p.setY(i, p.getY(i) * (1 - 0.3 * u * u));
  }
  g.computeVertexNormals();
  return g;
}
const upGeo = { bar: null, strip: null, blank: null, tang: null, teeth: new THREE.PlaneGeometry(1, 1) };
function rebuildUpGeometry() {
  upGeo.bar = new THREE.BoxGeometry(limaLen() * 0.72, P.h * 1.6, P.b * 0.9);   // barra chata de aço (secção rectangular): mais curta e grossa, a laminagem alonga-a
  upGeo.strip = new THREE.BoxGeometry(limaLen() + 60, P.h, P.b);        // tira chata direita que sai do laminador (antes do corte no molde)
  upGeo.blank = upBlankGeometry();
  upGeo.tang = new THREE.BoxGeometry(60, P.h * 0.6, P.b * 0.42);
}
rebuildUpGeometry();
const upTeethTex = teeth.clone(); upTeethTex.needsUpdate = true; upTeethTex.repeat.set(8, 1); upTeethTex.rotation = Math.PI / 2;
function makeUpLima(slot) {
  const g = new THREE.Group(); scene.add(g);
  const m = new THREE.MeshStandardMaterial({ color: 0xb3bac2, metalness: 0.85, roughness: 0.32 });
  const tm = new THREE.MeshStandardMaterial({ map: upTeethTex, metalness: 0.85, roughness: 0.4, transparent: true, opacity: 0.9 });
  const bar = new THREE.Mesh(upGeo.bar, m), strip = new THREE.Mesh(upGeo.strip, m), blank = new THREE.Mesh(upGeo.blank, m), tang = new THREE.Mesh(upGeo.tang, m);
  const teethPlane = new THREE.Mesh(upGeo.teeth, tm); teethPlane.rotation.x = -Math.PI / 2;
  const mark = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), mat.ledG);
  for (const o of [bar, strip, blank, tang]) { o.castShadow = true; o.receiveShadow = true; }
  g.add(bar, strip, blank, tang, teethPlane, mark);
  const l = { g, m, tm, bar, strip, blank, tang, teethPlane, mark, slot, color: new THREE.Color(), metal: 0, rough: 0 };
  UP.reset(l);
  UP.limas.push(l);
  return l;
}
for (let s = UP.FIRST; s <= UP.END; s++) makeUpLima(s);
const _heat = new THREE.Color();
function drawUpLima(l) {
  const x = UP.xOf(l.slot + (UP.phase === "move" ? UP.shift : 0));
  l.g.position.set(x, UP.TOP, UP.Z);
  const len = limaLen();
  l.bar.visible = l.form < 0.5;
  l.strip.visible = l.form >= 0.5 && !l.cut;
  l.blank.visible = l.tang.visible = !!l.cut;
  l.bar.position.set(0, 2 + P.h * 0.8, 0);
  l.strip.scale.set(1, 1 + (1 - l.form) * 1.4, 1); l.strip.position.set(30, 2 + (P.h * l.strip.scale.y) / 2, 0);
  l.blank.scale.set(1, 1 + (1 - l.form) * 1.4, 1); l.blank.position.set(0, 2 + (P.h * l.blank.scale.y) / 2, 0);
  l.tang.position.set(len / 2 + 30, 2 + P.h * 0.3, 0);
  l.teethPlane.visible = !!l.cut && l.teeth > 0.01;
  l.teethPlane.scale.set(Math.max(1, len * 0.85 * l.teeth), P.b * 0.8, 1);
  l.teethPlane.position.set(-len / 2 + 10 + (len * 0.85 * l.teeth) / 2, 2 + P.h + 0.4, 0);
  upTeethTex.repeat.set(8, 1);
  l.mark.visible = l.tested; l.mark.position.set(len / 2 + 30, 2 + P.h * 0.6 + 5, 0);
  l.m.color.copy(l.color); l.m.metalness = l.metal; l.m.roughness = l.rough;
  // calor: vermelho escuro → laranja → amarelo
  const h = Math.max(0, Math.min(1, l.heat));
  _heat.setRGB(1, 0.25 + 0.55 * h * h, 0.05 + 0.25 * Math.max(0, h - 0.7)).multiplyScalar(h);
  l.m.emissive.copy(_heat); l.m.emissiveIntensity = 2.2 * h;
  l.tm.color.copy(l.color); l.tm.emissive.copy(_heat); l.tm.emissiveIntensity = 2.2 * h;
}

addSystem({
  update(dt) {
    UP.t += dt;
    if (UP.phase === "dwell") {
      const s = Math.min(1, UP.t / UP.dwell);
      for (const st of UP.stations) { const l = UP.limaAt(st.slot); if (l && st.onDwell) st.onDwell(l, s, dt); }
      if (s >= 1) {
        // a lima no fim cai na caixa azul; se não houver caixa com espaço, a linha espera
        const last = UP.limaAt(UP.END);
        if (last) { if (!depositUp()) { UP.waiting = true; return; } UP.made++; last.slot = UP.FIRST - 1; UP.reset(last); }
        UP.waiting = false; UP.phase = "move"; UP.t = 0;
      }
    } else {
      UP.shift = ease(Math.min(1, UP.t / UP.move));
      for (const st of UP.stations) { const l = UP.limaAt(st.slot); if (l && st.onMove) st.onMove(l, UP.shift, dt); }
      if (UP.t >= UP.move) { for (const l of UP.limas) { l.slot += 1; UP.guarantee(l); } UP.shift = 0; UP.phase = "dwell"; UP.t = 0; }
    }
  },
  draw() { for (const l of UP.limas) drawUpLima(l); },
});
// alimentador de barras no início da linha
{
  const x = UP.xOf(UP.FIRST) - 60;
  box(260, 400, 420, mat.steelBlue, x - 120, 200 - 0, UP.Z, scene);
  for (let i = 0; i < 6; i++) box(limaLen() * 0.72, P.h * 1.6, P.b * 0.9, mat.steel, x - 120, 410 + P.h * 0.8, UP.Z - 110 + i * 44);   // barras chatas à espera
  addTag({ text: "0 · Alimentação de barras de aço", at: () => V(x - 120, 560, UP.Z), max: 6000 });
}
addTag({ text: () => (UP.waiting ? "Linha a montante · em espera (caixa azul cheia)" : (UP.made === 1 ? "Linha a montante · 1 lima produzida" : `Linha a montante · ${UP.made} limas produzidas`)), at: () => V(UP.xOf(14), 1950, UP.Z), min: 2500, big: true });
addView("up", "Linha a montante", [-5200, 2600, 3000], [-5600, 0, -420]);
window.__UP = UP;
