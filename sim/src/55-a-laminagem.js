// =====================================================================
// Estação 1 · Laminagem — laminador duo com cilindros de aço giratórios
// Duas caixas (housings) de aço fundido com janela; em cada janela os mancais (chumaceiras) dos dois
// cilindros de trabalho Ø330 × 420 mm. Em cima, cilindros hidráulicos de aperto (AGC) que baixam o
// cilindro superior e seguem o perfil da lima (afunilamento) durante a passagem. Do lado −z, redutor +
// caixa de pinhões accionado por motor eléctrico, ligado aos cilindros por veios cardã.
// A barra chata (secção rectangular) chega ao batente da entrada com a frente na mordedura; os cilindros
// (sempre a rodar) puxam-na e laminam-na: sai primeiro o espigão, depois o corpo e por fim a ponta
// afunilada. No fim da passagem a lima fica exactamente no slot 1 (x = −9250).
// =====================================================================
{
  const SLOT = 1, SX = UP.xOf(SLOT), Z0 = UP.Z;            // x = −9250, z = −420
  const L = limaLen(), H = P.h, B = P.b;                   // dimensões do esboço (as mesmas da geometria da linha)
  const LB = 0.72 * L, HB = 1.6 * H, BB = 0.9 * B;         // barra chata de aço bruta
  const LT = 60, LF = L + LT;                              // comprimento final: esboço + espigão
  const R = 165, BAR = 420;                                // cilindros de trabalho Ø330, mesa 420
  const XG = SX - L / 2;                                   // eixo dos cilindros (x = −9385): no fim a lima fica no slot
  const YL = 2 - R;                                        // cilindro inferior: topo no plano de apoio da lima
  const OPEN = 2 + HB + 12;                                // fundo do cilindro superior com a folga aberta
  const PRE = XG - LB / 2;                                 // centro da barra no batente (frente na mordedura)
  const OMEGA = 1.9;                                       // rad/s (≈ 18 rpm) — velocidade periférica = velocidade de saída
  const ZOS = -125, ZDS = -715, HT = 130;                  // centros das caixas (lado do operador / lado do accionamento)
  const S_DOWN = 0.1, S_A = 0.2;                           // aperto e início da passagem (fracção da paragem)
  const sB = () => S_A + LF / (OMEGA * R * UP.dwell);      // fim da passagem
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const countMeshes = () => { let n = 0; scene.traverse((o) => { if (o.isMesh || o.isPoints) n++; }); return n; };
  const MESH0 = countMeshes();

  // ---------- materiais
  const mCast = M(0x30475c, 0.4, 0.5);                     // aço fundido pintado
  const mCastDark = M(0x263646, 0.45, 0.55);
  const mChock = M(0x7d868f, 0.75, 0.38);
  const mGear = M(0x52677a, 0.35, 0.5);
  const mMotor = M(0x2a6496, 0.35, 0.45);
  const mBase = M(0x3c4248, 0.45, 0.6);
  const mWater = M(0x2f8a57, 0.3, 0.45);                   // tubagem de água (verde)
  const mHose = M(0x141518, 0.1, 0.75);
  const mLiner = M(0xb08a4a, 0.85, 0.35);                  // chapas de desgaste em bronze
  const mShaft = M(0x3a3f45, 0.55, 0.4);
  const mGuardMesh = M(0x2a2e33, 0.5, 0.5, { map: meshTex(500, 500), transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
  const rollTex = canvasTex(512, 8, (g, w, h) => {
    g.fillStyle = "#d9dee4"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, a = 0.12 + Math.random() * 0.3; g.fillStyle = `rgba(110,118,128,${a})`; g.fillRect(x, 0, 1 + Math.random() * 3, h); }
    for (let i = 0; i < 25; i++) { g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(Math.random() * w, 0, 1 + Math.random() * 2, h); }
    g.fillStyle = "rgba(70,78,88,0.42)"; g.fillRect(40, 0, 34, h); g.fillRect(300, 0, 16, h);   // película de água / marcas de rectificação
    g.fillStyle = "rgba(60,64,70,0.55)"; g.fillRect(180, 0, 6, h);
  });
  const mRoll = M(0xffffff, 1, 0.16, { map: rollTex });
  const endTex = (id) => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#4a5058"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#636a73"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
    g.fillStyle = "#f2c200"; g.fillRect(116, 8, 24, 112);                       // risco de referência (rotação)
    g.fillStyle = "#1a1d21"; g.font = "800 40px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(id, 128, 176);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, x = 128 + 86 * Math.cos(a), y = 128 + 86 * Math.sin(a); g.fillStyle = "#c7cdd4"; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.fillStyle = "#3a3f46"; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    g.fillStyle = "#2a2e33"; g.beginPath(); g.arc(128, 128, 14, 0, 7); g.fill();
  });

  const sh = (o) => { o.castShadow = o.receiveShadow = true; return o; };
  const put = (o, x, y, z, parent = scene) => { o.position.set(x, y, z); parent.add(o); return o; };
  // caixa com arestas arredondadas (rectângulo arredondado em x-z extrudido em y)
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
  const zcyl = (r, len, m, parent = scene, seg = 24) => { const o = cyl(r, len, m, parent, seg); o.rotation.x = Math.PI / 2; return o; };   // eixo em z
  const xcyl = (r, len, m, parent = scene, seg = 24) => { const o = cyl(r, len, m, parent, seg); o.rotation.z = Math.PI / 2; return o; };   // eixo em x
  const plate = (tex, w, h, x, y, z, ry = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M(0xffffff, 0.1, 0.5, { map: tex })); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); return p; };

  // ---------- caixas do laminador (housings): perfil x-y com janela, extrudido em z
  {
    const s = new THREE.Shape();
    s.moveTo(-430, -560); s.lineTo(430, -560); s.lineTo(430, -505); s.lineTo(372, -478); s.lineTo(372, 490);
    s.quadraticCurveTo(372, 560, 302, 560); s.lineTo(-302, 560); s.quadraticCurveTo(-372, 560, -372, 490);
    s.lineTo(-372, -478); s.lineTo(-430, -505); s.closePath();
    const w = new THREE.Path();
    w.moveTo(-185, -336); w.quadraticCurveTo(-185, -350, -171, -350); w.lineTo(171, -350); w.quadraticCurveTo(185, -350, 185, -336);
    w.lineTo(185, 426); w.quadraticCurveTo(185, 440, 171, 440); w.lineTo(-171, 440); w.quadraticCurveTo(-185, 440, -185, 426); w.closePath();
    s.holes.push(w);
    const g = new THREE.ExtrudeGeometry(s, { depth: HT - 12, bevelEnabled: true, bevelThickness: 6, bevelSize: 6, bevelSegments: 2, curveSegments: 8 });
    for (const zc of [ZOS, ZDS]) {
      const m = sh(new THREE.Mesh(g, mCast)); m.position.set(XG, 0, zc - HT / 2 + 6); scene.add(m);
      box(940, 60, HT + 130, mBase, XG, FLOOR + 30, zc);                              // placa de assentamento
      for (const sx of [-1, 1]) {
        box(6, 790, HT + 4, mLiner, XG + sx * 182, 45, zc);                             // chapas de desgaste na janela
        box(70, 46, HT + 24, mCastDark, XG + sx * 400, -540, zc);                       // patas de fixação
      }
    }
    // pernos de ancoragem
    const bolts = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(15, 15, 34, 6), mat.chrome, 16));
    const d = new THREE.Object3D(); let i = 0;
    for (const zc of [ZOS, ZDS]) for (const sx of [-1, 1]) for (const dz of [-90, 90]) for (const dx of [-25, 25]) { d.position.set(XG + sx * (425 + dx), FLOOR + 77, zc + dz); d.updateMatrix(); bolts.setMatrixAt(i++, d.matrix); }
    scene.add(bolts);
    // travessas superiores (pórtico) entre as duas caixas
    for (const sx of [-1, 1]) box(80, 64, (ZOS - ZDS) + HT + 20, mCastDark, XG + sx * 310, 592, (ZOS + ZDS) / 2);
    // placa de características na face do operador (+z)
    const t = canvasTex(512, 200, (g2, w2, h2) => {
      g2.fillStyle = "#e9edf1"; g2.fillRect(0, 0, w2, h2); g2.strokeStyle = "#22303f"; g2.lineWidth = 6; g2.strokeRect(5, 5, w2 - 10, h2 - 10);
      g2.fillStyle = "#1f5fd6"; g2.fillRect(5, 5, w2 - 10, 54);
      g2.fillStyle = "#fff"; g2.font = "800 34px Arial, sans-serif"; g2.textBaseline = "middle"; g2.fillText(tr("LAMINADOR DUO  L1"), 20, 33);
      g2.fillStyle = "#16202c"; g2.font = "600 26px Arial, sans-serif";
      g2.fillText(tr("Cilindros Ø330 × 420 mm"), 20, 88); g2.fillText(tr("Força máx. 600 kN · 18 rpm"), 20, 124);
      g2.fillStyle = "#4a5868"; g2.font = "22px Arial, sans-serif"; g2.fillText(tr("Aperto hidráulico AGC · 2 × 300 kN"), 20, 162);
    });
    plate(t, 230, 90, XG + 278, 300, ZOS + HT / 2 + 0.6);
  }

  // ---------- cilindros de trabalho (perfil de revolução, eixo em z)
  function rollGeo(grooves) {
    const p = [[0, -382], [100, -382], [100, -228], [118, -216], [150, -212], [160, -210], [R, -205]];
    if (grooves) p.push([R, -156], [160, -153], [100, -150], [100, -120], [160, -117], [R, -114], [R, 114], [160, 117], [100, 120], [100, 150], [160, 153], [R, 156]);
    p.push([R, 205], [160, 210], [150, 212], [118, 216], [100, 228], [100, 382], [80, 384], [80, 402], [0, 402]);
    const g = new THREE.LatheGeometry(p.map(([r, t]) => new THREE.Vector2(r, t)), 64);
    g.rotateX(Math.PI / 2);
    return g;
  }
  function makeRoll(id, grooves) {
    const g = new THREE.Group(); scene.add(g);
    const spin = new THREE.Group(); g.add(spin);
    spin.add(sh(new THREE.Mesh(rollGeo(grooves), mRoll)));
    const ep = new THREE.Mesh(new THREE.CircleGeometry(78, 40), M(0xffffff, 0.5, 0.45, { map: endTex(id) })); ep.position.z = 402.6; spin.add(ep);
    const wob = sh(new THREE.Mesh(new THREE.BoxGeometry(128, 128, 44), mat.steel)); wob.position.z = -404; spin.add(wob);   // extremidade com faces planas (wobbler)
    const fl = sh(zcyl(95, 16, mat.steel, spin, 28)); fl.position.z = -434;
    for (const sx of [-1, 1]) { const e = sh(new THREE.Mesh(new THREE.BoxGeometry(18, 64, 34), mat.steel)); e.position.set(sx * 40, 0, -459); spin.add(e); }
    return { g, spin };
  }
  const rollU = makeRoll("C-01", false), rollL = makeRoll("C-02", true);
  rollU.g.position.set(XG, OPEN + R, Z0); rollL.g.position.set(XG, YL, Z0);

  // ---------- mancais (chumaceiras), tampas, células de carga
  const chockU = [], rods = [];
  for (const zc of [ZOS, ZDS]) {
    const out = zc === ZOS ? 1 : -1;                                           // sentido da face exterior
    const lo = put(rbox(356, 300, HT + 20, 10, mChock), XG, YL, zc);
    const up = put(rbox(356, 290, HT + 20, 10, mChock), XG, OPEN + R, zc);
    chockU.push(up);
    for (const c of [lo, up]) {
      const cap = zcyl(126, 12, mat.dark, c, 32); cap.position.set(0, 0, out * (HT / 2 + 16));
      box(60, 22, 40, mat.dark, 0, 150, out * 30, c);                            // olhal de elevação
      box(18, 18, 18, mat.brass, 150, 120, out * (HT / 2 + 12), c);              // copo de lubrificação
    }
    { const lc = cyl(70, 37, mat.dark, scene, 24); lc.position.set(XG, -331.5, zc); }   // célula de carga de laminagem
    // cilindro hidráulico de aperto (AGC) no topo da caixa
    box(300, 26, HT + 30, mCastDark, XG, 573, zc);
    { const b = cyl(86, 200, mat.steel, scene, 32); b.position.set(XG, 686, zc); }
    for (const y of [596, 776]) { const f = cyl(98, 18, mat.dark, scene, 32); f.position.set(XG, y, zc); }
    { const s2 = cyl(22, 64, mat.alu, scene, 16); s2.position.set(XG, 817, zc); const c2 = cyl(14, 22, mat.black, scene, 12); c2.position.set(XG, 860, zc); }   // sensor de posição
    const rod = cyl(52, 1, mat.chrome, scene, 24); rod.position.set(XG, 400, zc); rods.push(rod);
    // bloco de válvulas servo (AGC) montado no topo da caixa, ligado ao cilindro por tubos flexíveis
    box(110, 100, 120, mat.alu, XG + 165, 636, zc);
    box(60, 46, 64, mat.black, XG + 165, 709, zc);
    for (const [y0, y1] of [[612, 640], [660, 748]]) {
      const pts = [V(XG + 110, y0, zc + 30), V(XG + 98, (y0 + y1) / 2, zc + 46), V(XG + 84, y1, zc + 30)];
      scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 8, 8), mHose)));
    }
  }
  // linhas de pressão / retorno do AGC: de uma caixa à outra por cima e descida pelo lado do accionamento
  for (const dz of [-24, 24]) {
    const pts = [V(XG + 235, 640, ZOS + 40 + dz), V(XG + 235, 650, (ZOS + ZDS) / 2 + dz), V(XG + 235, 650, ZDS + dz), V(XG + 240, 640, -830 + dz), V(XG + 330, 560, -840 + dz), V(XG + 330, 300, -842 + dz), V(XG + 330, -540, -842 + dz)];
    scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 9, 8), mat.steel)));
  }

  // ---------- guia de entrada (calha que centra a barra na mordedura)
  {
    const xg = XG - 215;
    box(50, 30, (ZOS - ZDS) - HT - 10, mCastDark, xg, 250, (ZOS + ZDS) / 2);       // travessa entre as caixas (acima do túnel)
    for (const s of [-1, 1]) {
      box(12, 205, 12, mat.dark, xg, 132, Z0 + s * (BB / 2 + 17));                 // tirantes
      box(210, 26, 8, mat.steel, xg - 10, 17, Z0 + s * (BB / 2 + 7));              // réguas de guia
      box(30, 26, 18, mat.steel, xg - 125, 17, Z0 + s * (BB / 2 + 18));           // boca alargada
    }
  }

  // ---------- veios cardã e redutor + caixa de pinhões (lado −z)
  const GZ = -1060, J1Z = -880, J2Z = -1010, GY_U = (OPEN + 8) / 2 + R;          // saída superior a meio do curso
  const outU = new THREE.Group(), outL = new THREE.Group();
  for (const [o, y] of [[outU, GY_U], [outL, YL]]) {
    o.position.set(XG, y, 0); scene.add(o);
    const fl = sh(zcyl(95, 16, mat.steel, o, 28)); fl.position.z = -1037;
    for (const sx of [-1, 1]) { const e = sh(new THREE.Mesh(new THREE.BoxGeometry(18, 64, 34), mat.steel)); e.position.set(sx * 40, 0, -1012 + 1); o.add(e); }
    const boss = zcyl(112, 16, mGear, scene, 32); boss.position.set(XG, y, GZ + 8);
  }
  function makeShaft() {
    const g = new THREE.Group(); scene.add(g);
    const tube = sh(new THREE.Mesh(new THREE.CylinderGeometry(44, 44, 1, 24), mShaft)); tube.rotation.x = Math.PI / 2; g.add(tube);
    const ends = [];
    for (const k of [0, 1]) {
      const e = new THREE.Group(); g.add(e); ends.push(e);
      e.add(sh(new THREE.Mesh(new THREE.BoxGeometry(110, 20, 20), mat.chrome)));
      e.add(sh(new THREE.Mesh(new THREE.BoxGeometry(20, 110, 20), mat.chrome)));
      for (const sy of [-1, 1]) { const ear = sh(new THREE.Mesh(new THREE.BoxGeometry(64, 18, 34), mat.steel)); ear.position.set(0, sy * 40, k ? -14 : 14); e.add(ear); }
      const hub = sh(new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 26, 24), mat.steel)); hub.rotation.x = Math.PI / 2; hub.position.z = k ? -40 : 40; e.add(hub);
    }
    return { g, tube, ends };
  }
  const shaftU = makeShaft(), shaftL = makeShaft();
  // redutor + caixa de pinhões
  {
    const x0 = XG, w = 470;
    put(rbox(w, 960, 190, 14, mGear), x0, -80, -1155);
    for (const y of [GY_U, YL]) box(w + 14, 16, 194, mGear, x0, y, -1155);         // juntas de flange (caixa partida pelos eixos)
    put(rbox(400, 30, 160, 8, mGear), x0, 415, -1155);                            // tampa de inspecção
    box(160, 18, 120, mat.dark, x0 - 90, 446, -1155);
    { const br = cyl(12, 50, mat.brass, scene, 10); br.position.set(x0 - 160, 455, -1205); }   // respiro
    for (const sx of [-1, 1]) for (const y of [-470, 40, 300]) box(14, 70, 150, mGear, x0 + sx * (w / 2 + 7), y, -1155);   // nervuras
    const sight = zcyl(18, 6, M(0x7a5a10, 0.3, 0.2, { emissive: 0x3a2a05, emissiveIntensity: 0.4 }), scene, 16); sight.position.set(x0 + 170, -330, GZ + 3);
    box(600, 60, 240, mBase, x0 + 10, FLOOR + 30, -1130);                           // base
    const t = canvasTex(400, 160, (g, W, Hh) => {
      g.fillStyle = "#e7ebef"; g.fillRect(0, 0, W, Hh); g.strokeStyle = "#2b3644"; g.lineWidth = 5; g.strokeRect(4, 4, W - 8, Hh - 8);
      g.fillStyle = "#16202c"; g.font = "700 28px Arial, sans-serif"; g.fillText(tr("REDUTOR + CAIXA DE PINHÕES"), 16, 44);
      g.font = "24px Arial, sans-serif"; g.fillText(tr("i = 40 · 2 saídas Ø150"), 16, 88); g.fillStyle = "#4a5868"; g.fillText(tr("Óleo ISO VG 320 · 38 L"), 16, 128);
    });
    plate(t, 200, 80, x0 - 120, 330, GZ + 0.8);
  }
  // motor eléctrico (eixo em x) + acoplamento com protecção
  {
    const zc = -1120, yc = -330;
    const ib = xcyl(62, 24, mGear, scene, 24); ib.position.set(XG + 247, yc, zc);   // mancal de entrada
    put(rbox(90, 200, 190, 30, mat.yellow), XG + 300, yc, zc);                     // protecção do acoplamento
    { const f = xcyl(126, 22, mMotor, scene, 32); f.position.set(XG + 357, yc, zc); }
    { const b = xcyl(116, 230, mMotor, scene, 32); b.position.set(XG + 483, yc, zc); }
    const fins = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(220, 20, 7), mMotor, 18));
    const d = new THREE.Object3D();
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; d.position.set(XG + 483, yc + 124 * Math.cos(a), zc + 124 * Math.sin(a)); d.rotation.set(a, 0, 0); d.updateMatrix(); fins.setMatrixAt(i, d.matrix); }
    scene.add(fins);
    { const c = xcyl(124, 80, mMotor, scene, 32); c.position.set(XG + 640, yc, zc); }   // tampa do ventilador
    const grille = new THREE.Mesh(new THREE.CircleGeometry(112, 32), M(0xffffff, 0.3, 0.6, { map: canvasTex(128, 128, (g, W) => {
      g.fillStyle = "#1d3f5f"; g.fillRect(0, 0, W, W); g.strokeStyle = "#0b1622"; g.lineWidth = 5;
      for (let r = 12; r < 64; r += 10) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); }
    }) }));
    grille.rotation.y = Math.PI / 2; grille.position.set(XG + 681, yc, zc); scene.add(grille);
    box(120, 80, 110, mMotor, XG + 470, yc + 160, zc);                              // caixa de terminais
    box(40, 40, 40, mat.dark, XG + 470, yc + 160, zc - 70);
    for (const sx of [-1, 1]) box(60, 110, 250, mMotor, XG + 483 + sx * 80, yc - 160, zc);   // patas
    box(380, 70, 250, mBase, XG + 480, FLOOR + 35, zc);   // termina em x = -8715 (folga para a estação 2)
    box(130, 34, 3, mat.label, XG + 483, yc + 40, zc + 136);                        // chapa de características
    // conduta eléctrica do motor ao armário de comando
    // tubo de cabos (conduta rígida) da caixa de terminais ao armário do variador, por cima do redutor
    const pts = [V(XG + 470, -130, -1120), V(XG + 470, 380, -1120), V(XG + 466, 452, -1120), V(XG + 440, 470, -1120), V(XG + 300, 472, -1120), V(XG - 265, 472, -1120)];
    scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2), 48, 14, 8), mat.black)));
    for (const [x, y] of [[XG + 470, 120], [XG + 180, 472], [XG - 120, 472]]) box(34, 34, 34, mat.aluDark, x, y, -1120);   // braçadeiras
  }
  // armário do variador de velocidade (lado −x do redutor)
  {
    const x = XG - 335, z = -1140;
    put(rbox(140, 1300, 200, 8, mat.cabinet), x, FLOOR + 650 + 60, z);
    box(150, 60, 210, mat.dark, x, FLOOR + 30, z);
    box(4, 1180, 2, mat.dark, x, FLOOR + 710, z + 101);
    const t = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = "#f2c200"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.lineWidth = 8; g.strokeStyle = "#111";
      g.beginPath(); g.moveTo(64, 18); g.lineTo(112, 104); g.lineTo(16, 104); g.closePath(); g.stroke();
      g.font = "800 60px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 64, 72);
      g.font = "700 26px Arial"; g.textAlign = "left"; g.fillText("400 V", 132, 50); g.font = "20px Arial"; g.fillText(tr("Variador"), 132, 86);
    });
    plate(t, 110, 55, x, FLOOR + 1150, z + 100.6);
  }
  // protecção dos veios cardã: quadro amarelo com rede
  {
    const x0 = XG - 215, x1 = XG + 215, y0 = -330, y1 = 345, z0 = -1044, z1 = -862;
    for (const x of [x0, x1]) for (const z of [z0, z1]) box(30, y1 - FLOOR, 30, mat.yellow, x, (y1 + FLOOR) / 2, z);
    for (const x of [x0, x1]) { box(30, 30, z1 - z0, mat.yellow, x, y1, (z0 + z1) / 2); box(30, 30, z1 - z0, mat.yellow, x, y0, (z0 + z1) / 2); }
    for (const z of [z0, z1]) box(x1 - x0, 30, 30, mat.yellow, (x0 + x1) / 2, y1, z);
    for (const x of [x0, x1]) { const p = box(4, y1 - y0 - 30, z1 - z0 - 30, mGuardMesh, x, (y0 + y1) / 2, (z0 + z1) / 2, scene, false); p.renderOrder = 2; }
    const top = box(x1 - x0 - 30, 4, z1 - z0 - 30, mGuardMesh, (x0 + x1) / 2, y1, (z0 + z1) / 2, scene, false); top.renderOrder = 2;
  }

  // ---------- água de arrefecimento: colectores com bicos sobre o cilindro superior
  const NOZ = [];
  {
    const yH = 365;
    const noz = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(8, 11, 34, 10), mat.brass, 10));
    const d = new THREE.Object3D(); let i = 0;
    for (const sx of [-1, 1]) {
      const x = XG + sx * 245;
      const p = zcyl(16, 450, mWater, scene, 16); p.position.set(x, yH, Z0);
      for (const z of [-200, -640]) { const c = zcyl(22, 14, mWater, scene, 16); c.position.set(x, yH, z + (z > -400 ? -7 : 7)); }
      box(26, 120, 30, mat.dark, x, yH + 60, -205);                              // suporte na caixa do operador
      // alimentação: atravessa a coluna da caixa do accionamento e desce até ao colector no chão
      const pts = [V(x, yH, -640), V(x, yH, -790), V(x, yH - 12, -822), V(x, yH - 70, -830), V(x, -500, -830)];
      scene.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 15, 10), mWater)));
      for (const z of [-646, -784]) { const f = zcyl(25, 8, mWater, scene, 16); f.position.set(x, yH, z); }
      for (const z of [-590, -505, -420, -335, -250]) {
        const dir = V(XG - x, (OPEN + 8) / 2 + R - yH, 0).normalize();
        const tip = V(x, yH, z).addScaledVector(dir, 34);
        d.position.set(x, yH, z).addScaledVector(dir, 17); d.quaternion.setFromUnitVectors(V(0, 1, 0), dir); d.updateMatrix(); noz.setMatrixAt(i++, d.matrix);
        NOZ.push({ tip, dir });
      }
    }
    scene.add(noz);
    xcyl(20, 560, mWater, scene, 12).position.set(XG, -500, -825);                // colector de alimentação junto ao chão
    box(60, 80, 60, mat.blue, XG + 140, -500, -825);   // válvula
  }

  // ---------- consola do operador (virada para +z)
  const HW = 640, HHt = 400;
  const hmiTex = canvasTex(HW, HHt, () => {});
  hmiTex.wrapS = hmiTex.wrapT = THREE.ClampToEdgeWrapping;
  const hg = hmiTex.image.getContext("2d");
  const lampG = M(0x22ff88, 0, 0.5, { emissive: 0x22ff88, emissiveIntensity: 0 }), lampO = M(0xffa040, 0, 0.5, { emissive: 0xffa040, emissiveIntensity: 0 });
  {
    const c = new THREE.Group(); c.position.set(-9600, FLOOR, 180); c.rotation.y = 0.3; scene.add(c);
    box(320, 30, 260, mat.dark, 0, 15, 0, c);
    put(rbox(240, 820, 200, 10, mat.cabinet), 0, 440, -20, c);
    const desk = new THREE.Group(); desk.position.set(0, 900, 20); desk.rotation.x = 0.55; c.add(desk);
    put(rbox(420, 60, 300, 12, mat.cabinet), 0, 0, 0, desk);
    box(330, 4, 210, mat.black, 0, 31, -20, desk);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(316, 198), new THREE.MeshBasicMaterial({ map: hmiTex, toneMapped: false }));
    scr.rotation.x = -Math.PI / 2; scr.position.set(0, 33.5, -20); desk.add(scr);
    const btn = (r, h, m, x, z) => { const o = cyl(r, h, m, desk, 20); o.position.set(x, 30 + h / 2, z); return o; };
    btn(22, 5, mat.yellow, -160, 118); btn(15, 20, M(0xc4161c, 0.1, 0.4), -160, 118);            // paragem de emergência
    btn(11, 8, lampG, -100, 118); btn(11, 8, lampO, -66, 118); btn(11, 8, mat.black, -32, 118);
    const knob = cyl(16, 22, mat.dark, desk, 16); knob.position.set(40, 41, 118);
    box(120, 2, 30, mat.label, 130, 31, 118, desk);
    // coluna luminosa
    const p = cyl(10, 300, mat.alu, c, 12); p.position.set(150, 1080, -60);
    [[lampG, 1250], [lampO, 1298]].forEach(([m, y]) => { const l = cyl(28, 44, m, c, 20); l.position.set(150, y, -60); });
    const cap = cyl(28, 14, mat.dark, c, 20); cap.position.set(150, 1328, -60);
  }

  // ---------- lima em laminagem: malha deformável (barra chata → esboço afunilado com espigão)
  const rings = [];
  // secção depois dos cilindros: tira chata DIREITA e calibrada (rectângulo constante em todo o comprimento, incluindo a zona
  // do futuro espigão) — a silhueta afunilada com espigão é cortada a seguir, no molde
  const section = (xf, o) => { o.bot = 2; o.top = 2 + H; o.hw = B / 2; return o; };
  for (let i = 0; i <= 30; i++) rings.push(section(-L / 2 + (i * L) / 30, { xf: -L / 2 + (i * L) / 30 }));
  for (let i = 0; i <= 6; i++) { const r = section(L / 2 + 1 + (i * LT) / 6, {}); r.xf = L / 2 + (i * LT) / 6; rings.push(r); }
  for (const r of rings) r.xi = (r.xf + L / 2) / LF;
  const NR = rings.length;
  const rx = new Float32Array(NR), rb = new Float32Array(NR), rt = new Float32Array(NR), rw = new Float32Array(NR);
  const morphGeo = new THREE.BufferGeometry();
  const mPos = new Float32Array((NR * 8 + 8) * 3);
  morphGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
  morphGeo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(mPos.length), 3));
  {
    const idx = [];
    // tiras: (P, Q) por anel, (Q − P) × x̂ = normal exterior → triângulos (Pi, Qi, Qi+1), (Pi, Qi+1, Pi+1)
    for (let s = 0; s < 4; s++) for (let i = 0; i < NR - 1; i++) {
      const p0 = i * 8 + s * 2, q0 = p0 + 1, p1 = p0 + 8, q1 = p1 + 1;
      idx.push(p0, q0, q1, p0, q1, p1);
    }
    const c0 = NR * 8, c1 = c0 + 4;                                              // tampas: A, Bc, C, D
    idx.push(c0, c0 + 2, c0 + 3, c0, c0 + 1, c0 + 2);
    idx.push(c1, c1 + 3, c1 + 2, c1, c1 + 2, c1 + 1);
    morphGeo.setIndex(idx);
  }
  const morphMat = new THREE.MeshStandardMaterial({ color: 0xb3bac2, metalness: 0.85, roughness: 0.32, flatShading: true });
  const morph = sh(new THREE.Mesh(morphGeo, morphMat)); morph.visible = false; morph.frustumCulled = false; scene.add(morph);
  function writeMorph() {
    const P3 = mPos;
    const set = (k, x, y, z) => { P3[k * 3] = x; P3[k * 3 + 1] = y; P3[k * 3 + 2] = z; };
    for (let i = 0; i < NR; i++) {
      const x = rx[i], b = rb[i], t = rt[i], w = rw[i], k = i * 8;
      // topo (D, C), base (Bc, A), +z (C, Bc), −z (A, D)
      set(k, x, t, Z0 - w); set(k + 1, x, t, Z0 + w);
      set(k + 2, x, b, Z0 + w); set(k + 3, x, b, Z0 - w);
      set(k + 4, x, t, Z0 + w); set(k + 5, x, b, Z0 + w);
      set(k + 6, x, b, Z0 - w); set(k + 7, x, t, Z0 - w);
    }
    for (const [c, i] of [[NR * 8, 0], [NR * 8 + 4, NR - 1]]) {
      set(c, rx[i], rb[i], Z0 - rw[i]); set(c + 1, rx[i], rb[i], Z0 + rw[i]); set(c + 2, rx[i], rt[i], Z0 + rw[i]); set(c + 3, rx[i], rt[i], Z0 - rw[i]);
    }
    morphGeo.attributes.position.needsUpdate = true;
  }

  // ---------- estado do ciclo
  const st = { lima: null, s: -1, from: SX, staged: null, done: false, n: 0, yr: OPEN, xig: 1, force: 0, rolling: false };
  const gapSec = {};
  const xiAt = (s) => 1 - clamp01((s - S_A) / (sB() - S_A));
  const tangTop = 2 + 0.6 * H, tipTop = section(-L / 2, {}).top;
  function rollBottom(s, xig) {
    if (s < 0) return OPEN;
    if (s < S_A) return OPEN + (tangTop - OPEN) * ease(clamp01((s - S_DOWN) / (S_A - S_DOWN)));
    if (s <= sB()) return section(-L / 2 + xig * LF, gapSec).top;
    return tipTop + (OPEN - tipTop) * ease(clamp01((s - sB() - 0.03) / 0.12));
  }
  // posição/secção de cada anel da lima (cinemática de laminagem: entrada à velocidade da barra, saída à do cilindro)
  function solveLima(s, from) {
    const xig = xiAt(s), xfg = -L / 2 + xig * LF, yr = rollBottom(s, xig), barTop = 2 + HB;
    section(xfg, gapSec);
    const slide = (from - PRE) * (1 - ease(clamp01(s / S_DOWN)));
    for (let i = 0; i < NR; i++) {
      const r = rings[i];
      if (r.xi > xig || xig <= 0) { rx[i] = XG + (r.xf - xfg); rb[i] = r.bot; rt[i] = r.top; rw[i] = r.hw; continue; }
      const x = XG - LB * (xig - r.xi) + slide, d = XG - x;
      let top = barTop, k = 0;
      if (d >= 0 && d < R) {
        const ys = yr + R - Math.sqrt(R * R - d * d);
        if (ys < barTop) { top = ys; k = clamp01((barTop - ys) / Math.max(0.5, barTop - gapSec.top)); }
      }
      rx[i] = x; rt[i] = top; rb[i] = 2 + (gapSec.bot - 2) * k; rw[i] = BB / 2 + (gapSec.hw - BB / 2) * k;
    }
    st.xig = xig; st.yr = yr;
    // força de laminagem estimada: kf · b · √(R·Δh) · 1,1 (kf ≈ 420 MPa)
    const dh = barTop - gapSec.top + (gapSec.bot - 2);
    st.rolling = s >= S_A && s <= sB();
    st.force = st.rolling ? 420 * 2 * gapSec.hw * Math.sqrt(R * Math.max(0.1, dh)) * 1.1 / 1000 : 0;
  }

  UP.addStation({
    slot: SLOT, name: "Laminagem",
    onDwell(l, s) {
      if (st.lima !== l) { st.lima = l; st.from = st.staged === l ? PRE : SX; st.done = false; }
      st.s = s;
      const xig = xiAt(s);
      l.form = s < S_A ? 0 : Math.min(1, 1 - xig);
      if (s >= sB() && !st.done) { st.done = true; st.n++; l.form = 1; }
    },
  });

  // ---------- partículas: água dos bicos, salpicos à saída e carepa (calamina) à entrada (≤ 300 pontos)
  const NW = 170, NSPL = 80, NF = 50, NP = NW + NSPL + NF;
  const pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pVel = new Float32Array(NP * 3), pAge = new Float32Array(NP), pLife = new Float32Array(NP), pFan = new Float32Array(NP);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const dotTex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  dotTex.wrapS = dotTex.wrapT = THREE.ClampToEdgeWrapping;
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 7, map: dotTex, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
  pts.frustumCulled = false; scene.add(pts);
  const park = (i) => { pPos[i * 3] = XG; pPos[i * 3 + 1] = -5000; pPos[i * 3 + 2] = Z0; pAge[i] = -1; };
  for (let i = 0; i < NP; i++) {
    const water = i < NW + NSPL;
    pCol[i * 3] = water ? 0.86 : 0.16; pCol[i * 3 + 1] = water ? 0.93 : 0.14; pCol[i * 3 + 2] = water ? 1 : 0.13;
    if (i < NW) { pAge[i] = Math.random() * 0.12; pFan[i] = Math.random() * 2 - 1; } else park(i);
  }
  const _v = new THREE.Vector3();
  function stepParticles(dt) {
    const yU = st.yrNow + R;
    for (let i = 0; i < NW; i++) {
      const n = NOZ[i % NOZ.length];
      pAge[i] += dt;
      _v.copy(n.tip).addScaledVector(n.dir, 900 * pAge[i]);
      _v.z += pFan[i] * 420 * pAge[i];
      const dx = _v.x - XG, dy = _v.y - yU;
      if (dx * dx + dy * dy < (R + 3) * (R + 3) || pAge[i] > 0.2) { pAge[i] = 0; pFan[i] = Math.random() * 2 - 1; _v.copy(n.tip); }
      pPos[i * 3] = _v.x; pPos[i * 3 + 1] = _v.y; pPos[i * 3 + 2] = _v.z;
    }
    const g = 9810;
    for (let i = NW; i < NP; i++) {
      const flake = i >= NW + NSPL;
      if (pAge[i] < 0) {
        if (!st.rollingNow || Math.random() > (flake ? 0.06 : 0.05)) continue;
        pAge[i] = 0; pLife[i] = flake ? 1.2 + Math.random() : 0.5;
        if (flake) {
          pPos[i * 3] = XG - 20 - Math.random() * 45; pPos[i * 3 + 1] = 2 + HB + Math.random() * 2; pPos[i * 3 + 2] = Z0 + (Math.random() - 0.5) * BB;
          pVel[i * 3] = -60 - Math.random() * 220; pVel[i * 3 + 1] = 120 + Math.random() * 320; pVel[i * 3 + 2] = (Math.random() - 0.5) * 260;
        } else {
          pPos[i * 3] = XG + 10 + Math.random() * 50; pPos[i * 3 + 1] = 10 + Math.random() * 18; pPos[i * 3 + 2] = Z0 + (Math.random() - 0.5) * 70;
          pVel[i * 3] = 250 + Math.random() * 500; pVel[i * 3 + 1] = 150 + Math.random() * 450; pVel[i * 3 + 2] = (Math.random() - 0.5) * 600;
        }
      }
      pAge[i] += dt;
      if (pAge[i] > pLife[i]) { park(i); continue; }
      if (pPos[i * 3 + 1] > 0.8 || pVel[i * 3 + 1] > 0) {
        pVel[i * 3 + 1] -= g * dt;
        pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
        if (pPos[i * 3 + 1] < 0.8) {
          if (Math.abs(pPos[i * 3 + 2] - Z0) < 120) { pPos[i * 3 + 1] = 0.8; pVel[i * 3] = pVel[i * 3 + 1] = pVel[i * 3 + 2] = 0; if (!flake) pLife[i] = Math.min(pLife[i], pAge[i] + 0.15); }
          else if (pPos[i * 3 + 1] < -600) park(i);
        }
      }
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  // ---------- HMI
  function drawHMI() {
    const g = hg, W = HW, Hh = HHt;
    g.fillStyle = "#0a111d"; g.fillRect(0, 0, W, Hh);
    g.fillStyle = "#15294b"; g.fillRect(0, 0, W, 46);
    g.textBaseline = "middle"; g.textAlign = "left"; g.fillStyle = "#eaf1fd"; g.font = "700 22px Arial, sans-serif"; g.fillText(tr("LAMINADOR DUO L1 · LAMINAGEM"), 16, 24);
    g.textAlign = "right"; g.fillStyle = "#9fb3d1"; g.font = "18px Arial, sans-serif"; g.fillText(tr("Esboços: ") + st.n, W - 16, 24);
    const gap = st.yrNow - 2, rpm = OMEGA * 60 / (2 * Math.PI);
    const cells = [[tr("VELOCIDADE"), rpm.toFixed(1), "rpm"], [tr("FOLGA"), gap.toFixed(1), "mm"], [tr("FORÇA"), st.forceNow.toFixed(0), "kN"]];
    cells.forEach(([k, v, u], i) => {
      const x = 16 + i * 205;
      g.fillStyle = "#101c31"; g.fillRect(x, 58, 192, 92);
      g.textAlign = "left"; g.fillStyle = "#7f93b3"; g.font = "600 15px Arial, sans-serif"; g.fillText(k, x + 10, 76);
      g.fillStyle = i === 2 && st.forceNow < 1 ? "#5d6f8c" : "#ffffff"; g.font = "700 44px Menlo, Consolas, monospace"; g.fillText(v, x + 10, 118);
      const vw = g.measureText(v).width; g.font = "700 20px Arial, sans-serif"; g.fillText(u, x + 18 + vw, 124);
    });
    // fase
    const s = st.sNow;
    const phase = s < 0 ? (UP.phase === "move" ? tr("Barra a entrar no batente") : tr("Em espera")) : s < S_DOWN ? tr("Barra na mordedura") : s < S_A ? tr("Aperto hidráulico (AGC)") : s <= sB() ? tr("A laminar · barra apertada até à tira direita") : tr("Tira direita pronta · folga a abrir");
    g.textAlign = "left"; g.fillStyle = st.rollingNow ? "#fbbf24" : "#8fa3c0"; g.font = "600 18px Arial, sans-serif"; g.fillText(phase, 16, 172);
    const pr = s < S_A ? 0 : clamp01(1 - st.xig);
    g.fillStyle = "#1a2740"; g.fillRect(16, 188, W - 32, 12); g.fillStyle = "#38bdf8"; g.fillRect(16, 188, (W - 32) * pr, 12);
    // perfil da lima (vista lateral, espessura × 6)
    const px = 16, py = 214, pw = W - 32, ph = 170;
    g.fillStyle = "#0e1a2d"; g.fillRect(px, py, pw, ph); g.strokeStyle = "#3a4d6e"; g.lineWidth = 1.5; g.strokeRect(px, py, pw, ph);
    g.fillStyle = "#7f93b3"; g.font = "13px Arial, sans-serif"; g.fillText(tr("Perfil da peça (espessura ×6) · alvo a tracejado"), px + 8, py + 14);
    const x0w = XG - 260, sc = pw / 620, X = (x) => px + (x - x0w) * sc, Y = (y) => py + ph - 30 - (y - 2) * 6;
    g.strokeStyle = "#22324d"; g.beginPath(); g.moveTo(X(XG), py + 22); g.lineTo(X(XG), py + ph - 6); g.stroke();
    g.fillStyle = "#5d6f8c"; g.fillText(tr("eixo dos cilindros"), X(XG) + 6, py + ph - 12);
    // alvo
    g.setLineDash([5, 4]); g.strokeStyle = "#4ade80"; g.beginPath();
    for (let i = 0; i < NR; i++) { const x = X(SX + rings[i].xf), y = Y(rings[i].top); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.setLineDash([]);
    if (st.drawn) {
      g.beginPath();
      for (let i = 0; i < NR; i++) { const x = X(rx[i]), y = Y(rt[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      for (let i = NR - 1; i >= 0; i--) g.lineTo(X(rx[i]), Y(rb[i]));
      g.closePath(); g.fillStyle = "rgba(180,190,202,0.85)"; g.fill();
    }
    // cilindros (posição do fundo do superior e do topo do inferior)
    g.fillStyle = "rgba(159,179,209,0.35)"; g.fillRect(X(XG) - 30, Y(st.yrNow) - 26, 60, 26);
    g.fillRect(X(XG) - 30, Y(2), 60, 22);
    hmiTex.needsUpdate = true;
  }

  // ---------- etiquetas e vista
  addTag({ text: "1 · Laminagem — rolo de aço giratório", at: () => V(SX, 1350, -420), min: 2500, big: true });
  addTag({ text: "Cilindros de trabalho Ø330 × 420 mm · 18 rpm", at: () => V(XG - 150, 560 + 60, ZOS + 80), max: 3000 });
  addTag({ text: () => `Aperto hidráulico (AGC) · folga ${(st.yrNow - 2).toFixed(1)} mm`, at: () => V(XG, 900, ZDS), max: 3000 });
  addTag({ text: "Motor 22 kW + redutor / caixa de pinhões", at: () => V(XG + 480, -120, -1120), max: 3000 });
  addTag({ text: "Veios cardã", at: () => V(XG, 400, -930), max: 3000 });
  addTag({ text: () => (st.rollingNow ? `A laminar · ${(16).toFixed(0)} → ${(st.yrNow - 2).toFixed(1)} mm` : "Barra chata → tira direita e calibrada (o molde corta a forma)"), at: () => V(SX + 330, 40, Z0 + 140), max: 3000 });
  addView("lam", "Laminagem", [-8350, 1650, 350], [-9350, 60, -430]);

  // ---------- animação
  let ang = 0, hmiT = 0, hmiKey = "";
  const qA = new THREE.Quaternion(), qS = new THREE.Quaternion(), ZA = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3(), j1 = new THREE.Vector3(), j2 = new THREE.Vector3();
  st.yrNow = OPEN; st.sNow = -1; st.forceNow = 0; st.rollingNow = false; st.drawn = false;
  function placeShaft(sf, yRoll, yOut, a) {
    j1.set(XG, yRoll, J1Z); j2.set(XG, yOut, J2Z);
    dir.subVectors(j2, j1); const len = dir.length(); dir.normalize();
    qA.setFromUnitVectors(ZA, dir); qS.setFromAxisAngle(ZA, a);
    sf.g.position.copy(j1); sf.g.quaternion.multiplyQuaternions(qA, qS);
    sf.tube.scale.y = len - 80; sf.tube.position.z = len / 2;
    sf.ends[0].position.z = 0; sf.ends[1].position.z = len;
  }
  addSystem({
    update(dt) {
      ang += OMEGA * dt;
      stepParticles(dt);
    },
    draw() {
      // barra que entra durante o avanço: fica no batente com a frente na mordedura
      if (UP.phase === "move") {
        const l = UP.limaAt(SLOT - 1);
        if (l) { l.g.position.x = UP.xOf(SLOT - 1) + (PRE - UP.xOf(SLOT - 1)) * UP.shift; st.staged = l; }
      }
      const here = UP.limaAt(SLOT);
      // primeiro frame da paragem (antes de onDwell): a barra continua no batente, sem saltar para o slot
      if (UP.phase === "dwell" && here && st.lima !== here && st.staged === here) { st.lima = here; st.from = PRE; st.s = 0; st.done = false; }
      const active = UP.phase === "dwell" && here && st.lima === here;
      const s = active ? st.s : -1;
      st.sNow = s;
      if (active) {
        solveLima(s, st.from); writeMorph();
        here.bar.visible = here.blank.visible = here.tang.visible = false;
        morph.visible = true; st.drawn = true;
        morphMat.color.copy(here.m.color); morphMat.metalness = here.m.metalness; morphMat.roughness = here.m.roughness;
        morphMat.emissive.copy(here.m.emissive); morphMat.emissiveIntensity = here.m.emissiveIntensity;
        st.yrNow = st.yr; st.forceNow = st.force; st.rollingNow = st.rolling;
      } else {
        morph.visible = false; st.drawn = false;
        st.yrNow = OPEN; st.forceNow = 0; st.rollingNow = false;
      }
      // cilindros, mancais, hastes do AGC
      const yU = st.yrNow + R;
      rollU.g.position.y = yU;
      rollU.spin.rotation.z = ang; rollL.spin.rotation.z = -ang;
      for (const c of chockU) c.position.y = yU;
      for (const r of rods) { const y0 = yU + 145, y1 = 470; r.scale.y = y1 - y0; r.position.y = (y0 + y1) / 2; }
      outU.rotation.z = ang; outL.rotation.z = -ang;
      outU.position.y = GY_U; outL.position.y = YL;
      placeShaft(shaftU, yU, GY_U, ang); placeShaft(shaftL, YL, YL, -ang);
      // lâmpadas: verde = em marcha, laranja = a laminar
      lampG.emissiveIntensity = 1.6; lampO.emissiveIntensity = st.rollingNow ? 2.2 : 0;
      // HMI (≈ 10×/s)
      const now = performance.now();
      const key = `${st.n}|${st.yrNow.toFixed(1)}|${Math.round(st.forceNow)}|${s.toFixed(2)}|${UP.phase}|${LANG.rev}`;
      if (key !== hmiKey && now - hmiT > 90) { hmiKey = key; hmiT = now; drawHMI(); }
    },
  });
  st.meshes = countMeshes() - MESH0;
  window.__lam = st;
}
