// =====================================================================
// Instalações de apoio dentro da nave, em contentores modulares (10' = 2991 mm, 20' = 6058 mm; 2438 × 2591):
//   fila da frente (parede +z): Administração · Sala de almoço · HSA + RH · Sala dos engenheiros · portão sandwich
//   parede −x: WC · Armazém de EPI · Sala de limpeza        atrás da linha: Recepção logística · Zona de emergência · Manutenção
//   cais de carga (porta da parede +x): camião encostado ao cais, paletes de caixas prontas
//   relógio de turno com sirene e luzes de alarme (almoço e fim de turno)
// =====================================================================
{
  const CD = 2438, CH = 2591, L10 = 2991, L20 = 6058, TAU_ = Math.PI * 2;
  const corr = canvasTex(256, 128, (g, w, h) => {                       // chapa canelada
    g.fillStyle = "#e9ebee"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = "#d6d9de"; g.fillRect(x, 0, 10, h); g.fillStyle = "#f4f5f7"; g.fillRect(x + 10, 0, 6, h); }
  }, [1, 1]);
  const wallMat = (c) => { const t = corr.clone(); t.needsUpdate = true; return M(c, 0.15, 0.6, { map: t }); };
  const mPost = M(0x3b4148, 0.4, 0.5), mDoor = M(0x2f3b4a, 0.3, 0.5), mFrame = M(0xe8eaed, 0.4, 0.4), mAC = M(0xd9dcdf, 0.3, 0.5);
  const signTex = (label, sub, band) => canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = "#f6f7f9"; g.fillRect(0, 0, w, h); g.fillStyle = band; g.fillRect(0, 0, 14, h);
    g.fillStyle = "#15202e"; g.font = "700 40px Arial"; g.fillText(tr(label), 32, 58);
    g.fillStyle = "#5b6b7d"; g.font = "24px Arial"; g.fillText(tr(sub), 32, 98);
  });
  // contentor: cx, cz = centro; len ao longo do eixo local x; rot = rotação em y; a frente (porta/janelas) é a face local +z
  function container(cx, cz, len, rot, label, sub, color, band, opts = {}) {
    const level = opts.level || 0;                                                     // 1 = contentor em cima de outro (1.º andar)
    const g = new THREE.Group(); g.position.set(cx, FLOOR + level * (CH + 70), cz); g.rotation.y = rot; scene.add(g);
    const wm = wallMat(color); wm.map.repeat.set(len / 400, 1);
    box(len, CH, CD, wm, 0, CH / 2, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(140, CH + 20, 140, mPost, sx * (len / 2 - 70), CH / 2 + 10, sz * (CD / 2 - 70), g);
    box(len + 30, 70, CD + 30, mPost, 0, CH + 35, 0, g);
    box(len + 30, 70, CD + 30, mPost, 0, 35, 0, g);
    const F = CD / 2 + 2;
    const dx = opts.door ?? -len / 2 + 700;
    box(900, 2050, 50, mDoor, dx, 1025, F + 20, g);                                   // porta
    box(60, 2100, 70, mFrame, dx - 470, 1050, F + 20, g); box(60, 2100, 70, mFrame, dx + 470, 1050, F + 20, g); box(1000, 60, 70, mFrame, dx, 2120, F + 20, g);
    box(140, 30, 30, mat.chrome, dx + 320, 1050, F + 55, g);                           // puxador
    box(1100, 120, 500, M(0x6b7280, 0.3, 0.6), dx, 60, F + 300, g);                    // degrau
    for (let i = 0; i < (opts.windows ?? Math.max(1, Math.floor((len - 1800) / 1500))); i++) {
      const wx = dx + 1200 + i * 1500;
      if (wx + 600 > len / 2 - 150) break;
      box(1240, 940, 60, mFrame, wx, 1600, F + 10, g); box(1160, 860, 30, mat.glass, wx, 1600, F + 40, g);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2000, 500), new THREE.MeshBasicMaterial({ map: signTex(label, sub, band) }));
    sign.position.set(Math.min(len / 2 - 1100, dx + 1500), CH - 330, F + 60); g.add(sign);
    if (!opts.noAC) box(640, 520, 320, mAC, len / 2 - 600, CH + 330, -CD / 2 + 400, g);   // unidade de ar condicionado no tecto
    const lamp = cyl(50, 90, mat.lamp, g, 12); lamp.rotation.x = Math.PI / 2; lamp.position.set(dx, 2350, F + 50);
    if (level === 1) {                                                                 // passadiço à frente com guarda-corpos e escada metálica
      box(len + 300, 60, 1100, M(0x4b5563, 0.5, 0.5), 0, -35, F + 560, g);
      for (let x = -len / 2 - 100; x <= len / 2 + 100; x += 1000) box(40, 1050, 40, mPost, x, 500, F + 1090, g);
      box(len + 300, 40, 40, mat.yellow, 0, 1030, F + 1090, g); box(len + 300, 30, 30, mPost, 0, 520, F + 1090, g);
      // escada metálica: desce do passadiço para a nave (local +z), encostada a um dos topos do contentor
      const sx = opts.stairSide || 1, xs = sx * (len / 2 - 520), z0 = F + 1100, RUN = 3000, DROP = CH + 70 - 160;
      for (let i = 0; i < 14; i++) { const t = i / 14; box(1000, 40, 260, M(0x4b5563, 0.5, 0.5), xs, -70 - t * DROP, z0 + 150 + t * RUN, g); }
      for (const x of [xs - 470, xs + 470]) beam(V(x, -20, z0 + 50), V(x, -DROP + 120, z0 + 150 + RUN + 100), 60, mPost, g);
      for (let i = 0; i <= 3; i++) { const t = i / 3; for (const x of [xs - 500, xs + 500]) box(40, 1000, 40, mPost, x, 430 - t * DROP, z0 + 150 + t * RUN, g); }
      for (const x of [xs - 500, xs + 500]) beam(V(x, 1000, z0 + 150), V(x, 1000 - DROP, z0 + 150 + RUN), 40, mat.yellow, g);
    }
    return g;
  }

  // ---------- fila da frente (parede +z), frentes viradas para −z (interior da nave)
  const ZF = 5750, R180 = Math.PI;
  container(-8271, ZF, L20, R180, "ADMINISTRAÇÃO", "Direcção · contabilidade · compras", 0xf1f3f5, "#1f5fd6");
  container(-1871, ZF, L20, R180, "SALA DE ALMOÇO", "Refeitório dos funcionários", 0xfbf3e4, "#d97706");
  container(-8271, ZF, L20, R180, "SALA DE REUNIÃO EXECUTIVA", "1.º andar · direcção e gestão", 0xeef2f7, "#1e3a8a", { level: 1, stairSide: -1, noAC: false });
  container(-1871, ZF, L20, R180, "SALA DE VISITAS · CLIENTES", "1.º andar · recepção de clientes e demonstrações", 0xfdf6ec, "#9a3412", { level: 1, stairSide: 1 });
  container(2870, ZF, L10, R180, "HSA + RH", "Segurança, saúde, ambiente · recursos humanos", 0xe8f5ec, "#15803d");
  container(6200, ZF, L10, R180, "SALA DOS ENGENHEIROS", "Engenharia · métodos · manutenção", 0xe7eef8, "#2f6fdc");
  // ---------- parede −x, frentes viradas para +x
  const XW = -10300, R90 = Math.PI / 2;
  container(XW, 3000, L10, R90, "WC", "Balneários · vestiários", 0xeef2f6, "#64748b", { door: -L10 / 2 + 700, windows: 0 });
  container(XW, -2500, L10, R90, "ARMAZÉM DE EPI", "Capacetes · luvas · óculos · botas", 0xfff4e5, "#ea580c", { windows: 0 });
  container(XW, -5300, L10, R90, "SALA DE LIMPEZA", "Material e produtos de limpeza", 0xeaf6fb, "#0e7490", { windows: 0 });
  // ---------- atrás da linha (corredor do operador), frentes viradas para +z
  // atrás da linha, fora do corredor dos robôs: o KMF 1500P circula em z −5500…−3000 (x ≥ 2000) e ao longo de x ≈ 9150;
  // nada é colocado a menos de 1 m desses corredores, nem a menos de 0,5 m do corredor do operador da linha
  container(-8450, -2950, L20, 0, "RECEPÇÃO LOGÍSTICA", "Armazém de entrada · bobinas · consumíveis", 0xf1f3f5, "#334155");
  container(-3800, -2950, L10, 0, "MANUTENÇÃO", "Materiais e peças de reserva", 0xf1f3f5, "#b45309", { windows: 0 });

  // mesas e bancos à porta do refeitório; carrinho de limpeza; estante de EPI à porta
  for (const x of [-2700, -1300]) { box(1400, 40, 700, mat.wood, x, FLOOR + 740, 3900); for (const s of [-1, 1]) box(1400, 30, 250, mat.wood, x, FLOOR + 460, 3900 + s * 500); for (const sx of [-1, 1]) box(60, 740, 60, mPost, x + sx * 600, FLOOR + 370, 3900); }
  { const g = new THREE.Group(); g.position.set(-8600, FLOOR, -5300); scene.add(g); box(900, 60, 500, M(0x2563eb, 0.2, 0.5), 0, 900, 0, g); for (const [x, z] of [[-400, -200], [400, -200], [-400, 200], [400, 200]]) box(40, 880, 40, mPost, x, 440, z, g); box(700, 500, 400, mat.yellow, 0, 300, 0, g); cyl(25, 1200, mat.alu, g, 10).position.set(430, 600, 0); }   // carrinho de limpeza
  { for (let i = 0; i < 3; i++) box(1200, 30, 400, mAC, -8600, FLOOR + 400 + i * 500, -2500); for (const s of [-1, 1]) box(40, 1500, 400, mPost, -8600 + s * 600, FLOOR + 750, -2500); for (const [i, c] of [[0, 0xf2c200], [1, 0x2563eb], [2, 0xef4444]]) box(300, 260, 240, M(c, 0.2, 0.5), -8900 + i * 300, FLOOR + 560, -2500); }   // estante de EPI

  // ---------- zona de emergência (área livre, marcada no chão)
  {
    const EX = 3300, EZ = -2100;
    box(3600, 6, 1800, M(0x16a34a, 0.1, 0.7), EX, FLOOR + 3, EZ, scene, false);
    box(3600, 7, 120, mat.label, EX, FLOOR + 4, EZ - 840, scene, false); box(3600, 7, 120, mat.label, EX, FLOOR + 4, EZ + 840, scene, false);
    const crossTex = canvasTex(256, 256, (g) => { g.fillStyle = "#16a34a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#fff"; g.fillRect(104, 40, 48, 176); g.fillRect(40, 104, 176, 48); });
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ map: crossTex })); cross.rotation.x = -Math.PI / 2; cross.position.set(EX, FLOOR + 8, EZ); scene.add(cross);
    box(60, 2600, 60, mPost, EX - 1500, FLOOR + 1300, EZ - 700);                               // poste com sinal de ponto de encontro
    const pe = new THREE.Mesh(new THREE.PlaneGeometry(900, 600), new THREE.MeshBasicMaterial({ map: canvasTex(384, 256, (g) => { g.fillStyle = "#16a34a"; g.fillRect(0, 0, 384, 256); g.fillStyle = "#fff"; g.font = "700 34px Arial"; g.fillText(tr("PONTO DE ENCONTRO"), 20, 70); g.font = "26px Arial"; g.fillText(tr("Zona de emergência · primeiros socorros"), 20, 120); g.fillText(tr("Lava-olhos · extintores · maca"), 20, 160); g.beginPath(); g.arc(320, 200, 30, 0, 7); g.fill(); }) }));
    pe.position.set(EX - 1500, FLOOR + 2300, EZ - 660); scene.add(pe);
    for (const x of [EX + 900, EX + 1200]) { const e = cyl(90, 520, M(0xdc2626, 0.3, 0.4), scene, 16); e.position.set(x, FLOOR + 330, EZ - 700); cyl(30, 80, mat.black, scene, 10).position.set(x, FLOOR + 630, EZ - 700); }   // extintores
    box(700, 600, 200, mat.label, EX + 1500, FLOOR + 1500, EZ - 760); box(80, 400, 10, M(0xdc2626, 0.1, 0.5), EX + 1500, FLOOR + 1500, EZ - 655, scene, false); box(400, 80, 10, M(0xdc2626, 0.1, 0.5), EX + 1500, FLOOR + 1500, EZ - 655, scene, false);   // armário de primeiros socorros
    cyl(40, 1100, mat.steel, scene, 12).position.set(EX - 1000, FLOOR + 550, EZ + 600); box(500, 120, 350, M(0x22c55e, 0.3, 0.4), EX - 1000, FLOOR + 1150, EZ + 600); for (const s of [-1, 1]) cyl(25, 60, mat.chrome, scene, 10).position.set(EX - 1000 + s * 120, FLOOR + 1240, EZ + 600);   // lava-olhos
    box(1900, 60, 600, M(0xf97316, 0.2, 0.5), EX + 600, FLOOR + 650, EZ + 600); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(50, 620, 50, mPost, EX + 600 + sx * 850, FLOOR + 310, EZ + 600 + sz * 250);
    // linhas de segurança: corredor do KMF 1500P (2,5 m livres) e faixa do AMR — circulação dos robôs sempre desimpedida
    stripe(2000, -3000, 9800, -3000, 100); stripe(2000, -5500, 7200, -5500, 100); stripe(8300, -5500, 8300, 3600, 100); stripe(10000, -5500, 10000, 1200, 100);
    stripe(4300, -1200, 4300, 2400, 80); stripe(6100, -1200, 6100, 700, 80); stripe(4300, 2400, 7600, 2400, 80); stripe(7600, 2400, 7600, 700, 80);   // maca
  }

  // ---------- cais de carga: a porta da parede +x (z = 2200) é o cais; o camião está encostado por fora, com a traseira aberta no cais
  {
    const DZ = 2200, DX = HALL.x - 40;
    box(2600, 140, 3200, M(0x6b7280, 0.6, 0.5), DX - 1300, FLOOR + 70, DZ);                      // plataforma / rampa niveladora
    box(2600, 10, 3200, M(0x374151, 0.6, 0.6), DX - 1300, FLOOR + 145, DZ, scene, false);
    for (const s of [-1, 1]) box(300, 400, 400, mat.black, DX - 150, FLOOR + 350, DZ + s * 1300);   // batentes de borracha
    stripe(DX - 3200, DZ - 1700, DX - 3200, DZ + 1700, 100); stripe(DX - 3200, DZ - 1700, DX - 100, DZ - 1700, 100); stripe(DX - 3200, DZ + 1700, DX - 100, DZ + 1700, 100);
    // traseira do semi-reboque (entra 1,4 m pela porta): caixa, portas abertas, pára-choques, luzes
    const tr_ = new THREE.Group(); tr_.position.set(DX + 600, FLOOR + 150, DZ); scene.add(tr_);
    box(2000, 2600, 2550, M(0xf1f1ee, 0.2, 0.5), 0, 1300, 0, tr_);                               // caixa do reboque (parte que se vê)
    box(1990, 2560, 2500, M(0x1f2937, 0.1, 0.8), -10, 1300, 0, tr_);                              // interior escuro
    box(1800, 120, 2500, M(0x4b5563, 0.3, 0.6), 0, 60, 0, tr_);                                    // piso do reboque
    for (const s of [-1, 1]) { const d = box(60, 2500, 1250, M(0xe5e7eb, 0.2, 0.5), -1030, 1300, s * 1900, tr_); d.rotation.y = s * 0.15; }   // portas abertas
    for (const s of [-1, 1]) box(40, 120, 160, mat.ledR, -1010, 2420, s * 1180, tr_, false);       // luzes traseiras
    box(1600, 80, 2500, mat.dark, -1010, 300, 0, tr_);                                             // pára-choques
    // carga já dentro do reboque + paletes à espera no cais
    for (const z of [-700, 700]) { const p = makePallet(0, 0); p.g.position.set(DX + 900, FLOOR + 270, DZ + z); p.g.rotation.y = Math.PI / 2; p.g.scale.set(0.8, 1, 0.8); stackLoad(p.g, 0, 140, 0, 700, mat.carton); }
    for (const [x, z] of [[DX - 2400, DZ - 1000], [DX - 2400, DZ + 1000], [DX - 3800, DZ - 1000]]) { const p = makePallet(0, 0); p.g.position.set(x, FLOOR, z); stackLoad(p.g, 0, 140, 0, 600, mat.carton); }
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2600, 500), new THREE.MeshBasicMaterial({ map: signTex("CAIS DE CARGA · 1", "Expedição de paletes · camião", "#b45309") }));
    sg.rotation.y = -Math.PI / 2; sg.position.set(DX - 20, FLOOR + 5300, DZ); scene.add(sg);
  }

  // ---------- portão sandwich (parede +z, x ≈ 9700): porta seccional de painéis sandwich, porta de peões, sinalética
  {
    const GX = 9850, GZ = HALL.z - 40, GW = 3400, GH = 4200;
    const panelTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#cfd6dd"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 86) { g.fillStyle = "#b9c2ca"; g.fillRect(0, y, w, 6); g.fillStyle = "#e3e8ed"; g.fillRect(0, y + 6, w, 4); }
      g.fillStyle = "#1f2937"; for (let x = 24; x < w; x += 120) g.fillRect(x, 300, 90, 48);        // janelas da secção
    });
    const door = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, 60), M(0xffffff, 0.3, 0.5, { map: panelTex })); door.position.set(GX, FLOOR + GH / 2, GZ); scene.add(door);
    for (const s of [-1, 1]) box(200, GH + 300, 200, M(0x2f6a9e, 0.3, 0.5), GX + s * (GW / 2 + 120), FLOOR + (GH + 300) / 2, GZ - 60);
    box(GW + 640, 250, 260, M(0x2f6a9e, 0.3, 0.5), GX, FLOOR + GH + 300, GZ - 60);
    box(GW + 640, 90, 260, mat.yellow, GX, FLOOR + GH + 470, GZ - 60);
    box(900, 2100, 40, mDoor, GX - GW / 2 + 700, FLOOR + 1050, GZ - 50);                             // porta de peões (postigo no portão)
    box(1000, 60, 50, mFrame, GX - GW / 2 + 700, FLOOR + 2150, GZ - 50); box(120, 30, 30, mat.chrome, GX - GW / 2 + 1050, FLOOR + 1050, GZ - 80);
    stripe(GX - GW / 2, GZ - 400, GX + GW / 2, GZ - 400, 120); stripe(GX - GW / 2, GZ - 1200, GX + GW / 2, GZ - 1200, 120);
    const gs = new THREE.Mesh(new THREE.PlaneGeometry(2600, 500), new THREE.MeshBasicMaterial({ map: signTex("ENTRADA · PORTÃO 1", "Portão seccional de painel sandwich · 3,8 × 4,2 m", "#2f6fdc") }));
    gs.rotation.y = Math.PI; gs.position.set(GX, FLOOR + GH + 950, GZ - 200); scene.add(gs);
    const bc = cyl(60, 120, mat.ledO, scene, 16); bc.position.set(GX + GW / 2 + 120, FLOOR + GH + 560, GZ - 60);   // pirilampo do portão
  }

  // ---------- ventilação da nave: extractores de cobertura, ventiladores HVLS de tecto e ventiladores axiais de parede com persianas
  const fans = [];
  {
    const RY = FLOOR + HALL.h - 160, mFan = M(0x9aa3ad, 0.6, 0.45), mBlade = M(0x374151, 0.3, 0.6);
    for (const x of [-8000, -3000, 2000, 7000]) for (const z of [-4200, 3600]) {          // 8 extractores de cobertura (turbina)
      cyl(420, 260, mFan, scene, 24).position.set(x, RY, z);
      const cap = cyl(470, 60, mFan, scene, 24); cap.position.set(x, RY + 160, z);
      const rot = new THREE.Group(); rot.position.set(x, RY - 140, z); scene.add(rot);
      for (let i = 0; i < 6; i++) { const b = box(360, 14, 120, mBlade, 0, 0, 0, rot, false); b.position.set(Math.cos(i * Math.PI / 3) * 200, 0, Math.sin(i * Math.PI / 3) * 200); b.rotation.y = -i * Math.PI / 3; b.rotation.x = 0.5; }
      fans.push({ g: rot, w: 9 });
    }
    for (const [x, z] of [[-5500, 1800], [3500, -3200]]) {                                 // 2 ventiladores HVLS (Ø 5 m, lentos), acima dos contentores de 1.º andar
      const hub = new THREE.Group(); hub.position.set(x, FLOOR + 6100, z); scene.add(hub);
      cyl(40, 1300, mPost, scene, 10).position.set(x, FLOOR + 6800, z);
      cyl(220, 220, M(0xe5e7eb, 0.4, 0.4), hub, 24);
      for (let i = 0; i < 6; i++) { const b = box(2400, 20, 220, M(0xcbd5e1, 0.5, 0.4), 0, 0, 0, hub, false); b.position.set(Math.cos(i * Math.PI / 3) * 1350, 0, Math.sin(i * Math.PI / 3) * 1350); b.rotation.y = -i * Math.PI / 3; b.rotation.x = 0.18; }
      fans.push({ g: hub, w: 1.2 });
    }
    const louv = canvasTex(128, 256, (g, w, h) => { g.fillStyle = "#b9bfc5"; g.fillRect(0, 0, w, h); g.fillStyle = "#3b4148"; for (let y = 8; y < h - 6; y += 18) g.fillRect(8, y, w - 16, 9); });
    for (const [x, z, rot] of [[-6000, -HALL.z + 70, 0], [6000, -HALL.z + 70, 0], [HALL.x - 70, -3500, -Math.PI / 2], [-HALL.x + 70, 5000, Math.PI / 2]]) {   // ventiladores axiais de parede
      const g = new THREE.Group(); g.position.set(x, FLOOR + 4200, z); g.rotation.y = rot; scene.add(g);
      box(1300, 1300, 160, mFan, 0, 0, 0, g);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), M(0xffffff, 0.5, 0.5, { map: louv })); pl.position.z = 85; g.add(pl);
      const rot2 = new THREE.Group(); rot2.position.z = -40; g.add(rot2);
      for (let i = 0; i < 5; i++) { const b = box(520, 150, 10, mBlade, 0, 0, 0, rot2, false); b.position.set(Math.cos(i * TAU_ / 5) * 300, Math.sin(i * TAU_ / 5) * 300, 0); b.rotation.z = i * TAU_ / 5; }
      fans.push({ g: rot2, w: 6, axis: "z" });
    }
  }
  addSystem({ draw(dt) { for (const f of fans) { if (f.axis === "z") f.g.rotation.z += f.w * dt; else f.g.rotation.y += f.w * dt; } } });

  // ---------- relógio de turno, sirene e luzes de alarme (almoço e fim de turno)
  // tempo da fábrica: 1 minuto de turno por 2 s de simulação (à velocidade 1) — turno 08:00–17:00, almoço às 12:00
  const SHIFT = { start: 8 * 60, end: 17 * 60, lunch: 12 * 60, lunchLen: 60, min: 8 * 60, alarm: null, alarmT: 0 };
  const beacons = [];
  function beacon(x, y, z, rot) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
    box(360, 520, 160, M(0x374151, 0.3, 0.5), 0, 0, 0, g);                                      // caixa da sirene
    for (let i = 0; i < 5; i++) box(300, 24, 40, mat.black, 0, -180 + i * 80, 90, g);          // grelha
    const a = cyl(60, 120, M(0xffa040, 0, 0.5, { emissive: 0xffa040, emissiveIntensity: 0 }), g, 16); a.position.set(-90, 340, 0);
    const r = cyl(60, 120, M(0xff4040, 0, 0.5, { emissive: 0xff4040, emissiveIntensity: 0 }), g, 16); r.position.set(90, 340, 0);
    beacons.push({ a: a.material, r: r.material });
    return g;
  }
  beacon(-4000, 3200, HALL.z - 150, Math.PI); beacon(5000, 3200, HALL.z - 150, Math.PI);             // fila da frente
  beacon(-HALL.x + 150, 3200, -1500, Math.PI / 2); beacon(0, 3400, -HALL.z + 150, 0); beacon(HALL.x - 150, 3200, 2200 + 2500, -Math.PI / 2);
  // painel LED do turno, ao lado do portão
  const ledW = 800, ledH = 250;
  const ledTex = canvasTex(ledW, ledH, () => {}); ledTex.wrapS = ledTex.wrapT = THREE.ClampToEdgeWrapping;
  const led = new THREE.Mesh(new THREE.PlaneGeometry(3200, 1000), new THREE.MeshBasicMaterial({ map: ledTex })); led.rotation.y = Math.PI; led.position.set(5000, FLOOR + 4100, HALL.z - 90); scene.add(led);
  box(3300, 1100, 60, mat.black, 5000, FLOOR + 4100, HALL.z - 55);
  let ledKey = "";
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
  function drawLed() {
    const g = ledTex.image.getContext("2d");
    g.fillStyle = "#06090f"; g.fillRect(0, 0, ledW, ledH);
    g.fillStyle = "#f59e0b"; g.font = "700 96px Menlo, Consolas, monospace"; g.fillText(hhmm(SHIFT.min), 24, 110);
    g.fillStyle = "#9fb3c8"; g.font = "600 28px Arial"; g.fillText(tr("Turno 1 · 08:00–17:00 · almoço 12:00"), 330, 60);
    g.fillText(tr("Produção") + ` · OK ${okCount} · NOK ${nokCount}`, 330, 104);
    g.fillStyle = SHIFT.alarm === "lunch" ? "#fbbf24" : SHIFT.alarm === "end" ? "#ef4444" : "#22c55e"; g.font = "700 54px Arial";
    g.fillText(SHIFT.alarm === "lunch" ? tr("ALMOÇO · PAUSA 60 MIN") : SHIFT.alarm === "end" ? tr("FIM DE TURNO") : tr("EM PRODUÇÃO"), 24, 205);
    ledTex.needsUpdate = true;
  }
  // sirene: dois tons (almoço) ou tom contínuo (fim de turno), só se o browser já permitir áudio
  let audio = null;
  function siren(kind) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state !== "running") return;
      const o = audio.createOscillator(), gn = audio.createGain(); o.connect(gn); gn.connect(audio.destination);
      o.type = "square"; gn.gain.value = 0.03; const t0 = audio.currentTime;
      if (kind === "lunch") { o.frequency.setValueAtTime(660, t0); o.frequency.setValueAtTime(880, t0 + 0.4); o.frequency.setValueAtTime(660, t0 + 0.8); o.frequency.setValueAtTime(880, t0 + 1.2); o.start(t0); o.stop(t0 + 1.6); }
      else { o.frequency.setValueAtTime(440, t0); o.frequency.linearRampToValueAtTime(900, t0 + 1.5); o.start(t0); o.stop(t0 + 2.5); }
    } catch (e) { /* sem áudio */ }
  }
  let sirenT = 0;
  addSystem({
    update(dt) {
      SHIFT.min += dt / 2;                                                              // 1 min de turno por 2 s
      if (SHIFT.min >= SHIFT.end + 30) SHIFT.min = SHIFT.start;                         // novo turno
      const a = SHIFT.min >= SHIFT.lunch && SHIFT.min < SHIFT.lunch + 0.5 * 2 ? "lunch" : SHIFT.min >= SHIFT.end && SHIFT.min < SHIFT.end + 1 ? "end" : null;
      if (a && SHIFT.alarm !== a) { SHIFT.alarm = a; SHIFT.alarmT = 0; sirenT = 0; }
      if (SHIFT.alarm) { SHIFT.alarmT += dt; sirenT -= dt; if (sirenT <= 0) { siren(SHIFT.alarm); sirenT = 3; } if (SHIFT.alarmT > 12) SHIFT.alarm = null; }
    },
    draw(dt) {
      const on = SHIFT.alarm ? (Math.floor(performance.now() / 250) % 2 === 0) : false;
      for (const b of beacons) { b.a.emissiveIntensity = SHIFT.alarm === "lunch" && on ? 2.6 : 0; b.r.emissiveIntensity = SHIFT.alarm === "end" && on ? 2.6 : 0; }
      const key = `${Math.floor(SHIFT.min)}|${SHIFT.alarm}|${okCount}|${nokCount}|${LANG.rev}`;
      if (key !== ledKey) { ledKey = key; drawLed(); }
    },
  });
  window.__shift = SHIFT;

  // ---------- etiquetas e vistas
  const T = [
    ["Administração · direcção, contabilidade, compras", -8271, ZF - 200], ["Sala de almoço dos funcionários", -1871, ZF - 200],
    ["1.º andar · Sala de reunião executiva", -8271, ZF + 2900], ["1.º andar · Sala de visitas de clientes", -1871, ZF + 2900], ["HSA + Recursos Humanos", 2870, ZF - 200], ["Sala dos engenheiros", 6200, ZF - 200],
    ["WC · balneários", XW + 200, 3000], ["Armazém de EPI", XW + 200, -2500], ["Sala de limpeza · material de limpeza", XW + 200, -5300],
    ["Recepção logística · armazém de entrada", -8450, -2950], ["Manutenção · materiais e peças de reserva", -3800, -2950], ["Zona de emergência · ponto de encontro", 3300, -2100],
    ["Cais de carga · camião a carregar paletes de caixas", HALL.x - 1800, 2200], ["Entrada · portão sandwich", 9850, HALL.z - 600],
  ];
  for (const [text, x, z] of T) addTag({ text, at: () => V(x, FLOOR + CH + 650 + (z > ZF + 2000 ? CH + 70 : 0), z > ZF + 2000 ? ZF - 200 : z), max: 9000 });
  addTag({ text: "Corredor do KMF 1500P · 2,5 m livres (linha de segurança)", at: () => V(5500, FLOOR + 400, -4250), max: 7000 });
  addTag({ text: "Faixa do AMR · circulação livre", at: () => V(5200, FLOOR + 400, 600), max: 6000 });
  addTag({ text: "Ventilação · extractores de cobertura, HVLS e ventiladores de parede", at: () => V(-5500, FLOOR + 5800, 1800), min: 1500, max: 12000 });
  addTag({ text: () => `9 · Instalações de apoio (contentores) · ${hhmm(SHIFT.min)}`, at: () => V(-1000, FLOOR + 4300, 5200), min: 3500, big: true });
  addTag({ text: () => (SHIFT.alarm === "lunch" ? "Sirene · ALMOÇO" : SHIFT.alarm === "end" ? "Sirene · FIM DE TURNO" : `Relógio de turno · ${hhmm(SHIFT.min)}`), at: () => V(5000, FLOOR + 4900, HALL.z - 300), max: 9000 });
  addView("inst", "Instalações", [-2000, 4200, -400], [-2000, 200, 5200]);
  addView("cais", "Cais e portão", [7600, 2800, -1200], [10800, 500, 2600]);
}
