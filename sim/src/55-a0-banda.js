// =====================================================================
// Estação 0 · Bobina de banda de aço (≈90 m) → desbobinador → endireitador → laminador → molde de corte
//   A matéria-prima é uma banda contínua: não há barras soltas. A banda sai da bobina, passa no endireitador,
//   é apertada nos cilindros do laminador (tira chata direita) e entra no molde. A cada ciclo a banda avança
//   exactamente um passo (os cilindros rodam só nesse avanço, sincronizados com o molde) e o molde corta uma lima.
// =====================================================================
{
  const Z0 = UP.Z, H = P.h, HB = 1.6 * P.h, B = P.b, LF = limaLen() + 60;
  const XG = UP.xOf(1) - limaLen() / 2;                    // eixo dos cilindros do laminador (x = −9385)
  const XD = UP.xOf(2);                                     // centro do molde de corte (x = −8900)
  const CX = -10520, CR = 360, CY = FLOOR + 90 + CR;        // bobina: centro e raio exterior
  const mStrip = new THREE.MeshStandardMaterial({ color: 0xb3bac2, metalness: 0.85, roughness: 0.32 });
  const mCoil = M(0x6d737a, 0.85, 0.42), mStand = M(0x2f6a9e, 0.3, 0.5);

  // textura da banda: riscas de laminagem + marcas transversais (desliza no avanço para se ver a banda a andar)
  const stripTex = (len) => {
    const t = canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = "#b9c0c7"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#9aa1a8"; g.lineWidth = 1; for (let y = 4; y < h; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = "#8a9198"; g.fillRect(0, 0, 3, h); g.fillRect(w / 2, 0, 2, h);
    }, [len / 100, 1]);
    return t;
  };
  const segs = [];
  function stripSeg(a, b, thick) {                           // troço de banda entre dois pontos (eixo x-y), largura B em z
    const len = Math.hypot(b.x - a.x, b.y - a.y), tex = stripTex(len);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, thick, B), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.32 }));
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, Z0); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
    m.castShadow = m.receiveShadow = true; scene.add(m); segs.push({ m, tex, len }); return m;
  }

  // --- desbobinador: bobina vertical (eixo em z) num cavalete com mandril motorizado
  box(640, 60, 620, mat.dark, CX, FLOOR + 30, Z0);
  for (const s of [-1, 1]) box(90, CY - FLOOR - 60, 90, mStand, CX, (CY + FLOOR + 60) / 2, Z0 + s * 230);
  const mandrel = cyl(70, 560, mat.steel, scene, 24); mandrel.rotation.x = Math.PI / 2; mandrel.position.set(CX, CY, Z0);
  const coil = cyl(CR, B + 8, mCoil, scene, 48); coil.rotation.x = Math.PI / 2; coil.position.set(CX, CY, Z0);
  const coilFace = canvasTex(512, 512, (g, w, h) => {                       // espiras vistas de lado
    g.fillStyle = "#6d737a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#4a4f55"; g.lineWidth = 2;
    for (let r = 60; r < 254; r += 9) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }
    g.fillStyle = "#2b2f34"; g.beginPath(); g.arc(256, 256, 58, 0, 7); g.fill();
  });
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.CircleGeometry(CR + 0.5, 48), new THREE.MeshStandardMaterial({ map: coilFace, metalness: 0.7, roughness: 0.5 })); f.rotation.y = s > 0 ? 0 : Math.PI; f.position.set(CX, CY, Z0 + s * (B / 2 + 4.3)); scene.add(f); coil.add; segs.coilFaces = (segs.coilFaces || []).concat(f); }
  const motor = box(180, 160, 160, mat.steelBlue, CX, CY, Z0 - 420); cyl(40, 120, mat.dark, scene, 16).position.set(CX, CY, Z0 - 320);
  box(90, 30, 300, mat.yellow, CX + 380, FLOOR + 75, Z0);                   // batente de segurança

  // --- endireitador: 5 rolos alternados num quadro, entre a bobina e o laminador
  const SX0 = -10180, SX1 = -9930, RY = 2 + HB / 2;
  box(SX1 - SX0 + 80, 30, 40, mStand, (SX0 + SX1) / 2, RY + 95, Z0 - B / 2 - 60);
  box(SX1 - SX0 + 80, 30, 40, mStand, (SX0 + SX1) / 2, RY + 95, Z0 + B / 2 + 60);
  for (const s of [-1, 1]) for (const x of [SX0 - 20, SX1 + 20]) box(40, RY + 110 - FLOOR, 40, mStand, x, (RY + 110 + FLOOR) / 2, Z0 + s * (B / 2 + 60));
  const rollers = [];
  for (let i = 0; i < 5; i++) {
    const x = SX0 + (i * (SX1 - SX0)) / 4, up = i % 2 === 0;
    const r = cyl(28, B + 90, mat.chrome, scene, 20); r.rotation.x = Math.PI / 2; r.position.set(x, RY + (up ? 1 : -1) * (28 + HB / 2 + 1), Z0); rollers.push(r);
  }

  // --- banda: bobina → endireitador (desce) → laminador (grossa, HB) → molde (fina, H, comprimento variável)
  const pTop = { x: CX + 40, y: CY + CR + HB / 2 }, pIn = { x: SX0 - 10, y: RY }, pOut = { x: SX1 + 10, y: RY };
  stripSeg(pTop, { x: pTop.x + 120, y: pTop.y - 30 }, HB);
  stripSeg({ x: pTop.x + 120, y: pTop.y - 30 }, pIn, HB);
  stripSeg(pIn, pOut, HB);
  stripSeg(pOut, { x: XG, y: RY }, HB);
  const thinTex = stripTex(1000);
  const thin = new THREE.Mesh(new THREE.BoxGeometry(1, H, B), new THREE.MeshStandardMaterial({ map: thinTex, metalness: 0.85, roughness: 0.32 }));
  thin.castShadow = thin.receiveShadow = true; thin.position.set(XG, 2 + H / 2, Z0); scene.add(thin);
  const END_CUT = XD - LF / 2 - 20, END_FULL = XD + LF / 2 + 2;   // ponta da banda: depois do corte (sobra de 20 mm) / dentro do molde antes do corte

  let adv = 0, lastShift = 0;
  addSystem({
    draw() {
      // avanço da banda: exactamente um passo por ciclo, só durante o "move" da linha
      if (UP.phase === "move") { const d = UP.shift - lastShift; if (d > 0) adv += d * UP.PITCH; lastShift = UP.shift; } else lastShift = 0;
      let end;
      if (UP.phase === "move") end = END_CUT + UP.PITCH * UP.shift;
      else { const l = UP.limaAt(2); end = l && l.cut ? END_CUT : END_FULL; }
      const len = Math.max(1, end - XG);
      thin.scale.x = len; thin.position.x = XG + len / 2;
      thinTex.repeat.set(len / 100, 1); thinTex.offset.x = -adv / 100 + (len / 100);   // a ponta fixa em XG: compensa a mudança de comprimento
      for (const s of segs) s.tex.offset.x = -adv / 100;
      coil.rotation.y = -adv / CR;                                           // a bobina desenrola (topo move-se para +x)
      for (const f of segs.coilFaces) f.rotation.z = (f.rotation.y === 0 ? -1 : 1) * adv / CR;
      for (const r of rollers) r.rotation.y = -adv / 28;
    },
  });

  addTag({ text: "0 · Bobina de banda de aço · ≈90 m (desbobinador + endireitador)", at: () => V(CX, CY + CR + 420, Z0), max: 6000 });
  addTag({ text: () => (UP.phase === "move" ? "Banda a avançar um passo · cilindros a rodar" : "Banda parada · molde a cortar"), at: () => V((SX1 + XG) / 2, 230, Z0 + 150), max: 3000 });
}
