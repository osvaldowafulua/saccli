// =====================================================================
// Estação 2 · Picagem dos dentes — picadora automática de limas (cinzel)
// Corpo em C de ferro fundido atrás da esteira. Na face do braço superior corre um carro (eixo X: guias lineares,
// fuso de esferas e servomotor) com o martelo: uma árvore de cames de 6 ressaltos levanta a haste do cinzel contra
// a mola e deixa-a cair — cada queda é um golpe do cinzel na lima. A árvore é accionada por volante + correias em V
// a partir do motor de 7,5 kW, através de uma embraiagem-travão pneumática (o volante roda sempre; a came só roda
// quando há lima a picar). Na paragem (slot 4): bigorna sobe e apoia a esteira por baixo → cilindro de aproximação
// solta o cinzel sobre a lima → o carro avança da ponta para o espigão a bater ~12 golpes/s, com névoa de óleo de
// corte → o cinzel recua e o carro regressa durante o avanço da linha.
// =====================================================================
{
  const SLOT = 4, X0 = UP.xOf(SLOT), Z0 = UP.Z;           // x = -8200, z = -420
  const TAU = Math.PI * 2;
  const XL = -8480, XR = -7940, ZF = -600;                 // corpo fundido (x) e face frontal do braço superior
  const YC = 440, ZC = -495;                               // eixo da árvore de cames
  const NLOB = 6, REV = 2, R0 = 30, HC = 8;                // came: ressaltos, rot/s, raio mínimo, curso do golpe
  const RR = 15, LT = 473, LIFT = 50;                      // rolete seguidor, ponta do cinzel → centro do rolete, recuo
  const XFW = -7840, MY = 1120, MZ = -860;                 // plano do volante/correias; eixo do motor principal
  const GX0 = -8500, GX1 = -7920, GZ = -240, GZB = -660, GT = 880;   // protecção (pórtico de perfis + policarbonato)
  const XCH = -8250, CHR = 40, CHY = 748, CHZ = -572, NLK = 24, LPK = 20;   // porta-cabos do carro

  // ---------- materiais
  const mCast = M(0x4a6458, 0.35, 0.5);                    // ferro fundido pintado, verde-máquina
  const mCast2 = M(0x3f584c, 0.4, 0.55);
  const mBase = M(0x4e555d, 0.45, 0.55);
  const mCover = M(0xd9dde1, 0.2, 0.42);
  const mPoly = M(0xbcd7ef, 0.1, 0.05, { transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide });
  const mGround = M(0xbcc3cb, 0.92, 0.22);                 // aço temperado e rectificado (came, bigorna)
  const mTool = M(0xe6ebf0, 0.95, 0.14);                   // cinzel
  const mBlued = M(0x29313c, 0.75, 0.38);                  // aço oxidado (porta-cinzel, mola)
  const mRubber = M(0x111214, 0, 0.9);
  const mVBelt = M(0x1c1d20, 0.05, 0.85);
  const mChain = M(0x1e2024, 0.2, 0.72);
  const mRail = M(0xb7bec6, 0.95, 0.22);
  const mAir = M(0x2563eb, 0.05, 0.45);
  const mHoseOil = M(0x15171a, 0.1, 0.6);
  const mOil = M(0xc89b3c, 0.2, 0.25, { emissive: 0x3a2a08, emissiveIntensity: 0.5 });
  const mClutch = M(0xd2541c, 0.3, 0.45);
  const finTex = canvasTex(64, 8, (g, w, h) => { for (let x = 0; x < w; x += 8) { g.fillStyle = (x / 8) % 2 ? "#5c84a6" : "#2a4a66"; g.fillRect(x, 0, 8, h); } }, [12, 1]);
  const mMotor = M(0xffffff, 0.45, 0.45, { map: finTex });
  const mMotorPaint = M(0x2f5574, 0.45, 0.45);
  const locTex = canvasTex(32, 8, (g, w, h) => { g.fillStyle = "#f08a2c"; g.fillRect(0, 0, w, h); g.fillStyle = "#a64d0e"; g.fillRect(25, 0, 7, h); }, [22, 1]);
  const mLoc = M(0xffffff, 0.15, 0.45, { map: locTex });
  // rede de metal distendido amarela (protecção do volante e das correias)
  const meshY = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = "#f2c200"; g.lineWidth = 9; g.lineJoin = "round";
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w / 2, 0); g.lineTo(w, h / 2); g.lineTo(w / 2, h); g.closePath(); g.stroke();
  });
  meshY.repeat.set(1 / 34, 1 / 34);
  const mMeshY = M(0xffffff, 0.3, 0.55, { map: meshY, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide });
  const mCurtainLed = M(0x3a0808, 0.3, 0.25, { emissive: 0xff2020, emissiveIntensity: 0.18 });
  const lamp = (c) => { const m = M(c, 0, 0.35, { emissive: c, emissiveIntensity: 0 }); m.userData.on = new THREE.Color(c); m.userData.off = new THREE.Color(c).multiplyScalar(0.22); return m; };
  const setLamp = (m, on) => { m.color.copy(on ? m.userData.on : m.userData.off); m.emissiveIntensity = on ? 2.2 : 0; };
  const mLampR = lamp(0xff2b2b), mLampA = lamp(0xffa21a), mLampG = lamp(0x26e07a), mHit = lamp(0xffb347);

  const sh = (o) => { o.castShadow = o.receiveShadow = true; return o; };
  const put = (o, x, y, z, parent = scene) => { o.position.set(x, y, z); parent.add(o); return o; };
  const cylX = (r, len, m, x, y, z, parent = scene, seg = 24) => { const o = cyl(r, len, m, parent, seg); o.rotation.z = Math.PI / 2; o.position.set(x, y, z); return o; };
  const cylZ = (r, len, m, x, y, z, parent = scene, seg = 24) => { const o = cyl(r, len, m, parent, seg); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); return o; };
  const seg = (s, a, b) => ease(Math.max(0, Math.min(1, (s - a) / (b - a))));
  // caixa com arestas arredondadas: rectângulo arredondado em x-z extrudido em y
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
  const tube = (pts, r, m, parent = scene, closed = false, seg = 64, rs = 8) =>
    parent.add(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, "centripetal"), seg, r, rs, closed), m))).children.at(-1);
  // correia aberta entre duas polias (plano z-y): arco grande + recta + arco pequeno + recta
  function beltPath(c1, r1, c2, r2, n1 = 56, n2 = 18, nl = 10) {
    const dz = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dz, dy), phi = Math.atan2(dy, dz), b = Math.acos((r1 - r2) / d);
    const P1 = (a) => [c1[0] + r1 * Math.cos(a), c1[1] + r1 * Math.sin(a)], P2 = (a) => [c2[0] + r2 * Math.cos(a), c2[1] + r2 * Math.sin(a)];
    const out = [], line = (p, q) => { for (let i = 1; i < nl; i++) out.push([p[0] + (q[0] - p[0]) * i / nl, p[1] + (q[1] - p[1]) * i / nl]); };
    for (let i = 0; i <= n1; i++) out.push(P1(phi + b + (TAU - 2 * b) * i / n1));
    line(P1(phi - b), P2(phi - b));
    for (let i = 0; i <= n2; i++) out.push(P2(phi - b + 2 * b * i / n2));
    line(P2(phi + b), P1(phi + b));
    return out;
  }
  const plate = (w, h, tex, x, y, z, ry = 0, parent = scene) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M(0xffffff, 0.1, 0.55, { map: tex }));
    p.position.set(x, y, z); p.rotation.y = ry; parent.add(p); return p;
  };

  // =================================================================
  // Corpo em C (perfil z-y extrudido ao longo de x)
  // =================================================================
  {
    const o = 8, s = new THREE.Shape();
    s.moveTo(-1080 + o, -560 + o);
    s.lineTo(-1080 + o, 940); s.quadraticCurveTo(-1080 + o, 1000 - o, -1020, 1000 - o);
    s.lineTo(-660, 1000 - o); s.quadraticCurveTo(ZF - o, 1000 - o, ZF - o, 940);
    s.lineTo(ZF - o, 290); s.lineTo(-640, 250 + o);
    s.lineTo(-700, 250 + o); s.quadraticCurveTo(-800 + o, 250 + o, -800 + o, 150);
    s.lineTo(-800 + o, -470); s.lineTo(-730 - o, -560 + o); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: XR - XL - 2 * o, bevelEnabled: true, bevelThickness: o, bevelSize: o, bevelSegments: 2, curveSegments: 12 });
    const frame = sh(new THREE.Mesh(g, mCast)); frame.rotation.y = -Math.PI / 2; frame.position.set(XR - o, 0, 0); scene.add(frame);
    // painéis de reforço fundidos nas faces laterais (aro em relevo)
    const t = new THREE.Shape();
    t.moveTo(-1035, -515); t.lineTo(-1035, 925); t.quadraticCurveTo(-1035, 955, -1005, 955);
    t.lineTo(-675, 955); t.quadraticCurveTo(-645, 955, -645, 925); t.lineTo(-645, 330); t.quadraticCurveTo(-645, 295, -680, 295);
    t.lineTo(-720, 295); t.quadraticCurveTo(-845, 295, -845, 170); t.lineTo(-845, -470); t.lineTo(-790, -515); t.closePath();
    const gi = new THREE.ExtrudeGeometry(t, { depth: 2, bevelEnabled: true, bevelThickness: 3, bevelSize: 3, bevelSegments: 1, curveSegments: 10 });
    for (const x of [XR + 3, XL - 1]) { const p = sh(new THREE.Mesh(gi, mCast2)); p.rotation.y = -Math.PI / 2; p.position.set(x, 0, 0); scene.add(p); }
  }
  // nervuras fundidas e tampa de inspecção na face traseira
  for (const x of [XL + 120, XR - 120]) box(46, 1380, 18, mCast, x, 230, -1089);
  box(220, 360, 6, mCast2, (XL + XR) / 2, 120, -1083);
  // soco de assentamento e chumbadouros
  box(XR - XL + 80, 60, 420, mBase, (XL + XR) / 2, FLOOR + 30, -890);
  {
    const nuts = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(14, 14, 12, 6), mat.chrome, 6));
    const d = new THREE.Object3D(); let i = 0;
    for (const x of [XL - 22, XR + 22]) for (const z of [-1060, -890, -720]) { d.position.set(x, FLOOR + 66, z); d.updateMatrix(); nuts.setMatrixAt(i++, d.matrix); }
    scene.add(nuts);
  }
  // placa de características (face frontal do braço, acima da protecção)
  plate(290, 63, canvasTex(512, 112, (g, w, h) => {
    g.fillStyle = "#e9edf1"; g.fillRect(0, 0, w, h); g.strokeStyle = "#24302b"; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = "#2f5a45"; g.fillRect(4, 4, 104, h - 8);
    g.fillStyle = "#fff"; g.font = "800 42px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("PL", 56, h / 2);
    g.textAlign = "left"; g.fillStyle = "#16202c"; g.font = "700 27px Arial, sans-serif"; g.fillText(tr("PICADORA DE LIMAS"), 124, 32);
    g.font = "19px Arial, sans-serif"; g.fillText(tr("came de 6 ressaltos · 720 golpes/min"), 124, 63);
    g.fillStyle = "#4a5868"; g.font = "17px Arial, sans-serif"; g.fillText(tr("cinzel HSS · avanço por fuso de esferas"), 124, 90);
  }), -8090, 946, ZF + 1);

  // =================================================================
  // Bigorna (bloco fundido entre as pernas da esteira; o tampo temperado sobe e apoia a esteira por baixo da lima)
  // =================================================================
  box(300, 380, 150, mCast, X0, FLOOR + 190, Z0);
  box(340, 26, 150, mCast2, X0, -227, Z0);
  for (const sx of [-1, 1]) { const c = cyl(28, 64, mat.alu, scene, 20); c.position.set(X0 + sx * 95, -182, Z0); }
  const anvG = new THREE.Group(); anvG.position.set(X0, -40, Z0); scene.add(anvG);
  box(300, 40, 70, mGround, 0, -20, 0, anvG);
  box(300, 18, 110, mat.dark, 0, -49, 0, anvG);
  for (const sx of [-1, 1]) { const r = cyl(10, 100, mat.chrome, anvG, 12); r.position.set(sx * 95, -108, 0); }

  // =================================================================
  // Braço superior: guias lineares, mancais, árvore de cames, fuso de esferas e servomotor do avanço
  // =================================================================
  for (const y of [330, 620]) box(440, 20, 15, mRail, (XL + XR) / 2 + 30, y, ZF + 7.5);
  for (const x of [XL + 25, XR - 25]) {
    box(50, 130, 130, mCast, x, YC, -535);                            // consola do mancal
    cylX(44, 58, mat.dark, x, YC, ZC);                                 // caixa do rolamento
    const c = cyl(7, 16, mat.brass, scene, 12); c.position.set(x, YC + 73, -560);   // copo de lubrificação
  }
  // árvore de cames (roda só com a embraiagem engatada)
  const camG = new THREE.Group(); camG.position.set(0, YC, ZC); scene.add(camG);
  const camR = (psi) => {                                              // came em caracol: subida lenta, queda brusca
    const k = TAU / NLOB, u = (((psi % k) + k) % k) / k, p = 1 - u;
    return R0 + HC * (p < 0.8 ? Math.sin((p / 0.8) * Math.PI / 2) ** 2 : Math.cos(((p - 0.8) / 0.2) * Math.PI / 2) ** 2);
  };
  const camLift = (th) => camR(Math.PI / 2 - th) - R0;               // elevação do rolete (topo da came)
  {
    cylX(22, 790, mGround, -8095, 0, 0, camG);
    const s = new THREE.Shape(), N = NLOB * 40;
    for (let i = 0; i <= N; i++) { const a = (i / N) * TAU, r = camR(a); i ? s.lineTo(r * Math.cos(a), r * Math.sin(a)) : s.moveTo(r * Math.cos(a), r * Math.sin(a)); }
    const cm = sh(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 420, bevelEnabled: false, curveSegments: 1 }), mGround));
    cm.rotation.y = Math.PI / 2; cm.position.x = -8420; camG.add(cm);
  }
  // fuso de esferas + servomotor do avanço do carro (fora da protecção, lado −x)
  cylX(12, 650, mat.chrome, -8315, 475, -588, scene, 16);
  box(40, 96, 80, mat.aluDark, -8500, 475, -588);
  { const b = put(rbox(96, 120, 96, 14, mat.black), -8580, 475, -588); b.rotation.z = Math.PI / 2; }
  { const b = put(rbox(86, 30, 86, 12, mat.carbon), -8655, 475, -588); b.rotation.z = Math.PI / 2; }
  box(40, 30, 46, mat.dark, -8585, 538, -588);

  // =================================================================
  // Carro do martelo (move-se em x)
  // =================================================================
  const carG = new THREE.Group(); scene.add(carG);
  box(170, 580, 25, mBase, 0, 440, -557.5, carG);                      // placa do carro
  {
    const blocks = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(50, 34, 15), mat.dark, 4));
    const d = new THREE.Object3D(); let i = 0;
    for (const x of [-55, 55]) for (const y of [330, 620]) { d.position.set(x, y, -577.5); d.updateMatrix(); blocks.setMatrixAt(i++, d.matrix); }
    carG.add(blocks);
  }
  box(56, 44, 24, mat.dark, 0, 475, -582, carG);                        // porca de esferas
  put(rbox(110, 190, 165, 14, mCover), 0, 275, -462.5, carG);           // guia da haste
  put(rbox(113, 16, 168, 15, mCast), 0, 352, -462.5, carG);
  plate(84, 92, canvasTex(168, 184, (g, w, h) => {
    g.fillStyle = "#e3e7eb"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8d969f"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#2f5a45"; g.font = "800 30px Arial, sans-serif"; g.textAlign = "center"; g.fillText(tr("CINZEL"), w / 2, 50);
    g.fillStyle = "#3d4b5c"; g.font = "600 18px Arial, sans-serif"; g.fillText(tr("picado bastardo"), w / 2, 86); g.fillText(tr("10 dentes/cm"), w / 2, 112);
    g.fillText("65° · 12°", w / 2, 138);
  }), 0, 262, -379.5, 0, carG);
  const hitLed = box(26, 8, 3, mHit, 0, 330, -378.5, carG);
  { const w = cyl(26, 10, mRubber, carG, 20); w.position.set(0, 375, -420); }   // raspador
  box(70, 24, 150, mBase, 0, 718, -470, carG);                          // suporte superior
  { const c = cyl(24, 100, mat.alu, carG, 20); c.position.set(0, 655, -420); }   // cilindro de aproximação
  for (const y of [611, 699]) box(56, 12, 56, mat.dark, 0, y, -420, carG);
  { const f = cylX(5, 14, mat.brass, 33, 690, -420, carG, 10); f.rotation.z = Math.PI / 2; }
  // mola do martelo (entre a travessa da haste e o suporte superior)
  const SPH = 150;
  const spring = (() => {
    const pts = [], turns = 7, N = turns * 20;
    for (let i = 0; i <= N; i++) { const a = (i / N) * turns * TAU; pts.push(V(34 * Math.cos(a), (i / N) * SPH, 34 * Math.sin(a))); }
    const m = sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, 3.6, 6), mBlued));
    m.position.set(0, 530, -420); carG.add(m); return m;
  })();
  // óleo de corte: distribuidor + mangueira articulada (laranja) + bocal apontado à ponta do cinzel
  box(18, 20, 16, mat.brass, 48, 200, -372, carG);
  const NOZ = V(36, 40, -394);
  tube([V(48, 190, -372), V(50, 150, -362), V(49, 100, -368), V(44, 64, -382), NOZ], 5.5, mLoc, carG, false, 40, 8);
  {
    const d = V(0, 12, Z0).sub(NOZ).normalize();
    const n = sh(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 5.6, 16, 12), mat.brass));
    n.quaternion.setFromUnitVectors(V(0, 1, 0), d); n.position.copy(NOZ).addScaledVector(d, 7); carG.add(n);
    NOZ.addScaledVector(d, 15);                                         // saída do bocal
  }
  box(40, 14, 40, mat.dark, 60, 737, CHZ, carG);                        // ligação do porta-cabos

  // haste do martelo (move-se em y; origem = ponta do cinzel)
  const ramG = new THREE.Group(); carG.add(ramG);
  {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(7, 16); s.lineTo(7, 54); s.lineTo(-7, 54); s.lineTo(-7, 16); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 40, bevelEnabled: false }); g.translate(0, 0, -20);
    const chG = new THREE.Group(); chG.position.set(0, 0, Z0); chG.rotation.set(0, 0.38, 0.2); ramG.add(chG);
    chG.add(sh(new THREE.Mesh(g, mTool)));
    box(60, 54, 62, mBlued, 0, 77, Z0, ramG);                           // porta-cinzel
    const bolts = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(7, 7, 9, 6), mat.chrome, 2));
    const d = new THREE.Object3D(); d.rotation.x = Math.PI / 2;
    [-15, 15].forEach((x, i) => { d.position.set(x, 80, Z0 + 35.5); d.updateMatrix(); bolts.setMatrixAt(i, d.matrix); });
    ramG.add(bolts);
    { const r = cyl(20, 418, mat.chrome, ramG, 24); r.position.set(0, 309, Z0); }       // haste
    box(50, 18, 130, mBase, 0, 509, -445, ramG);                       // travessa
    for (const sx of [-1, 1]) box(8, 34, 36, mBase, sx * 19, 483, ZC, ramG);
    cylX(RR, 30, mat.chrome, 0, LT, ZC, ramG, 20);                      // rolete seguidor sobre a came
    { const r = cyl(8, 112, mat.chrome, ramG, 12); r.position.set(0, 574, Z0); }       // haste do cilindro de aproximação
  }

  // porta-cabos (corrente articulada horizontal) entre o braço e o carro
  const chain = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(21, 16, 36), mChain, NLK)); scene.add(chain);
  box(30, 40, 30, mat.aluDark, XCH - 10, CHY + 2 * CHR, -585);
  const dmy = new THREE.Object3D(); let chainX = NaN;
  function updateChain(xm) {
    if (Math.abs(xm - chainX) < 0.01) return; chainX = xm;
    const LTOT = NLK * LPK, LA = Math.PI * CHR, xb = (XCH + xm + (LTOT - LA)) / 2, L1 = xb - XCH;
    for (let i = 0; i < NLK; i++) {
      const d = (i + 0.5) * LPK; let x, y, th = 0;
      if (d < L1) { x = XCH + d; y = CHY + 2 * CHR; }
      else if (d < L1 + LA) { const ph = (d - L1) / CHR; x = xb + CHR * Math.sin(ph); y = CHY + CHR + CHR * Math.cos(ph); th = -ph; }
      else { x = xb - (d - L1 - LA); y = CHY; }
      dmy.position.set(x, y, CHZ); dmy.rotation.set(0, 0, th); dmy.updateMatrix(); chain.setMatrixAt(i, dmy.matrix);
    }
    chain.instanceMatrix.needsUpdate = true;
  }

  // =================================================================
  // Volante, embraiagem-travão, correias em V e motor principal
  // =================================================================
  const flyG = new THREE.Group(); flyG.position.set(XFW, YC, ZC); scene.add(flyG);
  {
    const pr = [[205, -40], [258, -40], [258, -32], [244, -24], [258, -16], [258, -8], [244, 0], [258, 8], [258, 16], [244, 24], [258, 32], [258, 40], [205, 40], [205, -40]];
    const rim = sh(new THREE.Mesh(new THREE.LatheGeometry(pr.map(([r, a]) => new THREE.Vector2(r, a)), 96), M(0x67707a, 0.8, 0.36)));
    rim.rotation.z = Math.PI / 2; flyG.add(rim);
    const spokes = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(12, 18, 142, 14), mCast, 6));
    const d = new THREE.Object3D();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; d.position.set(0, 137 * Math.cos(a), 137 * Math.sin(a)); d.rotation.set(a, 0, 0); d.scale.set(0.55, 1, 1); d.updateMatrix(); spokes.setMatrixAt(i, d.matrix); }
    flyG.add(spokes);
    cylX(80, 120, mCast2, 0, 0, 0, flyG, 32);                         // cubo
    const bolts = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(9, 9, 10, 6), mat.chrome, 6));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5; d.position.set(-62, 55 * Math.cos(a), 55 * Math.sin(a)); d.rotation.set(0, 0, Math.PI / 2); d.scale.set(1, 1, 1); d.updateMatrix(); bolts.setMatrixAt(i, d.matrix); }
    flyG.add(bolts);
    cylX(104, 44, mClutch, 82, 0, 0, flyG, 40);                         // embraiagem-travão pneumática
    cylX(107, 10, mat.dark, 66, 0, 0, flyG, 40);
    box(30, 26, 40, mat.dark, 82, 104, 0, flyG);                        // marca de rotação na embraiagem
  }
  cylX(18, 44, mat.brass, XFW + 126, YC, ZC, scene, 16);               // junta rotativa (ar)
  tube([V(XFW + 148, YC, ZC), V(XFW + 158, YC - 40, ZC - 30), V(XFW + 145, 260, -760), V(-7780, 160, -900), V(-7880, 128, -945), V(-7928, 126, -950)], 5, mAir, scene, false, 48, 8);
  box(14, 26, 26, mat.brass, -7933, 126, -950);                        // electroválvula da embraiagem (ligação)
  box(16, 90, 60, mat.dark, -7932, 126, -1010);
  // motor principal 7,5 kW (em cima do braço) e polia
  cylX(95, 220, mMotor, -8070, MY, MZ, scene, 48);
  cylX(90, 56, mat.dark, -8208, MY, MZ, scene, 32);                    // tampa do ventilador
  cylX(80, 18, mMotorPaint, -7951, MY, MZ, scene, 32);
  cylX(16, 120, mat.chrome, -7882, MY, MZ, scene, 16);
  box(110, 64, 120, mMotorPaint, -8060, MY + 127, MZ);                 // caixa de terminais
  box(180, 30, 210, mMotorPaint, -8070, 1033, MZ);                     // patas
  box(300, 18, 280, mBase, -8070, 1009, MZ);                           // base tensora
  box(64, 36, 2, mat.label, -8070, MY + 10, MZ + 96);
  const pulley = new THREE.Group(); pulley.position.set(XFW, MY, MZ); scene.add(pulley);
  {
    const pr = [[18, -40], [62, -40], [62, -32], [48, -24], [62, -16], [62, -8], [48, 0], [62, 8], [62, 16], [48, 24], [62, 32], [62, 40], [18, 40]];
    const p = sh(new THREE.Mesh(new THREE.LatheGeometry(pr.map(([r, a]) => new THREE.Vector2(r, a)), 48), mat.aluDark)); p.rotation.z = Math.PI / 2; pulley.add(p);
    box(84, 10, 14, mat.dark, 0, 30, 0, pulley);
  }
  // três correias em V
  {
    const pts = beltPath([ZC, YC], 250, [MZ, MY], 54).map(([z, y]) => V(0, y, z));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "centripetal"), 260, 6.5, 6, true);
    for (const dx of [-24, 0, 24]) { const b = sh(new THREE.Mesh(g, mVBelt)); b.position.x = XFW + dx; scene.add(b); }
    // resguardo em rede de metal distendido (amarelo)
    const hull = beltPath([ZC, YC], 292, [MZ, MY], 100, 72, 28, 2);
    const s = new THREE.Shape(); hull.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); s.closePath();
    const gd = new THREE.ExtrudeGeometry(s, { depth: 110, bevelEnabled: false, curveSegments: 1 });
    const guard = new THREE.Mesh(gd, mMeshY); guard.rotation.y = -Math.PI / 2; guard.position.x = XFW + 55; scene.add(guard);
  }

  // =================================================================
  // Óleo de corte: depósito com bomba, linha até ao porta-cabos; armário eléctrico e conduta
  // =================================================================
  put(rbox(200, 230, 160, 10, mat.steelBlue), -7800, FLOOR + 115, -1000);
  box(206, 10, 166, mat.dark, -7800, FLOOR + 235, -1000);
  { const p = cyl(42, 110, mMotorPaint, scene, 24); p.position.set(-7752, FLOOR + 295, -1000); }
  { const p = cyl(30, 34, mat.aluDark, scene, 20); p.position.set(-7752, FLOOR + 223 + 34, -1000); }
  { const p = cyl(20, 18, mat.yellow, scene, 16); p.position.set(-7850, FLOOR + 249, -1000); }
  box(4, 130, 26, mOil, -7699, FLOOR + 115, -1000);                    // visor do nível de óleo
  tube([V(-7752, FLOOR + 352, -1000), V(-7760, -200, -1050), V(-7880, -120, -1062), V(-7932, -40, -1062), V(-7933, 900, -1062), V(-7945, 992, -1055),
    V(-8000, 1012, -1045), V(-8280, 1012, -1040), V(-8288, 1016, -700), V(-8282, 1002, -615), V(-8270, 960, -590), V(-8262, 900, -589), V(-8260, 838, -588)], 7, mHoseOil, scene, false, 140, 8);
  put(rbox(180, 1000, 220, 10, mCover), -8610, FLOOR + 500, -970);
  box(2, 930, 2, mat.dark, -8610, FLOOR + 500, -859);
  for (const x of [-8630, -8590]) box(12, 70, 16, mat.chrome, x, FLOOR + 540, -853);
  plate(110, 55, canvasTex(256, 128, (g) => {
    g.fillStyle = "#f2c200"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#111";
    g.beginPath(); g.moveTo(64, 18); g.lineTo(112, 104); g.lineTo(16, 104); g.closePath(); g.lineWidth = 8; g.strokeStyle = "#111"; g.stroke();
    g.font = "800 60px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 64, 72);
    g.font = "700 26px Arial"; g.textAlign = "left"; g.fillText("400 V", 132, 50); g.font = "20px Arial"; g.fillText(tr("Comando"), 132, 86);
  }), -8610, 250, -858.5);
  tube([V(-8610, 380, -1000), V(-8560, 430, -1045), V(-8491, 500, -1058), V(-8490, 1000, -1060), V(-8440, 1052, -1060), V(-8200, 1060, -1062), V(-8100, 1118, -1020), V(-8070, 1200, -960), V(-8060, 1247, -925)], 11, mat.black, scene, false, 80, 8);
  // coluna luminosa no braço
  const tower = { x: -8420, z: -690 };
  { const b = cyl(24, 16, mat.dark, scene, 20); b.position.set(tower.x, 1008, tower.z); }
  { const p = cyl(9, 100, mat.alu, scene, 12); p.position.set(tower.x, 1066, tower.z); }
  [[mLampG, 1140], [mLampA, 1186], [mLampR, 1232]].forEach(([m, y]) => { const l = cyl(30, 44, m, scene, 24); l.position.set(tower.x, y, tower.z); });
  { const c = cyl(30, 14, mat.dark, scene, 24); c.position.set(tower.x, 1261, tower.z); }

  // =================================================================
  // Protecção: perfis de alumínio, policarbonato (lados, tecto, janela frontal) e cortina de luz na abertura frontal
  // =================================================================
  {
    for (const x of [GX0, GX1]) for (const z of [GZ, GZB]) box(40, GT - FLOOR, 40, mat.alu, x, (GT + FLOOR) / 2, z);
    const feet = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(90, 10, 90), mat.dark, 4)); const d = new THREE.Object3D(); let i = 0;
    for (const x of [GX0, GX1]) for (const z of [GZ, GZB]) { d.position.set(x, FLOOR + 5, z); d.updateMatrix(); feet.setMatrixAt(i++, d.matrix); }
    scene.add(feet);
    const zm = (GZ + GZB) / 2, dz = GZ - GZB - 40;
    box(GX1 - GX0 + 40, 40, 40, mat.alu, (GX0 + GX1) / 2, GT - 20, GZ);
    box(GX1 - GX0 - 40, 30, 30, mat.alu, (GX0 + GX1) / 2, 440, GZ);
    for (const x of [GX0, GX1]) {
      box(40, 40, dz, mat.alu, x, GT - 20, zm);
      box(40, 40, dz, mat.alu, x, 120, zm);                               // travessa sobre a passagem da esteira
      box(4, GT - 40 - 140, dz, mPoly, x, (GT - 40 + 140) / 2, zm, scene, false).renderOrder = 2;
    }
    box(GX1 - GX0 - 40, 4, GZ - ZF - 20, mPoly, (GX0 + GX1) / 2, GT - 20, (GZ - 20 + ZF) / 2, scene, false).renderOrder = 2;
    box(GX1 - GX0 - 40, GT - 40 - 455, 4, mPoly, (GX0 + GX1) / 2, (GT - 40 + 455) / 2, GZ, scene, false).renderOrder = 2;
    box(14, 90, 22, mat.black, GX1 - 46, 640, GZ + 14);                   // puxador da janela
    box(30, 60, 26, mat.yellow, GX1 - 2, 560, GZ + 34);                   // encravamento de segurança
    for (const sx of [-1, 1]) {
      const x = sx < 0 ? GX0 + 37 : GX1 - 37;
      put(rbox(30, 280, 30, 6, mat.yellow, 2), x, 280, GZ);
      box(4, 250, 12, mCurtainLed, x - sx * 16, 280, GZ);
      box(34, 14, 34, mat.dark, x, 133, GZ);
    }
    plate(140, 70, canvasTex(280, 140, (g, w, h) => {
      g.fillStyle = "#f2c200"; g.fillRect(0, 0, w, h); g.strokeStyle = "#111"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      g.beginPath(); g.moveTo(62, 22); g.lineTo(112, 112); g.lineTo(12, 112); g.closePath(); g.lineWidth = 9; g.stroke();
      g.fillStyle = "#111"; g.font = "800 58px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 62, 80);
      g.textAlign = "left"; g.font = "800 30px Arial"; g.fillText(tr("PERIGO"), 128, 52); g.font = "600 19px Arial"; g.fillText(tr("cinzel em"), 128, 84); g.fillText(tr("movimento"), 128, 106);
    }), GX0 + 110, 520, GZ + 3);
  }

  // =================================================================
  // Painel do operador com HMI num braço articulado preso ao poste frontal esquerdo (virado para +z)
  // =================================================================
  const HW = 512, HH = 320;
  const hmiTex = canvasTex(HW, HH, () => {});
  hmiTex.wrapS = hmiTex.wrapT = THREE.ClampToEdgeWrapping;
  const hg = hmiTex.image.getContext("2d");
  {
    const hd = new THREE.Group(); hd.position.set(-8572, 610, -128); hd.rotation.set(-0.12, 0.35, 0, "YXZ"); scene.add(hd);
    put(rbox(280, 230, 70, 14, mCover), 0, 0, 0, hd);
    box(262, 172, 5, mat.black, 0, 18, 36, hd);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(252, 157.5), new THREE.MeshBasicMaterial({ map: hmiTex, toneMapped: false }));
    scr.position.set(0, 18, 38.7); hd.add(scr);
    const btn = (r, h, m, x) => { const o = cyl(r, h, m, hd, 20); o.rotation.x = Math.PI / 2; o.position.set(x, -88, 35 + h / 2); return o; };
    btn(17, 5, mat.yellow, -104); btn(12, 16, M(0xc4161c, 0.1, 0.4), -104);
    btn(8, 7, M(0x1c9a48, 0.1, 0.4, { emissive: 0x22c55e, emissiveIntensity: 0.35 }), -62); btn(8, 7, mat.black, -38); btn(8, 7, M(0x1d5fd0, 0.1, 0.4), -14);
    box(96, 18, 3, mat.label, 74, -88, 36, hd);
    box(70, 70, 26, mat.dark, 0, 0, -48, hd);                           // suporte VESA
    hd.updateMatrixWorld();
    const m = hd.localToWorld(V(0, 0, -60)), p0 = V(GX0, 610, GZ + 22);
    beam(p0, m, 30, mat.alu);
    for (const q of [p0, m]) { const j = cyl(20, 46, mat.aluDark, scene, 16); j.position.copy(q); }
  }

  // =================================================================
  // Partículas: lascas/faíscas na ponta do cinzel e névoa de óleo de corte
  // =================================================================
  const dotTex = canvasTex(32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.75)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  });
  dotTex.wrapS = dotTex.wrapT = THREE.ClampToEdgeWrapping;
  function pointCloud(n, size) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = -1e5;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    p.frustumCulled = false; scene.add(p);
    return { p, pos, col, vel: new Float32Array(n * 3), base: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), n, next: 0 };
  }
  const chips = pointCloud(260, 6), mist = pointCloud(140, 15);
  function emit(pc, x, y, z, vx, vy, vz, life, r, g, b) {
    const i = pc.next; pc.next = (pc.next + 1) % pc.n; const k = i * 3;
    pc.pos[k] = x; pc.pos[k + 1] = y; pc.pos[k + 2] = z; pc.vel[k] = vx; pc.vel[k + 1] = vy; pc.vel[k + 2] = vz;
    pc.base[k] = r; pc.base[k + 1] = g; pc.base[k + 2] = b; pc.life[i] = pc.max[i] = life;
  }
  function strike(x, y) {
    for (let n = 0; n < 9; n++) {
      const spark = Math.random() < 0.5, b = 0.8 + Math.random() * 0.5;
      emit(chips, x + (Math.random() - 0.5) * 6, y + 1, Z0 + (Math.random() - 0.5) * 24,
        (Math.random() - 0.7) * 900, 250 + Math.random() * 1100, (Math.random() - 0.5) * 1000, 0.22 + Math.random() * 0.45,
        spark ? 1.7 * b : 0.85 * b, spark ? (0.5 + Math.random() * 0.25) * b : 0.88 * b, spark ? 0.1 * b : 0.95 * b);
    }
  }
  function stepCloud(pc, dt, grav, drag, floorY) {
    const f = Math.exp(-drag * dt);
    for (let i = 0; i < pc.n; i++) {
      if (pc.life[i] <= 0) continue;
      const k = i * 3; pc.life[i] -= dt;
      if (pc.life[i] <= 0) { pc.pos[k + 1] = -1e5; pc.col[k] = pc.col[k + 1] = pc.col[k + 2] = 0; continue; }
      pc.vel[k] *= f; pc.vel[k + 1] = pc.vel[k + 1] * f - grav * dt; pc.vel[k + 2] *= f;
      pc.pos[k] += pc.vel[k] * dt; pc.pos[k + 1] += pc.vel[k + 1] * dt; pc.pos[k + 2] += pc.vel[k + 2] * dt;
      if (pc.pos[k + 1] < floorY && pc.vel[k + 1] < 0) { pc.pos[k + 1] = floorY; pc.vel[k + 1] *= -0.2; pc.vel[k] *= 0.3; pc.vel[k + 2] *= 0.3; }
      const a = pc.life[i] / pc.max[i], w = Math.sqrt(a);
      pc.col[k] = pc.base[k] * w; pc.col[k + 1] = pc.base[k + 1] * w; pc.col[k + 2] = pc.base[k + 2] * w;
    }
    pc.p.geometry.attributes.position.needsUpdate = true; pc.p.geometry.attributes.color.needsUpdate = true;
  }

  // =================================================================
  // Ciclo de picagem
  // =================================================================
  const st = { lima: null, s: -1, done: false, n: 0, strikes: 0 };
  const cutAt = (s) => Math.max(0, Math.min(1, (s - 0.06) / 0.86));       // avanço do corte (= fracção de dentes)
  const lowerAt = (s) => seg(s, 0, 0.06) * (1 - seg(s, 0.93, 0.99));     // cilindro de aproximação: 1 = cinzel solto sobre a lima
  const limaTopAt = (l, x) => {
    if (l.form < 0.5) return 2 + 1.6 * P.h;
    const len = limaLen(), h = P.h * (1 + (1 - l.form) * 1.4), u = Math.max(0, Math.min(1, -(x - l.g.position.x) / (len / 2)));
    return Math.max(2 + h - 0.15 * h * u * u + 0.3, 2 + P.h + 0.45);       // aresta do cinzel na frente da camada de dentes
  };
  const phaseText = (s, here) => {
    if (s < 0) return UP.phase === "move" ? "Carro a regressar · lima a avançar" : here ? "Em espera" : "Em espera · sem lima";
    if (s < 0.06) return "Bigorna em apoio · cinzel a descer";
    if (s < 0.92) return "A picar · 1.º corte (65°)";
    if (s < 0.99) return "Cinzel a recuar";
    return UP.waiting ? "Linha em espera (caixa cheia)" : "Picagem concluída";
  };
  UP.addStation({
    slot: SLOT, name: "Picagem dos dentes",
    onDwell(l, s) {
      if (st.lima !== l) { st.lima = l; st.done = false; }
      st.s = s;
      l.teeth = cutAt(s);                                                // a camada de dentes cresce desde a ponta, atrás do cinzel
      if (l.teeth >= 1 && !st.done) { st.done = true; st.n++; }
    },
  });

  // ---------- camada de dentes picados, por lima (como a marca de dureza da estação 4): a textura do núcleo tem
  // passo sub-milimétrico e deixa de se ver a mais de ~0,5 m; esta camada (passo ≈ 3 mm, exagerado) acompanha a
  // forma afunilada da lima, cresce dente a dente atrás do cinzel e segue a cor, o acabamento e o calor da lima.
  const PITCH_T = 12, NSEG = 80;                                        // mm por ladrilho (4 dentes); segmentos ≈ 2,9 mm
  const cutTex = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = "#a3aab2"; g.fillRect(0, 0, w, h);
    const sk = 172, par = (x, wx, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + wx, 0); g.lineTo(x + wx + sk, h); g.lineTo(x + sk, h); g.closePath(); g.fill(); };
    for (let k = -1; k <= 0; k++) for (let i = 0; i < 4; i++) { const x = i * 64 + k * 256; par(x, 22, "#32383f"); par(x + 22, 12, "#f1f5f9"); par(x + 34, 10, "#cfd5dc"); }
  });
  const buildOv = () => {
    const len = limaLen(), x0 = -len / 2 + 10, L = len * 0.85;
    const g = new THREE.PlaneGeometry(1, 1, NSEG, 1), p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const xs = x0 + (p.getX(i) + 0.5) * L, u = Math.max(0, -xs / (len / 2)), f = 1 - 0.42 * u * u;
      p.setXYZ(i, xs, 2 + P.h + 0.75, -p.getY(i) * P.b * 0.8 * f); uv.setX(i, (xs - x0) / PITCH_T); n.setXYZ(i, 0, 1, 0);
    }
    g.computeBoundingSphere(); return g;
  };
  let ovKey = "", ovFull = null, ovPart = null;
  const ovs = UP.limas.map((l) => {
    const o = new THREE.Mesh(undefined, M(0xffffff, 0.85, 0.5, { map: cutTex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    o.visible = false; o.receiveShadow = true; l.g.add(o); return [l, o];
  });
  function drawTeeth() {
    const key = `${limaLen()}|${P.h}|${P.b}`;
    if (key !== ovKey) { ovKey = key; if (ovFull) { ovFull.dispose(); ovPart.dispose(); } ovFull = buildOv(); ovPart = buildOv(); }
    for (const [l, o] of ovs) {
      const on = l.form >= 0.5 && l.teeth > 0.004; o.visible = on; if (!on) continue;
      if (l.teeth >= 0.999) o.geometry = ovFull;
      else { o.geometry = ovPart; ovPart.setDrawRange(0, 6 * Math.max(1, Math.floor(l.teeth * NSEG + 1e-4))); }
      const m = o.material; m.color.copy(l.color); m.metalness = l.metal; m.roughness = Math.min(1, l.rough + 0.18);
      m.emissive.copy(l.m.emissive); m.emissiveIntensity = l.m.emissiveIntensity;
    }
  }

  // ---------- HMI
  function drawHMI(s, c, gpm, engaged, anvUp) {
    const g = hg;
    g.fillStyle = "#0b1220"; g.fillRect(0, 0, HW, HH);
    g.fillStyle = "#1d3b30"; g.fillRect(0, 0, HW, 42);
    g.textBaseline = "middle"; g.textAlign = "left"; g.fillStyle = "#e9f5ee"; g.font = "700 21px Arial, sans-serif"; g.fillText(tr("PICAGEM · CINZEL"), 14, 22);
    g.textAlign = "right"; g.fillStyle = "#a7c9b6"; g.font = "17px Arial, sans-serif"; g.fillText(tr("Limas picadas: ") + st.n, HW - 14, 22);
    g.textAlign = "left"; g.fillStyle = "#7f9a8c"; g.font = "600 14px Arial, sans-serif"; g.fillText(tr("GOLPES / MIN"), 16, 62);
    g.fillStyle = engaged ? "#ffffff" : "#56695f"; g.font = "700 56px Menlo, Consolas, monospace"; g.fillText(engaged ? String(gpm) : "0", 16, 104);
    g.fillStyle = s >= 0 && s < 0.99 ? "#fbbf24" : "#8fa79a"; g.font = "600 16px Arial, sans-serif"; g.fillText(tr(phaseText(s, !!UP.limaAt(SLOT))), 16, 146);
    // tabela à direita
    const rows = [[tr("Carro X"), `${(c * limaLen() * 0.85).toFixed(1)} mm`], [tr("Cinzel"), engaged && s > 0.06 && s < 0.92 ? tr("a bater") : tr("recolhido")],
      [tr("Bigorna"), anvUp ? tr("em apoio") : tr("em baixo")], [tr("Óleo de corte"), engaged ? tr("névoa ON") : tr("OFF")], [tr("Golpes"), String(st.strikes)]];
    rows.forEach(([k, v], i) => {
      const y = 64 + i * 22; g.fillStyle = "#7f9a8c"; g.font = "15px Arial, sans-serif"; g.textAlign = "left"; g.fillText(k, 300, y);
      g.fillStyle = "#dfe9e3"; g.font = "600 15px Arial, sans-serif"; g.textAlign = "right"; g.fillText(v, HW - 14, y);
    });
    // lima esquemática (vista de cima) com os dentes picados até à frente do cinzel
    g.textAlign = "left"; g.fillStyle = "#7f9a8c"; g.font = "600 14px Arial, sans-serif"; g.fillText(tr("DENTES PICADOS · ") + Math.round(c * 100) + " %", 16, 182);
    const x0 = 22, x1 = 430, ym = 238, hw = 26, xt = x1 + 62;
    const yAt = (x) => { const u = Math.max(0, (x0 + 210 - x) / 210); return hw * (1 - 0.42 * u * u); };
    g.beginPath(); g.moveTo(x0, ym - yAt(x0)); for (let x = x0; x <= x1; x += 6) g.lineTo(x, ym - yAt(x)); g.lineTo(x1, ym + yAt(x1));
    for (let x = x1; x >= x0; x -= 6) g.lineTo(x, ym + yAt(x)); g.closePath();
    g.fillStyle = "#56606b"; g.fill();
    g.fillStyle = "#56606b"; g.fillRect(x1, ym - 8, xt - x1, 16);
    const xc = x0 + 6 + c * (x1 - x0) * 0.85 * 1.0;
    g.save(); g.beginPath(); g.rect(x0, ym - hw, xc - x0, 2 * hw); g.clip();
    g.strokeStyle = "#cfd8e2"; g.lineWidth = 1.6; for (let x = x0 - 40; x < x1; x += 7) { g.beginPath(); g.moveTo(x, ym + hw); g.lineTo(x + 22, ym - hw); g.stroke(); }
    g.restore();
    if (s >= 0 && s < 0.99) { g.strokeStyle = "#fbbf24"; g.lineWidth = 3; g.beginPath(); g.moveTo(xc, ym - hw - 10); g.lineTo(xc + 10, ym + hw + 10); g.stroke(); }
    g.fillStyle = "#6b7f74"; g.font = "13px Arial, sans-serif"; g.fillText(tr("ponta"), x0, 290); g.textAlign = "right"; g.fillText(tr("espigão"), xt, 290);
    g.textAlign = "left"; g.fillStyle = "#8fa79a"; g.fillText(tr("picado bastardo · 10 dentes/cm · cinzel 12°"), 110, 306);
    hmiTex.needsUpdate = true;
  }

  // ---------- etiquetas e vista
  const gpmNow = () => Math.round(NLOB * REV * 60 * Math.min(Math.max(P.speed, 0.01), 1.5));
  let carX = X0 - limaLen() / 2 + 10;
  addTag({ text: "2 · Picagem dos dentes", at: () => V(X0, 1500, -620), min: 2500, big: true });
  let engagedNow = false;
  addTag({ text: () => (engagedNow ? `Cinzel · ${gpmNow()} golpes/min` : "Cinzel · recolhido"), at: () => V(carX + 150, 190, -340), max: 3000 });
  addTag({ text: "Volante + embraiagem · motor 7,5 kW", at: () => V(XFW, 1330, -700), max: 3000 });
  addTag({ text: "Bigorna", at: () => V(X0 + 170, -150, -330), max: 2200 });
  addView("pic", "Picagem", [-7250, 1450, 1450], [-8200, 470, -480]);

  // ---------- animação
  let clock = 0, carXm = carX, prevPhase = UP.phase, theta = 0, fly = 0, lastK = 0, mistAcc = 0, hitT = 0, hmiKey = "", hmiT = 0;
  const TIP = V(0, 0, 0);
  addSystem({
    draw(dt) {
      clock += dt;
      const sp = Math.max(0.01, P.speed), dtv = (dt / sp) * Math.min(sp, 1.5);   // rotação visível limitada (evita estroboscopia)
      const len = limaLen(), xs = X0 - len / 2 + 10, xe = xs + len * 0.85;
      const here = UP.limaAt(SLOT);
      const active = UP.phase === "dwell" && !!here && st.lima === here;
      if (UP.phase === "move" && prevPhase !== "move") carXm = carX;
      prevPhase = UP.phase;
      const s = active ? st.s : -1;
      let c = 0, lower = 0;
      if (active) { c = cutAt(s); lower = lowerAt(s); carX = xs + (xe - xs) * c; }
      else if (UP.phase === "move") carX = carXm + (xs - carXm) * UP.shift;   // regresso do carro durante o avanço
      carG.position.x = carX;
      updateChain(carX + 60);
      drawTeeth();
      // volante sempre a rodar; a came só com a embraiagem engatada (há lima e o cinzel está em baixo)
      const engaged = active && s > 0.015 && s < 0.985; engagedNow = engaged;
      fly += TAU * REV * dtv; if (engaged) theta += TAU * REV * dtv;
      flyG.rotation.x = fly; camG.rotation.x = theta; pulley.rotation.x = fly * (250 / 54);
      const touch = active ? limaTopAt(here, carX) : 2 + P.h + 0.45;
      camG.position.y = touch + LT - RR - R0;
      const tipY = touch + Math.max(camLift(theta), LIFT * (1 - lower));
      ramG.position.y = tipY;
      spring.position.y = tipY + 518; spring.scale.y = (706 - (tipY + 518)) / SPH;
      // golpe: o rolete cai do ressalto → o cinzel bate na lima
      const k = Math.floor((theta - Math.PI / 2) / (TAU / NLOB));
      const cutting = engaged && lower > 0.98 && c > 0 && c < 1;
      if (k !== lastK) { if (cutting && dt > 0) { strike(carX, touch); st.strikes++; hitT = 0.06; } lastK = k; }
      hitT -= dt; setLamp(mHit, hitT > 0);
      // bigorna: sobe no início da paragem, desce antes do avanço
      const an = active ? seg(s, 0, 0.05) * (1 - seg(s, 0.95, 1)) : 0;
      anvG.position.y = -40 + 33.5 * an;
      // partículas
      if (dt > 0) {
        if (cutting) {
          mistAcc += dt * 170; TIP.set(carX, touch + 4, Z0);
          while (mistAcc >= 1) {
            mistAcc -= 1;
            const nx = carX + NOZ.x, dx = TIP.x - nx, dy = TIP.y - NOZ.y, dz = TIP.z - NOZ.z, dl = Math.hypot(dx, dy, dz), v = 420 + Math.random() * 260;
            const b = 0.22 + Math.random() * 0.16;
            emit(mist, nx, NOZ.y, NOZ.z, (dx / dl) * v + (Math.random() - 0.5) * 160, (dy / dl) * v + (Math.random() - 0.5) * 120, (dz / dl) * v + (Math.random() - 0.5) * 160, 0.35 + Math.random() * 0.3, b * 1.1, b, b * 0.7);
          }
        }
        stepCloud(chips, dt, 9810, 0.6, 1);
        stepCloud(mist, dt, 300, 3.2, 1);
      }
      // coluna luminosa: verde = automático; âmbar a piscar = linha em espera
      setLamp(mLampG, !UP.waiting); setLamp(mLampA, UP.waiting && Math.sin(clock * 8) > 0); setLamp(mLampR, false);
      // HMI (no máximo ~12×/s e só se algo mudou)
      const now = performance.now(), anvUp = an > 0.5, gpm = gpmNow();
      const key = `${LANG.rev}|${phaseText(s, !!here)}|${Math.round(c * 100)}|${st.n}|${engaged}|${anvUp}|${gpm}|${Math.floor(st.strikes / 3)}`;
      if (key !== hmiKey && now - hmiT > 80) { hmiKey = key; hmiT = now; drawHMI(s, c, gpm, engaged, anvUp); }
    },
  });
}
