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
    if (opts.windows !== 0) for (let wx = -len / 2 + 1500; wx < len / 2 - 700; wx += 1500) {   // janelas ao longo da frente, fora da porta
      if (Math.abs(wx - dx) < 1150) continue;
      box(1240, 940, 60, mFrame, wx, 1600, F + 10, g); box(1160, 860, 30, mat.glass, wx, 1600, F + 40, g);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2000, 500), new THREE.MeshBasicMaterial({ map: signTex(label, sub, band) }));
    sign.position.set(dx > 0 ? Math.max(-len / 2 + 1100, dx - 1500) : Math.min(len / 2 - 1100, dx + 1500), CH - 330, F + 60); g.add(sign);
    if (!opts.noAC) box(640, 520, 320, mAC, len / 2 - 600, CH + 330, -CD / 2 + 400, g);   // unidade AC inverter (calor/frio) no tecto do contentor
    const lamp = cyl(50, 90, mat.lamp, g, 12); lamp.rotation.x = Math.PI / 2; lamp.position.set(dx, 2350, F + 50);
    if (level === 1) {                                                                 // passadiço à frente com guarda-corpos e escada metálica
      // passadiço de 1,1 m com guarda-corpos; o guarda-corpos tem uma ABERTURA de 1,4 m onde começa a escada
      // passadiço PARTILHADO: o corredor do 1.º andar é contínuo entre contentores vizinhos (opts.openEnd = topo local sem
      // guarda-corpos, onde liga ao passadiço do contentor ao lado); só um dos contentores tem escada (opts.stairs)
      const sx = opts.stairSide || 1, xs = sx * (len / 2 - 650), SW = 1100, z0 = F + 1100, RUN = 2600, DROP = CH + 70 - 160;
      const ext = opts.extend || 0;                                                           // prolonga o passadiço para tapar o intervalo até ao vizinho
      box(len + 300 + Math.abs(ext), 60, 1100, M(0x4b5563, 0.5, 0.5), ext / 2, -35, F + 560, g);
      const rail = (x0, x1) => { if (x1 - x0 < 200) return; const xm = (x0 + x1) / 2, w = x1 - x0; box(w, 40, 40, mat.yellow, xm, 1030, F + 1090, g); box(w, 30, 30, mPost, xm, 520, F + 1090, g); for (let x = x0; x <= x1; x += 1000) box(40, 1050, 40, mPost, Math.min(x, x1), 500, F + 1090, g); box(40, 1050, 40, mPost, x1, 500, F + 1090, g); };
      const xl = -len / 2 - 100 + Math.min(0, ext), xr = len / 2 + 100 + Math.max(0, ext);
      if (opts.stairs) { rail(xl, xs - SW / 2 - 100); rail(xs + SW / 2 + 100, xr); } else rail(xl, xr);
      for (const sxx of [-1, 1]) {
        if (sxx === opts.openEnd) continue;                                                   // topo aberto: liga ao passadiço vizinho
        box(40, 1050, 40, mPost, sxx * (len / 2 + 120), 500, F + 10, g);
        box(40, 40, 1100, mat.yellow, sxx * (len / 2 + 120), 1030, F + 560, g); box(30, 30, 1100, mPost, sxx * (len / 2 + 120), 520, F + 560, g);
      }
      if (!opts.stairs) return g;
      // escada metálica de 1,1 m AO LONGO DA FACHADA (não avança para a nave): patamar na abertura do guarda-corpos, no
      // topo DIREITO (+x) do contentor, e 14 degraus (44°) a descer paralelamente ao contentor, para o lado do centro;
      // fica a 1,1–2,2 m da fachada e termina antes da porta do piso térreo
      const d = -Math.sign(xs), zc = F + 1100 + SW / 2 + 50, mSt = M(0x4b5563, 0.5, 0.5);
      box(1300, 60, SW, mSt, xs, -35, zc, g);
      for (let i = 1; i <= 14; i++) { const t = i / 14; box(240, 40, SW, mSt, xs + d * (650 + t * RUN), -70 - (DROP - 160) * t, zc, g); }
      for (const z of [zc - SW / 2 + 30, zc + SW / 2 - 30]) beam(V(xs + d * 650, -20, z), V(xs + d * (650 + RUN + 100), -DROP + 140, z), 60, mPost, g);
      for (const z of [zc - SW / 2 - 20, zc + SW / 2 + 20]) {
        for (let i = 0; i <= 4; i++) { const t = i / 4; box(40, 1000, 40, mPost, xs + d * (650 + t * RUN), 430 - (DROP - 160) * t, z, g); }
        beam(V(xs + d * 650, 1000, z), V(xs + d * (650 + RUN), 1000 - (DROP - 160), z), 40, mat.yellow, g);
      }
      box(40, 1050, 40, mPost, xs - d * 650, 500, zc + SW / 2 + 20, g); box(40, 1050, 40, mPost, xs - d * 650, 500, zc - SW / 2 - 20, g);   // guarda-corpos do patamar
      box(1300, 40, 40, mat.yellow, xs, 1030, zc + SW / 2 + 20, g); box(40, 40, SW + 80, mat.yellow, xs - d * 650, 1030, zc, g);
    }
    return g;
  }

  // ---------- bloco compacto no canto ESQUERDO da nave (x ≤ −2100), só com as instalações de intervenção rápida;
  //            administração, HSA + RH, reunião executiva e visitas de clientes ficam no escritório central (68-exterior.js).
  //            Nada em frente ao armário de paletes (x ≥ −7000, z ≈ −6100) nem nos corredores dos robôs.
  const ZF = 5750, R180 = Math.PI, XW = -10300, R90 = Math.PI / 2;
  // fila da frente (parede +z), frentes viradas para −z: refeitório (20') + manutenção (10'); 1.º andar: engenheiros e EPI
  container(-8400, ZF, L20, R180, "SALA DE ALMOÇO", "Refeitório dos funcionários", 0xfbf3e4, "#d97706");
  container(-8400, ZF, L20, R180, "SALA DOS ENGENHEIROS", "1.º andar · engenharia · métodos · intervenção rápida", 0xe7eef8, "#2f6fdc", { level: 1, stairs: false, openEnd: -1, extend: -150 });   // sem escada: usa o passadiço partilhado
  container(-3600, ZF, L10, R180, "MANUTENÇÃO", "Materiais e peças de reserva · intervenção rápida", 0xf1f3f5, "#b45309", { windows: 0 });
  container(-3600, ZF, L10, R180, "ARMAZÉM DE EPI", "1.º andar · capacetes · luvas · óculos · botas", 0xfff4e5, "#ea580c", { level: 1, stairs: true, stairSide: 1, openEnd: 1, extend: 150, windows: 0 });   // a ÚNICA escada: no topo do lado do cais (+x), desce ao longo da fachada para o cais
  // coluna da parede −x, frentes viradas para +x: WC junto ao refeitório; logística junto à bobina; limpeza ao fundo
  container(XW, 2700, L10, R90, "WC", "Balneários · vestiários", 0xeef2f6, "#64748b", { door: -L10 / 2 + 700, windows: 0 });
  container(XW, -2450, L10, R90, "RECEPÇÃO LOGÍSTICA", "Armazém de entrada · bobinas · consumíveis", 0xf1f3f5, "#334155", { windows: 0 });
  container(XW, -5450, L10, R90, "SALA DE LIMPEZA", "Material e produtos de limpeza", 0xeaf6fb, "#0e7490", { windows: 0 });

  // mesas e bancos à porta do refeitório; carrinho de limpeza à porta da sala de limpeza
  for (const x of [-7400, -6000]) { box(1400, 40, 700, mat.wood, x, FLOOR + 740, 3900); for (const s of [-1, 1]) box(1400, 30, 250, mat.wood, x, FLOOR + 460, 3900 + s * 500); for (const sx of [-1, 1]) box(60, 740, 60, mPost, x + sx * 600, FLOOR + 370, 3900); }
  { const g = new THREE.Group(); g.position.set(-8500, FLOOR, -4700); scene.add(g); box(900, 60, 500, M(0x2563eb, 0.2, 0.5), 0, 900, 0, g); for (const [x, z] of [[-400, -200], [400, -200], [-400, 200], [400, 200]]) box(40, 880, 40, mPost, x, 440, z, g); box(700, 500, 400, mat.yellow, 0, 300, 0, g); cyl(25, 1200, mat.alu, g, 10).position.set(430, 600, 0); }   // carrinho de limpeza

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
    // rampa niveladora: sobe 418 mm em 2,2 m, do chão da nave até ao piso do reboque (o KMF 1500P sobe-a para carregar)
    const rampA = Math.atan2(DOCK.rise, DOCK.ramp), rampL = Math.hypot(DOCK.ramp, DOCK.rise);
    const ramp = box(rampL, 60, 2700, M(0x4b5563, 0.6, 0.5), DX - DOCK.ramp / 2, FLOOR + DOCK.rise / 2 - 20, DZ); ramp.rotation.z = rampA;
    for (let i = 1; i < 12; i++) { const r = box(40, 20, 2600, M(0x9ca3af, 0.7, 0.4), DX - DOCK.ramp + i * (DOCK.ramp / 12), FLOOR + DOCK.rise * (i / 12) + 14, DZ, scene, false); }   // ranhuras anti-derrapantes
    for (const sz of [-1, 1]) box(DOCK.ramp, DOCK.rise, 40, mat.yellow, DX - DOCK.ramp / 2, FLOOR + DOCK.rise / 2, DZ + sz * 1370, scene, false);   // saias laterais amarelas
    for (const s of [-1, 1]) box(300, 400, 400, mat.black, DX - 150, FLOOR + 350, DZ + s * 1300);   // batentes de borracha
    stripe(DX - 3200, DZ - 1700, DX - 3200, DZ + 1700, 100); stripe(DX - 3200, DZ - 1700, DX - 100, DZ - 1700, 100); stripe(DX - 3200, DZ + 1700, DX - 100, DZ + 1700, 100);
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

  // ---------- climatização: AC inverter calor/frio — unidades interiores de tecto (cassete 4 vias) suspensas na nave,
  //            consola de parede em cada contentor, ventiladores das unidades a rodar; as unidades exteriores ficam fora (68-exterior.js)
  const fans = [];
  {
    const mCas = M(0xf4f5f7, 0.2, 0.5), mGrille = M(0x3b4148, 0.3, 0.6);
    for (const x of [-8000, -3000, 2000, 7000]) for (const z of [-4200, 0, 3600]) {          // 12 cassetes de tecto, suspensas por tirantes
      const g = new THREE.Group(); g.position.set(x, FLOOR + 5600, z); scene.add(g);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(14, 1100, mat.alu, g, 8).position.set(sx * 400, 700, sz * 400);   // tirantes à asna
      box(900, 300, 900, mCas, 0, 150, 0, g);
      box(1050, 40, 1050, mCas, 0, -20, 0, g, false);                                           // painel decorativo
      for (const [ox, oz, w, d] of [[0, -420, 760, 120], [0, 420, 760, 120], [-420, 0, 120, 760], [420, 0, 120, 760]]) { const v = box(w, 24, d, mGrille, ox, -46, oz, g, false); v.rotation.x = oz ? Math.sign(oz) * 0.5 : 0; v.rotation.z = ox ? -Math.sign(ox) * 0.5 : 0; }   // 4 aletas
      const ret = box(500, 10, 500, mGrille, 0, -46, 0, g, false);                               // grelha de retorno
      const rot = new THREE.Group(); rot.position.set(0, 60, 0); g.add(rot);
      for (let i = 0; i < 5; i++) { const b = box(220, 10, 60, mGrille, 0, 0, 0, rot, false); b.position.set(Math.cos(i * TAU_ / 5) * 130, 0, Math.sin(i * TAU_ / 5) * 130); b.rotation.y = -i * TAU_ / 5; }
      fans.push({ g: rot, w: 14 });
      box(90, 90, 1400, mat.alu, 0, 330, 700, g, false);                                          // tubagem de refrigerante / condensados
      const led = box(40, 6, 40, mat.ledG, 300, -26, 300, g, false);
    }
    // conduta de ar novo com grelhas ao longo da asna central (renovação de ar da nave)
    box(2 * HALL.x - 2000, 500, 500, M(0xcfd4da, 0.6, 0.4), 0, FLOOR + 6000, -1750); for (let x = -9000; x <= 9000; x += 1500) box(700, 160, 520, mGrille, x, FLOOR + 5820, -1750, scene, false);
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
    ["Sala de almoço dos funcionários", -8400, ZF - 200, 0], ["1.º andar · Sala dos engenheiros (intervenção rápida)", -8400, ZF - 200, 1],
    ["Manutenção · peças de reserva (intervenção rápida)", -3600, ZF - 200, 0], ["1.º andar · Armazém de EPI", -3600, ZF - 200, 1],
    ["WC · balneários", XW + 200, 2700, 0], ["Recepção logística · armazém de entrada", XW + 200, -2450, 0], ["Sala de limpeza · material de limpeza", XW + 200, -5450, 0],
    ["Zona de emergência · ponto de encontro", 3300, -2100, 0],
    ["Cais de carga · camião a carregar paletes de caixas", HALL.x - 1800, 2200, 0], ["Entrada · portão sandwich", 9850, HALL.z - 600, 0],
  ];
  for (const [text, x, z, lv] of T) addTag({ text, at: () => V(x, FLOOR + CH + 650 + lv * (CH + 70), z), max: 9000 });
  addTag({ text: "Corredor do KMF 1500P · 2,5 m livres (linha de segurança)", at: () => V(5500, FLOOR + 400, -4250), max: 7000 });
  addTag({ text: "Faixa do AMR · circulação livre", at: () => V(5200, FLOOR + 400, 600), max: 6000 });
  addTag({ text: "Climatização · AC inverter calor/frio · cassetes de tecto + conduta de ar novo", at: () => V(-3000, FLOOR + 5300, 0), min: 1500, max: 12000 });
  addTag({ text: () => `9 · Instalações de apoio (contentores) · ${hhmm(SHIFT.min)}`, at: () => V(-6500, FLOOR + 6600, 5200), min: 3500, big: true });
  addTag({ text: () => (SHIFT.alarm === "lunch" ? "Sirene · ALMOÇO" : SHIFT.alarm === "end" ? "Sirene · FIM DE TURNO" : `Relógio de turno · ${hhmm(SHIFT.min)}`), at: () => V(5000, FLOOR + 4900, HALL.z - 300), max: 9000 });
  addView("inst", "Instalações", [-3500, 4200, -1500], [-7500, 800, 4500]);
  addView("cais", "Cais e portão", [7600, 2800, -1200], [10800, 500, 2600]);
}
