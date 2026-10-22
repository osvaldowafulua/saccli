// =====================================================================
// Estação 1b · Molde de corte (matriz de recorte) — logo a seguir ao laminador, no slot 2
//   O laminador aperta a barra até uma tira chata direita; aqui uma prensa hidráulica fecha o molde com a
//   silhueta exacta da lima (lâmina afunilada + espigão): matriz inferior embutida na esteira e punção superior
//   com a forma em negativo. A cada paragem o punção desce, CORTA a silhueta na tira e sobe; as aparas caem
//   pela calha para o contentor ao lado. Tudo fora do túnel da esteira excepto a matriz e o punção.
// =====================================================================
{
  const SLOT = 2, XD = UP.xOf(SLOT), Z0 = UP.Z;           // x = −8900, z = −420
  const L = limaLen(), LT = 60, LF = L + LT, B = P.b;     // lima final: lâmina + espigão (espigão na ponta +x)
  const mDie = M(0x8e959d, 0.9, 0.3), mFrame = M(0x2f6a9e, 0.3, 0.5), mRam = M(0xb9c0c7, 0.9, 0.25), mScrap = M(0xb3bac2, 0.85, 0.35);

  // silhueta da lima (negativo no molde): canvas com o fundo de aço e a cavidade escura
  const DW = 512, DH = 192;
  const dieTex = (label) => canvasTex(DW, DH, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#aab1b8"); gr.addColorStop(1, "#7f868d");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#5b636b"; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    const sx = (x) => 40 + (x / LF) * (w - 80), cy = h / 2, hw = (B / 2) * ((w - 80) / LF) * 1.15;
    g.fillStyle = "#1d2126";
    g.beginPath();                                                                     // lâmina: afunila do meio para a ponta e para o talão
    g.moveTo(sx(0), cy - hw * 0.55); g.lineTo(sx(L * 0.35), cy - hw); g.lineTo(sx(L * 0.9), cy - hw * 0.8); g.lineTo(sx(L), cy - hw * 0.4);
    g.lineTo(sx(L), cy + hw * 0.4); g.lineTo(sx(L * 0.9), cy + hw * 0.8); g.lineTo(sx(L * 0.35), cy + hw); g.lineTo(sx(0), cy + hw * 0.55); g.closePath(); g.fill();
    g.beginPath();                                                                     // espigão
    g.moveTo(sx(L), cy - hw * 0.4); g.lineTo(sx(LF) - 4, cy - hw * 0.12); g.lineTo(sx(LF) - 4, cy + hw * 0.12); g.lineTo(sx(L), cy + hw * 0.4); g.closePath(); g.fill();
    g.fillStyle = "#30363c"; for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) g.fillRect(sx(x * L) - 1, cy - hw - 10, 2, 6);   // marcas de posição
    g.fillStyle = "#2b3238"; g.font = "700 16px Arial"; g.fillText(tr(label), 14, h - 14);
  });
  const texLow = dieTex("MOLDE DE CORTE · MATRIZ"), texUp = dieTex("MOLDE DE CORTE · PUNÇÃO");

  // matriz inferior: placa embutida à superfície da esteira (a lima assenta nela em y = 2)
  box(LF + 110, 8, 160, mDie, XD, -2, Z0);
  const low = new THREE.Mesh(new THREE.PlaneGeometry(LF + 80, 136), new THREE.MeshStandardMaterial({ map: texLow, metalness: 0.6, roughness: 0.4 }));
  low.rotation.x = -Math.PI / 2; low.position.set(XD, 2.6, Z0); low.receiveShadow = true; scene.add(low);
  for (const s of [-1, 1]) box(LF + 110, 16, 14, mFrame, XD, 6, Z0 + s * 87);   // réguas laterais de guia

  // prensa: duas colunas fora do túnel, travessa, cilindro hidráulico e punção com a forma em negativo
  for (const s of [-1, 1]) { box(70, 620 - FLOOR, 70, mFrame, XD, (620 + FLOOR) / 2, Z0 + s * 240); box(160, 14, 160, mat.dark, XD, FLOOR + 7, Z0 + s * 240); }
  box(90, 90, 560, mFrame, XD, 620, Z0);
  const cylH = cyl(58, 170, mat.dark, scene, 28); cylH.position.set(XD, 750, Z0);
  cyl(62, 16, mat.alu, scene, 28).position.set(XD, 672, Z0);
  for (const s of [-1, 1]) { const h = cyl(9, 90, mat.dark, scene, 10); h.rotation.z = Math.PI / 2; h.position.set(XD, 790 + s * 25, Z0 - 70); }   // ligações hidráulicas
  const punch = new THREE.Group(); scene.add(punch);                   // sobe/desce
  const rod = cyl(26, 300, mRam, punch, 20); rod.position.set(XD, 520, Z0);
  box(LF + 60, 60, 150, mRam, XD, 390, Z0, punch);                       // porta-punção
  box(LF + 40, 70, 136, mDie, XD, 330, Z0, punch);                       // punção
  const up = new THREE.Mesh(new THREE.PlaneGeometry(LF + 40, 136), new THREE.MeshStandardMaterial({ map: texUp, metalness: 0.6, roughness: 0.4 }));
  up.rotation.x = Math.PI / 2; up.position.set(XD, 294.4, Z0); punch.add(up);
  const PUNCH_REST = 0, PUNCH_DOWN = -(295 - (2 + P.h) - 1);           // em baixo a face do punção toca o topo da tira (corte)
  let want = PUNCH_REST;
  const lamp = cyl(24, 40, mat.ledG, scene, 16); lamp.position.set(XD, 680, Z0 + 300);

  // aparas: calha do lado +z e contentor de aparas; 4 peças (duas tiras laterais e duas pontas) que caem a cada corte
  const CHZ = Z0 + 150, BINZ = Z0 + 360;
  const chute = box(LF + 60, 6, 170, mat.steel, XD, -40, CHZ + 10); chute.rotation.x = 0.55;
  box(320, 260, 240, mat.dark, XD, FLOOR + 130, BINZ);
  box(324, 8, 244, M(0x3a3f45, 0.5, 0.6), XD, FLOOR + 262, BINZ, scene, false);
  const scrapTag = canvasTex(256, 64, (g) => { g.fillStyle = "#f1f1ee"; g.fillRect(0, 0, 256, 64); g.fillStyle = "#1f2a3a"; g.font = "700 30px Arial"; g.fillText(tr("Aparas"), 20, 44); });
  const tagM = new THREE.Mesh(new THREE.PlaneGeometry(160, 40), new THREE.MeshBasicMaterial({ map: scrapTag })); tagM.position.set(XD, FLOOR + 150, BINZ + 121); scene.add(tagM);
  const scrap = [[LF, 3, B * 0.14, 0, B * 0.43], [LF, 3, B * 0.14, 0, -B * 0.43], [LT, 3, B * 0.35, LF / 2 + 5, 0], [12, 3, B * 0.6, -LF / 2 - 6, 0]].map(([w, h, d, ox, oz]) => {
    const m = box(w, h, d, mScrap, XD + ox, 4, Z0 + oz); m.visible = false; return { m, ox, oz, t: -1 };
  });
  let nCut = 0;
  function cutNow(l) {
    if (l.cut) return;
    l.cut = true; l.form = 1; nCut++;
    for (const p of scrap) { p.t = 0; p.m.visible = true; p.m.position.set(XD + 30 + p.ox, 6, Z0 + p.oz); p.m.rotation.set(0, 0, 0); }
  }

  UP.addStation({
    slot: SLOT, name: "Molde",
    onDwell(l, s) {
      // desce (0,15→0,35), corta (0,35→0,6), sobe (0,6→0,8)
      const k = s < 0.15 ? 0 : s < 0.35 ? ease((s - 0.15) / 0.2) : s < 0.6 ? 1 : s < 0.8 ? 1 - ease((s - 0.6) / 0.2) : 0;
      want = PUNCH_REST + (PUNCH_DOWN - PUNCH_REST) * k;
      if (s > 0.36 && s < 0.6) { l.g.position.x = XD; if (s > 0.42) cutNow(l); }   // dentro do molde a tira fica exactamente no lugar; o corte dá-se com o punção em baixo
      lamp.material = s > 0.15 && s < 0.8 ? mat.ledO : mat.ledG;
    },
    onMove() { want = PUNCH_REST; },
  });
  addSystem({
    draw(dt) {
      punch.position.y += (want - punch.position.y) * Math.min(1, 8 * Math.max(dt, 0.004));
      for (const p of scrap) {                         // as aparas deslizam para +z pela calha e caem no contentor
        if (p.t < 0) continue;
        p.t += dt;
        const u = Math.min(1, p.t / 1.3);
        p.m.position.z = Z0 + p.oz + (BINZ - Z0 - p.oz) * ease(u);
        p.m.position.y = u < 0.35 ? 6 + 10 * Math.sin(u * 9) : 6 - (6 - (FLOOR + 262 + 20)) * ease((u - 0.35) / 0.65);
        p.m.rotation.x = -0.6 * ease(Math.min(1, u * 2)) * (1 - u);
        if (u >= 1) { p.t = -1; p.m.visible = false; }
      }
    },
  });

  addTag({ text: "Molde de corte · corta a silhueta da lima na tira (lâmina + espigão)", at: () => V(XD, 880, Z0), max: 3500 });
  addTag({ text: () => (punch.position.y < PUNCH_DOWN * 0.9 ? "A cortar no molde" : "Molde aberto"), at: () => V(XD, 470, Z0 + 220), max: 2200 });
  addTag({ text: () => `Aparas do corte · ${nCut}`, at: () => V(XD, FLOOR + 330, BINZ), max: 2200 });
}
