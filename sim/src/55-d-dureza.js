// =====================================================================
// Estação 4 · Medição de dureza / rigidez — durómetro Rockwell C automático
// Pórtico em C fundido (azul-acinzentado): o braço superior avança em nariz por cima da esteira e leva,
// coaxial com o indentador, o fuso de esferas e o servomotor (a força de ensaio passa em linha recta
// pelo fuso para o nariz). A cabeça de ensaio (célula de carga + indentador cónico de diamante 120°)
// desce guiada por duas colunas que deslizam em casquilhos no nariz.
// Por baixo da esteira, uma ponte (pórtico com os pés fora do túnel: o braço inferior do C atrás e um
// pilar à frente) leva a bigorna pneumática que sobe e apoia a esteira por baixo da lima.
// Ciclo (paragem no slot 16): aproximação → pré-carga F0 = 98 N → carga total F = 1471 N (150 kgf)
// → permanência → retorno a F0 → leitura da profundidade h → HRC = 100 − h/0,002 mm → recuo.
// Lima macia (HRC < 55): no slot 17 o empurrador leva-a pela aba e pela rampa até à caixa vermelha.
// =====================================================================
{
  const SLOT = 16, X0 = UP.xOf(SLOT), Z0 = UP.Z;           // x = -4000, z = -420
  const F0 = 98, F1 = 1471, HRC_MIN = 55;
  const Y_REST = 150;                                       // ponta do diamante em repouso (fora do túnel)
  const NOSE_Y = 512, NOSE_TOP = 948;                       // faces inferior / superior do nariz (com o chanfro)
  const RX = 80;                                            // colunas-guia da cabeça em x = X0 ± 80
  const GX = 158, ZFr = -200, ZBk = -700, YT = 800;         // protecção (postes fora do túnel)
  const XP = UP.xOf(SLOT + 1), XR = XP + 4, RW = 168;       // rejeição no slot 17: empurrador, rampa (meia largura útil)
  const NSLOTS = UP.END - UP.FIRST + 1;                     // lugares no circuito das limas (22)

  // ---------- materiais
  const mCast = M(0x46627f, 0.35, 0.5);                     // ferro fundido pintado, azul-acinzentado
  const mBase = M(0x4e555d, 0.45, 0.55);
  const mCover = M(0xd9dde1, 0.2, 0.42);
  const mPoly = M(0xbcd7ef, 0.1, 0.05, { transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide });
  const mDiamond = M(0xf2f8ff, 0.4, 0.04, { emissive: 0x8aa6bf, emissiveIntensity: 0.35 });
  const mChain = M(0x1e2024, 0.2, 0.72);
  const mRubber = M(0x111214, 0, 0.9);
  const bellowsTex = canvasTex(16, 32, (g, w, h) => { g.fillStyle = "#16181b"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a3e45"; g.fillRect(0, 0, w, h * 0.45); });
  const mBellows = M(0xffffff, 0, 0.85, { map: bellowsTex });
  const mHeadPlate = M(0xffffff, 0.15, 0.5, { map: canvasTex(300, 240, (g, w, h) => {
    g.fillStyle = "#c9cfd5"; g.fillRect(0, 0, w, h); g.strokeStyle = "#9aa3ad"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#8d969f"; for (const [x, y] of [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
    g.fillStyle = "#1f3550"; g.font = "800 54px Arial, sans-serif"; g.textAlign = "center"; g.fillText("HRC", w / 2, 104);
    g.font = "600 26px Arial, sans-serif"; g.fillStyle = "#3d4b5c"; g.fillText(tr("cabeça de ensaio"), w / 2, 150); g.fillText(tr("célula 2 kN"), w / 2, 186);
  }) });
  const mCurtainLed = M(0x3a0808, 0.3, 0.25, { emissive: 0xff2020, emissiveIntensity: 0.18 });
  const lamp = (c) => { const m = M(c, 0, 0.35, { emissive: c, emissiveIntensity: 0 }); m.userData.on = new THREE.Color(c); m.userData.off = new THREE.Color(c).multiplyScalar(0.22); return m; };
  const setLamp = (m, on) => { m.color.copy(on ? m.userData.on : m.userData.off); m.emissiveIntensity = on ? 2.2 : 0; };
  const mLampR = lamp(0xff2b2b), mLampA = lamp(0xffa21a), mLampG = lamp(0x26e07a);

  const sh = (o) => { o.castShadow = o.receiveShadow = true; return o; };
  // caixa com arestas arredondadas (carenagens): rectângulo arredondado em x-z extrudido em y
  function rbox(w, h, d, r, m, bev = 3) {
    const s = new THREE.Shape(), x0 = -w / 2 + bev, x1 = w / 2 - bev, y0 = -d / 2 + bev, y1 = d / 2 - bev;
    const q = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
    s.moveTo(x0 + q, y0); s.lineTo(x1 - q, y0); s.quadraticCurveTo(x1, y0, x1, y0 + q); s.lineTo(x1, y1 - q);
    s.quadraticCurveTo(x1, y1, x1 - q, y1); s.lineTo(x0 + q, y1); s.quadraticCurveTo(x0, y1, x0, y1 - q); s.lineTo(x0, y0 + q);
    s.quadraticCurveTo(x0, y0, x0 + q, y0);
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -(h - 2 * bev) / 2); g.rotateX(-Math.PI / 2);
    return sh(new THREE.Mesh(g, m));
  }
  const put = (o, x, y, z, parent = scene) => { o.position.set(x, y, z); parent.add(o); return o; };
  const limaIn = (slot) => { const a = UP.limas; for (let i = 0; i < a.length; i++) if (a[i].slot === slot) return a[i]; return null; };

  // ---------- pórtico em C (perfil extrudido ao longo de x; s = z, t = y)
  // braço superior em nariz até z = -312, por cima do ponto de ensaio; braço inferior curto, acaba em z = -575 (fora do túnel)
  {
    const s = new THREE.Shape();
    s.moveTo(-1000, -482);
    s.lineTo(-1000, 880); s.quadraticCurveTo(-1000, 940, -940, 940);
    s.lineTo(-380, 940); s.quadraticCurveTo(-320, 940, -320, 880);            // nariz
    s.lineTo(-320, 580); s.quadraticCurveTo(-320, 520, -380, 520);
    s.lineTo(-620, 520); s.quadraticCurveTo(-720, 520, -720, 420);            // garganta (raio de concordância)
    s.lineTo(-720, -120); s.quadraticCurveTo(-720, -200, -640, -200);
    s.lineTo(-583, -200); s.lineTo(-583, -340); s.lineTo(-660, -482);         // braço inferior (apoio da ponte)
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 220, bevelEnabled: true, bevelThickness: 8, bevelSize: 8, bevelSegments: 2, curveSegments: 10 });
    const frame = sh(new THREE.Mesh(g, mCast));
    frame.rotation.y = -Math.PI / 2; frame.position.set(X0 + 110, 0, 0);   // x ∈ [X0 − 118, X0 + 118]
    scene.add(frame);
  }
  // base fundida, pés niveladores e parafusos de fixação
  box(250, 100, 520, mBase, X0, FLOOR + 80, -850);
  {
    const feet = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(30, 34, 30, 16), mat.dark, 4));
    const bolts = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(10, 10, 10, 6), mat.chrome, 4));
    const d = new THREE.Object3D(); let i = 0;
    for (const sx of [-1, 1]) for (const z of [-1070, -630]) { d.position.set(X0 + sx * 90, FLOOR + 15, z); d.updateMatrix(); feet.setMatrixAt(i++, d.matrix); }
    i = 0;
    for (const sx of [-1, 1]) for (const z of [-1062, -618]) { d.position.set(X0 + sx * 92, FLOOR + 135, z); d.updateMatrix(); bolts.setMatrixAt(i++, d.matrix); }
    scene.add(feet, bolts);
  }
  // placa de características no braço superior (face +x)
  {
    const t = canvasTex(512, 160, (g, w, h) => {
      g.fillStyle = "#e9edf1"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#2b3644"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = "#1f5fd6"; g.fillRect(6, 6, 120, h - 12);
      g.fillStyle = "#fff"; g.font = "800 54px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("HRC", 66, h / 2);
      g.textAlign = "left"; g.fillStyle = "#16202c"; g.font = "700 30px Arial, sans-serif";
      { const t1 = tr("DURÓMETRO ROCKWELL"), mw = w - 156, tw = g.measureText(t1).width; if (tw > mw) g.font = `700 ${Math.floor((30 * mw) / tw)}px Arial, sans-serif`; g.fillText(t1, 142, 48); }   // encolhe para caber (EN é mais comprido)
      g.font = "24px Arial, sans-serif"; g.fillText("F₀ 98 N · F 1471 N (150 kgf)", 142, 92);
      g.fillStyle = "#4a5868"; g.font = "20px Arial, sans-serif"; g.fillText(tr("diamante 120° · EN ISO 6508"), 142, 126);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(250, 78), M(0xffffff, 0.1, 0.5, { map: t }));
    p.rotation.y = Math.PI / 2; p.position.set(X0 + 119, 700, -845); scene.add(p);
  }

  // ---------- eixo Z no nariz: casquilhos das colunas-guia, mancal do fuso, servomotor coaxial com o indentador
  for (const sx of [-1, 1]) {
    const f = cyl(26, 14, mat.aluDark, scene, 20); f.position.set(X0 + sx * RX, NOSE_Y - 7, Z0);     // casquilho (por baixo)
    const c = cyl(24, 14, mat.aluDark, scene, 20); c.position.set(X0 + sx * RX, NOSE_TOP + 7, Z0);   // casquilho (por cima)
  }
  { const b = cyl(40, 14, mat.dark, scene, 28); b.position.set(X0, NOSE_Y - 7, Z0); }               // mancal axial do fuso
  { const a = cyl(50, 20, mBase, scene, 28); a.position.set(X0, NOSE_TOP + 10, Z0); }              // flange do motor
  { const c = cyl(36, 56, mat.alu, scene, 24); c.position.set(X0, NOSE_TOP + 48, Z0); }            // caixa do acoplamento
  put(rbox(112, 170, 112, 14, mat.black), X0, 1109, Z0);                                            // servomotor
  put(rbox(116, 14, 116, 16, mat.yellow, 2), X0, 1166, Z0);                                         // anel de identificação
  put(rbox(100, 34, 100, 12, mat.carbon), X0, 1211, Z0);                                            // encoder
  box(3, 50, 70, mat.label, X0 - 57.5, 1100, Z0);                                                   // chapa do motor
  box(34, 34, 44, mat.dark, X0 + 72, 1140, Z0);                                                     // ficha de potência
  // conduta do motor até ao armário de comando
  {
    const pts = [V(X0 + 89, 1140, Z0), V(X0 + 128, 1132, -470), V(X0 + 140, 1060, -700), V(X0 + 140, 960, -900), V(X0 + 140, 870, -982), V(X0 + 140, 520, -984), V(X0 + 150, 185, -975)];
    const tube = sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 9, 8), mat.black));
    scene.add(tube);
    for (const y of [760, 420]) box(26, 14, 30, mat.aluDark, X0 + 131, y, -984);   // braçadeiras
  }
  // armário de comando (face +x do pilar)
  put(rbox(130, 480, 260, 10, mCover), X0 + 184, -60, -860);
  box(4, 440, 2, mat.dark, X0 + 250, -60, -860);
  box(14, 70, 16, mat.chrome, X0 + 252, -40, -760);
  {
    const t = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = "#f2c200"; g.fillRect(0, 0, w, h); g.fillStyle = "#111";
      g.beginPath(); g.moveTo(64, 18); g.lineTo(112, 104); g.lineTo(16, 104); g.closePath(); g.lineWidth = 8; g.strokeStyle = "#111"; g.stroke();
      g.font = "800 60px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 64, 72);
      g.font = "700 26px Arial"; g.textAlign = "left"; g.fillText("400 V", 132, 50); g.font = "20px Arial"; g.fillText(tr("Comando"), 132, 86);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(110, 55), M(0xffffff, 0, 0.6, { map: t }));
    p.rotation.y = Math.PI / 2; p.position.set(X0 + 250.5, 110, -860); scene.add(p);
  }

  // ---------- cabeça de ensaio (móvel): origem do grupo = ponta do diamante
  const head = new THREE.Group(); head.position.set(X0, Y_REST, 0); scene.add(head);
  {
    const add = (o, x, y, z) => { o.position.set(x, y, z); head.add(sh(o)); return o; };
    const C = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg);
    add(new THREE.Mesh(C(3.8, 0.15, 2.1, 24), mDiamond), 0, 1.05, Z0);         // cone de diamante 120°
    add(new THREE.Mesh(C(6.5, 4.2, 18, 20), mat.brass), 0, 11.1, Z0);          // porta-indentador
    add(new THREE.Mesh(C(11, 11, 9, 6), mat.chrome), 0, 24.6, Z0);             // porca
    add(new THREE.Mesh(C(9, 9, 12, 16), mat.chrome), 0, 35.1, Z0);
    add(new THREE.Mesh(C(30, 30, 32, 32), mat.steel), 0, 57, Z0);               // célula de carga
    add(new THREE.Mesh(C(30.8, 30.8, 8, 32), mat.blue), 0, 57, Z0);
    add(new THREE.Mesh(new THREE.BoxGeometry(16, 12, 14), mat.dark), 36, 57, Z0);
    add(new THREE.Mesh(C(15, 15, 30, 20), mat.chrome), 0, 88, Z0);             // haste
    add(new THREE.Mesh(C(24, 19, 22, 20), mRubber), 0, 106, Z0);              // fole de protecção
    add(rbox(190, 170, 184, 26, mCover), 0, 200, Z0);                            // corpo da cabeça
    add(rbox(193, 22, 187, 27, mat.blue), 0, 262, Z0);
    add(rbox(198, 14, 192, 28, mBase), 0, 292, Z0);
    add(new THREE.Mesh(new THREE.BoxGeometry(150, 110, 3), mHeadPlate), 0, 185, Z0 + 93.5);   // tampa frontal
    add(new THREE.Mesh(new THREE.BoxGeometry(34, 8, 3), mat.ledG), 50, 246, Z0 + 93.5);       // LED de estado
    add(new THREE.Mesh(C(30, 30, 24, 24), mat.dark), 0, 311, Z0);               // porca de esferas
    for (const sx of [-1, 1]) {
      add(new THREE.Mesh(C(11, 11, 560, 16), mat.chrome), sx * RX, 579, Z0);  // coluna-guia (desliza no nariz)
      add(new THREE.Mesh(C(20, 20, 16, 16), mat.aluDark), sx * RX, 307, Z0);   // fixação da coluna
      add(new THREE.Mesh(C(16, 16, 12, 16), mat.dark), sx * RX, 853, Z0);      // batente de fim de curso
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(40, 16, 112), mat.aluDark), 0, 240, -566);   // ligação da corrente porta-cabos
    add(new THREE.Mesh(C(9, 9, 14, 12), mat.dark), -62, 306, Z0 - 60);         // bucim do cabo da célula
  }
  // fole do fuso de esferas, entre a porca (na cabeça) e o mancal do nariz
  const bel = sh(new THREE.Mesh(new THREE.CylinderGeometry(23, 23, 1, 20), mBellows)); bel.position.set(X0, 400, Z0); scene.add(bel);

  // ---------- porta-cabos (corrente articulada) na garganta: fixa na face da garganta, móvel nas costas da cabeça
  const NL = 20, LP = 20, CR = 35, ZF = -690, ZM = ZF + 2 * CR, XCH = X0, YF = 400, LTOT = NL * LP;
  const chain = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(30, 19, 16), mChain, NL));
  scene.add(chain);
  box(44, 22, 32, mat.aluDark, XCH, YF + 11, -696);
  const dmy = new THREE.Object3D();
  let chainY = NaN;
  function updateChain(ym) {
    if (Math.abs(ym - chainY) < 0.01) return; chainY = ym;
    const yb = (YF + ym - (LTOT - Math.PI * CR)) / 2, L1 = YF - yb, LA = Math.PI * CR, zc = (ZF + ZM) / 2;
    for (let i = 0; i < NL; i++) {
      const d = (i + 0.5) * LP; let y, z, th;
      if (d < L1) { y = YF - d; z = ZF; th = 0; }
      else if (d < L1 + LA) { const ph = (d - L1) / CR; z = zc - CR * Math.cos(ph); y = yb - CR * Math.sin(ph); th = Math.atan2(Math.sin(ph), -Math.cos(ph)); }
      else { y = yb + (d - L1 - LA); z = ZM; th = 0; }
      dmy.position.set(XCH, y, z); dmy.rotation.set(th, 0, 0); dmy.updateMatrix(); chain.setMatrixAt(i, dmy.matrix);
    }
    chain.instanceMatrix.needsUpdate = true;
  }

  // ---------- ponte da bigorna: pórtico sob a esteira com os pés fora do túnel (braço inferior do C atrás, pilar à frente)
  box(150, 60, 384, mCast, X0, -230, -385);            // ponte (z -577..-193, y -260..-200), aparafusada à face do braço inferior
  box(80, 360, 70, mCast, X0, -440, -228);             // pilar da frente (z -263..-193)
  box(110, 10, 76, mat.dark, X0, FLOOR + 5, -228);     // sapata
  // bigorna pneumática (sobe e apoia a esteira por baixo da lima)
  box(96, 14, 96, mat.dark, X0, -193, Z0);
  { const c = cyl(38, 86, mat.alu, scene, 28); c.position.set(X0, -143, Z0); }
  box(96, 14, 96, mat.dark, X0, -93, Z0);
  const rod = cyl(13, 1, mat.chrome, scene, 16); rod.position.set(X0, -80, Z0);
  const anvil = new THREE.Group(); scene.add(anvil);
  { const a = cyl(32, 22, mat.steel, anvil, 28); a.position.y = -11; const r = cyl(34, 5, mat.dark, anvil, 28); r.position.y = -20; }
  const ANV_REST = -40, ANV_UP = -6;
  // ar comprimido: electroválvula na face da frente do pilar e mangueira até ao cilindro
  box(44, 34, 26, mat.dark, X0, -300, -180);
  {
    const pts = [V(X0 + 38, -150, Z0), V(X0 + 88, -158, -380), V(X0 + 88, -230, -250), V(X0 + 60, -300, -190), V(X0 + 22, -300, -176)];
    scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 4, 6), mat.black)));
  }

  // ---------- protecção: perfis de alumínio, painéis de policarbonato e cortina de luz frontal
  {
    for (const sx of [-1, 1]) for (const z of [ZFr, ZBk]) { box(40, YT - FLOOR, 40, mat.alu, X0 + sx * GX, (YT + FLOOR) / 2, z); box(60, 10, 60, mat.dark, X0 + sx * GX, FLOOR + 5, z); }
    box(2 * GX + 40, 40, 40, mat.alu, X0, YT - 20, ZFr);                       // trave da frente
    const lb = GX + 20 - 118;                                                   // atrás: dois troços que acabam nas faces do C
    for (const sx of [-1, 1]) box(lb, 40, 40, mat.alu, X0 + sx * (118 + lb / 2), YT - 20, ZBk);
    for (const sx of [-1, 1]) {
      box(40, 40, ZFr - ZBk - 40, mat.alu, X0 + sx * GX, YT - 20, (ZFr + ZBk) / 2);
      box(40, 40, ZFr - ZBk - 40, mat.alu, X0 + sx * GX, 118, (ZFr + ZBk) / 2);   // trave sobre a passagem da esteira
      const p = box(4, YT - 40 - 138, ZFr - ZBk - 40, mPoly, X0 + sx * GX, (YT - 40 + 138) / 2, (ZFr + ZBk) / 2, scene, false);
      p.renderOrder = 2;
      // cortina de luz de segurança (emissor / receptor)
      put(rbox(36, 560, 36, 6, mat.yellow, 2), X0 + sx * GX, 420, ZFr + 38);
      box(4, 520, 14, mCurtainLed, X0 + sx * (GX - 19), 420, ZFr + 38);
      box(40, 24, 40, mat.dark, X0 + sx * GX, 128, ZFr + 38);
    }
  }

  // ---------- coluna luminosa (vermelho / âmbar / verde) no topo do poste frontal esquerdo
  {
    const x = X0 - GX, z = ZFr;
    const b = cyl(22, 14, mat.dark, scene, 20); b.position.set(x, YT + 7, z);
    const p = cyl(9, 70, mat.alu, scene, 12); p.position.set(x, YT + 49, z);
    for (const [m, y] of [[mLampG, 907], [mLampA, 953], [mLampR, 999]]) { const l = cyl(30, 46, m, scene, 24); l.position.set(x, y, z); }
    const c = cyl(30, 14, mat.dark, scene, 24); c.position.set(x, 1029, z);
  }

  // ---------- consola do operador com HMI (virada para +z)
  const HW = 640, HH = 400;
  const hmiTex = canvasTex(HW, HH, () => {});
  hmiTex.wrapS = hmiTex.wrapT = THREE.ClampToEdgeWrapping;
  const hg = hmiTex.image.getContext("2d");
  {
    // braço articulado preso ao poste frontal esquerdo da protecção; painel virado para +z (ligeiramente para jusante)
    const hd = new THREE.Group(); hd.position.set(-4330, 470, -30); hd.rotation.set(-0.1, 0.35, 0, "YXZ"); scene.add(hd);
    put(rbox(300, 270, 70, 14, mCover), 0, 0, 0, hd);
    box(284, 188, 6, mat.black, 0, 22, 36, hd);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(270, 169), new THREE.MeshBasicMaterial({ map: hmiTex, toneMapped: false }));
    scr.position.set(0, 22, 39.5); hd.add(scr);
    const btn = (r, h, m, x) => { const o = cyl(r, h, m, hd, 20); o.rotation.x = Math.PI / 2; o.position.set(x, -104, 35 + h / 2); return o; };
    btn(19, 5, mat.yellow, -110); btn(13, 18, M(0xc4161c, 0.1, 0.4), -110);   // paragem de emergência
    btn(9, 8, M(0x1c9a48, 0.1, 0.4, { emissive: 0x22c55e, emissiveIntensity: 0.35 }), -62); btn(9, 8, M(0x1d5fd0, 0.1, 0.4), -34); btn(9, 8, mat.black, -6);
    box(96, 22, 3, mat.label, 84, -104, 36, hd);
    box(80, 80, 30, mat.dark, 0, 0, -50, hd);                          // suporte VESA
    hd.updateMatrixWorld();
    const m = hd.localToWorld(V(0, 0, -65)), p0 = V(X0 - GX - 44, 470, ZFr - 10);   // abraçadeira na face -x do poste
    beam(p0, m, 34, mat.alu);
    for (const q of [p0, m]) { const j = cyl(24, 50, mat.aluDark, scene, 16); j.position.copy(q); }
  }

  // ---------- rejeição (lado +z): empurrador pneumático, aba basculante, rampa e caixa vermelha
  // a rampa e a caixa cabem entre o poste da protecção (x = -3822) e o fim da região (x = -3470)
  const pusher = new THREE.Group(); scene.add(pusher);
  const flap = new THREE.Group(); flap.position.set(XR, -3, -262); scene.add(flap);
  const pRod = sh(new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1, 12).rotateX(Math.PI / 2), mat.chrome));
  pRod.position.set(XP, 26, -610); scene.add(pRod);
  const TH = Math.atan2(290, 220);                       // inclinação da rampa
  {
    box(60, 600, 60, mBase, XP, FLOOR + 300, -800);                                  // poste
    box(84, 36, 250, mat.dark, XP, -16, -800);                                       // berço do cilindro
    const c = cyl(24, 330, mat.alu, scene, 20); c.rotation.x = Math.PI / 2; c.position.set(XP, 26, -800);   // cilindro (curso 300 mm)
    for (const z of [-958, -642]) box(56, 56, 16, mat.aluDark, XP, 26, z);           // tampas
    box(180, 28, 10, mat.kukaOrange, XP, 17, -582, pusher);                          // placa do empurrador
    box(2 * RW, 50, 6, mat.steel, 0, 25, 0, flap);                                   // aba (fechada = guarda lateral)
    const hinge = cyl(4, 2 * RW + 8, mat.chrome, scene, 10); hinge.rotation.z = Math.PI / 2; hinge.position.set(XR, -3, -262);
    box(24, 30, 30, mat.dark, XR - RW - 18, 10, -250);                               // actuador rotativo da aba
    const dz = 220, dy = 290, L = Math.hypot(dz, dy), cz = -258 + dz / 2, cy = -8 - dy / 2;
    const ch = box(2 * RW + 8, 6, L, mat.steel, XR, cy, cz); ch.rotation.x = TH;
    const LW = L - 80, wy = cy - (40 * dy) / L + 30 * Math.cos(TH), wz = cz + (40 * dz) / L + 30 * Math.sin(TH);
    for (const sx of [-1, 1]) { const w = box(4, 60, LW, mat.steel, XR + sx * (RW + 2), wy, wz); w.rotation.x = TH; }
    const yLeg = -8 - (158 * dy) / dz - 3 / Math.cos(TH) - 1;                       // face de baixo da rampa em z = -100
    for (const sx of [-1, 1]) box(30, yLeg - FLOOR, 30, mBase, XR + sx * 120, (yLeg + FLOOR) / 2, -100);   // pernas da rampa
    box(2 * RW + 8, 230, 290, mat.crateRed, XR, FLOOR + 115, 70);
    box(2 * RW - 6, 4, 276, mat.dark, XR, FLOOR + 229, 70);
  }
  // trajecto da lima rejeitada depois de empurrada: aba → rampa → caixa (z, y, rotação em x)
  const KZ = [0, -226, -199.2, -59.2, 30, 60], KY = [0, -8.5, -83.9, -268.4, -372, -470], KR = [0, 0.18, TH, TH, 0.5, 0.3], KC = [0, 0, 0, 0, 0, 0];
  const rej = { l: null, t: 0, n: 0 };
  function startReject(l) {
    rej.l = l; rej.t = 0; rej.n++; l.rejected = true;
    l.slot -= NSLOTS;          // sai da linha: o lugar fica vazio e a lima volta a entrar como barra nova quando a lacuna chegar ao fim
    KZ[0] = -277 + P.b / 2;
    for (let i = 1; i < 6; i++) KC[i] = KC[i - 1] + Math.hypot(KZ[i] - KZ[i - 1], KY[i] - KY[i - 1]);
  }
  function poseReject(l, t, d) {
    const g = l.g;
    if (t < 0.7) { g.position.set(XP, 0, Math.max(Z0, -577 + d + P.b / 2)); g.rotation.x = 0; return; }
    const u = Math.min(1, (t - 0.7) / 0.55), dist = u * u * KC[5];
    let i = 0; while (i < 4 && dist > KC[i + 1]) i++;
    const f = Math.min(1, (dist - KC[i]) / (KC[i + 1] - KC[i])), xk = Math.min(1, dist / KC[2]);
    g.position.set(XP + (XR - 30 - XP) * xk, KY[i] + (KY[i + 1] - KY[i]) * f, KZ[i] + (KZ[i + 1] - KZ[i]) * f);
    g.rotation.x = KR[i] + (KR[i + 1] - KR[i]) * f;
  }

  // ---------- impressão do ensaio (marca na lima, ligeiramente exagerada para se ver)
  const dotTex = canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, "rgba(10,12,14,1)"); gr.addColorStop(0.45, "rgba(30,33,38,1)"); gr.addColorStop(0.62, "rgba(220,226,232,0.95)");
    gr.addColorStop(0.8, "rgba(160,168,176,0.5)"); gr.addColorStop(1, "rgba(160,168,176,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
  dotTex.wrapS = dotTex.wrapT = THREE.ClampToEdgeWrapping;
  const dotGeo = new THREE.PlaneGeometry(7, 7); dotGeo.rotateX(-Math.PI / 2);
  const dotMat = M(0xffffff, 0.6, 0.4, { map: dotTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const dotL = [], dotM = [];
  for (const l of UP.limas) { const d = new THREE.Mesh(dotGeo, dotMat); d.visible = false; d.renderOrder = 3; l.g.add(d); dotL.push(l); dotM.push(d); }
  const limaTop = (l) => (l.form < 0.5 ? 2 + 1.6 * P.h : 2 + P.h * (1 + (1 - l.form) * 1.4) + (l.teeth > 0.6 ? 0.4 : 0));

  // ---------- ciclo de ensaio
  const st = { lima: null, s: -1, top: 12, hrc: 60, h: 0, result: false, done: false, last: null, lastOk: true, n: 0, sum: 0 };
  const dec = (v, n) => v.toFixed(n).replace(".", ",");
  let lastTxt = "Última: — HRC";
  const NS = 200, samples = new Float32Array(NS); let nSamp = 0;
  const seg = (s, a, b) => ease(Math.max(0, Math.min(1, (s - a) / (b - a))));
  function forceAt(s) {
    if (s < 0.27 || s >= 0.77) return 0;
    if (s < 0.31) return F0 * seg(s, 0.27, 0.31);
    if (s < 0.35) return F0;
    if (s < 0.45) return F0 + (F1 - F0) * seg(s, 0.35, 0.45);
    if (s < 0.62) return F1 + Math.sin(s * 900) * 0.8;
    if (s < 0.69) return F1 - (F1 - F0) * seg(s, 0.62, 0.69);
    if (s < 0.74) return F0;
    return F0 * (1 - seg(s, 0.74, 0.77));
  }
  function tipAt(s, top) {
    if (s < 0.06) return Y_REST;
    if (s < 0.22) return Y_REST + (top + 4 - Y_REST) * seg(s, 0.06, 0.22);
    if (s < 0.27) return top + 4 - 4 * seg(s, 0.22, 0.27);
    if (s < 0.75) return top - 0.12 * Math.min(1, forceAt(s) / F1);        // penetração (≈ 0,1 mm)
    return top + (Y_REST - top) * seg(s, 0.75, 0.9);
  }
  const anvilAt = (s) => (s < 0 ? ANV_REST : ANV_REST + (ANV_UP - ANV_REST) * (seg(s, 0.0, 0.1) - seg(s, 0.86, 0.96)));
  const PH = ["Em espera · lima a avançar", "Em espera · sem lima", "Aproximação do indentador", "Pré-carga F₀ = 98 N", "A aplicar a carga total",
    "Carga total · permanência", "Retorno à pré-carga F₀", "Leitura da profundidade h", "Recuo do indentador", "Ensaio concluído"];
  const phaseIdx = (s, here) => (s < 0 ? (here ? 0 : 1) : s < 0.27 ? 2 : s < 0.35 ? 3 : s < 0.45 ? 4 : s < 0.62 ? 5 : s < 0.69 ? 6 : s < 0.75 ? 7 : s < 0.9 ? 8 : 9);

  UP.addStation({
    slot: SLOT, name: "Dureza Rockwell C",
    onDwell(l, s) {
      if (st.lima !== l) {
        st.lima = l; st.hrc = Math.round((58 + Math.random() * 4.5) * 10) / 10; st.h = (100 - st.hrc) * 0.002;
        st.result = false; st.done = false; nSamp = 0; samples.fill(0);
      }
      st.s = s; st.top = limaTop(l);
      const i = Math.min(NS - 1, Math.floor(s * (NS - 1)));
      while (nSamp <= i) { samples[nSamp] = forceAt(nSamp / (NS - 1)); nSamp++; }
      if (s >= 0.7 && !st.result) st.result = true;
      if (s >= 0.8 && !st.done) {
        st.done = true; l.tested = true; l.hrc = st.hrc;
        st.last = st.hrc; st.lastOk = st.hrc >= HRC_MIN; st.n++; st.sum += st.hrc;
        lastTxt = `Última: ${dec(st.hrc, 1)} HRC ${st.lastOk ? "✓" : "✗"}`;
      }
    },
  });

  // ---------- HMI
  const STEP_T = ["F₀", "F", "F₀", "h"], STEP_A = [0.27, 0.35, 0.62, 0.69], STEP_B = [0.35, 0.62, 0.69, 0.75];
  const px = 316, py = 58, pw = 306, ph2 = 186, fy = (f) => py + ph2 - (f / 1600) * ph2;   // área do gráfico F × t
  function drawHMI(s, F, ph) {
    const g = hg;
    g.fillStyle = "#0a111d"; g.fillRect(0, 0, HW, HH);
    g.fillStyle = "#15294b"; g.fillRect(0, 0, HW, 44);
    g.textBaseline = "middle"; g.textAlign = "left";
    g.fillStyle = "#eaf1fd"; g.font = "700 22px Arial, sans-serif"; g.fillText("ROCKWELL C · HRC", 16, 23);
    g.textAlign = "right"; g.fillStyle = "#9fb3d1"; g.font = "18px Arial, sans-serif";
    g.fillText(tr("Ensaio n.º ") + (st.n + (s >= 0 && !st.done ? 1 : 0)), HW - 16, 23);
    // força ao vivo
    g.textAlign = "left"; g.fillStyle = "#7f93b3"; g.font = "600 15px Arial, sans-serif"; g.fillText(tr("FORÇA DE ENSAIO"), 18, 66);
    g.fillStyle = F > 0.5 ? "#ffffff" : "#5d6f8c"; g.font = "700 66px Menlo, Consolas, monospace";
    const fs = String(Math.round(F)); g.fillText(fs, 18, 116);
    const fw = g.measureText(fs).width; g.font = "700 30px Arial, sans-serif"; g.fillText("N", 26 + fw, 124);
    g.fillStyle = s >= 0 && s < 0.9 ? "#fbbf24" : "#8fa3c0"; g.font = "600 17px Arial, sans-serif"; g.fillText(tr(PH[ph]), 18, 164);
    // etapas
    g.font = "700 17px Arial, sans-serif"; g.textAlign = "center";
    for (let k = 0; k < 4; k++) {
      const x = 18 + k * 68, on = s >= STEP_A[k] && s < STEP_B[k], past = s >= STEP_B[k];
      g.fillStyle = on ? "#f59e0b" : past ? "#1d4ed8" : "#1a2740"; g.fillRect(x, 186, 60, 30);
      g.fillStyle = on || past ? "#fff" : "#6b7f9f"; g.fillText(STEP_T[k], x + 30, 202);
    }
    g.textAlign = "left";
    g.fillStyle = "#6b7f9f"; g.font = "14px Arial, sans-serif";
    g.fillText(tr("Bigorna: ") + tr(anvilAt(s) > -12 ? "em apoio" : "em baixo") + tr("  ·  rejeitadas: ") + rej.n, 18, 238);
    // curva força × tempo
    g.fillStyle = "#0e1a2d"; g.fillRect(px, py, pw, ph2);
    g.strokeStyle = "#22324d"; g.lineWidth = 1;
    for (let f = 400; f <= 1200; f += 400) { g.beginPath(); g.moveTo(px, fy(f)); g.lineTo(px + pw, fy(f)); g.stroke(); }
    g.setLineDash([5, 4]); g.strokeStyle = "#3e5a86";
    g.beginPath(); g.moveTo(px, fy(F0)); g.lineTo(px + pw, fy(F0)); g.moveTo(px, fy(F1)); g.lineTo(px + pw, fy(F1)); g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#7f93b3"; g.font = "13px Arial, sans-serif"; g.textAlign = "right";
    g.fillText("1471 N", px + pw - 4, fy(F1) - 9); g.fillText("98 N", px + pw - 4, fy(F0) - 9);
    g.textAlign = "left"; g.fillText("F (N) × t", px + 6, py + 12);
    if (nSamp > 1 && s >= 0) {
      g.beginPath(); g.moveTo(px, fy(0));
      for (let i = 0; i < nSamp; i++) g.lineTo(px + (i / (NS - 1)) * pw, fy(samples[i]));
      g.lineTo(px + ((nSamp - 1) / (NS - 1)) * pw, fy(0)); g.closePath();
      g.fillStyle = "rgba(56,189,248,0.16)"; g.fill();
      g.beginPath();
      for (let i = 0; i < nSamp; i++) { const x = px + (i / (NS - 1)) * pw, y = fy(samples[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = "#38bdf8"; g.lineWidth = 3; g.stroke();
    }
    g.strokeStyle = "#3a4d6e"; g.lineWidth = 1.5; g.strokeRect(px, py, pw, ph2);
    // resultado
    g.fillStyle = "#101c31"; g.fillRect(0, 260, HW, HH - 260);
    const cur = s >= 0 && st.result, val = cur ? st.hrc : st.last;
    g.fillStyle = "#7f93b3"; g.font = "600 15px Arial, sans-serif";
    g.fillText(tr(cur || val == null ? "RESULTADO" : "RESULTADO ANTERIOR"), 18, 284);
    if (val == null) { g.fillStyle = "#5d6f8c"; g.font = "700 54px Arial, sans-serif"; g.fillText("— HRC", 18, 336); }
    else {
      const good = val >= HRC_MIN, vs = dec(val, 1);
      g.fillStyle = good ? "#4ade80" : "#ef5350"; g.font = "700 60px Arial, sans-serif"; g.fillText(vs, 18, 334);
      const w = g.measureText(vs).width; g.font = "700 30px Arial, sans-serif"; g.fillText("HRC", 30 + w, 342);
      g.font = "700 22px Arial, sans-serif"; g.fillText(tr(good ? "✓ OK  (mín. 55 HRC)" : "✗ MACIA → rejeição"), 18, 380);
      g.textAlign = "right"; g.fillStyle = "#c9d6ea"; g.font = "18px Arial, sans-serif";
      g.fillText("h = " + dec((100 - val) * 0.002, 3) + " mm", HW - 18, 292);
      g.fillText(tr("HRC = 100 − h / 0,002 mm"), HW - 18, 322);
      g.fillStyle = "#8fa3c0"; g.fillText(st.n ? "n = " + st.n + tr(" · média ") + dec(st.sum / st.n, 1) + " HRC" : "n = 0", HW - 18, 352);
      g.fillText(tr(good ? "Lima aprovada" : "Lima rejeitada"), HW - 18, 380);
      g.textAlign = "left";
    }
    hmiTex.needsUpdate = true;
  }

  // ---------- etiquetas e vista (posições criadas uma só vez)
  const TAG_T = V(X0, 1420, Z0), TAG_L = V(-4330, 690, -30), TAG_R = V(XR, -230, 70);   // título por cima do motor, última leitura por cima da HMI
  addTag({ text: "4 · Dureza / rigidez — Rockwell C · 1471 N", at: () => TAG_T, min: 2500, big: true });
  addTag({ text: () => lastTxt, at: () => TAG_L, max: 3000 });
  addTag({ text: "Rejeição · HRC < 55", at: () => TAG_R, max: 3000 });
  addView("dur", "Dureza", [-2650, 1450, 2250], [-3980, 470, -420]);

  // ---------- animação
  let clock = 0, hmiT = 0;
  let kF = -1, kPh = -1, kRes = false, kN = -1, kS = -1, kAnv = false, kRej = -1, kLang = -1;
  addSystem({
    update(dt) {
      // rejeição: uma lima macia que chega ao slot 17 é empurrada para a rampa e sai da linha
      if (!rej.l && UP.phase === "dwell") {
        const n = limaIn(SLOT + 1);
        if (n && n.tested && n.hrc < HRC_MIN) startReject(n);
      }
      if (rej.l) {
        rej.t += dt;
        if (rej.t >= 1.25 && rej.l.g.visible) { rej.l.g.visible = false; rej.l.g.rotation.x = 0; UP.reset(rej.l); }
        if (rej.t >= 1.6) rej.l = null;
      }
    },
    draw(dt) {
      clock += dt;
      const here = limaIn(SLOT);
      const active = UP.phase === "dwell" && here !== null && st.lima === here;
      const s = active ? st.s : -1;
      const tip = active ? tipAt(s, st.top) : Y_REST;
      head.position.y = tip;
      updateChain(tip + 240);
      const yb0 = tip + 323, bl = NOSE_Y - 14 - yb0;
      bel.scale.y = bl; bel.position.y = yb0 + bl / 2; bellowsTex.repeat.y = Math.max(1, bl / 9);
      const ay = anvilAt(s);
      anvil.position.set(X0, ay, Z0);
      const rl = ay - 22 + 86; rod.scale.y = Math.max(1, rl); rod.position.y = -86 + rl / 2;
      // coluna luminosa: verde = aprovada / em espera, âmbar a piscar = ensaio, vermelho = macia / a rejeitar
      const testing = s >= 0.04 && s < 0.9;
      setLamp(mLampG, !testing && st.lastOk && !rej.l);
      setLamp(mLampA, testing && Math.sin(clock * 9) > -0.3);
      setLamp(mLampR, !st.lastOk || rej.l !== null);
      // rejeição: empurrador (curso 300 mm), aba e lima a cair pela rampa
      let d = 0, fo = 0;
      if (rej.l) {
        const t = rej.t;
        d = 300 * (seg(t, 0.1, 0.7) - seg(t, 0.8, 1.3));
        fo = seg(t, 0, 0.25) - seg(t, 1.3, 1.6);
        if (rej.l.g.visible) poseReject(rej.l, t, d);
      }
      pusher.position.z = d; pRod.scale.z = 47 + d; pRod.position.z = (-634 - 587 + d) / 2;
      flap.rotation.x = 1.75 * fo;
      // marca da impressão em cada lima ensaiada; marca vermelha no espigão se for macia; regresso das rejeitadas
      for (let i = 0; i < dotL.length; i++) {
        const l = dotL[i], m = dotM[i];
        m.visible = l.tested; if (l.tested) m.position.set(0, limaTop(l) + 0.15, 0);
        const mk = l.tested && l.hrc < HRC_MIN ? mat.ledR : mat.ledG;
        if (l.mark.material !== mk) l.mark.material = mk;
        if (l.rejected && l !== rej.l && (l.slot >= UP.FIRST || (l.slot === UP.FIRST - 1 && UP.phase === "move"))) { l.rejected = false; l.g.visible = true; l.g.rotation.x = 0; }
      }
      // HMI: redesenha no máximo ~12×/s e só se algo mudou (comparações numéricas, sem criar objectos)
      const now = performance.now();
      const F = active ? forceAt(s) : 0;
      const fR = Math.round(F), ph = phaseIdx(s, here !== null), anv = ay > -12;
      if ((fR !== kF || ph !== kPh || st.result !== kRes || st.n !== kN || nSamp !== kS || anv !== kAnv || rej.n !== kRej || LANG.rev !== kLang) && now - hmiT > 80) {
        kF = fR; kPh = ph; kRes = st.result; kN = st.n; kS = nSamp; kAnv = anv; kRej = rej.n; kLang = LANG.rev; hmiT = now;
        drawHMI(s, F, ph);
      }
    },
  });
}
