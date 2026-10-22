// =====================================================================
// Estação 5 · Jateamento — dá às limas o cinza especial
// Cabine de passagem em pórtico: a esteira atravessa a câmara pelas cortinas de borracha da entrada
// e da saída; a lima pára no slot 19, por baixo das turbinas e em frente à janela de inspecção iluminada.
//  · "shot" — granalha seca → cinza mate: duas turbinas centrífugas no tecto (roda de pás + motor
//    de 11 kW) projectam granalha de aço; a granalha cai pela malha da esteira para a tremonha →
//    parafuso sem-fim → elevador de alcatruzes → separador de ar → silo → válvulas doseadoras → turbinas.
//  · "wet" — jato húmido (lama de óxido de alumínio + água + ar) → cinza metálico: a bomba de lama
//    aspira do tanque com agitador e alimenta dois bicos oscilantes montados na parede traseira.
// O colector de pó de cartuchos aspira a câmara e o separador. O modo vem de P.finish (relido a cada frame).
// =====================================================================
{
  const SLOT = 19, X0 = UP.xOf(SLOT), Z0 = UP.Z;                     // x = -2950, z = -420
  const XE0 = -3320, XC0 = -3200, XC1 = -2700, XE1 = -2580;         // face de entrada · câmara · face de saída
  const ZF = -240, ZFI = -252, ZBI = -588, ZB = -600;                // parede frontal (ext./int.) e traseira (int./ext.)
  const YB = FLOOR + 90, YV = 250, YR = 500, YO = 110;               // base das paredes, tecto dos vestíbulos, tecto da câmara, topo da passagem
  const OZ0 = -572, OZ1 = -268;                                       // passagem da esteira nas faces (pórtico)
  const WX0 = X0 - 150, WX1 = X0 + 150, WY0 = 30, WY1 = 400;          // janela de inspecção
  const TX = [X0 - 115, X0 + 115], ZT = -470, YW = 600;               // turbinas: x, z da caixa, y do eixo da roda
  const NX = [X0 - 62, X0 + 62], NY = 230;                            // bicos do jato húmido (rótula na parede traseira)
  const B0 = 0.1, B1 = 0.86;                                          // janela de jateamento dentro da paragem

  const pre = new Set(); scene.traverse((o) => pre.add(o));

  // ---------- materiais
  const mBody = M(0xd2d6d3, 0.3, 0.52);                  // chapa pintada (RAL 7035)
  const mFrame = M(0x2c4b6e, 0.4, 0.5);                  // perfis, reforços e bases
  const mLiner = M(0x2a2d31, 0.05, 0.92);                // revestimento interior de borracha
  const mRubber = M(0x141517, 0, 0.9);                   // cortinas
  const mCast = M(0x4a5058, 0.55, 0.45);                 // caixas das turbinas (aço de desgaste)
  const mMotor = M(0x2f5f9a, 0.35, 0.42);               // motores (RAL 5010)
  const mGalv = M(0xb0b8c0, 0.75, 0.42);                 // condutas galvanizadas
  const mHose = M(0x1d1f23, 0.05, 0.75);                 // mangueiras
  const mStain = M(0xc5ccd3, 0.9, 0.3, { side: THREE.DoubleSide });   // inox (tanque)
  const mGlass = M(0xd6e8f7, 0.1, 0.05, { transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
  const mInLamp = M(0xf4f7ff, 0, 0.3, { emissive: 0xeef4ff, emissiveIntensity: 1.6 });
  const lamp = (c) => { const m = M(c, 0, 0.35, { emissive: c, emissiveIntensity: 0 }); m.userData.on = new THREE.Color(c); m.userData.off = new THREE.Color(c).multiplyScalar(0.2); return m; };
  const setLamp = (m, on, k = 2.2) => { m.color.copy(on ? m.userData.on : m.userData.off); m.emissiveIntensity = on ? k : 0; };
  const mLedT = lamp(0x26e07a), mLedW = lamp(0x38bdf8), mLampShot = lamp(0xffa21a), mLampWet = lamp(0x3aa0ff);
  const mTowR = lamp(0xff2b2b), mTowA = lamp(0xffa21a), mTowG = lamp(0x26e07a);

  // ---------- auxiliares
  const sh = (o) => { o.castShadow = o.receiveShadow = true; return o; };
  const put = (o, x, y, z, parent = scene) => { o.position.set(x, y, z); parent.add(o); return o; };
  const frac = (v) => v - Math.floor(v);
  function rrect(p, x0, y0, x1, y1, r) {
    p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r); p.lineTo(x1, y1 - r);
    p.quadraticCurveTo(x1, y1, x1 - r, y1); p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r); p.lineTo(x0, y0 + r);
    p.quadraticCurveTo(x0, y0, x0 + r, y0); return p;
  }
  // caixa com arestas verticais arredondadas (carenagens)
  function rbox(w, h, d, r, m, bev = 3) {
    const s = rrect(new THREE.Shape(), -w / 2 + bev, -d / 2 + bev, w / 2 - bev, d / 2 - bev, Math.min(r, w / 2 - bev - 1, d / 2 - bev - 1));
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -(h - 2 * bev) / 2); g.rotateX(-Math.PI / 2);
    return sh(new THREE.Mesh(g, m));
  }
  // perfil (x, y) extrudido em z a partir de z0
  function slabXY(shape, z0, depth, m) {
    const o = sh(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 }), m));
    return put(o, 0, 0, z0);
  }
  // perfil (z, y) extrudido em x a partir de x0
  function slabZY(shape, x0, depth, m) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
    g.rotateY(-Math.PI / 2); g.translate(depth, 0, 0);
    return put(sh(new THREE.Mesh(g, m)), x0, 0, 0);
  }
  const tube = (pts, r, m, seg = 48, rad = 12) => put(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), seg, r, rad), m)), 0, 0, 0);
  const dmy = new THREE.Object3D();
  // [x, y, z, sx, sy, sz, rx, ry, rz]
  function inst(geo, m, list) {
    const im = sh(new THREE.InstancedMesh(geo, m, list.length));
    list.forEach((a, i) => { dmy.position.set(a[0], a[1], a[2]); dmy.scale.set(a[3] ?? 1, a[4] ?? 1, a[5] ?? 1); dmy.rotation.set(a[6] ?? 0, a[7] ?? 0, a[8] ?? 0); dmy.updateMatrix(); im.setMatrixAt(i, dmy.matrix); });
    scene.add(im); return im;
  }
  // corpo de motor com alhetas de refrigeração (ao longo de y)
  function ribbed(r, len, ribs = 18, depth = 0.08) {
    const n = ribs * 4, g = new THREE.CylinderGeometry(r, r, len, n, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      if (Math.hypot(x, z) < r * 0.5) continue;
      const j = ((Math.round((Math.atan2(x, z) / (Math.PI * 2)) * n) % n) + n) % n, k = j % 4 < 2 ? 1 : 1 - depth;
      p.setX(i, x * k); p.setZ(i, z * k);
    }
    const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
  }
  const plate = (tex, w, h, m = null) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m || M(0xffffff, 0.1, 0.55, { map: tex }));
  const bolts = [];                                       // cabeças de parafuso (todas numa só malha)
  const boltZ = (x, y, z) => bolts.push([x, y, z, 1, 1, 1, Math.PI / 2, 0, 0]);

  // ---------- texturas
  const grilleTex = canvasTex(64, 64, (g) => {
    g.fillStyle = "#24282e"; g.fillRect(0, 0, 64, 64); g.strokeStyle = "#5c636c"; g.lineWidth = 2.4;
    for (let r = 6; r < 32; r += 5) { g.beginPath(); g.arc(32, 32, r, 0, 7); g.stroke(); }
    g.fillStyle = "#4a5058"; g.fillRect(30, 0, 4, 64); g.fillRect(0, 30, 64, 4);
  });
  grilleTex.wrapS = grilleTex.wrapT = THREE.ClampToEdgeWrapping;
  const bucketTex = canvasTex(64, 256, (g) => {
    g.fillStyle = "#16191d"; g.fillRect(0, 0, 64, 256);
    g.fillStyle = "#3a3f46"; g.fillRect(26, 0, 12, 256);                    // correia
    for (let y = 0; y < 256; y += 64) {
      g.fillStyle = "#c2621d"; g.beginPath(); g.moveTo(8, y + 10); g.lineTo(56, y + 10); g.lineTo(50, y + 44); g.lineTo(14, y + 44); g.closePath(); g.fill();
      g.fillStyle = "#8f969e"; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(12 + Math.random() * 40, y + 12 + Math.random() * 9, 2.2, 0, 7); g.fill(); }
      g.fillStyle = "#e8833a"; g.fillRect(8, y + 9, 48, 3);
    }
  }, [1, 1.1]);
  const sightTex = canvasTex(32, 64, (g) => {
    g.fillStyle = "#2b3037"; g.fillRect(0, 0, 32, 64);
    for (let i = 0; i < 70; i++) { const v = 120 + Math.random() * 90 | 0; g.fillStyle = `rgb(${v},${v + 4},${v + 10})`; g.beginPath(); g.arc(Math.random() * 32, Math.random() * 64, 1.6, 0, 7); g.fill(); }
  }, [3, 1]);
  const mSightFlow = M(0xffffff, 0.3, 0.25, { map: sightTex });
  const mSightIdle = M(0x2e343b, 0.4, 0.12);
  const swirlTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#a9aeaa"; g.fillRect(0, 0, w, h);
    g.lineWidth = 5;
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = k % 2 ? "rgba(235,238,236,0.55)" : "rgba(120,126,124,0.45)"; g.beginPath();
      for (let t = 0; t < 1; t += 0.01) { const a = t * 9 + k * 0.9, r = 12 + t * 118; const x = 128 + r * Math.cos(a), y = 128 + r * Math.sin(a); t ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
  });
  swirlTex.wrapS = swirlTex.wrapT = THREE.ClampToEdgeWrapping;
  const stripeTex = canvasTex(64, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#111" : "#f2c200"; g.fillRect(i * 8, 0, 8, 16); } }, [3, 1]);
  const perfTex = canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64); g.fillStyle = "#f2c200"; g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = "destination-out";
    for (let y = 4; y < 64; y += 10) for (let x = (y / 10) % 2 ? 9 : 4; x < 64; x += 10) { g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fill(); }
  }, [3, 2]);
  const plateTex = (w, h, draw) => { const t = canvasTex(w, h, draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  const nameTex = plateTex(512, 120, (g, w, h) => {
    g.fillStyle = "#e9edf1"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2b3644"; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#2c4b6e"; g.fillRect(5, 5, 104, h - 10);
    g.fillStyle = "#fff"; g.font = "800 40px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("JT", 57, h / 2 - 12);
    g.font = "700 19px Arial, sans-serif"; g.fillText("500", 57, h / 2 + 22);
    g.textAlign = "left"; g.fillStyle = "#16202c"; g.font = "700 27px Arial, sans-serif"; g.fillText(tr("JATEAMENTO DE LIMAS"), 124, 36);
    g.font = "19px Arial, sans-serif"; g.fillText(tr("Cabine de passagem · cinza especial"), 124, 68);
    g.fillStyle = "#4a5868"; g.font = "17px Arial, sans-serif"; g.fillText(tr("Granalha 2 × 11 kW  ·  jato húmido 2 bicos"), 124, 96);
  });
  const warnTex = plateTex(200, 260, (g, w, h) => {
    g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#333"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#f2c200"; g.beginPath(); g.moveTo(100, 14); g.lineTo(176, 140); g.lineTo(24, 140); g.closePath(); g.fill();
    g.lineWidth = 7; g.strokeStyle = "#111"; g.stroke();
    g.fillStyle = "#111"; g.font = "800 70px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 100, 96);
    g.font = "800 26px Arial"; g.fillText(tr("PERIGO"), 100, 170);
    g.font = "600 16px Arial"; g.fillText(tr("Projecção de abrasivo"), 100, 196);
    g.fillText(tr("Não abrir em marcha"), 100, 218); g.fillStyle = "#1f5fd6"; g.fillText(tr("Use protecção auditiva"), 100, 242);
  });
  const turbTex = (n) => plateTex(200, 120, (g, w, h) => {
    g.fillStyle = "#dfe4e9"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2b3644"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#16202c"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "800 28px Arial"; g.fillText(tr(`TURBINA ${n}`), w / 2, 32);
    g.font = "18px Arial"; g.fillText(tr("11 kW · 3000 rpm"), w / 2, 66); g.fillStyle = "#4a5868"; g.fillText(tr("roda Ø 360 · 8 pás"), w / 2, 94);
  });
  const textPlate = (txt, sub, w = 320, h = 70) => plateTex(w, h, (g) => {
    g.fillStyle = "#e9edf1"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2b3644"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#16202c"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `800 ${sub ? 24 : 28}px Arial`; g.fillText(tr(txt), w / 2, sub ? h * 0.36 : h / 2);
    if (sub) { g.font = "17px Arial"; g.fillStyle = "#4a5868"; g.fillText(tr(sub), w / 2, h * 0.74); }
  });

  // =====================================================================
  // Cabine (pórtico sobre a esteira): paredes de chapa de 12 mm, vestíbulos com cortinas
  // =====================================================================
  const profile = () => {
    const s = new THREE.Shape();
    s.moveTo(XE0, YB); s.lineTo(XE1, YB); s.lineTo(XE1, YV); s.lineTo(XC1, YV); s.lineTo(XC1, YR);
    s.lineTo(XC0, YR); s.lineTo(XC0, YV); s.lineTo(XE0, YV); s.closePath(); return s;
  };
  {
    const f = profile(); f.holes.push(rrect(new THREE.Path(), WX0, WY0, WX1, WY1, 22));
    slabXY(f, ZFI, ZF - ZFI, mBody);                                  // parede frontal com a janela
    slabXY(profile(), ZB, ZBI - ZB, mBody);                           // parede traseira
    const portal = () => {
      const s = new THREE.Shape();
      s.moveTo(ZBI, YB); s.lineTo(OZ0, YB); s.lineTo(OZ0, YO); s.lineTo(OZ1, YO); s.lineTo(OZ1, YB); s.lineTo(ZFI, YB);
      s.lineTo(ZFI, YV); s.lineTo(ZBI, YV); s.closePath(); return s;
    };
    slabZY(portal(), XE0, 10, mBody); slabZY(portal(), XE1 - 10, 10, mBody);   // faces de entrada e saída
    for (const x of [XC0, XC1]) box(10, YR - YO, ZFI - ZBI, mBody, x, (YR + YO) / 2, (ZFI + ZBI) / 2);   // divisórias vestíbulo/câmara
    box(XC1 - XC0 + 16, 12, ZF - ZB + 12, mBody, X0, YR + 6, (ZF + ZB) / 2);                           // tecto da câmara
    for (const [a, b] of [[XE0, XC0], [XC1, XE1]]) box(b - a + 4, 10, ZF - ZB + 8, mBody, (a + b) / 2, YV + 5, (ZF + ZB) / 2);
    // perfis de canto, nervuras horizontais (à cota da esteira) e bases
    const L = [];
    for (const [x, top] of [[XE0 + 14, YV], [XC0, YR + 12], [XC1, YR + 12], [XE1 - 14, YV]]) for (const z of [ZF + 4, ZB - 4]) L.push([x, (YB + top) / 2, z, 36, top - YB, 36]);
    for (const z of [ZF + 7, ZB - 7]) L.push([(XE0 + XE1) / 2, -10, z, XE1 - XE0, 30, 14]);
    for (const z of [ZF, ZB]) L.push([(XE0 + XE1) / 2, YB - 30, z, XE1 - XE0 + 40, 60, 50]);
    for (const [a, b] of [[XE0, XC0], [XC1, XE1]]) for (const z of [ZF + 6, ZB - 6]) L.push([(a + b) / 2, YV + 14, z, b - a, 18, 18]);   // rebordo dos tectos dos vestíbulos
    for (const z of [ZF + 8, ZB - 8]) L.push([X0, YR + 20, z, XC1 - XC0 + 16, 16, 18]);
    inst(unitBox, mFrame, L);
    const feet = [];
    for (const x of [XE0 + 30, X0 - 180, X0 + 180, XE1 - 30]) for (const z of [ZF + 6, ZB - 6]) feet.push([x, FLOOR + 15, z]);
    inst(new THREE.CylinderGeometry(26, 32, 30, 16), mat.dark, feet);
  }
  // janela de inspecção: aro aparafusado, vidro laminado
  {
    const s = rrect(new THREE.Shape(), WX0 - 24, WY0 - 24, WX1 + 24, WY1 + 24, 34); s.holes.push(rrect(new THREE.Path(), WX0, WY0, WX1, WY1, 22));
    slabXY(s, ZF, 10, mat.dark);
    const gl = put(plate(null, WX1 - WX0, WY1 - WY0, mGlass), X0, (WY0 + WY1) / 2, ZF - 6); gl.renderOrder = 3;
    for (let i = 0; i <= 4; i++) { const x = WX0 - 12 + (i / 4) * (WX1 - WX0 + 24); boltZ(x, WY0 - 12, ZF + 12); boltZ(x, WY1 + 12, ZF + 12); }
    for (let i = 1; i <= 3; i++) { const y = WY0 - 12 + (i / 4) * (WY1 - WY0 + 24); boltZ(WX0 - 12, y, ZF + 12); boltZ(WX1 + 12, y, ZF + 12); }
  }
  // interior: revestimento de borracha, barras LED e a luz da câmara
  box(XC1 - XC0 - 12, YR - 6 + 40, 6, mLiner, X0, (YR - 6 - 40) / 2, ZBI + 3);
  for (const z of [ZFI - 14, ZBI + 16]) box(XC1 - XC0 - 90, 10, 16, mInLamp, X0, YR - 8, z, scene, false);
  {
    const L = new THREE.PointLight(0xf1f5ff, 1.25, 950, 0); L.position.set(X0, 400, -330); scene.add(L);
  }
  // porta de acesso à tremonha (frente, por baixo da esteira) e chapas
  box(330, 300, 7, mBody, X0, -310, ZF + 3.5);
  inst(new THREE.CylinderGeometry(9, 9, 70, 12), mat.chrome, [[X0 + 135, -270, ZF + 22], [X0 + 135, -350, ZF + 22]]);
  inst(unitBox, mat.dark, [[X0 - 160, -220, ZF + 8, 14, 50, 16], [X0 - 160, -400, ZF + 8, 14, 50, 16], [X0 + 135, -270, ZF + 11, 20, 16, 16], [X0 + 135, -350, ZF + 11, 20, 16, 16]]);
  put(plate(nameTex, 300, 70), X0, -80, ZF + 0.8);
  put(plate(warnTex, 92, 120), (XC1 + XE1) / 2, 105, ZF + 0.8);

  // ---------- cortinas de borracha: 4 filas (entrada, entrada da câmara, saída da câmara, saída)
  const CURT = [XE0 + 16, XC0, XC1, XE1 - 16], NS = 13, SWD = (OZ1 - OZ0) / NS, CTOP = YO - 12;
  inst(unitBox, mFrame, CURT.map((x) => [x, YO - 6, (OZ0 + OZ1) / 2, 16, 12, OZ1 - OZ0 + 20]));     // réguas de aperto
  const stripGeo = new THREE.BoxGeometry(5, 1, SWD - 1.6); stripGeo.translate(0, -0.5, 0);
  const strips = sh(new THREE.InstancedMesh(stripGeo, mRubber, CURT.length * NS)); strips.frustumCulled = false; scene.add(strips);
  const curt = CURT.map(() => ({ a: 0, v: 0 }));

  // =====================================================================
  // Turbinas centrífugas (granalha) no tecto
  // =====================================================================
  const turbLeds = [];
  {
    const dS = new THREE.Shape(); dS.moveTo(-100, -86); dS.lineTo(100, -86); dS.lineTo(100, 0); dS.absarc(0, 0, 100, 0, Math.PI, false); dS.lineTo(-100, -86);
    const dGeo = new THREE.ExtrudeGeometry(dS, { depth: 122, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 2, curveSegments: 28 }); dGeo.translate(0, 0, -61);
    const motorGeo = ribbed(70, 140); motorGeo.rotateX(Math.PI / 2);
    const flangeGeo = new THREE.CylinderGeometry(80, 80, 16, 32); flangeGeo.rotateX(Math.PI / 2);
    const cowlGeo = new THREE.CylinderGeometry(73, 71, 36, 32); cowlGeo.rotateX(Math.PI / 2);
    const coverGeo = new THREE.CylinderGeometry(58, 58, 14, 28); coverGeo.rotateX(Math.PI / 2);
    const mGrille = M(0xffffff, 0.4, 0.5, { map: grilleTex });
    TX.forEach((tx, i) => {
      put(sh(new THREE.Mesh(dGeo, mCast)), tx, YW, ZT);                                        // caixa da roda (forma em D)
      put(sh(new THREE.Mesh(coverGeo, mFrame)), tx, YW, ZT - 72);                              // tampa da alimentação
      put(sh(new THREE.Mesh(flangeGeo, mMotor)), tx, YW, -393);                                // flange do motor
      put(sh(new THREE.Mesh(motorGeo, mMotor)), tx, YW, -317);                                 // motor com alhetas
      put(sh(new THREE.Mesh(cowlGeo, mMotor)), tx, YW, -229);                                  // tampa do ventilador
      put(new THREE.Mesh(new THREE.CircleGeometry(66, 32), mGrille), tx, YW, -210.6);
      box(58, 40, 72, mMotor, tx, YW + 88, -330);                                              // caixa de terminais
      box(90, 18, 60, mFrame, tx, 521, -320);                                                  // berço do motor
      const led = put(new THREE.Mesh(new THREE.BoxGeometry(34, 7, 3), mLedT), tx, YW + 88, -400); turbLeds.push(led);
      const lp = put(plate(turbTex(i + 1), 104, 62), tx + (i ? 104.6 : -104.6), 560, ZT); lp.rotation.y = i ? Math.PI / 2 : -Math.PI / 2;
      for (let k = 0; k < 7; k++) { const a = (k / 6) * Math.PI; boltZ(tx + 91 * Math.cos(a), YW + 91 * Math.sin(a), -399); }
      for (const sx of [-1, 1]) boltZ(tx + sx * 90, 530, -399);
    });
    inst(unitBox, mFrame, TX.map((tx) => [tx, 516, ZT, 228, 8, 152]));                        // flanges das gargantas no tecto
    // gargantas no interior (de onde sai a granalha)
    inst(unitBox, mat.black, TX.map((tx) => [tx, YR - 10, ZT + 6, 170, 20, 110]));
  }

  // ---------- silo de granalha + separador de ar, válvulas doseadoras, visores de caudal
  const sights = [];
  {
    box(430, 160, 200, mBody, X0, 980, -700);                                                 // silo
    box(125, 240, 200, mBody, -3227.5, 1020, -700);                                           // separador de ar
    inst(unitBox, mFrame, [[X0, 1064, -700, 438, 10, 208], [-3227.5, 1144, -700, 133, 10, 208], [X0, 902, -700, 438, 8, 206]]);
    const louv = canvasTex(64, 64, (g) => { g.fillStyle = "#3a4048"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#9aa3ad"; for (let y = 2; y < 64; y += 8) g.fillRect(2, y, 60, 3); });
    put(plate(louv, 90, 120), -3227.5, 1050, -599.4);                                         // entrada de ar do separador
    put(plate(textPlate("SILO DE GRANALHA", "aço S230 · 450 kg"), 210, 46), X0 + 60, 990, -599.4);
    // pernas: traseiras até ao chão, dianteiras pousadas no tecto da câmara; travessa
    inst(unitBox, mFrame, [
      [-3270, (FLOOR + 900) / 2, -790, 40, 900 - FLOOR, 40], [-2755, (FLOOR + 900) / 2, -790, 40, 900 - FLOOR, 40],
      [-3150, (512 + 900) / 2, -588, 36, 388, 36], [-2750, (512 + 900) / 2, -588, 36, 388, 36],
      [(-3270 - 2755) / 2, -250, -790, 515, 30, 30],
    ]);
    const pyr = new THREE.ConeGeometry(1, 1, 4, 1, true); pyr.rotateY(Math.PI / 4); pyr.rotateX(Math.PI);
    inst(pyr, mBody, [...TX.map((tx) => [tx, 875, -700, 90 * Math.SQRT2, 50, 90 * Math.SQRT2]), [-2555, -195, -1080, 115 * Math.SQRT2, 270, 130 * Math.SQRT2]]);
    const sgGeo = new THREE.CylinderGeometry(27, 27, 38, 20);
    TX.forEach((tx) => {
      tube([V(tx, 852, -700), V(tx, 745, -700), V(tx, 690, -676), V(tx, 630, -608), V(tx, 602, -556), V(tx, 600, -526)], 22, mGalv, 40, 12);
      sights.push(put(new THREE.Mesh(sgGeo, mSightIdle), tx, 826, -700));
    });
    inst(unitBox, mat.dark, TX.map((tx) => [tx, 772, -700, 72, 52, 72]));                    // válvulas doseadoras
    inst(new THREE.CylinderGeometry(15, 15, 46, 14), mMotor, TX.map((tx) => [tx, 772, -642, 1, 1, 1, Math.PI / 2, 0, 0]));   // solenóides
    inst(new THREE.CylinderGeometry(31, 31, 8, 20), mFrame, TX.flatMap((tx) => [[tx, 849, -700], [tx, 803, -700]]));         // flanges dos visores
  }

  // ---------- elevador de alcatruzes (lado da entrada, atrás)
  const EX = -3400, EZ = -720;
  {
    box(100, 1460, 190, mBody, EX, 400, EZ);                                                 // caixa (y -330 … 1130)
    box(130, 290, 250, mBody, EX, FLOOR + 145, EZ);                                          // pé
    box(140, 90, 250, mBody, EX, 1175, EZ);                                                   // cabeça
    const hood = new THREE.CylinderGeometry(125, 125, 140, 24, 1, false, -Math.PI / 2, Math.PI); hood.rotateX(-Math.PI / 2); hood.rotateY(Math.PI / 2);
    put(sh(new THREE.Mesh(hood, mBody)), EX, 1220, EZ);
    inst(unitBox, mFrame, [-330, 40, 410, 780, 1130].map((y) => [EX, y, EZ, 112, 14, 202]).concat([[EX, -470, EZ + 128, 90, 120, 6]]));
    box(84, 300, 6, mat.dark, EX, 520, EZ + 97);
    put(plate(bucketTex, 64, 280), EX, 520, EZ + 100.6);                                     // visor dos alcatruzes
    box(70, 110, 110, mMotor, -3295, 1200, -770);                                            // redutor
    const em = put(sh(new THREE.Mesh(ribbed(48, 130), mMotor)), -3295, 1200, -890); em.rotation.x = Math.PI / 2;
    const ec = cyl(50, 30, mMotor, scene, 24); ec.rotation.x = Math.PI / 2; ec.position.set(-3295, 1200, -970);
    const ch = box(112, 56, 70, mBody, -3285, 1158, -650); ch.rotation.z = -0.46;          // calha de descarga para o separador
  }

  // ---------- tremonha de recuperação e parafuso sem-fim (atrás, ao nível do chão)
  const SX0 = -3335, SX1 = -2705, SZ = -680, SYT = -470, SYC = -495;
  let screw;
  {
    const w = new THREE.Shape(); w.moveTo(ZB, -60); w.lineTo(ZB, SYT); w.lineTo(SZ - 65, SYT); w.closePath();
    slabZY(w, XC0, XC1 - XC0, mBody);                                                         // tremonha (escoa para trás)
    const u = new THREE.Shape();
    u.moveTo(SZ - 65, SYT); u.lineTo(SZ - 65, SYC); u.absarc(SZ, SYC, 65, Math.PI, Math.PI * 2, false); u.lineTo(SZ + 65, SYT);
    u.lineTo(SZ + 60, SYT); u.lineTo(SZ + 60, SYC); u.absarc(SZ, SYC, 60, 0, Math.PI, true); u.lineTo(SZ - 60, SYT); u.closePath();
    slabZY(u, SX0, SX1 - SX0, mFrame);                                                        // calha em U (aberta)
    // hélice do parafuso (helicoide) + veio
    const L = SX1 - SX0 - 20, turns = L / 90, nu = Math.ceil(turns * 28), pos = [], idx = [];
    for (let i = 0; i <= nu; i++) { const t = i / nu, a = t * turns * Math.PI * 2, x = t * L, c = Math.cos(a), s = Math.sin(a); pos.push(x, 16 * c, 16 * s, x, 55 * c, 55 * s); }
    for (let i = 0; i < nu; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); hg.setIndex(idx); hg.computeVertexNormals();
    screw = put(sh(new THREE.Mesh(hg, M(0x9aa2ab, 0.8, 0.38, { side: THREE.DoubleSide }))), SX0 + 10, SYC, SZ);
    const sf = cyl(16, SX1 - SX0, mat.steel, scene, 14); sf.rotation.z = Math.PI / 2; sf.position.set((SX0 + SX1) / 2, SYC, SZ);
    inst(unitBox, mFrame, [SX0 + 80, X0, SX1 - 60].map((x) => [x, (FLOOR + SYC - 60) / 2, SZ, 40, SYC - 60 - FLOOR, 150]));
    box(70, 100, 110, mMotor, SX1 + 35, SYC, SZ);                                             // redutor
    const sm = put(sh(new THREE.Mesh(ribbed(44, 115), mMotor)), SX1 + 128, SYC, SZ); sm.rotation.z = Math.PI / 2;
    const sc = cyl(46, 26, mMotor, scene, 24); sc.rotation.z = Math.PI / 2; sc.position.set(SX1 + 198, SYC, SZ);
  }

  // =====================================================================
  // Colector de pó de cartuchos (atrás, lado da saída) e condutas de aspiração
  // =====================================================================
  const DCX = -2555, DCZ = -1080;
  {
    box(230, 780, 260, mBody, DCX, 330, DCZ);                                                 // corpo dos cartuchos
    box(240, 24, 270, mFrame, DCX, 732, DCZ);                                                 // câmara de ar limpo
    inst(unitBox, mFrame, [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [DCX + sx * 95, (FLOOR - 60) / 2, DCZ + sz * 110, 46, -60 - FLOOR, 46])));
    const rv = cyl(45, 110, mat.dark, scene, 20); rv.rotation.z = Math.PI / 2; rv.position.set(DCX, -370, DCZ);   // válvula rotativa
    const sl = cyl(30, 34, mat.black, scene, 16); sl.position.set(DCX, -430, DCZ);
    const dr = cyl(105, 170, M(0x2a5c8f, 0.3, 0.5), scene, 28); dr.position.set(DCX, -532, DCZ);  // bidão do pó
    box(170, 400, 8, mBody, DCX, 330, DCZ + 134);                                             // porta dos cartuchos
    inst(new THREE.CylinderGeometry(8, 8, 60, 10), mat.chrome, [[DCX + 66, 420, DCZ + 146], [DCX + 66, 240, DCZ + 146]]);
    put(plate(textPlate("COLECTOR DE PÓ", "8 cartuchos · pulsos de ar", 300, 80), 150, 40), DCX, 500, DCZ + 138.6);
    const hd = cyl(26, 210, mGalv, scene, 16); hd.rotation.z = Math.PI / 2; hd.position.set(DCX, 640, DCZ + 154);   // colector de ar dos pulsos
    inst(new THREE.CylinderGeometry(20, 20, 30, 14), mat.dark, [-70, 0, 70].map((dx) => [DCX + dx, 676, DCZ + 154]));
    // ventilador de extracção e chaminé
    const vo = cyl(112, 90, mBody, scene, 32); vo.position.set(DCX, 789, DCZ);
    put(sh(new THREE.Mesh(ribbed(55, 150), mMotor)), DCX, 909, DCZ);
    const vc = cyl(57, 30, mMotor, scene, 24); vc.position.set(DCX, 999, DCZ);
    const st1 = cyl(55, 680, mGalv, scene, 24); st1.position.set(DCX + 55, 1130, DCZ - 80);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(80, 56, 24), mGalv); cap.position.set(DCX + 55, 1510, DCZ - 80); scene.add(sh(cap));
    // condutas: câmara → colector; separador → colector
    tube([V(-2900, 380, -598), V(-2900, 380, -700), V(-2862, 380, -820), V(-2770, 380, -950), V(-2700, 380, -1010), V(-2668, 380, -1012)], 55, mGalv, 48, 16);
    tube([V(-3230, 1060, -798), V(-3230, 1060, -870), V(-3120, 1075, -905), V(-2900, 1075, -905), V(-2770, 1000, -960), V(-2702, 740, -1090), V(-2668, 640, -1100)], 44, mGalv, 64, 14);
    inst(new THREE.CylinderGeometry(64, 64, 14, 24), mFrame, [[-2900, 380, -606, 1, 1, 1, Math.PI / 2, 0, 0], [-2676, 380, -1012, 1, 1, 1, 0, 0, Math.PI / 2], [-2676, 640, -1100, 0.75, 1, 0.75, 0, 0, Math.PI / 2]]);
  }

  // =====================================================================
  // Jato húmido: tanque de lama com agitador, bomba de lama, mangueiras, bicos oscilantes
  // =====================================================================
  const TKX = -3150, TKZ = -1030, TKR = 170;
  let slurry, coupling, needle;
  const nozzles = [];
  {
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(TKR, TKR, 360, 40, 1, true), mStain); put(sh(wall), TKX, -290, TKZ);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(TKR, 90, 40, 1, true), mStain); cone.rotation.x = Math.PI; put(sh(cone), TKX, -515, TKZ);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(TKR + 2, 6, 8, 48), mStain); rim.rotation.x = Math.PI / 2; put(rim, TKX, -110, TKZ);
    slurry = new THREE.Mesh(new THREE.CircleGeometry(TKR - 2, 40), M(0xffffff, 0.15, 0.35, { map: swirlTex })); slurry.rotation.x = -Math.PI / 2; put(slurry, TKX, -150, TKZ);
    inst(unitBox, mFrame, [[TKX + 150, (FLOOR - 470) / 2, TKZ, 40, 150, 40], [TKX - 150, (FLOOR - 470) / 2, TKZ, 40, 150, 40], [TKX, (FLOOR - 470) / 2, TKZ + 150, 40, 150, 40], [TKX, (FLOOR - 470) / 2, TKZ - 150, 40, 150, 40], [TKX, -97, TKZ, 2 * TKR + 40, 26, 70]]);
    box(80, 60, 80, mMotor, TKX, -54, TKZ);                                                    // redutor do agitador
    put(sh(new THREE.Mesh(ribbed(42, 120), mMotor)), TKX, 36, TKZ);
    const ac = cyl(44, 22, mMotor, scene, 24); ac.position.set(TKX, 107, TKZ);
    const sh1 = cyl(10, 40, mat.steel, scene, 12); sh1.position.set(TKX, -130, TKZ);
    put(plate(textPlate("TANQUE DE LAMA", "óxido de alumínio + água", 300, 80), 120, 32), TKX, -200, TKZ + TKR + 1.5);
    // bomba de lama no seu skid
    const PX = -2920, PY = -495, PZ = -900;
    box(290, 40, 190, mFrame, -2830, FLOOR + 20, PZ);
    box(60, 46, 110, mFrame, PX, -557, PZ);
    const vol = cyl(78, 70, mat.dark, scene, 32); vol.rotation.z = Math.PI / 2; vol.position.set(PX, PY, PZ);    // voluta
    box(50, 70, 80, mMotor, -2860, PY, PZ);                                                   // suporte de rolamentos
    coupling = cyl(30, 22, M(0xffffff, 0.3, 0.5, { map: stripeTex }), scene, 20); coupling.rotation.z = Math.PI / 2; coupling.position.set(-2824, PY, PZ);
    const gGeo = new THREE.CylinderGeometry(44, 44, 44, 20, 1, true, 0, Math.PI * 1.25); gGeo.rotateZ(Math.PI / 2);
    put(new THREE.Mesh(gGeo, M(0xffffff, 0.2, 0.5, { map: perfTex, alphaTest: 0.5, side: THREE.DoubleSide })), -2824, PY, PZ).rotation.x = -0.4;   // protecção perfurada
    const pm = put(sh(new THREE.Mesh(ribbed(58, 100), mMotor)), -2763, PY, PZ); pm.rotation.z = Math.PI / 2;
    const pc = cyl(60, 22, mMotor, scene, 24); pc.rotation.z = Math.PI / 2; pc.position.set(-2702, PY, PZ);
    put(new THREE.Mesh(new THREE.BoxGeometry(30, 8, 3), mLedW), -2860, PY + 30, PZ + 41.6);
    // aspiração do tanque e compressão até à parede traseira da cabine
    tube([V(TKX, -560, TKZ), V(TKX, -592, TKZ), V(-3080, -592, -960), V(-2992, -530, -905), V(-2955, -495, PZ)], 22, mat.steel, 40, 12);
    tube([V(PX, -420, PZ), V(PX, -200, PZ - 4), V(-2945, 60, -842), V(-2955, 200, -720), V(-2955, NY, -655), V(-2955, NY, -640)], 22, mHose, 56, 12);
    tube([V(-3110, -30, -606), V(-3110, -48, -720), V(-3130, -72, -850), V(-3150, -100, -930)], 24, mat.steel, 32, 12);   // retorno da lama ao tanque
    // manómetro da compressão
    const gb = cyl(34, 16, mat.chrome, scene, 24); gb.rotation.x = Math.PI / 2; gb.position.set(PX, -300, PZ + 34);
    const gtex = plateTex(128, 128, (g) => {
      g.fillStyle = "#f6f6f2"; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      g.strokeStyle = "#c62828"; g.lineWidth = 7; g.beginPath();
      g.arc(64, 64, 50, Math.PI * 0.75 + (8 / 10) * Math.PI * 1.5, Math.PI * 2.25); g.stroke();
      g.strokeStyle = "#222"; g.lineWidth = 2; g.fillStyle = "#222"; g.font = "700 14px Arial"; g.textAlign = "center"; g.textBaseline = "middle";
      for (let p = 0; p <= 10; p++) { const a = Math.PI * 0.75 + (p / 10) * Math.PI * 1.5, c = Math.cos(a), s = Math.sin(a); g.beginPath(); g.moveTo(64 + 46 * c, 64 + 46 * s); g.lineTo(64 + 56 * c, 64 + 56 * s); g.stroke(); if (p % 2 === 0) g.fillText(String(p), 64 + 34 * c, 64 + 34 * s); }
      g.font = "600 12px Arial"; g.fillText("bar", 64, 92);
    });
    put(new THREE.Mesh(new THREE.CircleGeometry(31, 28), new THREE.MeshBasicMaterial({ map: gtex, toneMapped: false })), PX, -300, PZ + 42.6);
    needle = put(new THREE.Mesh(new THREE.BoxGeometry(3, 26, 1.5).translate(0, 11, 0), M(0xc62828, 0, 0.5)), PX, -300, PZ + 43.5);
    // colector de lama e ar na parede traseira, filtro-regulador de ar e mangueira de ar
    put(rbox(290, 50, 42, 10, mFrame), X0, NY, -621);
    box(60, 130, 40, mat.dark, -3140, 270, -622);
    const bowl = cyl(18, 60, M(0xd8e2ea, 0.1, 0.1, { transparent: true, opacity: 0.6 }), scene, 16); bowl.position.set(-3140, 175, -622);
    tube([V(-3140, 210, -644), V(-3125, 200, -660), V(-3098, 220, -648), V(-3090, NY, -636)], 9, mHose, 24, 8);
    // bicos de jato húmido (rótula na parede traseira; oscilam ao longo da lima)
    const noz = new THREE.LatheGeometry([V(0, 0, 0), V(21, 0, 0), V(21, 16, 0), V(16, 20, 0), V(16, 66, 0), V(12, 72, 0), V(12, 104, 0), V(8, 118, 0), V(5, 122, 0), V(3.5, 122, 0)].map((p) => new THREE.Vector2(p.x, p.y)), 20);
    inst(new THREE.SphereGeometry(24, 18, 12), mat.dark, NX.map((x) => [x, NY, ZBI + 4, 1, 1, 0.6]));
    for (const x of NX) { const n = put(sh(new THREE.Mesh(noz, mat.chrome)), x, NY, ZBI + 6); nozzles.push({ m: n, x, pv: V(x, NY, ZBI + 6), dir: V(0, -1, 0), tip: V(), ret: 84 }); }
  }

  // =====================================================================
  // Comando: consola com HMI (virada para +z), coluna luminosa, luz de trabalho, cabos
  // =====================================================================
  const HW = 512, HH = 320;
  const panelTex = canvasTex(HW, HH, () => {}); panelTex.wrapS = panelTex.wrapT = THREE.ClampToEdgeWrapping;
  const pg = panelTex.image.getContext("2d");
  {
    const con = new THREE.Group(); con.position.set(-3318, 0, -100); con.rotation.y = 0.38; scene.add(con);
    box(220, 14, 180, mat.dark, 0, FLOOR + 7, 0, con);
    box(80, 270 - FLOOR, 80, mFrame, 0, (270 + FLOOR) / 2, 0, con);
    box(120, 40, 60, mFrame, 0, 290, -10, con);
    const hd = new THREE.Group(); hd.position.set(0, 420, 0); hd.rotation.x = -0.3; con.add(hd);
    put(rbox(260, 210, 78, 12, mBody), 0, 0, 0, hd);
    box(214, 138, 4, mat.black, 0, 24, 39, hd);
    put(new THREE.Mesh(new THREE.PlaneGeometry(204, 127.5), new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false })), 0, 24, 41.2, hd);
    const ctex = plateTex(512, 112, (g, w, h) => {
      g.fillStyle = "#d9dde1"; g.fillRect(0, 0, w, h); g.fillStyle = "#16202c"; g.font = "700 17px Arial"; g.textAlign = "center"; g.textBaseline = "middle";
      [["GRANALHA", -94], ["HÚMIDO", -50], ["LIGAR", 4], ["PARAR", 48], ["EMERG.", 98]].forEach(([t, x]) => g.fillText(tr(t), ((x + 120) / 240) * w, 18));
    });
    put(plate(ctex, 240, 52), 0, -70, 39.4, hd);
    const btn = (r, h, m, x) => { const o = cyl(r, h, m, hd, 20); o.rotation.x = Math.PI / 2; o.position.set(x, -78, 39 + h / 2); return o; };
    btn(10, 10, mLampShot, -94); btn(10, 10, mLampWet, -50);
    btn(11, 9, M(0x1c9a48, 0.1, 0.4), 4); btn(11, 9, M(0xc4161c, 0.1, 0.4), 48);
    btn(17, 5, mat.yellow, 98); btn(12, 16, M(0xc4161c, 0.1, 0.4), 98);
  }
  // coluna luminosa no tecto do vestíbulo de saída
  {
    const x = XE1 - 34, z = ZB + 34;
    const b = cyl(22, 14, mat.dark, scene, 20); b.position.set(x, YV + 17, z);
    const p = cyl(8, 110, mat.alu, scene, 12); p.position.set(x, YV + 79, z);
    [[mTowG, YV + 158], [mTowA, YV + 202], [mTowR, YV + 246]].forEach(([m, y]) => { const l = cyl(25, 42, m, scene, 24); l.position.set(x, y, z); });
    const c = cyl(25, 12, mat.dark, scene, 24); c.position.set(x, YV + 273, z);
  }
  // luz de trabalho LED de pescoço flexível no tecto do vestíbulo de saída, sobre a lima acabada
  {
    const b0 = V(XE1 - 40, YV + 10, ZF - 42), h0 = V(XE1 + 78, 352, -372), aim = V(XE1 + 150, 12, Z0);
    const bs = cyl(30, 20, mat.dark, scene, 20); bs.position.set(b0.x, b0.y + 10, b0.z);
    tube([V(b0.x, b0.y + 18, b0.z), V(b0.x + 6, 380, b0.z - 8), V(XE1 + 20, 430, -322), V(h0.x - 18, 392, h0.z + 14), h0], 7, mat.black, 40, 8);
    const hd = new THREE.Group(); hd.position.copy(h0); hd.quaternion.setFromUnitVectors(Y, aim.clone().sub(h0).normalize().negate()); scene.add(hd);
    const c = cyl(36, 74, mat.aluDark, hd, 28); c.position.y = -12;
    const f = cyl(39, 10, mat.dark, hd, 28); f.position.y = -50;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(31, 28), mat.lamp); lens.rotation.x = Math.PI / 2; lens.position.y = -55.5; hd.add(lens);
  }
  // cabos dos motores das turbinas → caleira → conduta até à consola
  {
    box(440, 12, 52, mGalv, X0, 470, ZF + 26);
    for (const tx of TX) tube([V(tx + 22, YW + 106, -330), V(tx + 62, YW + 100, -305), V(tx + 84, YW + 10, -262), V(tx + 88, 530, -214), V(tx + 86, 480, -206)], 6.5, mat.black, 32, 8);
    tube([V(-3154, 467, -214), V(-3156, 425, -214), V(-3160, -470, -214), V(-3164, -556, -184), V(-3205, -596, -142), V(-3298, -598, -112)], 12, mat.black, 48, 10);
  }

  // parafusos (uma única malha instanciada)
  inst(new THREE.CylinderGeometry(6.5, 6.5, 6, 6), mat.chrome, bolts);

  // =====================================================================
  // Partículas — dois conjuntos, 500 pontos no total:
  //   A (pontos nítidos): granalha de aço · gotas de lama   B (nuvem suave): pó da granalha · névoa de lama
  // =====================================================================
  const dotTex = canvasTex(32, 32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.5, "rgba(255,255,255,1)"); r.addColorStop(0.8, "rgba(255,255,255,0.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); });
  const fogTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(0.45, "rgba(255,255,255,0.42)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  function makePool(n, size, tex) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = -3000;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    const o = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.01 }));
    o.position.set(X0, 0, Z0); o.frustumCulled = false; o.renderOrder = 2; scene.add(o);       // coordenadas locais: origem no centro da lima
    return { o, n, pos, col, geo, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), st: new Uint8Array(n), next: 0, alive: 0 };
  }
  const PA = makePool(330, 9, dotTex), PB = makePool(170, 40, fogTex);
  function spawn(Q, x, y, z, vx, vy, vz, r, g, b, a, max, s) {
    let i = -1;
    for (let k = 0; k < Q.n; k++) { const j = (Q.next + k) % Q.n; if (!Q.st[j]) { i = j; break; } }
    if (i < 0) return;
    Q.next = (i + 1) % Q.n; const k = i * 3, c = i * 4;
    Q.pos[k] = x; Q.pos[k + 1] = y; Q.pos[k + 2] = z; Q.vel[k] = vx; Q.vel[k + 1] = vy; Q.vel[k + 2] = vz;
    Q.col[c] = r; Q.col[c + 1] = g; Q.col[c + 2] = b; Q.col[c + 3] = a;
    Q.life[i] = 0; Q.max[i] = max; Q.st[i] = s; Q.alive++;
  }
  const kill = (Q, i) => { Q.st[i] = 0; Q.alive--; Q.pos[i * 3 + 1] = -3000; Q.col[i * 4 + 3] = 0; };
  const XL = XC1 - X0 - 10, ZL0 = ZBI - Z0 + 8, ZL1 = ZFI - Z0 - 8, YTOP = YR - 6;      // limites da câmara (local)
  const limaTopY = () => 2 + P.h + 0.4;
  const surf = (x, z) => (x > -limaLen() / 2 && x < limaLen() / 2 + 60 && Math.abs(z) < P.b * 0.45 ? (x > limaLen() / 2 ? 2 + P.h * 0.6 : limaTopY()) : Math.abs(z) < 118 ? 0.5 : -60);
  // granalha: cada turbina lança um leque estreito sobre metade da lima (mancha quente)
  function emitShot(t) {
    const sx = TX[t] - X0 + (Math.random() - 0.5) * 40, sy = YR - 24, sz = ZT - Z0 + 6 + (Math.random() - 0.5) * 24;
    const tx = (t ? 70 : -70) + (Math.random() - 0.5) * 150, ty = limaTopY(), tz = (Math.random() - 0.5) * 36;
    const dx = tx - sx, dy = ty - sy, dz = tz - sz, d = Math.hypot(dx, dy, dz), sp = 2000 + Math.random() * 500, v = 0.45 + Math.random() * 0.3;
    spawn(PA, sx, sy, sz, (dx / d) * sp, (dy / d) * sp, (dz / d) * sp, v, v * 1.02, v * 1.07, 1, 0.6 + Math.random() * 0.3, 1);
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function emitWet(j) {
    const n = nozzles[j];
    _a.set(1, 0, 0).cross(n.dir).normalize(); _b.copy(n.dir).cross(_a).normalize();
    const u = (Math.random() - 0.5) * 0.5, w = (Math.random() - 0.5) * 0.5, sp = 1300 + Math.random() * 500;
    const dx = n.dir.x + _a.x * u + _b.x * w, dy = n.dir.y + _a.y * u + _b.y * w, dz = n.dir.z + _a.z * u + _b.z * w, dl = Math.hypot(dx, dy, dz);
    spawn(PA, n.tip.x - X0, n.tip.y, n.tip.z - Z0, (dx / dl) * sp, (dy / dl) * sp, (dz / dl) * sp, 0.84, 0.92, 1, 0.8, 0.6, 4);
  }
  const puff = (x, y, z, wet) => (wet
    ? spawn(PB, x, y + 4, z, (Math.random() - 0.5) * 560, 70 + Math.random() * 220, (Math.random() - 0.5) * 440, 0.86, 0.93, 1, 0, 1.1 + Math.random() * 0.8, 2)
    : spawn(PB, x, y + 4, z, (Math.random() - 0.5) * 420, 90 + Math.random() * 170, (Math.random() - 0.5) * 320, 0.6, 0.58, 0.54, 0, 0.9 + Math.random() * 0.7, 3));
  function walls(Q, i, k) {
    if (Q.pos[k] < -XL || Q.pos[k] > XL) { Q.vel[k] *= -0.4; Q.pos[k] = Math.max(-XL, Math.min(XL, Q.pos[k])); }
    if (Q.pos[k + 2] < ZL0 || Q.pos[k + 2] > ZL1) { Q.vel[k + 2] *= -0.4; Q.pos[k + 2] = Math.max(ZL0, Math.min(ZL1, Q.pos[k + 2])); }
    if (Q.pos[k + 1] > YTOP) { Q.vel[k + 1] = -Math.abs(Q.vel[k + 1]) * 0.3; Q.pos[k + 1] = YTOP; }
  }
  // A: 1 = granalha em voo, 2 = granalha a ressaltar, 4 = gota em voo, 5 = salpico
  function stepA(h) {
    const Q = PA, p = Q.pos, v = Q.vel;
    for (let i = 0; i < Q.n; i++) {
      const s = Q.st[i]; if (!s) continue;
      const k = i * 3; Q.life[i] += h;
      if (s === 1 || s === 4) {
        v[k + 1] -= (s === 4 ? 2500 : 1800) * h; p[k] += v[k] * h; p[k + 1] += v[k + 1] * h; p[k + 2] += v[k + 2] * h;
        const sf = surf(p[k], p[k + 2]);
        if (p[k + 1] <= sf) {
          if (sf < -50) { kill(Q, i); continue; }
          p[k + 1] = sf + 0.6;
          if (s === 4) {
            if (Math.random() < 0.45) puff(p[k], sf, p[k + 2], true);
            Q.st[i] = 5; v[k] = v[k] * 0.2 + (Math.random() - 0.5) * 520; v[k + 2] = (Math.random() - 0.5) * 520; v[k + 1] = 150 + Math.random() * 300; Q.max[i] = Q.life[i] + 0.1 + Math.random() * 0.12;
          } else {
            if (Math.random() < 0.2) puff(p[k], sf, p[k + 2], false);
            Q.st[i] = 2; v[k] = v[k] * 0.25 + (Math.random() - 0.5) * 1000; v[k + 2] = v[k + 2] * 0.2 + (Math.random() - 0.5) * 1000; v[k + 1] = Math.abs(v[k + 1]) * 0.22 + Math.random() * 480;
            Q.max[i] = Q.life[i] + 0.16 + Math.random() * 0.14;
          }
        }
      } else {
        v[k + 1] -= 9810 * h; p[k] += v[k] * h; p[k + 1] += v[k + 1] * h; p[k + 2] += v[k + 2] * h;
        if (v[k + 1] < 0 && p[k + 1] <= surf(p[k], p[k + 2]) + 0.2) { kill(Q, i); continue; }     // cai pela malha da esteira
      }
      walls(Q, i, k);
      const fl = Q.life[i] / Q.max[i];
      if (fl >= 1 || p[k + 1] < -50) { kill(Q, i); continue; }
      Q.col[i * 4 + 3] = (s >= 4 ? 0.8 : 1) * Math.min(1, (1 - fl) * 4);
    }
  }
  // B: 2 = névoa de lama, 3 = pó de granalha (sobem devagar e dissipam-se)
  function stepB(h) {
    const Q = PB, p = Q.pos, v = Q.vel, dr = Math.exp(-2.4 * h);
    for (let i = 0; i < Q.n; i++) {
      const s = Q.st[i]; if (!s) continue;
      const k = i * 3; Q.life[i] += h;
      v[k] *= dr; v[k + 2] *= dr; v[k + 1] = v[k + 1] * dr + 30 * h;
      p[k] += v[k] * h; p[k + 1] += v[k + 1] * h; p[k + 2] += v[k + 2] * h;
      walls(Q, i, k);
      const fl = Q.life[i] / Q.max[i];
      if (fl >= 1) { kill(Q, i); continue; }
      Q.col[i * 4 + 3] = (s === 2 ? 0.42 : 0.26) * Math.sin(Math.PI * fl);
    }
  }

  // =====================================================================
  // Processo: na paragem do slot 19 a lima leva o acabamento P.finish até ao fim da janela de jato
  // =====================================================================
  const st = { lima: null, s: -1, p: 0, done: false, n: 0, from: new THREE.Color(0x3b3a3e) };
  UP.addStation({
    slot: SLOT, name: "Jateamento",
    onDwell(l, s) {
      if (st.lima !== l) { st.lima = l; st.p = 0; st.done = false; st.from.copy(l.color); }
      st.s = s;
      if (st.done) return;
      const p = Math.max(0, Math.min(1, (s - B0) / (B1 - B0)));
      if (p > st.p) { UP.blendFinish(l, P.finish, p >= 1 ? 1 : (p - st.p) / (1 - st.p)); st.p = p; }   // chega exactamente ao alvo em p = 1
      if (p >= 1) { l.finishName = P.finish; st.done = true; st.n++; }
    },
  });

  // ---------- HMI da consola
  const hex = (c) => "#" + c.getHexString();
  const _tc = new THREE.Color();
  const dec = (v, n = 1) => (LANG.cur === "en" ? v.toFixed(n) : v.toFixed(n).replace(".", ","));
  function phaseText(mode, s) {
    if (UP.waiting) return "Linha em espera (caixa cheia)";
    if (s < 0) return UP.phase === "move" ? "A avançar · lima a entrar" : "Sem lima na câmara";
    if (s < B0) return "Lima na câmara · cortinas fechadas";
    if (s < B1) return (mode === "shot" ? "A jatear com granalha " : "Jato húmido em curso ") + Math.round(((s - B0) / (B1 - B0)) * 100) + " %";
    return mode === "shot" ? "Sopro de limpeza (ar)" : "Enxaguamento e sopro (ar)";
  }
  function drawPanel(mode, s, read, l) {
    const g = pg, shot = mode === "shot", acc = shot ? "#f59e0b" : "#38bdf8";
    g.fillStyle = "#0a111d"; g.fillRect(0, 0, HW, HH);
    g.fillStyle = "#15294b"; g.fillRect(0, 0, HW, 38);
    g.textBaseline = "middle"; g.textAlign = "left"; g.fillStyle = "#eaf1fd"; g.font = "700 19px Arial, sans-serif"; g.fillText(tr("JATEAMENTO · cinza especial"), 12, 20);
    g.textAlign = "right"; g.fillStyle = "#9fb3d1"; g.font = "15px Arial, sans-serif"; g.fillText(tr("Limas jateadas: ") + st.n, HW - 12, 20);
    // modo
    g.fillStyle = "#101c31"; g.fillRect(12, 48, 270, 92); g.fillStyle = acc; g.fillRect(12, 48, 7, 92);
    g.textAlign = "left"; g.fillStyle = "#7f93b3"; g.font = "600 13px Arial"; g.fillText(tr("MODO"), 30, 62);
    g.fillStyle = "#ffffff"; g.font = "800 29px Arial"; g.fillText(tr(shot ? "GRANALHA SECA" : "JATO HÚMIDO"), 30, 93);
    g.fillStyle = acc; g.font = "600 16px Arial"; g.fillText(tr(shot ? "→ cinza mate especial" : "→ cinza metálico"), 30, 123);
    // leituras
    const rows = shot
      ? [["Turbina 1", `${dec(read.a1)} A`], ["Turbina 2", `${dec(read.a2)} A`], ["Granalha", "S230 · 2 × 90 kg/min"], ["Colector ΔP", "1,2 kPa"]]
      : [["Bomba de lama", `${dec(read.bar)} bar`], ["Ar dos bicos", read.air > 0 ? `${dec(read.air)} bar` : "fechado"], ["Bicos", "2 × Ø 8 mm · oscilam"], ["Lama", "óxido de alumínio"]];
    rows.forEach(([k, v], i) => {
      const y = 60 + i * 23; g.textAlign = "left"; g.fillStyle = "#8fa3c0"; g.font = "14px Arial"; g.fillText(tr(k), 296, y);
      g.textAlign = "right"; g.fillStyle = "#e6eefb"; g.font = "700 14px Arial"; g.fillText(tr(v), HW - 12, y);
    });
    // fase + progresso
    const ph = phaseText(mode, s), prog = s < 0 ? 0 : Math.max(0, Math.min(1, (s - B0) / (B1 - B0)));
    g.textAlign = "left"; g.fillStyle = s >= B0 && s < B1 ? acc : "#c9d6ea"; g.font = "700 17px Arial"; g.fillText(tr(ph), 12, 162);
    g.fillStyle = "#1a2740"; g.fillRect(12, 178, HW - 24, 12); g.fillStyle = acc; g.fillRect(12, 178, (HW - 24) * prog, 12);
    // amostras de cor: entrada → agora → alvo
    g.fillStyle = "#101c31"; g.fillRect(0, 204, HW, HH - 204);
    const sw = [["Entrada", hex(st.from)], ["Lima agora", l ? hex(l.color) : "#333a44"], ["Alvo", hex(_tc.set(UP.FINISH[mode].color))]];
    sw.forEach(([t, c], i) => {
      const x = 20 + i * 166; g.fillStyle = c; g.fillRect(x, 230, 120, 52); g.strokeStyle = "#3a4d6e"; g.lineWidth = 2; g.strokeRect(x, 230, 120, 52);
      g.fillStyle = "#8fa3c0"; g.font = "600 13px Arial"; g.textAlign = "left"; g.fillText(tr(t), x, 218);
      if (i < 2) { g.fillStyle = "#5d7396"; g.font = "700 26px Arial"; g.fillText("→", x + 128, 256); }
    });
    g.fillStyle = "#c9d6ea"; g.font = "14px Arial"; g.textAlign = "left";
    g.fillText(tr(shot ? "Acabamento: cinza mate (Ra ≈ 1,6 µm)" : "Acabamento: cinza metálico acetinado"), 20, 302);
    panelTex.needsUpdate = true;
  }

  // ---------- etiquetas e vista
  addTag({ text: "5 · Jateamento — cinza especial", at: () => V(X0, 1560, -560), min: 2500, big: true });
  addTag({ text: () => (P.finish === "wet" ? "Modo: jato húmido (cinza metálico)" : "Modo: granalha (cinza mate)"), at: () => V(X0, 1150, -600), max: 3200 });
  addView("jato", "Jateamento", [-2080, 1450, 1650], [-2960, 400, -620]);

  // =====================================================================
  // Animação
  // =====================================================================
  let clock = 0, panelKey = "", panelT = 0, shotAcc = 0, wetAcc = 0, gaugeP = 0, amps = 0, air = 0, sweep = 0;
  const _t = new THREE.Vector3(), POOLS = [PA, PB], read = { a1: 0, a2: 0, bar: 0, air: 0 };
  function updateCurtains(dt, flutter) {
    const yb = Math.max(20, 2 + P.h + 10), L = CTOP - yb, half = limaLen() / 2;
    const n = Math.max(1, Math.ceil(dt / 0.016)), h = dt / n;
    CURT.forEach((cx, r) => {
      let push = 0;
      for (const l of UP.limas) { if (l.slot < SLOT - 2 || l.slot > SLOT + 1) continue; const x = l.g.position.x; if (cx > x - half - 10 && cx < x + half + 70) push = 1; }
      const c = curt[r];
      for (let k = 0; k < n; k++) { c.v += (80 * (0.26 * push - c.a) - 10 * c.v) * h; c.a += c.v * h; }
      for (let i = 0; i < NS; i++) {
        const a = c.a * (0.85 + 0.3 * frac(i * 0.618)) + flutter * Math.sin(clock * 19 + i * 1.7 + r * 2.1);
        dmy.position.set(cx, CTOP, OZ0 + (i + 0.5) * SWD); dmy.rotation.set(0, 0, a); dmy.scale.set(1, L, 1); dmy.updateMatrix();
        strips.setMatrixAt(r * NS + i, dmy.matrix);
      }
    });
    strips.instanceMatrix.needsUpdate = true;
  }
  updateCurtains(0, 0);

  addSystem({
    draw(dt) {
      clock += dt;
      const mode = P.finish === "wet" ? "wet" : "shot", shot = mode === "shot";
      const here = UP.limaAt(SLOT);
      const active = UP.phase === "dwell" && here && st.lima === here && !UP.waiting;
      const s = UP.phase === "dwell" && here && st.lima === here ? st.s : -1;
      const blasting = active && s >= B0 && s < B1;

      // indicadores: conjunto activo realçado
      setLamp(mLedT, shot, blasting && shot ? 2.6 + Math.sin(clock * 14) * 0.6 : 1.8);
      setLamp(mLedW, !shot, blasting && !shot ? 2.6 + Math.sin(clock * 14) * 0.6 : 1.8);
      setLamp(mLampShot, shot); setLamp(mLampWet, !shot);
      setLamp(mTowG, !blasting && !UP.waiting); setLamp(mTowA, blasting && Math.sin(clock * 8) > -0.2); setLamp(mTowR, UP.waiting);

      // granalha: elevador, parafuso e visores de caudal só no modo granalha
      if (shot) { bucketTex.offset.y -= dt * 0.8; screw.rotation.x -= dt * 5.5; }
      for (const sg of sights) sg.material = shot && blasting ? mSightFlow : mSightIdle;
      if (shot && blasting) sightTex.offset.y += dt * 1.6;
      // jato húmido: agitador, bomba, manómetro, bicos oscilantes
      if (!shot) { slurry.rotation.z -= dt * 1.4; coupling.rotation.x += dt * 26; }
      const kq = 1 - Math.exp(-dt * 4);
      gaugeP += ((!shot ? (blasting ? 3.8 : 1.4) : 0) - gaugeP) * kq;
      air += ((!shot && blasting ? 5.5 : 0) - air) * kq;
      amps += ((shot ? (blasting ? 18.6 : 7.2) : 0) - amps) * kq;
      needle.rotation.z = 2.356 - (gaugeP / 10) * 4.712;
      if (!shot && blasting) sweep += dt;
      const ty = limaTopY();
      // bicos: avançam no modo húmido, recolhem-se nas mangas da parede no modo granalha
      nozzles.forEach((n, j) => {
        n.ret += ((shot ? 84 : 0) - n.ret) * (1 - Math.exp(-dt * 3));
        const off = (j ? 1 : -1) * (40 + 55 * Math.sin(sweep * 3.1 + j * Math.PI));
        _t.set(n.x + off, ty, Z0);
        n.dir.subVectors(_t, n.pv).normalize(); n.m.quaternion.setFromUnitVectors(Y, n.dir);
        n.m.position.copy(n.pv).addScaledVector(n.dir, -n.ret);
        n.tip.copy(n.m.position).addScaledVector(n.dir, 122);
      });

      // a camada de dentes também fica com o acabamento do jato (só nas limas jateadas; repõe-se quando a lima é reciclada)
      for (const l of UP.limas) {
        const tm = l.tm; if (!tm) continue;
        const k = l === st.lima && l.slot === SLOT ? (st.done ? 1 : st.p) : (l.slot >= SLOT && (l.finishName === "shot" || l.finishName === "wet") ? 1 : 0);
        if (k > 0 || tm.userData.jato) {
          tm.metalness = 0.85 + (Math.min(0.72, l.metal) - 0.85) * k; tm.roughness = 0.4 + (Math.max(0.36, l.rough) - 0.4) * k;   // cetim
          tm.userData.jato = k > 0;
        }
      }

      // cortinas (o ar das turbinas/bicos agita-as um pouco durante o jato)
      updateCurtains(dt, blasting ? 0.035 : 0);

      // partículas
      if (dt > 0) {
        const n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
        for (let k = 0; k < n; k++) {
          if (blasting) {
            if (shot) { shotAcc += 1150 * h; while (shotAcc >= 1) { shotAcc -= 1; emitShot((Math.random() * 2) | 0); } }
            else if (nozzles[0].ret < 6) { wetAcc += 950 * h; while (wetAcc >= 1) { wetAcc -= 1; emitWet((Math.random() * 2) | 0); } }
          }
          if (PA.alive > 0) stepA(h);
          if (PB.alive > 0) stepB(h);
        }
        for (const Q of POOLS) { Q.geo.attributes.position.needsUpdate = true; Q.geo.attributes.color.needsUpdate = true; }
      }

      // HMI (no máximo ~10×/s)
      const now = performance.now();
      if (now - panelT > 100) {
        read.a1 = amps * (1 + Math.sin(clock * 3.3) * 0.01); read.a2 = amps * (0.985 + Math.sin(clock * 2.7) * 0.01); read.bar = gaugeP; read.air = air;
        const key = `${LANG.rev}|${mode}|${phaseText(mode, s)}|${st.n}|${here ? here.color.getHex() : 0}|${dec(read.a1)}|${dec(gaugeP)}|${dec(air)}`;
        if (key !== panelKey) { panelKey = key; panelT = now; drawPanel(mode, s, read, s >= 0 ? here : null); }
      }
    },
  });

  // contagem de malhas desta estação (inspecção)
  const objs = []; scene.traverse((o) => { if (!pre.has(o) && (o.isMesh || o.isPoints)) objs.push(o); });
  window.__jato = { st, meshes: objs.length, objs, PA, PB, nozzles, get alive() { return PA.alive + PB.alive; } };
}
