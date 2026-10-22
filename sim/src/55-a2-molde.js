// =====================================================================
// Estação 1b · Molde de calibragem (matriz) — logo a seguir ao laminador, no slot 2
//   O laminador dá o afunilamento; aqui uma prensa hidráulica fecha o esboço num molde com a silhueta exacta da
//   lima (lâmina afunilada + espigão): matriz inferior embutida na esteira e punção superior com a forma em negativo.
//   A cada paragem o punção desce, calibra e sobe. Tudo fora do túnel da esteira excepto a matriz e o punção.
// =====================================================================
{
  const SLOT = 2, XD = UP.xOf(SLOT), Z0 = UP.Z;           // x = −8900, z = −420
  const L = limaLen(), LT = 60, LF = L + LT, B = P.b;     // lima final: lâmina + espigão (espigão na ponta +x)
  const mDie = M(0x8e959d, 0.9, 0.3), mFrame = M(0x2f6a9e, 0.3, 0.5), mRam = M(0xb9c0c7, 0.9, 0.25);

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
  const texLow = dieTex("MOLDE DE CALIBRAGEM · MATRIZ"), texUp = dieTex("MOLDE DE CALIBRAGEM · PUNÇÃO");

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
  const rod = cyl(26, 300, mRam, punch, 20); rod.position.set(XD, 520, Z0);   // haste (parte dentro do cilindro quando em cima)
  box(LF + 60, 60, 150, mRam, XD, 390, Z0, punch);                       // porta-punção
  box(LF + 40, 70, 136, mDie, XD, 330, Z0, punch);                       // punção
  const up = new THREE.Mesh(new THREE.PlaneGeometry(LF + 40, 136), new THREE.MeshStandardMaterial({ map: texUp, metalness: 0.6, roughness: 0.4 }));
  up.rotation.x = Math.PI / 2; up.position.set(XD, 294.4, Z0); punch.add(up);
  const PUNCH_REST = 0, PUNCH_DOWN = -(295 - (2 + P.h) - 1);           // em baixo a face do punção toca o topo da lima
  let want = PUNCH_REST;
  const lamp = cyl(24, 40, mat.ledG, scene, 16); lamp.position.set(XD, 680, Z0 + 300);

  UP.addStation({
    slot: SLOT, name: "Molde",
    onDwell(l, s) {
      // desce (0,15→0,35), calibra (0,35→0,6), sobe (0,6→0,8)
      const k = s < 0.15 ? 0 : s < 0.35 ? ease((s - 0.15) / 0.2) : s < 0.6 ? 1 : s < 0.8 ? 1 - ease((s - 0.6) / 0.2) : 0;
      want = PUNCH_REST + (PUNCH_DOWN - PUNCH_REST) * k;
      if (s > 0.35 && s < 0.6) { l.form = 1; l.g.position.x = XD; }   // dentro do molde a lima fica exactamente no lugar e com a forma final
      lamp.material = s > 0.15 && s < 0.8 ? mat.ledO : mat.ledG;
    },
    onMove() { want = PUNCH_REST; },
  });
  addSystem({ draw(dt) { punch.position.y += (want - punch.position.y) * Math.min(1, 8 * Math.max(dt, 0.004)); } });

  addTag({ text: "Molde de calibragem · forma final da lima (lâmina + espigão)", at: () => V(XD, 880, Z0), max: 3500 });
  addTag({ text: () => (punch.position.y < PUNCH_DOWN * 0.9 ? "A calibrar no molde" : "Molde aberto"), at: () => V(XD, 470, Z0 + 220), max: 2200 });
}
