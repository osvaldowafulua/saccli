// =====================================================================
// Exterior da fábrica SACFILE: revestimento exterior da nave (painel sandwich) com cobertura, letreiro luminoso
// SACFILE em letras vermelhas, escritório central em vidro e betão, estacionamento, camião de encomendas no cais,
// arruamentos, passeios e vegetação. A câmara pode sair da nave (vistas "Exterior" e "Escritório").
// =====================================================================
{
  const GY = FLOOR - 2, X = HALL.x, Z = HALL.z, H = HALL.h, TOP = FLOOR + H, W_ = 8000, DZ_ = 2200;
  const acRot = [];
  let person = null;
  const mAsph = M(0x3f4347, 0.05, 0.9), mKerb = M(0xc9ccd0, 0.1, 0.8), mGrass = M(0x4f7d3a, 0, 0.95), mConc = M(0xb8b4ad, 0.05, 0.75);
  const mPost = M(0x3b4148, 0.4, 0.5);
  const mGlassF = M(0x6fa8d6, 0.9, 0.08, { transparent: true, opacity: 0.55 }), mMullion = M(0x1f2933, 0.6, 0.4), mPanel = M(0xd3d8de, 0.4, 0.55);
  const mRed = M(0xe11d2e, 0.1, 0.45, { emissive: 0xff2030, emissiveIntensity: 1.6 });
  const carGlass = new THREE.MeshPhysicalMaterial({ color: 0x1b2a3a, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1 });
  const mTyre = M(0x15171a, 0.1, 0.9), mRim = M(0xd7dbe0, 0.95, 0.25), mTrim = M(0x111318, 0.3, 0.6), mLamp = M(0xfff7e0, 0.2, 0.2, { emissive: 0xfff1c8, emissiveIntensity: 1.2 });

  // ---------- terreno: asfalto à volta da nave, relva mais longe, passeios
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * X + 70000, 2 * Z + 70000), mGrass); ground.rotation.x = -Math.PI / 2; ground.position.y = GY - 40; ground.receiveShadow = true; scene.add(ground);
  // recinto: x de −X−15000 a X+24000, z de −Z−15000 a Z+30000 (o escritório e a avenida ficam dentro do muro)
  const XE = X + 24000, XWw = -X - 15000, ZS = Z + 30000, ZN = -Z - 15000;
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(XE - XWw, ZS - ZN), mAsph); yard.rotation.x = -Math.PI / 2; yard.position.set((XE + XWw) / 2, GY - 20, (ZS + ZN) / 2); yard.receiveShadow = true; scene.add(yard);
  // muro de vedação contínuo (betão, 2,4 m) com capeamento — só abre no portão da entrada
  const mWall = M(0xb9b6b0, 0.05, 0.8), mCap = M(0x8e9298, 0.1, 0.7);
  const wallSeg = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), w = box(len, 2400, 300, mWall, (x0 + x1) / 2, GY + 1200, (z0 + z1) / 2); w.rotation.y = -Math.atan2(z1 - z0, x1 - x0); const c = box(len, 120, 420, mCap, (x0 + x1) / 2, GY + 2460, (z0 + z1) / 2, scene, false); c.rotation.y = w.rotation.y; };
  const GATE = { x: X + 20000, w: 9000 };                                                         // único acesso: portão de correr para viaturas + portaria
  wallSeg(XWw, ZN, XE, ZN); wallSeg(XWw, ZN, XWw, ZS); wallSeg(XE, ZN, XE, ZS);
  wallSeg(XWw, ZS, GATE.x - GATE.w / 2, ZS); wallSeg(GATE.x + GATE.w / 2, ZS, XE, ZS);
  for (let x = XWw + 5000; x < XE; x += 5000) box(500, 2600, 500, mCap, x, GY + 1300, ZS, scene, false), box(500, 2600, 500, mCap, x, GY + 1300, ZN, scene, false);
  // avenida interna (E-O) em frente ao escritório e via de acesso do portão até à avenida e ao cais
  const AVZ = Z + 22500;
  box(XE - XWw - 6000, 14, 7000, M(0x34383c, 0.05, 0.9), (XE + XWw) / 2, GY + 3, AVZ, scene, false); for (let x = XWw + 4000; x < XE - 4000; x += 3000) box(1500, 16, 140, mat.label, x, GY + 12, AVZ, scene, false);
  box(7000, 14, ZS - DZ_, M(0x34383c, 0.05, 0.9), GATE.x, GY + 3, (ZS + DZ_) / 2, scene, false); for (let z = DZ_ + 2000; z < ZS - 1000; z += 3000) box(140, 16, 1500, mat.label, GATE.x, GY + 12, z, scene, false);
  for (const z of [AVZ - 3600, AVZ + 3600]) box(XE - XWw - 6000, 150, 300, mKerb, (XE + XWw) / 2, GY + 55, z, scene, false);

  // ---------- revestimento exterior da nave: painéis sandwich horizontais, soco de betão, cobertura a duas águas com beirais
  const extTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d6dbe1"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = "#b8c0c8"; g.fillRect(0, y, w, 5); g.fillStyle = "#e9edf1"; g.fillRect(0, y + 5, w, 3); } }, [1, 1]);
  const extWall = (len, x, z, rot, gap = null) => {
    const g = new THREE.Group(); g.position.set(x, FLOOR, z); g.rotation.y = rot; scene.add(g);
    const pieces = gap ? [[-len / 2, gap[0]], [gap[1], len / 2]] : [[-len / 2, len / 2]];
    for (const [a, b] of pieces) {
      const L = b - a, cx = (a + b) / 2;
      const t = extTex.clone(); t.needsUpdate = true; t.repeat.set(L / 2000, H / 2000);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(L, H + 500), M(0xffffff, 0.3, 0.55, { map: t })); p.position.set(cx, (H + 500) / 2, 0); p.receiveShadow = true; g.add(p);
      box(L, 1400, 160, M(0x8e9298, 0.05, 0.85), cx, 700, -60, g, false);                        // soco de betão
      if (L > 3000) box(L - 2000, 900, 40, mat.window, cx, 5200, -10, g, false);                // fita de janelas
      for (let xx = a + 1000; xx < b - 900; xx += 2000) box(80, 900, 60, mat.steelBlue, xx, 5200, -20, g, false);
      box(L, 300, 60, M(0x1f4f9e, 0.1, 0.6), cx, 1450, -20, g, false);                            // faixa azul da marca
    }
    if (gap) { const gw = gap[1] - gap[0], gc = (gap[0] + gap[1]) / 2, t = extTex.clone(); t.needsUpdate = true; t.repeat.set(gw / 2000, 1); const l = new THREE.Mesh(new THREE.PlaneGeometry(gw, H + 500 - 4900), M(0xffffff, 0.3, 0.55, { map: t })); l.position.set(gc, 4900 + (H + 500 - 4900) / 2, 0); g.add(l); box(gw + 400, 300, 600, M(0x9aa0a6, 0.3, 0.6), gc, 5100, -350, g, false); }   // lintel e pala do cais
    box(len + 200, 400, 300, M(0x9aa0a6, 0.3, 0.6), 0, H + 450, -100, g, false);                 // platibanda / beiral
    return g;
  };
  extWall(2 * X + 300, 0, -Z - 150, Math.PI); extWall(2 * X + 300, 0, Z + 150, 0);
  extWall(2 * Z + 300, -X - 150, 0, -Math.PI / 2); extWall(2 * Z + 300, X + 150, 0, Math.PI / 2, [-2200 - 2150, -2200 + 2150]);   // vão da porta do cais
  {   // cobertura exterior: duas águas suaves com clarabóias e caleiras (esconde-se com a cobertura interior na vista de topo)
    const half = new THREE.Mesh(new THREE.BoxGeometry(2 * X + 400, 60, Z + 400), M(0x8b9096, 0.4, 0.6));
    for (const s of [-1, 1]) { const r = half.clone(); r.position.set(0, TOP + 420 + 350, s * (Z / 2 + 50)); r.rotation.x = s * Math.atan2(700, Z); roofG.add(r); }
    box(2 * X + 400, 220, 500, M(0x7b8187, 0.5, 0.5), 0, TOP + 1200, 0, roofG, false);           // cumeeira
    for (const x of [-6000, -2000, 2000, 6000]) for (const s of [-1, 1]) box(1500, 60, Z - 2400, M(0xdfe7ee, 0.2, 0.3, { transparent: true, opacity: 0.6 }), x, TOP + 820, s * (Z / 2 + 50), roofG, false);
  }

  // ---------- letreiro luminoso SACFILE: letras vermelhas em caixa sobre a fachada da entrada (+z) e na fachada do cais (+x)
  const signTex = (w, h) => canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h); g.fillStyle = "#ff2a3a"; g.font = `900 ${Math.round(h * 0.78)}px Arial Black, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#ff6070"; g.shadowBlur = h * 0.12; g.fillText("SACFILE", w / 2, h / 2 + h * 0.04);
  });
  const letters = (x, y, z, rot, w) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
    const h = w * 0.22;
    box(w + 600, h + 300, 180, M(0x1b1f24, 0.4, 0.5), 0, 0, -120, g, false);                     // chapa de fundo preta
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTex(1024, 256), transparent: true, toneMapped: false })); m.position.z = -20; g.add(m);
    box(w + 560, h + 260, 60, mRed, 0, 0, -150, g, false);                                      // moldura luminosa vermelha por trás da chapa
    const spot = new THREE.PointLight(0xff3040, 1.2, w * 1.5); spot.position.set(0, -h, 600); g.add(spot);
    return g;
  };
  letters(0, FLOOR + H - 1000, Z + 400, 0, 9000);                       // fachada principal (+z), sobre a entrada
  letters(X + 400, FLOOR + H - 1000, -2500, Math.PI / 2, 6000);        // fachada do cais (+x)

  // ---------- escritório central: 3 pisos em vidro e betão, à frente da nave (+z), com entrada em pala
  {
    const OX = -2500, OZ = Z + 9500, W = 16000, D = 9000, FH = 3600, N = 3;
    for (let f = 0; f < N; f++) {
      const y0 = FLOOR + f * FH;
      box(W, 400, D, mConc, OX, y0 + 200, OZ);                                                   // laje
      // fachada em vidro contínuo com montantes; núcleo de betão (escadas/elevador) na traseira
      for (const [sx, sz, w, d] of [[0, 1, W, 60], [0, -1, W, 60], [1, 0, 60, D], [-1, 0, 60, D]]) {
        const gl = box(w, FH - 400, d, mGlassF, OX + sx * (W / 2), y0 + 400 + (FH - 400) / 2, OZ + sz * (D / 2), scene, false); gl.receiveShadow = true;
      }
      for (let x = -W / 2; x <= W / 2; x += 1500) for (const sz of [-1, 1]) box(120, FH - 400, 140, mMullion, OX + x, y0 + 400 + (FH - 400) / 2, OZ + sz * (D / 2), scene, false);
      for (let z = -D / 2; z <= D / 2; z += 1500) for (const sx of [-1, 1]) box(140, FH - 400, 120, mMullion, OX + sx * (W / 2), y0 + 400 + (FH - 400) / 2, OZ + z, scene, false);
      box(W + 200, 300, D + 200, mConc, OX, y0 + FH - 150, OZ, scene, false);                   // viga de bordadura
    }
    box(W + 200, 400, D + 200, mConc, OX, FLOOR + N * FH + 200, OZ);                              // cobertura
    box(4200, N * FH + 1200, 4200, mConc, OX - W / 2 + 2100, FLOOR + (N * FH + 1200) / 2, OZ - D / 2 + 2100);   // núcleo de betão
    box(6000, 300, 4000, mConc, OX, FLOOR + FH + 100, OZ + D / 2 + 2000);                        // pala da entrada
    for (const s of [-1, 1]) box(300, FH, 300, mConc, OX + s * 2600, FLOOR + FH / 2, OZ + D / 2 + 3800);
    box(2400, 2400, 80, M(0x254e7a, 0.6, 0.2, { transparent: true, opacity: 0.7 }), OX, FLOOR + 1400, OZ + D / 2 + 20, scene, false);   // porta de vidro
    letters(OX, FLOOR + N * FH + 900, OZ + D / 2 - 200, 0, 7000);                                  // letreiro no topo do escritório
    const stepW = 8000; for (let i = 0; i < 3; i++) box(stepW - i * 400, 150, 1200 - i * 300, mKerb, OX, GY + 75 + i * 150, OZ + D / 2 + 4600 + i * 250, scene, false);   // degraus de acesso
    // pisos: 0 recepção + sala de visitas de clientes · 1 administração (direcção, contabilidade, compras) · 2 sala de reunião executiva
    const FLOORS = [["PISO 0", "Recepção · Sala de visitas de clientes"], ["PISO 1", "Administração · HSA + RH · contabilidade · compras"], ["PISO 2", "Sala de reunião executiva · direcção"]];
    // ---- pessoas (≈9 malhas cada): pernas, tronco, braços, cabeça; sentadas ou de pé; com animação ligeira
    const people = [];
    const SKIN = [0xf1c9a5, 0xd9a47c, 0x8d5a3b, 0x5b3a26], SHIRT = [0x2563eb, 0xf3f4f6, 0x111827, 0x16a34a, 0xdc2626, 0x7c3aed, 0xf59e0b, 0x0ea5e9], PANTS = [0x1f2937, 0x374151, 0x1e3a8a, 0x6b7280];
    person = (x, y, z, rot, seated = false, k = 0) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
      const skin = M(SKIN[k % 4], 0, 0.7), shirt = M(SHIRT[k % 8], 0, 0.7), pants = M(PANTS[k % 4], 0, 0.8);
      if (seated) { for (const sx of [-1, 1]) { box(140, 130, 420, pants, sx * 95, 450, 180, g); box(140, 420, 130, pants, sx * 95, 220, 360, g); } box(360, 560, 230, shirt, 0, 800, 0, g); }
      else { for (const sx of [-1, 1]) box(150, 820, 160, pants, sx * 95, 410, 0, g); box(360, 600, 230, shirt, 0, 1120, 0, g); }
      const ty = seated ? 800 : 1120;
      for (const sx of [-1, 1]) { const arm = box(110, 520, 120, shirt, sx * 240, ty + 10, seated ? 120 : 0, g); arm.rotation.x = seated ? -0.9 : 0.15 * sx; }
      const head = new THREE.Mesh(new THREE.SphereGeometry(125, 14, 12), skin); head.position.set(0, ty + 480, 0); g.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(130, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M([0x2b1b12, 0x111111, 0x6b4a2b, 0xd1b48c][k % 4], 0, 0.9)); hair.position.set(0, ty + 500, 0); g.add(hair);
      people.push({ g, seated, ph: Math.random() * 6, y0: y });
      return g;
    };
    const mDesk = M(0xe7e5e4, 0.1, 0.6), mDeskLeg = M(0x4b5563, 0.5, 0.5), mChair = M(0x1f2937, 0.2, 0.6), mScreen = M(0x0b1220, 0.4, 0.3, { emissive: 0x9ec5ff, emissiveIntensity: 0.6 }), mLed = M(0xffffff, 0, 0.3, { emissive: 0xfff6e0, emissiveIntensity: 1.8 }), mPlant = M(0x3f7a33, 0, 0.9), mPot = M(0x9ca3af, 0.2, 0.6), mSofa = M(0x2f4f7a, 0, 0.9), mWoodD = M(0x8b5e3c, 0.1, 0.6);
    const desk = (x, y, z, rot, withPerson, k) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
      box(1600, 30, 800, mDesk, 0, 740, 0, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(50, 730, 50, mDeskLeg, sx * 750, 365, sz * 350, g);
      box(560, 340, 30, mScreen, 0, 1000, -250, g); box(60, 180, 60, mDeskLeg, 0, 830, -250, g); box(300, 30, 100, mDeskLeg, 0, 760, -250, g);   // monitor
      box(440, 14, 150, M(0x374151, 0.3, 0.6), 0, 762, 120, g);                                                                                 // teclado
      const chair = new THREE.Group(); chair.position.set(0, 0, 650); g.add(chair);
      box(520, 60, 520, mChair, 0, 480, 0, chair); box(520, 560, 70, mChair, 0, 800, 260, chair); cyl(35, 400, mDeskLeg, chair, 10).position.y = 250; for (let i = 0; i < 5; i++) { const r = box(300, 30, 40, mDeskLeg, 0, 40, 0, chair); r.position.set(Math.cos(i * 1.2566) * 150, 40, Math.sin(i * 1.2566) * 150); r.rotation.y = -i * 1.2566; }
      if (withPerson) { const pp = person(0, 0, 0, 0, true, k); pp.position.set(0, 0, 500); g.add(pp); scene.remove(pp); g.add(pp); }
      return g;
    };
    const plant = (x, y, z, h = 1400) => { cyl(180, 320, mPot, scene, 12).position.set(x, y + 160, z); const c = new THREE.Mesh(new THREE.SphereGeometry(h * 0.36, 10, 8), mPlant); c.position.set(x, y + 320 + h * 0.4, z); c.scale.y = 1.4; scene.add(c); };
    function furnish(f) {
      const y = FLOOR + f * FH + 400, x0 = OX - W / 2, z0 = OZ - D / 2;
      for (let i = 0; i < 6; i++) box(1800, 30, 220, mLed, x0 + 2500 + i * 2300, y + FH - 560, OZ + (i % 2 ? -1800 : 1800), scene, false);   // iluminação LED
      if (f === 0) {   // recepção + sala de visitas de clientes
        box(3200, 1100, 700, mWoodD, OX + 1500, y + 550, z0 + D - 2600); box(3300, 60, 800, mDesk, OX + 1500, y + 1130, z0 + D - 2600); person(OX + 1500, y, z0 + D - 3300, Math.PI, true, 1);
        const logoR = new THREE.Mesh(new THREE.PlaneGeometry(1800, 420), new THREE.MeshBasicMaterial({ map: signTex(1024, 256), transparent: true })); logoR.position.set(OX + 1500, y + 2300, z0 + 150); scene.add(logoR);
        box(2600, 420, 900, mSofa, OX - 3800, y + 210, z0 + D - 2200); box(2600, 500, 250, mSofa, OX - 3800, y + 670, z0 + D - 1650); box(1200, 40, 700, M(0x111827, 0.5, 0.2), OX - 3800, y + 420, z0 + D - 3600); for (const sx of [-1, 1]) box(60, 400, 60, mDeskLeg, OX - 3800 + sx * 500, y + 200, z0 + D - 3600);   // sofá e mesa
        person(OX - 4400, y, z0 + D - 2200, 0, true, 2); person(OX - 3200, y, z0 + D - 2200, 0, true, 5);
        box(4200, 1200, 60, M(0x0b1220, 0.4, 0.3, { emissive: 0x9ec5ff, emissiveIntensity: 0.5 }), OX - 3800, y + 1900, z0 + 80);   // ecrã de demonstrações
        for (let i = 0; i < 2; i++) person(OX - 5200 + i * 1200, y, z0 + 2400, Math.PI, true, 3 + i);
        people.walker = person(OX + 4500, y, z0 + 4500, 0, false, 6); people.walker.x0 = OX + 4500;
        person(OX + 6000, y, z0 + D - 2400, -2.4, false, 4);
        plant(x0 + 1200, y, z0 + 1000); plant(x0 + W - 1200, y, z0 + D - 1000); plant(OX - 1500, y, z0 + D - 1200, 1800);
      } else if (f === 1) {   // administração, HSA + RH, contabilidade, compras: open-space
        for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) desk(x0 + 2600 + i * 2500, y, z0 + 2200 + r * 4200, r ? Math.PI : 0, (i + r) % 3 !== 2, i + r * 3);
        box(5000, 2400, 60, M(0xdbe3ec, 0.3, 0.2, { transparent: true, opacity: 0.45 }), x0 + W - 2700, y + 1200, OZ, scene, false); box(2000, 30, 1000, mDesk, x0 + W - 2700, y + 740, OZ - 2000); person(x0 + W - 2700, y, OZ - 1200, Math.PI, true, 7);   // gabinete da direcção (vidro)
        plant(x0 + 900, y, z0 + 900); plant(x0 + W - 900, y, z0 + D - 900); plant(OX, y, z0 + 500, 1700);
        for (let i = 0; i < 4; i++) box(900, 1800, 420, M(0x9ca3af, 0.4, 0.5), x0 + 1200 + i * 1000, y + 900, z0 + 300);   // arquivos
      } else {   // sala de reunião executiva
        box(6400, 60, 2000, M(0x3b2a1e, 0.1, 0.5), OX + 800, y + 740, OZ); for (const sx of [-1, 1]) box(400, 720, 1200, M(0x2b1f16, 0.1, 0.6), OX + 800 + sx * 2600, y + 360, OZ);
        for (let i = 0; i < 5; i++) for (const sz of [-1, 1]) { const px = OX - 1800 + i * 1300, pz = OZ + sz * 1600; box(560, 60, 560, mChair, px, y + 480, pz); box(560, 600, 70, mChair, px, y + 800, pz + sz * 260); if ((i + (sz > 0)) % 3 !== 1) person(px, y, pz - sz * 120, sz > 0 ? Math.PI : 0, true, i + (sz > 0 ? 4 : 0)); }
        box(4200, 1300, 60, M(0x0b1220, 0.4, 0.3, { emissive: 0x9ec5ff, emissiveIntensity: 0.5 }), OX + 800, y + 2000, z0 + 80);   // ecrã de parede
        box(2000, 1200, 60, M(0xffffff, 0, 0.6), OX - 4800, y + 1900, z0 + 80);                                                      // quadro branco
        person(OX - 4800, y, z0 + 900, Math.PI, false, 2);
        plant(x0 + 900, y, z0 + 900); plant(x0 + W - 900, y, z0 + 900);
      }
    }
    let pt = 0;
    addSystem({ draw(dt) {
      pt += dt;
      for (const p of people) { p.g.position.y = p.y0 + (p.seated ? 6 : 12) * Math.sin(pt * 1.6 + p.ph); if (!p.seated) p.g.rotation.y += 0.004 * Math.sin(pt * 0.7 + p.ph); }
      const w = people.walker; if (w) { const u = (Math.sin(pt * 0.25) + 1) / 2; w.position.x = w.x0 - 4500 * u; w.rotation.y = Math.cos(pt * 0.25) > 0 ? Math.PI / 2 : -Math.PI / 2; w.position.y = w.position.y + 0; }
    } });
    FLOORS.forEach(([t1, t2], f) => {
      const tex = canvasTex(1024, 192, (g, w, h) => { g.fillStyle = "rgba(20,28,40,0.85)"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffffff"; g.font = "800 60px Arial"; g.fillText(tr(t1), 30, 80); g.fillStyle = "#cfe3f7"; g.font = "600 40px Arial"; g.fillText(tr(t2), 30, 150); });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(6400, 1200), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); pl.position.set(OX + 3000, FLOOR + f * FH + 2000, OZ + D / 2 + 90); scene.add(pl);
      furnish(f);
      addTag({ text: `${t1} · ${t2}`, at: () => V(OX + 3000, FLOOR + f * FH + 2900, OZ + D / 2 + 300), max: 30000 });
    });
    addTag({ text: "Escritório central SACFILE · vidro e betão · 3 pisos", at: () => V(OX, FLOOR + N * FH + 2200, OZ), min: 2000, max: 90000, big: true });
  }

  // ---------- estacionamento: lugares marcados ao longo da avenida, em frente ao escritório, carros, passadeira e postes de iluminação
  const OX_ = -2500;
  {
    const PX0 = -6000, PZ = Z + 22500 + 3600 + 2700, N = 12, BW = 2600, BL = 5000;
    box(N * BW + 400, 10, BL + 400, M(0x2f3337, 0.05, 0.9), PX0 + (N * BW) / 2, GY + 2, PZ, scene, false);
    for (let i = 0; i <= N; i++) box(120, 12, BL, mat.label, PX0 + i * BW, GY + 10, PZ, scene, false);
    // carro: carroçaria em perfil lateral extrudido com bisel, tinta com verniz (clearcoat), vidros, jantes com raios, faróis, espelhos, matrícula
    const bodyShape = (() => { const sh = new THREE.Shape(); [[-2200, 300], [-2200, 640], [-2050, 720], [-1350, 760], [-980, 1230], [-250, 1320], [620, 1300], [1250, 820], [2120, 740], [2250, 600], [2250, 300]].forEach(([x, y], k) => k ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath(); return sh; })();
    const glassShape = (() => { const sh = new THREE.Shape(); [[-1330, 790], [-980, 1200], [-250, 1280], [600, 1265], [1180, 830]].forEach(([x, y], k) => k ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath(); return sh; })();
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 1760, bevelEnabled: true, bevelThickness: 90, bevelSize: 70, bevelSegments: 4 }); bodyGeo.translate(0, 0, -880);
    const glassGeo = new THREE.ExtrudeGeometry(glassShape, { depth: 1790, bevelEnabled: false }); glassGeo.translate(0, 0, -895);
    const car = (x, z, c, rot) => {
      const g = new THREE.Group(); g.position.set(x, GY, z); g.rotation.y = rot; scene.add(g);
      const paint = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 });
      const body = new THREE.Mesh(bodyGeo, paint); body.castShadow = true; g.add(body);
      g.add(new THREE.Mesh(glassGeo, carGlass));
      box(4300, 90, 1700, mTrim, 0, 300, 0, g, false);                                                          // saia inferior
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const w = new THREE.Group(); w.position.set(sx * 1400, 340, sz * 820); g.add(w);
        const t = cyl(340, 230, mTyre, w, 24); t.rotation.x = Math.PI / 2;
        const r = cyl(215, 240, mRim, w, 20); r.rotation.x = Math.PI / 2;
        for (let i = 0; i < 5; i++) { const sp = box(60, 330, 250, mTrim, 0, 0, sz * 6, w, false); sp.rotation.z = i * 1.2566; }
        box(1000, 760, 60, mTrim, 0, 420, sz * 870 - sz * 30, w, false);                                           // cava da roda
      }
      for (const sz of [-1, 1]) { box(70, 190, 420, mLamp, 2230, 720, sz * 600, g, false); box(60, 170, 380, mat.ledR, -2210, 740, sz * 620, g, false); }   // faróis e farolins
      box(60, 240, 1100, mTrim, 2240, 480, 0, g, false); box(900, 130, 40, mat.label, 2255, 430, 0, g, false);  // grelha e matrícula
      for (const sz of [-1, 1]) { box(160, 90, 220, paint, -700, 1020, sz * 980, g, false); }                     // espelhos
      for (const xx of [-1300, 0]) box(16, 520, 1800, mTrim, xx, 640, 0, g, false);                                // linhas das portas
      box(1300, 20, 60, mTrim, -1950, 1330, 0, g, false);                                                          // barras de tejadilho (curtas)
      return g;
    };
    [[0, 0x2b5fb3], [1, 0xe5e7eb], [3, 0x1f2937], [4, 0xb91c1c], [6, 0x9ca3af], [7, 0x2f6fdc], [9, 0xf59e0b]].forEach(([i, c]) => car(PX0 + (i + 0.5) * BW, PZ, c, Math.PI / 2));
    for (let i = 0; i < 8; i++) box(600, 40, 7000, mat.label, OX_ - 4200 + i * 1200, GY + 8, Z + 22500, scene, false);   // passadeira para a entrada do escritório
    for (const x of [PX0 - 600, PX0 + N * BW + 600, 20000, 30000]) { cyl(70, 7000, mat.alu, scene, 12).position.set(x, GY + 3500, Z + 22500 + 3900); box(900, 160, 320, mat.dark, x + 350, GY + 7000, PZ + BL / 2 + 800); box(700, 20, 240, mat.lamp, x + 350, GY + 6910, PZ + BL / 2 + 800, scene, false); }
    addTag({ text: "Estacionamento · colaboradores e visitantes", at: () => V(PX0 + (N * BW) / 2, GY + 2500, PZ), max: 40000 });
  }

  // ---------- camião de encomendas: tractor + semi-reboque articulado. Estados: "loading" (recuado no cais, portas abertas, a receber
  //            paletes do KMF — uma por cada palete expedida), "closing" (fecha as portas), "leave" (segue pelo pátio, barreira sobe, sai pelo
  //            portão), "arrive" (um camião vazio recua em linha recta até ao cais) — e recomeça. Ciclo ligado ao contador `shipped`.
  const TRUCK = { state: "loading", t: 0, loaded: 0, CAP: 22, shippedAt: shipped, pallets: [], path: [], i: 0, hd: 0, x: 0, z: 0, trailer: { x: 0, z: 0, hd: 0 }, door: 1, barrier: 0, gone: 0 };
  const DZ = 2200, DOCK_X = X - 40;                                                                // porta do cais
  const trailerG = new THREE.Group(), tractorG = new THREE.Group(); scene.add(trailerG, tractorG);
  const TL = 13500, HITCH = TL / 2 - 1100;                                                        // comprimento do reboque; o pino de engate fica 1,1 m atrás da frente
  {
    const mBox = M(0xf1f1ee, 0.2, 0.5), mInner = M(0x1f2937, 0.1, 0.8);
    // caixa do reboque em painéis (abre-se à traseira e vê-se o interior a ser carregado)
    for (const sz of [-1, 1]) { const w = box(TL, 2600, 40, mBox, 0, 1450, sz * 1255, trailerG); w.receiveShadow = false; }
    { const w = box(40, 2600, 2550, mBox, TL / 2 - 20, 1450, 0, trailerG); w.receiveShadow = false; }
    box(1800, 900, 2470, mBox, TL / 2 - 900, 270 + 450, 0, trailerG);                              // pescoço de cisne (frente elevada sobre o prato e as rodas do tractor)   // caixas das rodas (reboque de piso rebaixado): as rodas ficam tapadas e as paletes passam entre elas
    for (let x = -TL / 2 + 600; x < TL / 2; x += 1200) for (const sz of [-1, 1]) box(60, 2500, 30, M(0xcbd5e1, 0.5, 0.4), x, 1450, sz * 1225, trailerG, false);   // nervuras interiores
    { const l = box(TL - 400, 20, 300, M(0xfff6e0, 0, 0.3, { emissive: 0xfff3d6, emissiveIntensity: 1 }), 0, 2740, 0, trailerG, false); }   // luz interior
    box(TL, 120, 2550, mat.dark, 0, 2830, 0, trailerG, false); box(TL - 200, 120, 2500, M(0x4b5563, 0.3, 0.6), 0, 210, 0, trailerG);   // tecto e piso
    for (const sz of [-1, 1]) { const logo = new THREE.Mesh(new THREE.PlaneGeometry(5000, 1100), new THREE.MeshBasicMaterial({ map: signTex(1024, 256), transparent: true, toneMapped: false })); logo.position.set(1500, 1650, sz * 1290); logo.rotation.y = sz > 0 ? 0 : Math.PI; trailerG.add(logo); }
    box(TL - 600, 300, 2300, mat.dark, 0, 0, 0, trailerG);                                        // chassis (por baixo do piso)
    for (const x of [-TL / 2 + 1900, -TL / 2 + 2600, -TL / 2 + 3300]) for (const sx of [-1, 1]) { const w = cyl(300, 260, mTyre, trailerG, 24); w.rotation.x = Math.PI / 2; w.position.set(x, -40, sx * 1080); const r = cyl(170, 270, mRim, trailerG, 16); r.rotation.x = Math.PI / 2; r.position.set(x, -40, sx * 1080); }   // 3 eixos de rodas baixas (piso rebaixado)
    for (const sz of [-1, 1]) box(TL - 4200, 330, 30, M(0x9ca3af, 0.4, 0.5), -400, 0, sz * 1280, trailerG, false);   // saias laterais
    for (const sx of [-1, 1]) box(140, 250, 140, mat.alu, TL / 2 - 2600, -20, sx * 800, trailerG);   // apoios (recolhidos, por baixo do piso)
    box(1600, 80, 2500, mat.dark, -TL / 2 + 20, 60, 0, trailerG); for (const sz of [-1, 1]) box(40, 120, 160, mat.ledR, -TL / 2 - 10, 2570, sz * 1180, trailerG, false);
    TRUCK.doors = [-1, 1].map((sz) => { const pivot = new THREE.Group(); pivot.position.set(-TL / 2, 1450, sz * 1250); trailerG.add(pivot); box(60, 2500, 1240, M(0xe5e7eb, 0.2, 0.5), 0, 0, -sz * 620, pivot); pivot.userData.sz = sz; return pivot; });
    // tractor
    // (o pino de engate fica em x local −300; a cabina começa 0,5 m à frente da parede frontal do reboque)
    box(2300, 2400, 2500, M(0xb91c1c, 0.3, 0.4), 2450, 1850, 0, tractorG); box(1500, 1200, 2450, carGlass, 2850, 2350, 0, tractorG, false);
    box(600, 500, 2400, M(0x8b1a1a, 0.3, 0.5), 3750, 650, 0, tractorG); box(5000, 300, 2300, mat.dark, 1300, 0, 0, tractorG);
    box(1200, 200, 2200, mat.dark, -300, 250, 0, tractorG);                                       // prato de engate (por baixo do pescoço do reboque)
    for (const x of [-300, 3000]) for (const s of [-1, 1]) { const w = cyl(520, 380, mTyre, tractorG, 24); w.rotation.x = Math.PI / 2; w.position.set(x, 370, s * 1050); const r = cyl(300, 390, mRim, tractorG, 16); r.rotation.x = Math.PI / 2; r.position.set(x, 520, s * 1050); }
    cyl(120, 1200, mat.alu, tractorG, 12).position.set(1150, 3150, -1100); for (const s of [-1, 1]) box(120, 200, 300, mLamp, 4060, 1050, s * 900, tractorG, false);
    const logoT = new THREE.Mesh(new THREE.PlaneGeometry(1600, 360), new THREE.MeshBasicMaterial({ map: signTex(1024, 256), transparent: true, toneMapped: false })); logoT.position.set(2450, 2900, 1260); tractorG.add(logoT);
  }
  // lugares no reboque: 11 filas × 2 paletes (1200 mm atravessadas) = 22; enche do fundo (junto ao pescoço) para a porta, esquerda e direita
  const ROWS = 11, palletSlot = (k) => V(-TL / 2 + 600 + (ROWS - 1 - Math.floor(k / 2)) * 1050, 270, (k % 2 ? 1 : -1) * 615);
  // palete leve no reboque (base + 24 caixas numa InstancedMesh) — substitui a palete do armário para não pesar a cena
  const cartGeo = new THREE.BoxGeometry(CART.w - 6, CART.h - 4, CART.d - 6), _o = new THREE.Object3D();
  function lightPallet() {
    const g = new THREE.Group();
    box(1200, 30, 1000, mat.wood, 0, 15, 0, g, false); for (const zz of [-440, 0, 440]) box(1200, 80, 120, mat.wood, 0, 70, zz, g, false); box(1200, 22, 1000, mat.wood, 0, 129, 0, g, false);
    const im = new THREE.InstancedMesh(cartGeo, mat.carton, SLOTS.length); im.castShadow = true;
    SLOTS.forEach(([x, z, l], i) => { _o.position.set(x, 140 + l * CART.h + CART.h / 2, z); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }); g.add(im);
    return { g };
  }
  function addTruckPallet() {   // palete já carregada (arranque e testes)
    const p = lightPallet(); trailerG.add(p.g); p.g.position.copy(palletSlot(TRUCK.pallets.length)); p.g.rotation.y = Math.PI / 2; TRUCK.pallets.push(p);
  }
  // interface com o KMF 1500P (40-logistics.js)
  DOCK.truck = {
    wants: () => TRUCK.state === "loading" && TRUCK.door > 0.95 && DOCKDOOR.open > 0.98 && TRUCK.pallets.length + DOCK.reserved < TRUCK.CAP,
    reserve: () => TRUCK.pallets.length + DOCK.reserved++,
    slotX: (k) => TRUCK.trailer.x + palletSlot(k).x,
    slotZ: (k) => palletSlot(k).z,
    accept: (pal, k) => {
      DOCK.reserved = Math.max(0, DOCK.reserved - 1);
      if (pal.g.parent) pal.g.parent.remove(pal.g);                                    // a palete do armário dá lugar a uma versão leve, igual à vista
      const lp = lightPallet(); trailerG.add(lp.g); lp.g.position.copy(palletSlot(k)); lp.g.rotation.set(0, Math.PI / 2, 0); TRUCK.pallets.push(lp);
    },
  };
  const DOCK_POSE = { x: DOCK_X - 400 + TL / 2, z: DZ, hd: 0 };                                  // reboque com a traseira 40 cm dentro da porta
  function placeRig(tx, tz, hd, trHd = hd) {                                                      // posiciona pelo reboque (centro) e deduz o tractor pelo pino de engate
    TRUCK.trailer.x = tx; TRUCK.trailer.z = tz; TRUCK.trailer.hd = trHd;
    const hx = tx + Math.cos(trHd) * HITCH, hz = tz + Math.sin(trHd) * HITCH;                    // pino de engate
    TRUCK.x = hx + Math.cos(hd) * 300; TRUCK.z = hz + Math.sin(hd) * 300; TRUCK.hd = hd;          // o prato do tractor está 30 cm à frente do pino (local x = −300)
  }
  function drawRig() {
    trailerG.position.set(TRUCK.trailer.x, GY + 150, TRUCK.trailer.z); trailerG.rotation.y = -TRUCK.trailer.hd;
    tractorG.position.set(TRUCK.x, GY + 150, TRUCK.z); tractorG.rotation.y = -TRUCK.hd;
    for (const d of TRUCK.doors) d.rotation.y = d.userData.sz * (Math.PI * 0.95) * TRUCK.door;
  }
  placeRig(DOCK_POSE.x, DOCK_POSE.z, 0); drawRig();
  // percurso de saída (pelo tractor): sai do cais para +x, curva para +z ao longo do pátio, passa a barreira e sai do recinto
  const EXIT = [[X + 17500, DZ + 300], [X + 19600, DZ + 3200], [X + 20000, DZ + 8000], [X + 20000, Z + 30000], [X + 20000, Z + 42000]];
  function stepRig(dt) {
    const T = TRUCK; T.t += dt;
    if (T.state === "dockopen") {                                                      // encostado: abre a porta do cais e depois as portas do reboque
      DOCKDOOR.open = Math.min(1, DOCKDOOR.open + dt * 0.3);
      if (DOCKDOOR.open >= 1) { T.door = Math.min(1, T.door + dt * 0.6); if (T.door >= 1) { T.state = "loading"; T.t = 0; } }
    } else if (T.state === "loading") {
      T.door = Math.min(1, T.door + dt);
      if (T.pallets.length >= T.CAP && !DOCK.inside && !DOCK.reserved) { T.full = (T.full || 0) + dt; if (T.full > 2.5) { T.state = "closing"; T.t = 0; T.full = 0; } }   // cheio e o KMF já saiu do reboque
    } else if (T.state === "closing") {
      T.door = Math.max(0, T.door - dt * 0.5);
      if (T.door <= 0 && T.t > 3) { T.state = "leave"; T.t = 0; T.i = 0; }
    } else if (T.state === "leave") {
      const wp = EXIT[T.i]; if (!wp) { T.state = "gone"; T.t = 0; return; }
      const dx = wp[0] - T.x, dz = wp[1] - T.z, dist = Math.hypot(dx, dz), want = Math.atan2(dz, dx);
      let dh = ((want - T.hd) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; T.hd += Math.sign(dh) * Math.min(Math.abs(dh), 0.9 * dt);
      const v = Math.min(dist, 1800 * dt); T.x += Math.cos(T.hd) * v; T.z += Math.sin(T.hd) * v;
      if (dist < 2500 || T.i === EXIT.length - 1 && dist < 600) T.i++;
      // reboque: o pino segue o tractor; o eixo do reboque fica a HITCH atrás do pino, na direcção do reboque (articulação)
      const hx = T.x - Math.cos(T.hd) * 300, hz = T.z - Math.sin(T.hd) * 300;
      const ax = T.trailer.x - Math.cos(T.trailer.hd) * (TL / 2 - 2900), az = T.trailer.z - Math.sin(T.trailer.hd) * (TL / 2 - 2900);   // eixo traseiro do reboque
      const th = Math.atan2(hz - az, hx - ax); T.trailer.hd = th;
      const L = HITCH + (TL / 2 - 2900); const nax = hx - Math.cos(th) * L, naz = hz - Math.sin(th) * L;
      T.trailer.x = nax + Math.cos(th) * (TL / 2 - 2900); T.trailer.z = naz + Math.sin(th) * (TL / 2 - 2900);
      T.barrier = Math.abs(T.z - (Z + 30000)) < 16000 ? Math.min(1, T.barrier + dt * 0.8) : Math.max(0, T.barrier - dt * 0.5);
      if (T.trailer.x - Math.cos(T.trailer.hd) * TL / 2 > DOCK_X + 1500 || T.i > 1) DOCKDOOR.open = Math.max(0, DOCKDOOR.open - dt * 0.3);   // o reboque saiu do vão: a porta do cais desce
    } else if (T.state === "gone") {
      DOCKDOOR.open = Math.max(0, DOCKDOOR.open - dt * 0.3);
      T.barrier = Math.max(0, T.barrier - dt * 0.5);
      if (T.t > 6) {   // novo camião vazio: aparece no pátio, alinhado com o cais, e recua em linha recta
        for (const p of T.pallets) if (p) trailerG.remove(p.g); T.pallets.length = 0; T.loaded = 0; T.door = 0; DOCK.reserved = 0;
        placeRig(DOCK_POSE.x + 9000, DZ, 0); T.state = "arrive"; T.t = 0;
      }
    } else if (T.state === "arrive") {
      const left = TRUCK.trailer.x - DOCK_POSE.x; const v = Math.min(left, 1200 * dt); placeRig(TRUCK.trailer.x - v, DZ, 0);
      if (left <= 1) { T.state = "dockopen"; T.t = 0; T.shippedAt = shipped; }
    }
    drawRig();
  }
  addSystem({ update(dt) { stepRig(dt); } });
  addTag({ text: () => TRUCK.state === "dockopen" ? "Camião encostado · a abrir a porta do cais" : TRUCK.state === "loading" ? `Camião de encomendas · a carregar · ${TRUCK.pallets.length}/${TRUCK.CAP} paletes` + (DOCK.inside ? " · KMF 1500P dentro do reboque" : "") : TRUCK.state === "closing" ? "Camião · a fechar as portas" : TRUCK.state === "leave" ? "Camião · a sair para entrega" : TRUCK.state === "arrive" ? "Camião vazio · a recuar para o cais" : "Cais livre", at: () => V(TRUCK.trailer.x, GY + 4200, TRUCK.trailer.z), max: 60000 });
  for (let k = 0; k < 16; k++) addTruckPallet();                                       // o 1.º camião já vem meio carregado: o KMF completa as 22 paletes
  addSystem({ draw() {                                                                  // porta seccional do cais: desce em lâminas (escala a partir do topo)
    const f = 1 - DOCKDOOR.open, pnl = DOCKDOOR.panel; if (!pnl) return;
    pnl.visible = f > 0.01; pnl.scale.y = Math.max(0.01, f); pnl.position.y = 4900 - (4800 * f) / 2;
  } });
  TRUCK.add = addTruckPallet; window.__truck = TRUCK;

  // ---------- entrada única do recinto (muro sul): portão de correr para viaturas, barreira, portaria/recepção, árvores
  {
    const gx = GATE.x, gz = ZS;
    box(3400, 3000, 3000, mConc, gx - GATE.w / 2 - 2200, GY + 1500, gz - 1800);                                             // portaria / recepção
    box(2600, 1300, 60, M(0x254e7a, 0.6, 0.2, { transparent: true, opacity: 0.7 }), gx - GATE.w / 2 - 2200, GY + 1800, gz - 280, scene, false);
    box(1300, 1200, 60, M(0x254e7a, 0.6, 0.2, { transparent: true, opacity: 0.7 }), gx - GATE.w / 2 - 480, GY + 1800, gz - 1800, scene, false);   // janela para a via
    box(3800, 300, 3400, M(0x9aa0a6, 0.3, 0.6), gx - GATE.w / 2 - 2200, GY + 3150, gz - 1800, scene, false);
    const rs = new THREE.Mesh(new THREE.PlaneGeometry(3000, 700), new THREE.MeshBasicMaterial({ map: signTex(1024, 256), transparent: true, toneMapped: false })); rs.position.set(gx - GATE.w / 2 - 2200, GY + 3700, gz - 1800); scene.add(rs);
    person(gx - GATE.w / 2 - 2200, GY, gz - 1800, 0, true, 0);                                                              // porteiro
    for (const sx of [-1, 1]) box(500, 2800, 500, mCap, gx + sx * (GATE.w / 2 + 250), GY + 1400, gz, scene, false);          // pilares
    const leaf = new THREE.Group(); leaf.position.set(gx + GATE.w / 2, GY, gz + 350); scene.add(leaf);                      // portão de correr (abre para +x, por trás do muro)
    box(GATE.w, 2000, 80, M(0x374151, 0.6, 0.4), -GATE.w / 2, 1300, 0, leaf); for (let x = -GATE.w + 300; x < 0; x += 300) box(50, 1700, 50, M(0x1f2937, 0.6, 0.4), x, 1300, 50, leaf, false);
    box(GATE.w, 120, 160, mCap, -GATE.w / 2, 2380, 0, leaf, false); for (const x of [-GATE.w + 400, -400]) { const w = cyl(120, 80, mat.black, leaf, 12); w.rotation.x = Math.PI / 2; w.position.set(x, 120, 0); }
    box(GATE.w + 2000, 60, 200, mCap, gx + 1000, GY + 20, gz + 350, scene, false);                                           // carril
    const armP = new THREE.Group(); armP.position.set(gx - GATE.w / 2 + 300, GY + 1100, gz - 5000); scene.add(armP);           // barreira a 5 m do portão, do lado de dentro
    box(GATE.w - 1200, 120, 120, M(0xfbbf24, 0.2, 0.5), (GATE.w - 1200) / 2, 0, 0, armP); for (let i = 0; i < 5; i++) box(600, 124, 124, M(0xdc2626, 0.2, 0.5), 800 + i * 1400, 0, 0, armP, false);
    cyl(140, 1100, mat.dark, scene, 12).position.set(gx - GATE.w / 2 + 300, GY + 550, gz - 5000);
    addSystem({ draw() { armP.rotation.z = TRUCK.barrier * 1.45; leaf.position.x = gx + GATE.w / 2 + GATE.w * TRUCK.barrier; } });
    addTag({ text: "Entrada única do recinto · portão de correr + barreira · portaria/recepção", at: () => V(gx, GY + 4800, gz - 1000), max: 80000 });
    const tree = (x, z, s = 1) => { cyl(90 * s, 1800 * s, M(0x5b3a1e, 0, 0.9), scene, 8).position.set(x, GY + 900 * s, z); const c = new THREE.Mesh(new THREE.SphereGeometry(1500 * s, 12, 10), M(0x3f7a33, 0, 0.9)); c.position.set(x, GY + 2900 * s, z); c.castShadow = true; scene.add(c); };
    [[-18500, -11000, 1.1], [-16000, 20000, 1.2], [-20500, 27000, 1], [8000, 20500, 1.1], [14000, 27500, 1], [20000, -9000, 1], [16000, -12000, 1.1], [-4000, -12500, 1], [4000, -12500, 1.1]].forEach(([x, z, s]) => tree(x, z, s));
  }

  // ---------- cobertura: painéis solares fotovoltaicos na nave (duas águas) e no escritório; unidades exteriores dos AC inverter
  {
    const mPV = M(0x0f2440, 0.7, 0.25), mPVf = M(0x9aa3ad, 0.5, 0.5);
    const pvTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#0e2a4a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#6c8db3"; g.lineWidth = 3; for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } });
    const pv = (x, y, z, w, d, rx, parent = roofG) => { const t = pvTex.clone(); t.needsUpdate = true; t.repeat.set(w / 1000, d / 1700); const m = new THREE.Mesh(new THREE.BoxGeometry(w, 50, d), M(0xffffff, 0.7, 0.3, { map: t })); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; parent.add(m); const f = box(w + 60, 30, d + 60, mPVf, 0, -40, 0, m, false); return m; };
    const pitch = Math.atan2(700, Z);
    for (const s of [-1, 1]) for (let x = -X + 1500; x < X - 1500; x += 2200) for (const zz of [1400, 3700]) pv(x, TOP + 420 + 350 + Math.cos(pitch) * 60 + (Z / 2 + 50 - s * zz) * 0 + (zz - Z / 2 - 50) * -s * Math.sin(pitch) * 0 + (s * zz - s * (Z / 2 + 50)) * -Math.tan(pitch) * 0, s * zz, 2000, 1700, s * pitch);
    // correção de altura: a cobertura desce do cume (z=0, TOP+1200) para os beirais (|z|=Z, TOP+500)
    for (const m of roofG.children.slice(-2 * 2 * Math.floor((2 * X - 3000) / 2200))) { const zz = Math.abs(m.position.z); m.position.y = TOP + 1200 - (zz / Z) * 700 + 90; }
    for (let x = -W_ + 1200; x < W_; x += 2200) pv(-2500 + x, FLOOR + 3 * 3600 + 420, Z + 9500 - 1500, 2000, 1700, 0.3, scene);   // escritório: painéis inclinados a sul
    // unidades exteriores dos AC inverter (calor/frio) em linha junto à parede −z da nave, em maciços de betão
    for (let i = 0; i < 6; i++) {
      const x = -8000 + i * 3200, z = -Z - 1500;
      box(1400, 200, 900, mConc, x, GY + 100, z, scene, false);
      box(1200, 1400, 450, M(0xe5e7eb, 0.3, 0.5), x, GY + 900, z);
      for (const sx of [-1, 1]) { const r = cyl(260, 30, M(0x111827, 0.3, 0.6), scene, 24); r.rotation.x = Math.PI / 2; r.position.set(x + sx * 300, GY + 1000, z + 240); const rot = new THREE.Group(); rot.position.set(x + sx * 300, GY + 1000, z + 250); scene.add(rot); for (let k = 0; k < 4; k++) { const b = box(200, 70, 8, M(0x374151, 0.3, 0.6), 0, 0, 0, rot, false); b.position.set(Math.cos(k * Math.PI / 2) * 130, Math.sin(k * Math.PI / 2) * 130, 0); b.rotation.z = k * Math.PI / 2; } acRot.push(rot); }
      box(1200, 10, 10, mat.alu, x, GY + 1700, z + 230, scene, false);
      const pipe = cyl(30, 1500, M(0x9ca3af, 0.6, 0.4), scene, 10); pipe.rotation.x = Math.PI / 2; pipe.position.set(x + 500, GY + 500, z + 750);
    }
    addTag({ text: "Painéis solares fotovoltaicos · nave e escritório", at: () => V(0, TOP + 2600, 2500), min: 3000, max: 90000 });
    addTag({ text: "Unidades exteriores · AC inverter calor/frio (6 × 50 kW)", at: () => V(0, GY + 2800, -Z - 1500), max: 60000 });
  }
  // ---------- utilidades exteriores (lado −x, junto à recepção logística): tanque de azoto líquido, poço de água subterrânea, compressor de ar
  {
    const UX = -X - 4500;
    // tanque criogénico de azoto líquido (vertical, isolado, com vaporizador de ar)
    box(3000, 300, 3000, mConc, UX, GY + 150, -3500, scene, false);
    const tank = cyl(900, 5200, M(0xf1f5f9, 0.4, 0.3), scene, 32); tank.position.set(UX, GY + 300 + 2600, -3500);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf1f5f9, 0.4, 0.3)); cap.position.set(UX, GY + 300 + 5200, -3500); scene.add(cap);
    for (let i = 0; i < 4; i++) box(120, 300, 120, mat.dark, UX + Math.cos(i * Math.PI / 2 + 0.785) * 950, GY + 450, -3500 + Math.sin(i * Math.PI / 2 + 0.785) * 950);
    box(600, 600, 60, M(0xffffff, 0.1, 0.5, { map: canvasTex(256, 256, (g) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#1d4ed8"; g.font = "800 46px Arial"; g.fillText("N₂", 90, 110); g.fillStyle = "#111"; g.font = "700 28px Arial"; g.fillText(tr("AZOTO LÍQUIDO"), 22, 170); g.fillText("−196 °C", 70, 215); }) }), UX, GY + 2300, -3500 + 905, scene, false);
    const vap = new THREE.Group(); vap.position.set(UX + 1900, GY + 300, -3500); scene.add(vap);      // vaporizador atmosférico (alhetas)
    for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) { cyl(40, 2600, mat.alu, vap, 10).position.set(i * 260 - 260, 1300, k * 260 - 260); for (let y = 100; y < 2600; y += 130) box(220, 6, 220, mat.alu, i * 260 - 260, y, k * 260 - 260, vap, false); }
    const pipeN = cyl(40, 2400, M(0x9ca3af, 0.6, 0.4), scene, 10); pipeN.rotation.z = Math.PI / 2; pipeN.position.set(UX + 1200, GY + 2900, -3500);
    for (const z of [-5500, -1500]) box(60, 1400, 4200, M(0x4b5563, 0.2, 0.6, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), UX + 2900, GY + 700, -3500 + (z + 3500) * 0 + 0, scene, false);
    addTag({ text: "Tanque de azoto líquido · N₂ −196 °C · vaporizador", at: () => V(UX, GY + 6800, -3500), max: 60000 });
    // poço de água subterrânea: tampa de betão, bomba submersível (cabeça do furo), depósito de água e quadro
    box(1600, 250, 1600, mConc, UX, GY + 125, 2500); cyl(320, 400, M(0x2563eb, 0.3, 0.5), scene, 20).position.set(UX, GY + 450, 2500);
    const pw = cyl(60, 1600, M(0x9ca3af, 0.6, 0.4), scene, 10); pw.rotation.z = Math.PI / 2; pw.position.set(UX + 900, GY + 600, 2500);
    const wt = cyl(1100, 2600, M(0x1e3a8a, 0.3, 0.5), scene, 32); wt.position.set(UX, GY + 300 + 1300, 5200); box(2600, 300, 2600, mConc, UX, GY + 150, 5200, scene, false);
    box(500, 700, 250, mat.dark, UX + 1500, GY + 700, 2500);
    addTag({ text: "Poço de água subterrânea · bomba submersível · depósito 10 m³", at: () => V(UX, GY + 4200, 3800), max: 60000 });
    // central de ar comprimido: compressor de parafuso, secador, depósito horizontal, abrigo
    const CX2 = UX, CZ2 = 9500;
    box(5000, 200, 3600, mConc, CX2, GY + 100, CZ2, scene, false);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(160, 3200, 160, M(0x2f6a9e, 0.3, 0.5), CX2 + sx * 2400, GY + 1800, CZ2 + sz * 1700);
    box(5400, 120, 4000, M(0x9aa0a6, 0.3, 0.6), CX2, GY + 3450, CZ2, scene, false);                   // cobertura do abrigo
    box(1600, 1500, 1000, M(0x1f6f9e, 0.3, 0.5), CX2 - 1400, GY + 950, CZ2 - 700);                     // compressor de parafuso
    box(500, 300, 60, mat.black, CX2 - 1400, GY + 1400, CZ2 - 190, scene, false); for (let y = 400; y < 1300; y += 180) box(1200, 60, 10, mat.dark, CX2 - 1400, GY + y, CZ2 - 195, scene, false);
    box(800, 1500, 700, M(0xe5e7eb, 0.3, 0.5), CX2 + 100, GY + 950, CZ2 - 800);                        // secador frigorífico
    const rec = cyl(600, 3000, M(0x1d4ed8, 0.4, 0.4), scene, 28); rec.rotation.z = Math.PI / 2; rec.position.set(CX2 + 800, GY + 1000, CZ2 + 900);   // depósito de ar 2000 L
    for (const sx of [-1, 1]) box(200, 400, 700, mat.dark, CX2 + 800 + sx * 1000, GY + 350, CZ2 + 900);
    const air = cyl(35, 4000, M(0x9ca3af, 0.6, 0.4), scene, 10); air.rotation.z = Math.PI / 2; air.position.set(CX2 + 2400, GY + 2800, CZ2 + 900);   // linha de ar para a nave
    addTag({ text: "Central de ar comprimido · compressor de parafuso 37 kW · secador · depósito 2000 L", at: () => V(CX2, GY + 4600, CZ2), max: 60000 });
  }
  addSystem({ draw(dt) { for (const r of acRot) r.rotation.z += 10 * dt; } });
  addView("util", "Utilidades exteriores", [-X - 12000, 5000, 9000], [-X - 4500, 1500, 2500]);

  addTag({ text: "10 · Exterior · SACFILE", at: () => V(0, FLOOR + H + 3200, Z + 2500), min: 4000, max: 80000, big: true });
  addTag({ text: "Portaria · controlo de acessos", at: () => V(X + 9000, GY + 4200, Z + 13000), max: 40000 });
  addView("ext", "Exterior", [44000, 16000, 42000], [2000, 1500, 8000]);
  addView("office", "Escritório", [12000, 5000, 32000], [-2500, 3500, 16500]);
  addView("dock", "Cais · camião", [30000, 6000, 14000], [16000, 1200, 2200]);
  addView("gate", "Portão · entrada", [X + 14000, 5000, Z + 42000], [X + 19000, 1000, Z + 30000]);
  window.__ext = true;
}
