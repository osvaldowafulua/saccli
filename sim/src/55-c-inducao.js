// =====================================================================
// Estação 3 · Têmpera por indução → choque em água → revenido por indução
//   Fonte AC de média frequência (gerador) → transformador de adaptação → bobina helicoidal de tubo de cobre
//   arrefecida a água (circuito fechado com refrigerador). A esteira passa POR BAIXO da bobina; por isso, no
//   slot 9 (x = -6450) uma pinça pneumática agarra a lima pelo espigão e eleva-a até ao eixo da bobina, e o
//   carro da bobina avança e envolve a lâmina (a lima é sempre chata: lâmina afunilada + espigão).
//   Aquecimento até P.indT → a pinça puxa a lima para fora (+x) e larga-a sobre o tanque (fosso UP.GAPS) →
//   cai na água: choque térmico em P.quenchT s (vapor + bolhas) → um elevador de raspadores tira-a da água e
//   devolve-a à esteira no slot 12 (x = -5400) → revenido por indução (indutor plano, ~200 °C) no slot 13.
// =====================================================================
{
  const SLOT = 9, X9 = UP.xOf(SLOT), Z0 = UP.Z, X12 = UP.xOf(12), XT = UP.xOf(13);
  const GRAV = 9810;                                          // mm/s²
  const YC = 92;                                              // eixo da bobina (acima da lima que passa na esteira)
  const RH = 59, RT = 6.5, NT = 6, CL = 204;                    // hélice: raio (eixo do tubo), raio do tubo, espiras, comprimento
  const CAR_PARK = X9 - 265, CAR_WORK = X9;                   // carro da bobina: recuado (a montante) / a trabalhar
  const WATER = -115;                                         // superfície da água
  const X_LAND = -6087;                                       // centro da lima ao cair (a ponta passa ao lado do tambor da esteira)
  const HL = () => limaLen() / 2;
  const liftY = () => YC - (2 + P.h / 2);                     // posição y da lima elevada (eixo = eixo da bobina)
  const XG0 = () => X9 + HL() + 30;                           // pinça no espigão da lima parada no slot 9
  const XG1 = () => X_LAND + HL() + 30;                       // pinça onde larga a lima sobre o tanque
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => ease(clamp((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const fmt = (v, d = 1) => v.toFixed(d).replace(".", ",");

  // ---------- tempos do ciclo (segundos de linha)
  const T_DOWN = 0.18, T_CLOSE = 0.28, T_LIFT = 0.48, T_CIN = 0.78, T_ON = 0.8, T_TOP = 1.72;   // na paragem do slot 9
  const T_PULL = 0.3, T_OPEN = 0.36, T_UP = 0.5, T_BACK = 0.85, T_COUT = 0.62, T_IDX = 0.5;     // no avanço 9 → 10

  // ---------- materiais
  const mCu = M(0xc8733f, 0.95, 0.27, { emissive: 0xff5a14, emissiveIntensity: 0 });
  const mCuT = M(0xc8733f, 0.95, 0.27, { emissive: 0xff5a14, emissiveIntensity: 0 });
  const mCuBar = M(0xd88c55, 0.9, 0.3);
  const mInsul = M(0xd9c58f, 0.05, 0.7);                     // isolante (resina/Celeron)
  const mCab = M(0xd5d9dc, 0.25, 0.5);                       // RAL 7035
  const mCabDark = M(0x3e444c, 0.4, 0.5);
  const mTrafo = M(0x35597f, 0.35, 0.45);
  const mInox = M(0xc4cad0, 0.9, 0.3), mTank = M(0xb4bcc4, 0.72, 0.42);
  const mInoxD = M(0x9ea7b0, 0.85, 0.4, { side: THREE.DoubleSide });
  const mHoseB = M(0x1f63c9, 0.1, 0.5), mHoseR = M(0xc62828, 0.1, 0.5), mRubber = M(0x17191c, 0, 0.85);
  const mSlat = M(0x8d959e, 0.85, 0.38), mFlight = M(0x6f7780, 0.8, 0.42), mFrame = M(0x4b6a8a, 0.4, 0.5);
  const mChiller = M(0xe9edf0, 0.2, 0.45);
  const mGlass = M(0x101a26, 0.3, 0.08);
  const lamp = (c) => { const m = M(c, 0, 0.35, { emissive: c, emissiveIntensity: 0 }); m.userData.on = new THREE.Color(c); m.userData.off = new THREE.Color(c).multiplyScalar(0.22); return m; };
  const setLamp = (m, on) => { m.color.copy(on ? m.userData.on : m.userData.off); m.emissiveIntensity = on ? 2.2 : 0; };

  // ---------- auxiliares
  const sh = (o) => { o.castShadow = o.receiveShadow = true; return o; };
  const put = (o, x, y, z, parent = scene) => { o.position.set(x, y, z); parent.add(o); return o; };
  function rbox(w, h, d, r, m, bev = 3) {                    // caixa de arestas arredondadas (carenagens)
    const s = new THREE.Shape(), x0 = -w / 2 + bev, x1 = w / 2 - bev, y0 = -d / 2 + bev, y1 = d / 2 - bev;
    const q = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
    s.moveTo(x0 + q, y0); s.lineTo(x1 - q, y0); s.quadraticCurveTo(x1, y0, x1, y0 + q); s.lineTo(x1, y1 - q);
    s.quadraticCurveTo(x1, y1, x1 - q, y1); s.lineTo(x0 + q, y1); s.quadraticCurveTo(x0, y1, x0, y1 - q); s.lineTo(x0, y0 + q);
    s.quadraticCurveTo(x0, y0, x0 + q, y0);
    const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -(h - 2 * bev) / 2); g.rotateX(-Math.PI / 2);
    return sh(new THREE.Mesh(g, m));
  }
  const tube = (pts, r, m, parent = scene, segs = 48, rad = 10) =>
    put(sh(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(p[0], p[1], p[2]))), segs, r, rad), m)), 0, 0, 0, parent);
  const cylX = (r, len, m, x, y, z, parent = scene, s = 20) => { const c = cyl(r, len, m, parent, s); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); return c; };
  const cylZ = (r, len, m, x, y, z, parent = scene, s = 20) => { const c = cyl(r, len, m, parent, s); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); return c; };
  const plate = (w, h, tex, x, y, z, ry = 0, parent = scene) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M(0xffffff, 0.1, 0.55, { map: tex })); p.rotation.y = ry; return put(p, x, y, z, parent);
  };
  const labelTex = (w, h, lines, bg = "#e9edf1", band = "#1f5fd6", icon = "") => canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = "#2b3644"; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
    let x0 = 22;
    if (icon) { g.fillStyle = band; g.fillRect(4, 4, h - 8, h - 8); g.fillStyle = "#fff"; g.font = `800 ${Math.round(h * 0.42)}px Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(icon, h / 2, h / 2 + 2); x0 = h + 14; }
    g.textAlign = "left"; g.textBaseline = "middle";
    lines.forEach(([t, f, c], i) => { g.font = f; g.fillStyle = c || "#16202c"; g.fillText(t, x0, (h / (lines.length + 1)) * (i + 1)); });
  });
  const warnTex = (txt) => canvasTex(256, 128, (g) => {
    g.fillStyle = "#f2c200"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#111"; g.lineWidth = 8;
    g.beginPath(); g.moveTo(64, 16); g.lineTo(114, 106); g.lineTo(14, 106); g.closePath(); g.stroke();
    g.fillStyle = "#111"; g.font = "800 54px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("⚡", 64, 74);
    g.font = "700 26px Arial"; g.textAlign = "left"; g.fillText(txt[0], 128, 48); g.font = "20px Arial"; g.fillText(txt[1], 128, 86);
  });

  // estado inicial coerente: cada lima já com o que as estações anteriores lhe fizeram (forma completa, dentes, …)
  for (const l of UP.limas) {
    UP.guarantee(l);
    if (l.slot >= 10 && l.slot <= 12) { UP.blendFinish(l, "scale", 1); l.finishName = "scale"; }
  }
  UP.addStation({ slot: SLOT, name: "Têmpera por indução" });
  UP.addStation({ slot: 13, name: "Revenido por indução" });

  // =====================================================================
  // 1 · Carro da bobina: bobina de cobre + ligações + transformador de adaptação (desliza em x)
  // =====================================================================
  // cotas (y) do carro: mesa → guias → patins → placa → transformador
  const TABLE_TOP = -130, Y_PLATE = -86, Y_TRAFO0 = -80, TRAFO_H = 300;
  const car = new THREE.Group(); car.position.set(CAR_PARK, YC, Z0); scene.add(car);
  {
    // tubo de cobre contínuo: ligação A → hélice de 6 espiras → ligação B (a água de arrefecimento corre por dentro)
    const pts = [[-22, 0, -246], [-22, 0, -190], [-28, 0, -135], [-62, 0, -98], [-90, 0, -72]];
    const N = NT * 28;
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = Math.PI + 2 * Math.PI * NT * u;
      pts.push([-CL / 2 + CL * u, RH * Math.sin(a), RH * Math.cos(a)]);
    }
    pts.push([90, 0, -72], [62, 0, -98], [28, 0, -135], [22, 0, -190], [22, 0, -246]);
    tube(pts, RT, mCu, car, 900, 10);
    // pentes isolantes que mantêm o passo das espiras (atrás, para deixar ver a lima)
    for (const a of [Math.PI * 0.7, Math.PI * 1.3]) {
      const c = put(sh(new THREE.Mesh(new THREE.BoxGeometry(CL + 26, 10, 18), mInsul)), 0, (RH + RT + 4) * Math.sin(a), (RH + RT + 4) * Math.cos(a), car);
      c.rotation.x = -a + Math.PI / 2;
    }
    // blocos de ligação (cobre) separados por uma placa isolante; barras de saída do transformador
    for (const s of [-1, 1]) { put(sh(new THREE.Mesh(new THREE.BoxGeometry(30, 66, 64), mCuBar)), s * 22, 0, -262, car); }
    put(sh(new THREE.Mesh(new THREE.BoxGeometry(12, 84, 70), mInsul)), 0, 0, -262, car);
    {
      // parafusos de aperto do pacote (atravessam os blocos em x)
      const bolts = sh(new THREE.InstancedMesh(new THREE.CylinderGeometry(6, 6, 8, 6), mat.chrome, 4)); const d = new THREE.Object3D(); let i = 0;
      for (const s of [-1, 1]) for (const y of [-18, 18]) { d.position.set(s * 41, y, -262); d.rotation.set(0, 0, Math.PI / 2); d.updateMatrix(); bolts.setMatrixAt(i++, d.matrix); }
      car.add(bolts);
    }
    // transformador de adaptação (frente em z = -294 local → -714 no mundo)
    const zF = -294, zB = -510, tc = (Y_TRAFO0 + TRAFO_H / 2) - YC;
    put(rbox(270, TRAFO_H, zF - zB, 16, mTrafo), 0, tc, (zF + zB) / 2, car);
    put(rbox(282, 14, zF - zB + 12, 18, mCabDark), 0, tc + TRAFO_H / 2 + 4, (zF + zB) / 2, car);    // tampa
    put(sh(new THREE.Mesh(new THREE.BoxGeometry(110, 120, 14), mCabDark)), 0, 0, zF - 2, car);      // flange das barras
    plate(150, 66, labelTex(300, 132, [["TRANSFORMADOR", "800 30px Arial"], ["de adaptação 12:1", "22px Arial", "#3d4b5c"], ["8 kV·A · água", "20px Arial", "#3d4b5c"]], "#e9edf1", "#1f5fd6", "T"), 136, tc + 40, (zF + zB) / 2, Math.PI / 2, car);
    plate(70, 35, warnTex(["Perigo", "AT / AF"]), 70, tc + 90, zF + 0.6, 0, car);
    // olhais de elevação e ligações de água no topo (entrada azul / saída vermelha)
    for (const s of [-1, 1]) { const e = put(sh(new THREE.Mesh(new THREE.TorusGeometry(14, 4, 8, 16), mat.chrome)), s * 100, tc + TRAFO_H / 2 + 24, (zF + zB) / 2, car); e.rotation.y = Math.PI / 2; }
    const fitY = tc + TRAFO_H / 2 + 10;
    for (const [s, m] of [[-1, mHoseB], [1, mHoseR]]) { const f = cyl(11, 34, m, car, 14); f.position.set(s * 50, fitY + 14, -470); const n = cyl(14, 10, mat.brass, car, 14); n.position.set(s * 50, fitY + 2, -470); }
    // mangueiras de água e cabos de potência (vão para a corrente porta-cabos, presa ao carro)
    const yCh = -44 - YC, zCh = -935 - Z0;
    tube([[-50, fitY + 30, -470], [-52, fitY + 75, -486], [-95, fitY + 70, zCh + 4], [-150, 60, zCh + 6], [-150, yCh + 30, zCh + 6], [-150, yCh + 12, zCh + 6]], 9, mHoseB, car, 40, 8);
    tube([[50, fitY + 30, -470], [48, fitY + 95, -492], [-60, fitY + 85, zCh - 2], [-165, 70, zCh - 4], [-165, yCh + 30, zCh - 4], [-165, yCh + 12, zCh - 4]], 9, mHoseR, car, 40, 8);
    tube([[0, -40, zB + 2], [-30, -100, zB - 8], [-120, yCh + 20, zCh], [-158, yCh + 6, zCh]], 15, mRubber, car, 24, 10);
    for (const [x, m] of [[-50, mHoseB], [50, mHoseR]]) { const b = cyl(13, 16, m, car, 14); b.position.set(x, fitY + 58, -478); }  // anilhas de identificação
    // placa do carro, patins, porca do fuso e suporte da corrente
    put(sh(new THREE.Mesh(new THREE.BoxGeometry(340, 12, 260), mat.aluDark)), 0, Y_PLATE - YC, -380, car);
    {
      const blocks = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(64, 14, 44), mat.dark, 4)); const d = new THREE.Object3D(); let i = 0;
      for (const sx of [-1, 1]) for (const z of [-720, -880]) { d.position.set(sx * 110, -99 - YC, z - Z0); d.updateMatrix(); blocks.setMatrixAt(i++, d.matrix); }
      car.add(blocks);
    }
    put(sh(new THREE.Mesh(new THREE.BoxGeometry(70, 30, 46), mat.dark)), 0, -107 - YC, -800 - Z0, car);
    put(sh(new THREE.Mesh(new THREE.BoxGeometry(40, 60, 22), mat.aluDark)), -150, -62 - YC, zCh + 18, car);
    // pirómetro óptico a medir a lima através das espiras
    const py = 228;
    cyl(9, py - (tc + TRAFO_H / 2), mat.aluDark, car, 12).position.set(60, (py + tc + TRAFO_H / 2) / 2, -300);
    put(sh(new THREE.Mesh(new THREE.BoxGeometry(22, 22, 300), mat.aluDark)), 60, py, -160, car);
    const pyro = cyl(20, 92, mat.dark, car, 18); pyro.position.set(60, py - 40, -14);
    const lens = cyl(13, 4, mGlass, car, 18); lens.position.set(60, py - 88, -14);
    cyl(22, 12, mat.yellow, car, 18).position.set(60, py + 4, -14);
  }
  // mesa fixa com guias lineares, fuso de esferas e servomotor
  {
    const xc = -6600, zc = -805, W = 620, Dd = 280;
    box(W, 24, Dd, mat.steelBlue, xc, TABLE_TOP - 12, zc);
    for (const sx of [-1, 1]) for (const z of [-690, -920]) box(50, TABLE_TOP - 24 - FLOOR, 50, mat.steelBlue, xc + sx * 280, (TABLE_TOP - 24 + FLOOR) / 2, z);
    for (const z of [-690, -920]) box(560, 30, 30, mat.steelBlue, xc, FLOOR + 90, z);
    for (const z of [-720, -880]) box(W, 24, 22, mRail(), xc, TABLE_TOP + 12, z);
    cylX(8, 600, mat.chrome, xc, -112, -800);
    for (const x of [xc - 300, xc + 300]) box(36, 44, 64, mat.dark, x, -108, -800);
    put(rbox(118, 104, 104, 12, mat.black), -6970, -112, -800);
    put(rbox(30, 96, 96, 10, mat.carbon), -7043, -112, -800);
    put(rbox(14, 108, 108, 14, mat.yellow, 2), -6918, -112, -800);
    box(30, 30, 40, mat.dark, -6975, -42, -800);
    box(600, 4, 34, mat.aluDark, xc, TABLE_TOP + 2, -935);                // calha da corrente porta-cabos
    box(40, 34, 34, mat.aluDark, -6330, TABLE_TOP + 17, -935);
  }
  function mRail() { return mRail.m || (mRail.m = M(0xb7bec6, 0.95, 0.22)); }

  // corrente porta-cabos (horizontal, no plano x-y em z = -935): ponta fixa a +x, ponta móvel no carro
  const CH_N = 34, CH_P = 19, CH_R = 32, CH_Z = -935, CH_YL = TABLE_TOP + 14, CH_XF = -6330;
  const chain = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(17, 20, 16), M(0x1e2024, 0.2, 0.72), CH_N)); scene.add(chain);
  const cd = new THREE.Object3D(); let chainX = NaN;
  function updateChain(xm) {
    if (Math.abs(xm - chainX) < 0.05) return; chainX = xm;
    const Lc = CH_N * CH_P, xb = (CH_XF + xm - Lc + Math.PI * CH_R) / 2, L1 = CH_XF - xb, LA = Math.PI * CH_R, yc = CH_YL + CH_R;
    for (let i = 0; i < CH_N; i++) {
      const d = (i + 0.5) * CH_P; let x, y, r;
      if (d < L1) { x = CH_XF - d; y = CH_YL; r = 0; }
      else if (d < L1 + LA) { const ph = (d - L1) / CH_R; x = xb - CH_R * Math.sin(ph); y = yc - CH_R * Math.cos(ph); r = -ph; }
      else { x = xb + (d - L1 - LA); y = CH_YL + 2 * CH_R; r = -Math.PI; }
      cd.position.set(x, y, CH_Z); cd.rotation.set(0, 0, r); cd.updateMatrix(); chain.setMatrixAt(i, cd.matrix);
    }
    chain.instanceMatrix.needsUpdate = true;
  }
  // cabos/mangueiras da ponta fixa da corrente até ao gerador
  tube([[CH_XF, CH_YL, CH_Z], [CH_XF + 26, CH_YL - 50, CH_Z - 6], [CH_XF - 60, -300, -948], [CH_XF - 180, -360, -962]], 15, mRubber, scene, 24, 10);
  tube([[CH_XF, CH_YL + 6, CH_Z + 6], [CH_XF + 40, CH_YL - 40, CH_Z + 4], [CH_XF - 40, -290, -946], [CH_XF - 150, -350, -962]], 9, mHoseB, scene, 24, 8);
  tube([[CH_XF, CH_YL + 6, CH_Z - 6], [CH_XF + 50, CH_YL - 36, CH_Z - 6], [CH_XF - 20, -280, -946], [CH_XF - 120, -340, -962]], 9, mHoseR, scene, 24, 8);

  // =====================================================================
  // 2 · Gerador de indução (fonte AC de média frequência) — a frente (HMI, comandos, ventilação)
  //     está virada para −z, o corredor do operador (atrás da linha); o lado +z, encostado à máquina, só recebe os cabos
  // =====================================================================
  const GX = -6620, GZF = -960, GZB = -1245, GW = 600, GH = 2000, GZ = (GZF + GZB) / 2;
  const HW = 800, HH = 600;
  const hmiTex = canvasTex(HW, HH, () => {}); hmiTex.wrapS = hmiTex.wrapT = THREE.ClampToEdgeWrapping;
  const hg = hmiTex.image.getContext("2d");
  const mLampR = lamp(0xff2b2b), mLampA = lamp(0xffa21a), mLampG = lamp(0x26e07a);
  {
    box(GW, 100, GZF - GZB, mat.dark, GX, FLOOR + 50, GZ);
    box(GW, GH - 100, GZF - GZB, mCab, GX, FLOOR + 100 + (GH - 100) / 2, GZ);
    box(GW + 20, 20, GZF - GZB + 20, mCabDark, GX, FLOOR + GH + 10, GZ);
    // frente do armário: grupo rodado 180° em torno do eixo do armário → tudo o que aqui está em z = F + k fica na face −z
    const front = new THREE.Group(); front.position.set(GX, 0, GZ); front.rotation.y = Math.PI; scene.add(front);
    const F = (GZF - GZB) / 2;
    box(3, GH - 160, 3, mat.dark, 0, FLOOR + 100 + (GH - 100) / 2, F + 1, front);
    for (const s of [-1, 1]) box(16, 130, 26, mat.dark, s * 26, FLOOR + 1180, F + 12, front);
    // ecrã (HMI)
    box(480, 362, 14, mat.dark, -20, 990, F + 7, front);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(450, 337.5), new THREE.MeshBasicMaterial({ map: hmiTex, toneMapped: false }));
    put(scr, -20, 990, F + 14.6, front);
    // placa de características
    plate(460, 72, labelTex(640, 100, [["GERADOR DE INDUÇÃO · FONTE AC MF", "800 30px Arial"], ["120 kW · 10–30 kHz · 400 V 3~", "22px Arial", "#3d4b5c"]], "#e9edf1", "#c2410c", "≈"), -20, 1270, F + 1, 0, front);
    plate(120, 60, warnTex(["Perigo", "alta tensão"]), 190, 640, F + 1, 0, front);
    // grelhas de ventilação
    const louv = canvasTex(128, 256, (g, w, h) => { g.fillStyle = "#b9bfc5"; g.fillRect(0, 0, w, h); g.fillStyle = "#3b4148"; for (let y = 10; y < h - 6; y += 16) g.fillRect(10, y, w - 20, 8); });
    plate(220, 420, louv, -150, -220, F + 1, 0, front); plate(220, 420, louv, 150, -220, F + 1, 0, front);
    // interruptor geral e paragem de emergência
    box(110, 110, 10, mat.yellow, 190, 820, F + 5, front);
    const h = box(80, 22, 30, M(0xc4161c, 0.1, 0.4), 190, 820, F + 22, front); h.rotation.z = 0.5;
    cylZ(30, 10, mat.yellow, 190, 990, F + 5, front);
    cylZ(20, 26, M(0xc4161c, 0.1, 0.4), 190, 990, F + 20, front);
    box(150, 70, 30, mat.dark, GX + 240, -380, GZF + 15);                   // bucins de entrada dos cabos (lado da máquina, onde chegam as mangueiras)
    // coluna luminosa (no canto do lado do operador)
    const x = GX - 230, z = GZ - 40, yt = FLOOR + GH + 20;
    cyl(26, 16, mat.dark, scene, 20).position.set(x, yt + 8, z);
    cyl(9, 110, mat.alu, scene, 12).position.set(x, yt + 70, z);
    [[mLampG, yt + 150], [mLampA, yt + 198], [mLampR, yt + 246]].forEach(([m, y]) => cyl(30, 46, m, scene, 24).position.set(x, y, z));
    cyl(30, 14, mat.dark, scene, 24).position.set(x, yt + 276, z);
  }

  // =====================================================================
  // 3 · Refrigerador de circuito fechado (água desionizada da bobina e do gerador)
  // =====================================================================
  const fans = [];
  let chillTex, chillG;
  {
    const CX = -7410, CZ = -1025, CW = 500, CD = 440, CH = 1300;
    box(CW, 60, CD, mat.dark, CX, FLOOR + 30, CZ);
    box(CW, CH - 60, CD, mChiller, CX, FLOOR + 60 + (CH - 60) / 2, CZ);
    box(CW + 10, 14, CD + 10, mCabDark, CX, FLOOR + CH + 7, CZ);
    const grill = canvasTex(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = "#2b3036"; g.lineWidth = 6;
      for (let r = 20; r < 128; r += 18) { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); }
      for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 124 * Math.cos(a * Math.PI / 4), 128 + 124 * Math.sin(a * Math.PI / 4)); g.stroke(); }
    });
    grill.wrapS = grill.wrapT = THREE.ClampToEdgeWrapping;
    const blades = canvasTex(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256); g.fillStyle = "#30353b";
      for (let a = 0; a < 5; a++) { g.save(); g.translate(128, 128); g.rotate(a * Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -62, 30, 58, 0.35, 0, 7); g.fill(); g.restore(); }
      g.beginPath(); g.arc(128, 128, 24, 0, 7); g.fill();
    });
    blades.wrapS = blades.wrapT = THREE.ClampToEdgeWrapping;
    for (const s of [-1, 1]) {
      const fx = CX + s * 120;
      const ring = cyl(112, 24, mCabDark, scene, 32); ring.position.set(fx, FLOOR + CH + 12, CZ);
      const b = new THREE.Mesh(new THREE.CircleGeometry(102, 32), M(0xffffff, 0.3, 0.6, { map: blades, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
      b.rotation.x = -Math.PI / 2; put(b, fx, FLOOR + CH + 16, CZ); fans.push(b);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(108, 32), M(0xffffff, 0.6, 0.4, { map: grill, transparent: true, alphaTest: 0.4 }));
      gr.rotation.x = -Math.PI / 2; put(gr, fx, FLOOR + CH + 25, CZ);
    }
    const louv = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#dfe4e8"; g.fillRect(0, 0, w, h); g.fillStyle = "#7d868f"; for (let y = 8; y < h; y += 12) g.fillRect(8, y, w - 16, 5); });
    plate(430, 520, louv, CX, FLOOR + 380, CZ + CD / 2 + 1);
    chillTex = canvasTex(320, 160, () => {}); chillTex.wrapS = chillTex.wrapT = THREE.ClampToEdgeWrapping; chillG = chillTex.image.getContext("2d");
    box(250, 140, 10, mat.dark, CX - 60, FLOOR + 1060, CZ + CD / 2 + 5);
    put(new THREE.Mesh(new THREE.PlaneGeometry(230, 115), new THREE.MeshBasicMaterial({ map: chillTex, toneMapped: false })), CX - 60, FLOOR + 1060, CZ + CD / 2 + 10.5);
    plate(300, 90, labelTex(400, 120, [["REFRIGERADOR", "800 34px Arial"], ["circuito fechado · 30 kW", "24px Arial", "#3d4b5c"]], "#e9edf1", "#0e7490", "❄"), CX, FLOOR + 900, CZ + CD / 2 + 1);
    // tubagens isoladas para o gerador (ida azul / retorno vermelho)
    for (const [y, m] of [[-330, mHoseB], [-250, mHoseR]]) cylX(16, 100, m, -7120, y, -1120);
  }

  // =====================================================================
  // 4 · Pinça pneumática no espigão (eixo x sobre a linha, preso a dois pilares atrás)
  // =====================================================================
  const BEAM_Y = 560, BEAM_Z = -530, PZ = -690;
  for (const px of [-6240, -5650]) {
    box(70, 900 - FLOOR, 70, mat.steelBlue, px, (900 + FLOOR) / 2, PZ);
    box(170, 12, 170, mat.dark, px, FLOOR + 6, PZ);
    box(60, 60, (BEAM_Z - 45) - (PZ + 35), mat.steelBlue, px, BEAM_Y, (BEAM_Z - 45 + PZ + 35) / 2);
  }
  box(820, 90, 90, mat.alu, -6010, BEAM_Y, BEAM_Z);
  box(820, 20, 12, mRail(), -6010, BEAM_Y, BEAM_Z + 51);
  put(rbox(110, 96, 96, 12, mat.black), -5545, BEAM_Y, BEAM_Z);
  put(rbox(14, 100, 100, 14, mat.yellow, 2), -5598, BEAM_Y, BEAM_Z);
  put(rbox(28, 88, 88, 10, mat.carbon), -5476, BEAM_Y, BEAM_Z);
  const xcar = new THREE.Group(); xcar.position.set(-6290, 0, 0); scene.add(xcar);
  const grip = new THREE.Group(); xcar.add(grip);
  const fingers = [];
  {
    box(170, 150, 40, mat.aluDark, 0, BEAM_Y, BEAM_Z + 77, xcar);
    box(70, 240, 50, mat.alu, 0, 470, Z0, xcar);
    box(50, 40, 30, mat.blue, 0, 560, Z0 + 40, xcar);                        // válvula
    tube([[0, 560, Z0 + 56], [30, 520, Z0 + 70], [26, 450, Z0 + 40]], 4, mat.blue, xcar, 12, 6);
    box(40, 300, 22, mat.chrome, 0, 245, Z0, grip);                          // haste guiada
    put(rbox(78, 50, 62, 10, mat.kukaOrange), 0, 70, Z0, grip);              // pinça paralela
    for (const s of [-1, 1]) fingers.push(box(26, 48, 8, mat.dark, 0, 24, Z0 + s * 20, grip));
  }

  // =====================================================================
  // 5 · Tanque de têmpera (água) no fosso da esteira + elevador de raspadores
  // =====================================================================
  const TX0 = -6392, TX1 = -5598, TZ0 = -620, TZ1 = -220, TY0 = -540, TY1 = -60, WT = 6;
  {
    const xc = (TX0 + TX1) / 2, zc = (TZ0 + TZ1) / 2, L = TX1 - TX0, W = TZ1 - TZ0, H = TY1 - TY0;
    box(L, WT, W, mTank, xc, TY0 + WT / 2, zc);
    for (const z of [TZ0 + WT / 2, TZ1 - WT / 2]) box(L, H, WT, mTank, xc, (TY0 + TY1) / 2, z);
    for (const x of [TX0 + WT / 2, TX1 - WT / 2]) box(WT, H, W - 2 * WT, mTank, x, (TY0 + TY1) / 2, zc);
    for (const z of [TZ0 - 12, TZ1 + 12]) box(L, 6, 30, mInox, xc, TY1 - 3, z);     // abas da borda
    for (const y of [-200, -400]) for (const z of [TZ0 - 5, TZ1 + 5]) box(L - 20, 34, 10, mTank, xc, y, z);   // reforços
    for (const x of [TX0 + 3, TX1 - 3]) for (const z of [TZ0 - 3, TZ1 + 3]) box(36, H, 36, mTank, x, (TY0 + TY1) / 2, z);
    // visor de nível (tubo de vidro com água)
    const gx = TX0 + 120;
    cyl(10, 400, M(0xdfefff, 0.2, 0.05, { transparent: true, opacity: 0.35, depthWrite: false }), scene, 14).position.set(gx, -320, TZ1 + 30);
    cyl(6.5, WATER - (TY0 + 40), M(0x2a8fa0, 0.1, 0.2), scene, 12).position.set(gx, (WATER + TY0 + 40) / 2, TZ1 + 30);
    for (const y of [-118, -522]) box(30, 16, 40, mInox, gx, y, TZ1 + 18);
    for (const sx of [0, 1]) for (const z of [TZ0 + 30, TZ1 - 30]) box(60, TY0 - FLOOR, 60, mat.steelBlue, sx ? TX1 - 40 : TX0 + 40, (TY0 + FLOOR) / 2, z);
    box(L - 40, 40, 40, mat.steelBlue, xc, FLOOR + 20, TZ0 + 30); box(L - 40, 40, 40, mat.steelBlue, xc, FLOOR + 20, TZ1 - 30);
    // válvula de esgoto (frente) e sonda de temperatura da água
    cylZ(16, 60, mInox, -5720, TY0 + 40, TZ1 + 26);
    box(52, 52, 52, mat.dark, -5720, TY0 + 40, TZ1 + 70);
    box(110, 10, 18, mat.yellow, -5720, TY0 + 72, TZ1 + 70);
    cyl(6, 300, mat.chrome, scene, 10).position.set(TX0 + 60, -170, TZ0 + 34);
    box(60, 50, 44, mat.dark, TX0 + 60, -10, TZ0 + 34);
    plate(200, 76, labelTex(400, 152, [["TANQUE DE TÊMPERA", "800 34px Arial"], ["água · 450 L · 25 °C", "26px Arial", "#3d4b5c"]], "#e9edf1", "#0e7490", "≈"), -6080, -300, TZ1 + 6);
  }
  // água: volume translúcido azul-esverdeado + superfície com ondulação
  const waterTop = (() => {
    const W = 256, c = document.createElement("canvas"); c.width = c.height = W; const g = c.getContext("2d"), img = g.createImageData(W, W);
    const TAU = 2 * Math.PI / W;
    const hgt = (x, y) => Math.sin(TAU * 2 * x + 0.9 * Math.sin(TAU * y)) * 0.5 + Math.sin(TAU * 3 * y + 0.7 * Math.sin(TAU * 2 * x)) * 0.35 + Math.sin(TAU * (5 * x + 4 * y)) * 0.12;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const dx = (hgt(x + 1, y) - hgt(x - 1, y)) * 9, dy = (hgt(x, y + 1) - hgt(x, y - 1)) * 9, n = Math.hypot(dx, dy, 1), i = 4 * (y * W + x);
      img.data[i] = 128 - 127 * dx / n; img.data[i + 1] = 128 - 127 * dy / n; img.data[i + 2] = 255 / n; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(TX1 - TX0 - 2 * WT, TZ1 - TZ0 - 2 * WT),
      new THREE.MeshStandardMaterial({ color: 0x2f8794, metalness: 0.05, roughness: 0.05, transparent: true, opacity: 0.4, normalMap: t, normalScale: new THREE.Vector2(0.22, 0.22), envMapIntensity: 1.3, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 3; put(m, (TX0 + TX1) / 2, WATER, (TZ0 + TZ1) / 2);
    return m;
  })();
  {
    const h = WATER - 2 - (TY0 + WT);
    const v = box(TX1 - TX0 - 2 * WT - 1, h, TZ1 - TZ0 - 2 * WT - 1, M(0x0f5a66, 0, 0.2, { transparent: true, opacity: 0.26, depthWrite: false }), (TX0 + TX1) / 2, TY0 + WT + h / 2, (TZ0 + TZ1) / 2, scene, false);
    v.renderOrder = 2;
  }

  // ---------- elevador de raspadores (taliscas de aço inox + raspadores), inclinado a 70°
  const TH = 70 * Math.PI / 180, CT = Math.cos(TH), STH = Math.sin(TH);
  const YB = -450, HX = -5700, HY = -12, RS = 32, NF = 6, D_TARGET = 366;
  const BX = HX - (HY - YB) / Math.tan(TH), INC = (HY - YB) / STH;
  const U1 = [CT, STH], N1 = [STH, -CT];
  const corner = (d) => { const tp = (-d - d * N1[1]) / U1[1]; return [BX + tp * U1[0] + d * N1[0], YB - d]; };
  function buildLoop(xt) {
    const A0 = [xt, YB - 4], A1 = corner(4), A2 = [HX + 4 * N1[0], HY + 4 * N1[1]];
    const HC = [A2[0] + RS * N1[0], A2[1] + RS * N1[1]], TC = [xt, YB - 4 - RS];
    const pts = [A0, A1, A2], a0 = Math.atan2(A2[1] - HC[1], A2[0] - HC[0]);
    for (let i = 1; i <= 16; i++) { const a = a0 - (Math.PI * i) / 16; pts.push([HC[0] + RS * Math.cos(a), HC[1] + RS * Math.sin(a)]); }
    pts.push(corner(4 + 2 * RS), [xt, YB - 4 - 2 * RS]);
    for (let i = 1; i < 16; i++) { const a = -Math.PI / 2 - (Math.PI * i) / 16; pts.push([TC[0] + RS * Math.cos(a), TC[1] + RS * Math.sin(a)]); }
    const cum = [0];
    for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    return { pts, cum, L: cum[pts.length], HC, TC, sB: cum[1] };
  }
  // comprimento do circuito = NF × passo dos raspadores (o passo é também o avanço por ciclo)
  let lo = -6420, hi = -6150, loop = null;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; loop = buildLoop(m); if (loop.L > NF * D_TARGET) lo = m; else hi = m; }
  const DSTEP = loop.L / NF, LOOP = loop.L;
  const P10 = X_LAND - BX, P11 = P10 + DSTEP;                 // posição (centro) da lima no elevador nos slots 10 e 11
  function loopAt(s, out) {
    s = ((s % LOOP) + LOOP) % LOOP;
    const { pts, cum } = loop; let i = 0;
    while (i < pts.length - 1 && cum[i + 1] < s) i++;
    const a = pts[i], b = pts[(i + 1) % pts.length], k = (s - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]);
    out.x = a[0] + (b[0] - a[0]) * k; out.y = a[1] + (b[1] - a[1]) * k; out.r = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return out;
  }
  {
    // chapas laterais: contorno do circuito afastado 3 mm para fora (cobrem a corrente, deixam ver as taliscas por cima)
    const P = loop.pts, n = P.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
      const d0 = [b[0] - a[0], b[1] - a[1]], d1 = [c[0] - b[0], c[1] - b[1]], l0 = Math.hypot(...d0), l1 = Math.hypot(...d1);
      const n0 = [-d0[1] / l0, d0[0] / l0], n1 = [-d1[1] / l1, d1[0] / l1], nm = [n0[0] + n1[0], n0[1] + n1[1]], lm = Math.hypot(...nm);
      const k = 3 / Math.max(0.35, (nm[0] / lm) * n1[0] + (nm[1] / lm) * n1[1]);
      out.push(new THREE.Vector2(b[0] + (nm[0] / lm) * k, b[1] + (nm[1] / lm) * k));
    }
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(out), { depth: 6, bevelEnabled: false }); g.translate(0, 0, -3);
    for (const s of [-1, 1]) put(sh(new THREE.Mesh(g, mFrame)), 0, 0, Z0 + s * 128);
    // veios (cabeça e cauda), chumaceiras e motorredutor na cabeça (lado +z, acima da borda do tanque)
    for (const c of [loop.HC, loop.TC]) { cylZ(16, 300, mat.chrome, c[0], c[1], Z0); for (const s of [-1, 1]) box(54, 54, 26, mat.dark, c[0], c[1], Z0 + s * 146); }
    box(84, 84, 70, mat.steelBlue, loop.HC[0], loop.HC[1] + 30, -600);
    put(rbox(120, 76, 76, 10, mat.steelBlue), loop.HC[0] - 100, loop.HC[1] + 30, -600);
    box(10, 60, 60, mat.dark, loop.HC[0] - 165, loop.HC[1] + 30, -600);
    // chapa de transição da cabeça para a esteira
    const dp = box(Math.hypot(34, 4), 3, 196, mInox, -5619, 5.5, Z0); dp.rotation.z = -Math.atan2(4, 34);
  }
  const NS = Math.round(LOOP / 36);
  const slats = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(30, 6, 226), mSlat, NS));
  const flights = sh(new THREE.InstancedMesh(new THREE.BoxGeometry(8, 26, 218), mFlight, NF));
  scene.add(slats, flights);
  const lp = { x: 0, y: 0, r: 0 }, sd = new THREE.Object3D();
  let convK = NaN;
  function updateConveyor(conv) {
    if (Math.abs(conv - convK) < 0.01) return; convK = conv;
    for (let j = 0; j < NS; j++) {
      loopAt(j * (LOOP / NS) + conv, lp); sd.position.set(lp.x, lp.y, Z0); sd.rotation.set(0, 0, lp.r); sd.updateMatrix(); slats.setMatrixAt(j, sd.matrix);
    }
    const s0 = loop.sB + (P10 - HL()) - 6;                    // raspador mesmo atrás da ponta da lima
    for (let k = 0; k < NF; k++) {
      loopAt(s0 + k * DSTEP + conv, lp);
      const nx = -Math.sin(lp.r), ny = Math.cos(lp.r);          // normal exterior (esquerda do sentido de marcha)
      sd.position.set(lp.x + nx * 16, lp.y + ny * 16, Z0); sd.rotation.set(0, 0, lp.r); sd.updateMatrix(); flights.setMatrixAt(k, sd.matrix);
    }
    slats.instanceMatrix.needsUpdate = true; flights.instanceMatrix.needsUpdate = true;
  }

  // =====================================================================
  // 6 · Hotte de extração de vapor
  // =====================================================================
  {
    const hx = (TX0 + TX1) / 2, hz = Z0, HB = 680, HT = 890;
    const g1 = new THREE.CylinderGeometry(0.42, 1, 1, 4, 1, true); g1.rotateY(Math.PI / 4);
    const hood = put(sh(new THREE.Mesh(g1, mInoxD)), hx, (HB + HT) / 2, hz); hood.scale.set(680 / Math.SQRT2, HT - HB, 440 / Math.SQRT2);
    const g2 = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true); g2.rotateY(Math.PI / 4);
    const sk = put(sh(new THREE.Mesh(g2, mInoxD)), hx, HB - 25, hz); sk.scale.set(680 / Math.SQRT2, 50, 440 / Math.SQRT2);
    cyl(135, 24, mInox, scene, 28).position.set(hx, HT + 12, hz);
    cyl(118, 1700, mInox, scene, 28).position.set(hx, HT + 850, hz);
    cyl(128, 30, mat.dark, scene, 28).position.set(hx, HT + 600, hz);
    for (const px of [-6240, -5650]) box(60, 40, 16, mat.steelBlue, px, 700, -647);
  }

  // =====================================================================
  // 7 · Revenido por indução (slot 13): indutor plano em gancho sobre a lima, ~200 °C, baixa potência
  // =====================================================================
  const tg = new THREE.Group(); tg.position.set(XT, 150, Z0); scene.add(tg);
  let tempTex, tempG;
  {
    box(60, 490 - FLOOR, 60, mat.steelBlue, XT, (490 + FLOOR) / 2, -700);
    box(150, 12, 150, mat.dark, XT, FLOOR + 6, -700);
    box(50, 50, 700 - 445 - 30, mat.steelBlue, XT, 455, (-670 - 445) / 2);
    box(60, 200, 50, mat.alu, XT, 380, Z0);
    box(40, 30, 26, mat.blue, XT + 46, 430, Z0);
    box(34, 260, 20, mat.chrome, 0, 175, 0, tg);
    put(rbox(150, 70, 110, 10, mTrafo), 0, 95, 0, tg);
    tube([[96, 60, -12], [100, 30, -12], [100, 6, -12], [60, 6, -12], [-90, 6, -12], [-116, 6, -6], [-116, 6, 6], [-90, 6, 12], [60, 6, 12], [100, 6, 12], [100, 30, 12], [96, 60, 12]], 5, mCuT, tg, 120, 8);
    box(200, 10, 40, mat.black, -10, 16, 0, tg);                             // concentrador de fluxo (ferrite)
    // conversor de revenido (caixa na traseira do pilar)
    box(260, 340, 150, mCab, XT + 210, 120, -812);
    tempTex = canvasTex(256, 128, () => {}); tempTex.wrapS = tempTex.wrapT = THREE.ClampToEdgeWrapping; tempG = tempTex.image.getContext("2d");
    box(170, 92, 8, mat.dark, XT + 210, 210, -733);
    put(new THREE.Mesh(new THREE.PlaneGeometry(160, 80), new THREE.MeshBasicMaterial({ map: tempTex, toneMapped: false })), XT + 210, 210, -728.5);
    tube([[XT + 160, 290, -760], [XT + 120, 420, -720], [XT + 60, 480, -560], [XT + 40, 440, Z0 - 30]], 7, mRubber, scene, 24, 8);
  }

  // =====================================================================
  // 8 · Vapor, bolhas, ondulação e luz da lima incandescente
  // =====================================================================
  const ptsVS = "attribute float a; attribute float s; varying float vA; uniform float k;\nvoid main(){ vA = a; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = s * k / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }";
  const steamFS = "uniform vec3 col; varying float vA;\nvoid main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(col, smoothstep(0.5, 0.0, d) * vA); }";
  const bubbleFS = "uniform vec3 col; varying float vA;\nvoid main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float m = smoothstep(0.5, 0.4, d) * (0.3 + 0.7 * smoothstep(0.18, 0.42, d)); gl_FragColor = vec4(col, m * vA); }";
  function particles(n, fs, color, order) {
    const g = new THREE.BufferGeometry();
    const P3 = new Float32Array(n * 3), A = new Float32Array(n), S = new Float32Array(n);
    g.setAttribute("position", new THREE.BufferAttribute(P3, 3)); g.setAttribute("a", new THREE.BufferAttribute(A, 1)); g.setAttribute("s", new THREE.BufferAttribute(S, 1));
    const m = new THREE.ShaderMaterial({ vertexShader: ptsVS, fragmentShader: fs, uniforms: { k: { value: 600 }, col: { value: new THREE.Color(color) } }, transparent: true, depthWrite: false });
    const o = new THREE.Points(g, m); o.frustumCulled = false; o.renderOrder = order; scene.add(o);
    const life = new Float32Array(n), age = new Float32Array(n), vel = new Float32Array(n * 3), s0 = new Float32Array(n);
    return { o, g, P3, A, S, life, age, vel, s0, n, next: 0 };
  }
  const steam = particles(360, steamFS, 0xf0f3f6, 4);
  const bubbles = particles(130, bubbleFS, 0xdff4ff, 1);
  function emit(ps, x, y, z, vx, vy, vz, size, life) {
    const i = ps.next; ps.next = (ps.next + 1) % ps.n;
    ps.P3[3 * i] = x; ps.P3[3 * i + 1] = y; ps.P3[3 * i + 2] = z;
    ps.vel[3 * i] = vx; ps.vel[3 * i + 1] = vy; ps.vel[3 * i + 2] = vz;
    ps.s0[i] = size; ps.life[i] = life; ps.age[i] = 0;
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 4; put(ring, X_LAND, WATER + 1, Z0);
  let ringAge = 9;
  const glowLight = new THREE.PointLight(0xff8a3a, 0, 1600, 2); scene.add(glowLight);

  // =====================================================================
  // 9 · Modelo do processo (tudo em função do tempo de linha → igual a qualquer velocidade)
  // =====================================================================
  const fallH = () => liftY() + 2 - WATER;                          // queda até tocar a água
  const tFall = () => Math.sqrt((2 * fallH()) / GRAV);
  const tauWater = () => UP.dwell + T_PULL + tFall();               // instante de entrada na água (desde o início da paragem no slot 9)
  // temperatura da lima ao longo do seu ciclo (τ = 0 no início da paragem no slot 9)
  function tempAt(tau) {
    const Tm = P.indT, Dw = UP.dwell, tw = tauWater(), Q = Math.max(0.05, P.quenchT);
    if (tau < T_ON) return 25;
    if (tau < Dw) { const u = clamp((tau - T_ON) / (T_TOP - T_ON)); return 25 + (Tm - 25) * Math.min(1, (1 - Math.exp(-2.6 * u)) / (1 - Math.exp(-2.6))); }
    if (tau < tw) return Tm - 40 * (tau - Dw) / (tw - Dw);
    const Tw = Tm - 40, q = (tau - tw) / Q;
    if (q < 1) return Tw - (Tw - 95) * (1 - Math.pow(1 - q, 2.4));
    return 35 + 60 * Math.exp(-(tau - tw - Q) / 0.7);
  }
  const heatOf = (T) => clamp((T - 480) / 720);
  // posição da lima no elevador: p = coordenada do centro ao longo do percurso (0 na dobra fundo → rampa)
  function onConveyor(pc, out) {
    const hl = HL(), q = pc - hl, span = 2 * hl + 60;                 // ponta → fim do espigão
    if (q >= 0) { out.x = BX + pc * CT; out.y = YB + pc * STH; out.r = TH; return out; }
    const a = -q;
    if (a >= span) { out.x = BX + pc; out.y = YB; out.r = 0; return out; }
    const b = -a * CT + Math.sqrt(a * a * CT * CT - a * a + span * span);
    const tx = BX - a, ty = YB, ex = BX + b * CT, ey = YB + b * STH, dx = (ex - tx) / span, dy = (ey - ty) / span;
    out.x = tx + dx * hl; out.y = ty + dy * hl; out.r = Math.atan2(dy, dx); return out;
  }
  const cIdx = (t) => ease(clamp(t / T_IDX));
  // instante (no avanço 11 → 12) em que o centro da lima chega à cabeça do elevador
  const tHead = (() => { const f = clamp((INC - P11) / DSTEP); let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; ease(m) < f ? (a = m) : (b = m); } return T_IDX * (a + b) / 2; })();

  // pose da lima (só slots 9–11) e estado das máquinas para este instante
  const pose = { x: 0, y: 0, r: 0 };
  const state = { gx: 0, fy: 0, open: 1, carX: CAR_PARK, on: false, tau9: 0 };
  function machineState() {
    const ph = UP.phase, t = UP.t, Dw = UP.dwell, L = liftY(), FY_UP = L + 61;
    if (ph === "dwell") {
      const td = Math.min(t, Dw);
      state.gx = XG0();
      state.fy = td < T_DOWN ? lerp(FY_UP, 1, ease(td / T_DOWN)) : td < T_CLOSE ? 1 : 1 + L * seg(td, T_CLOSE, T_LIFT);
      state.open = td < T_DOWN ? 1 : 1 - seg(td, T_DOWN, T_CLOSE);
      state.carX = lerp(CAR_PARK, CAR_WORK, seg(td, T_LIFT, T_CIN));
      state.on = td >= T_ON; state.tau9 = td;
    } else {
      state.gx = t < T_PULL ? lerp(XG0(), XG1(), ease(t / T_PULL)) : t < T_UP ? XG1() : lerp(XG1(), XG0(), seg(t, T_UP, T_BACK));
      state.fy = t < T_OPEN ? L + 1 : lerp(L + 1, FY_UP, seg(t, T_OPEN, T_UP));
      state.open = t < T_PULL ? 0 : seg(t, T_PULL, T_OPEN);
      state.carX = lerp(CAR_WORK, CAR_PARK, seg(t, T_PULL, T_COUT));
      state.on = false; state.tau9 = Dw + t;
    }
  }
  // queda e afundamento (td = tempo desde o início do avanço 9 → 10)
  function dropPose(td, out) {
    const L = liftY(), x = X_LAND;
    if (td < T_PULL) { out.x = lerp(XG0(), XG1(), ease(td / T_PULL)) - HL() - 30; out.y = L; out.r = 0; return out; }
    const tf = tFall(), tau = td - T_PULL;
    if (tau < tf) { out.x = x; out.y = L - 0.5 * GRAV * tau * tau; out.r = 0.12 * Math.sin(Math.PI * tau / tf * 0.5); return out; }
    const ve = GRAV * tf, vt = 420, k = 0.07, u = tau - tf, ye = WATER - 2;
    const y = ye - (vt * u + (ve - vt) * k * (1 - Math.exp(-u / k)));
    const yl = onConveyor(P10, out).y;                                // repousa no fundo do elevador
    const done = clamp((ye - y) / (ye - yl));
    out.x = x; out.y = Math.max(yl, y); out.r = 0.12 * (1 - done) * (1 - done) + 0.04 * Math.sin(u * 9) * (1 - done);
    return out;
  }
  // transferência da cabeça do elevador para a esteira (w = 0..1)
  // a lima rola sobre a roda da cabeça (contacto na superfície das taliscas) e tomba para a chapa / esteira
  const RTOP = RS + 4, D_ROLL = 80;
  function transferPose(w, out) {
    const hc = loop.HC;
    if (w < 0.4) {
      const v = ease(w / 0.4), phi = TH * (1 - v), a = phi + Math.PI / 2, d = D_ROLL * v;
      out.x = hc[0] + RTOP * Math.cos(a) + d * Math.cos(phi); out.y = hc[1] + RTOP * Math.sin(a) + d * Math.sin(phi); out.r = phi; return out;
    }
    const v = ease((w - 0.4) / 0.6), x0 = hc[0] + D_ROLL, y0 = hc[1] + RTOP;
    out.x = lerp(x0, X12, v); out.y = y0 * (1 - seg(v, 0.5, 0.88)); out.r = 0; return out;
  }
  // τ (tempo desde o início da paragem no slot 9) de uma lima nos slots 9–10
  function tauOf(l) {
    const Dw = UP.dwell, Mv = UP.move, t = UP.t;
    if (l.slot === 9) return UP.phase === "dwell" ? Math.min(t, Dw) : Dw + t;
    if (l.slot === 10) return UP.phase === "dwell" ? Dw + Mv + t : Dw + Mv + Dw + t;
    return 99;
  }
  function placeLima(l, out) {
    const ph = UP.phase, t = UP.t, Mv = UP.move;
    if (l.slot === 9 && ph === "dwell") { const td = Math.min(t, UP.dwell); out.x = X9; out.y = td < T_CLOSE ? 0 : liftY() * seg(td, T_CLOSE, T_LIFT); out.r = 0; return out; }
    if (l.slot === 9) return dropPose(t, out);
    if (l.slot === 10 && ph === "dwell") return dropPose(Mv + t, out);
    if (l.slot === 10) return onConveyor(P10 + DSTEP * cIdx(t), out);
    if (l.slot === 11 && ph === "dwell") return onConveyor(P11, out);
    if (t < tHead) return onConveyor(P11 + DSTEP * cIdx(t), out);
    return transferPose(clamp((t - tHead) / Math.max(0.05, Mv - tHead)), out);
  }

  // =====================================================================
  // 10 · Ecrãs (gerador, refrigerador, conversor de revenido)
  // =====================================================================
  function drawHMI(s) {
    const g = hg, Tm = P.indT, Dw = UP.dwell, tw = tauWater(), Q = P.quenchT;
    g.fillStyle = "#0a111d"; g.fillRect(0, 0, HW, HH);
    g.fillStyle = "#15294b"; g.fillRect(0, 0, HW, 58);
    g.textBaseline = "middle"; g.textAlign = "left"; g.fillStyle = "#eaf1fd"; g.font = "700 27px Arial"; g.fillText("GERADOR DE INDUÇÃO · MF", 20, 30);
    const [chip, cc] = s.on ? ["A AQUECER", "#f59e0b"] : s.quench ? ["TÊMPERA EM ÁGUA", "#38bdf8"] : ["PRONTO", "#22c55e"];
    g.font = "700 20px Arial"; const cw = g.measureText(chip).width + 30;
    g.fillStyle = cc; g.fillRect(HW - 20 - cw, 13, cw, 34); g.fillStyle = "#0a111d"; g.fillText(chip, HW - 5 - cw, 31);
    const tiles = [["POTÊNCIA", s.on ? fmt(s.kW, 0) : "0", "kW", s.on], ["FREQUÊNCIA", s.on ? fmt(s.kHz, 1) : "—", "kHz", s.on], ["TEMPERATURA DA PEÇA", s.T == null ? "—" : String(Math.round(s.T)), "°C", s.T != null && s.T > 300]];
    tiles.forEach(([lab, val, unit, hot], i) => {
      const x = 20 + i * 256, y = 72, w = 244, h = 124;
      g.fillStyle = "#101c31"; g.fillRect(x, y, w, h);
      g.fillStyle = "#7f93b3"; g.font = "600 16px Arial"; g.textAlign = "left"; g.fillText(lab, x + 14, y + 22);
      g.fillStyle = hot ? (i === 2 ? "#fbbf24" : "#ffffff") : "#5d6f8c"; g.font = "700 62px Menlo, Consolas, monospace"; g.fillText(val, x + 14, y + 80);
      const vw = g.measureText(val).width; g.font = "700 24px Arial"; g.fillText(unit, x + 22 + vw, y + 90);
    });
    // curva de temperatura da lima actual
    const px = 70, py = 222, pw = 700, ph = 300, tMax = Math.max(3.4, tw + Q + 0.6), Tmax = 1300;
    const fx = (tt) => px + (tt / tMax) * pw, fy = (T) => py + ph - (T / Tmax) * ph;
    g.fillStyle = "#0e1a2d"; g.fillRect(px, py, pw, ph);
    g.fillStyle = "rgba(245,158,11,0.10)"; g.fillRect(fx(T_ON), py, fx(Dw) - fx(T_ON), ph);
    g.fillStyle = "rgba(56,189,248,0.16)"; g.fillRect(fx(tw), py, Math.max(2, fx(tw + Q) - fx(tw)), ph);
    g.strokeStyle = "#22324d"; g.lineWidth = 1; g.font = "15px Arial"; g.fillStyle = "#7f93b3"; g.textAlign = "right";
    for (let T = 0; T <= 1200; T += 400) { g.beginPath(); g.moveTo(px, fy(T)); g.lineTo(px + pw, fy(T)); g.stroke(); g.fillText(String(T), px - 8, fy(T)); }
    g.textAlign = "center";
    for (let tt = 0; tt <= tMax + 1e-6; tt += 0.5) { g.beginPath(); g.moveTo(fx(tt), py + ph); g.lineTo(fx(tt), py + ph + 6); g.stroke(); if (Math.abs(tt % 1) < 1e-6) g.fillText(fmt(tt, 0) + " s", fx(tt), py + ph + 18); }
    g.setLineDash([7, 5]); g.strokeStyle = "#f59e0b"; g.beginPath(); g.moveTo(px, fy(Tm)); g.lineTo(px + pw, fy(Tm)); g.stroke(); g.setLineDash([]);
    g.textAlign = "left"; g.fillStyle = "#fbbf24"; g.font = "700 16px Arial"; g.fillText(`${Tm} °C`, px + 8, fy(Tm) - 12);
    g.fillStyle = "#c9d6ea"; g.font = "15px Arial"; g.fillText("aquecimento por indução", fx(T_ON) + 6, py + 16);
    g.fillStyle = "#7dd3fc"; g.font = "700 16px Arial"; g.fillText(`têmpera em água: ${fmt(Q, 2)} s`, Math.min(fx(tw) + 8, px + pw - 210), py + 40);
    g.fillStyle = "#7f93b3"; g.font = "14px Arial"; g.fillText("T (°C) × t", px + pw - 74, py + ph - 14);
    if (s.tau != null) {
      const n = 160, tEnd = Math.min(s.tau, tMax);
      g.beginPath();
      for (let i = 0; i <= n; i++) { const tt = (tEnd * i) / n, x = fx(tt), y = fy(tempAt(tt)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = "#fb923c"; g.lineWidth = 3.5; g.stroke();
      const T = tempAt(tEnd); g.fillStyle = T > 600 ? "#fde68a" : "#7dd3fc"; g.beginPath(); g.arc(fx(tEnd), fy(T), 6, 0, 7); g.fill();
    }
    g.strokeStyle = "#3a4d6e"; g.lineWidth = 1.5; g.strokeRect(px, py, pw, ph);
    g.fillStyle = "#8fa3c0"; g.font = "16px Arial"; g.textAlign = "left";
    g.fillText(`Bobina Ø104 mm · ${NT} espiras · água ${fmt(s.water, 1)} °C`, 20, HH - 34);
    g.textAlign = "right"; g.fillText(`Peças temperadas: ${s.n}`, HW - 20, HH - 34);
    hmiTex.needsUpdate = true;
  }
  function drawChiller(w, on) {
    const g = chillG; g.fillStyle = "#06121a"; g.fillRect(0, 0, 320, 160);
    g.fillStyle = "#67e8f9"; g.font = "700 22px Arial"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText("ÁGUA DA BOBINA", 16, 26);
    g.fillStyle = "#ffffff"; g.font = "700 46px Menlo, monospace"; g.fillText(fmt(w, 1), 16, 84); g.font = "700 22px Arial"; g.fillText("°C", 150, 92);
    g.fillStyle = "#9fb3d1"; g.font = "18px Arial"; g.fillText("caudal 32 L/min · 3,2 bar", 16, 134);
    g.fillStyle = on ? "#22c55e" : "#64748b"; g.beginPath(); g.arc(296, 26, 9, 0, 7); g.fill();
    chillTex.needsUpdate = true;
  }
  function drawTemper(on, T) {
    const g = tempG; g.fillStyle = "#0a111d"; g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#c4b5fd"; g.font = "700 18px Arial"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText("REVENIDO", 12, 20);
    g.fillStyle = on ? "#fbbf24" : "#64748b"; g.font = "700 44px Menlo, monospace"; g.fillText(String(Math.round(T)), 12, 68); g.font = "700 20px Arial"; g.fillText("°C", 120, 74);
    g.fillStyle = "#9fb3d1"; g.font = "16px Arial"; g.fillText(on ? "4,5 kW · 30 kHz" : "em espera", 12, 108);
    tempTex.needsUpdate = true;
  }

  // =====================================================================
  // 11 · Etiquetas e vista
  // =====================================================================
  const liveT = { T: null, on: false };
  addTag({ text: () => `3 · Têmpera por indução — ${P.indT} °C → água`, at: () => V(-6250, 1500, -620), min: 2500, big: true });
  addTag({ text: "Bobina de indução (cobre, arrefecida a água)", at: () => V(car.position.x - 20, YC + 300, Z0 - 60), max: 3000 });
  addTag({ text: () => `Peça: ${Math.round(liveT.T)} °C`, at: () => V(X9, YC + 120, Z0 + 60), max: 2600, when: () => liveT.on && liveT.T > 100 });
  addTag({ text: "Fonte AC / gerador de indução · HMI para o corredor do operador", at: () => V(GX, 1500, GZB), max: 4500 });
  addTag({ text: "Água de resfriamento da bobina (entrada · saída)", at: () => V(car.position.x - 120, 330, -930), max: 2600 });
  addTag({ text: "Refrigerador · circuito fechado", at: () => V(-7410, 760, -900), max: 4500 });
  addTag({ text: "Tanque de têmpera (água)", at: () => V(-5780, -40, TZ1 + 10), max: 3500 });
  addTag({ text: "Elevador de raspadores", at: () => V(-5770, 120, Z0 + 60), max: 2400 });
  addTag({ text: "Extração de vapor", at: () => V((TX0 + TX1) / 2, 1050, Z0), max: 3500 });
  addTag({ text: "Revenido por indução · ~200 °C", at: () => V(XT, 560, Z0), max: 3500 });
  addView("ind", "Indução", [-5700, 1100, 1400], [-6200, 100, -420]);
  addView("indHmi", "Indução · painel", [-7300, 1000, -2700], [-6620, 700, -1245]);

  // =====================================================================
  // 12 · Animação
  // =====================================================================
  const touched = new Set(), prevY = new Map(), quenched = new WeakSet();
  let clock = 0, nAdv = 0, lastPhase = UP.phase, hmiKey = "", hmiT = 0, nQ = 0, waterT = 18.4, fanA = 0, chillT = 0, temperOn = false;
  const tmp = new THREE.Vector3();
  addSystem({
    draw(dt) {
      clock += dt;
      if (lastPhase === "move" && UP.phase === "dwell") nAdv++;
      lastPhase = UP.phase;
      const ph = UP.phase, t = UP.t;
      machineState();
      // carro da bobina, corrente porta-cabos, pinça
      car.position.x = state.carX; updateChain(state.carX - 150);
      xcar.position.x = state.gx; grip.position.y = state.fy;
      const zf = 0.21 * P.b + 4 + 14 * state.open;
      fingers[0].position.z = Z0 - zf; fingers[1].position.z = Z0 + zf;
      // elevador de raspadores: avança DSTEP no início de cada avanço da linha
      const conv = nAdv * DSTEP + (ph === "move" ? DSTEP * cIdx(t) : 0);
      updateConveyor(conv);

      // limas da estação
      for (const l of touched) if (l.slot < 9 || l.slot > 11) { l.g.rotation.set(0, 0, 0); touched.delete(l); prevY.delete(l); }
      let hot = null, hotH = 0;
      for (const l of UP.limas) {
        if (l.slot < 9 || l.slot > 11) continue;
        placeLima(l, pose);
        l.g.position.set(pose.x, pose.y, Z0); l.g.rotation.set(0, 0, pose.r); touched.add(l);
        if (l.slot <= 10) {
          const tau = tauOf(l), T = tempAt(tau);
          l.heat = heatOf(T);
          const tw = tauWater();
          if (tau >= tw && !quenched.has(l)) {
            const q = (tau - tw) / Math.max(0.05, P.quenchT);
            if (q >= 1) { UP.blendFinish(l, "scale", 1); l.finishName = "scale"; quenched.add(l); nQ++; }
            else if (dt > 0) UP.blendFinish(l, "scale", clamp(dt * 3 / Math.max(0.05, P.quenchT)));
          }
          if (tau < UP.dwell) quenched.delete(l);
          if (l.heat > hotH) { hotH = l.heat; hot = l; }
          // entrada na água: nuvem de vapor + anel na superfície
          const py = prevY.has(l) ? prevY.get(l) : pose.y;
          if (py > WATER - 2 && pose.y <= WATER - 2 && l.heat > 0.05) {
            for (let i = 0; i < 220; i++) emit(steam, pose.x + (Math.random() - 0.5) * 2.2 * HL(), WATER + 4 + Math.random() * 30, Z0 + (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 220, 420 + Math.random() * 700, (Math.random() - 0.5) * 220, 60 + Math.random() * 70, 1.6 + Math.random() * 1.6);
            ringAge = 0; ring.position.x = pose.x;
          }
          // submersa e quente: bolhas a subir e vapor à superfície
          if (pose.y < WATER - 2 && l.heat > 0.02 && dt > 0) {
            const nb = Math.min(12, Math.floor(dt * 420 * l.heat + Math.random()));
            for (let i = 0; i < nb; i++) { const u = (Math.random() - 0.5) * 2 * HL(); emit(bubbles, pose.x + u * Math.cos(pose.r), pose.y + 8 + u * Math.sin(pose.r), Z0 + (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 40, 160 + Math.random() * 220, (Math.random() - 0.5) * 40, 7 + Math.random() * 9, 2.5); }
            const ns = Math.min(8, Math.floor(dt * 200 * l.heat + Math.random()));
            for (let i = 0; i < ns; i++) emit(steam, pose.x + (Math.random() - 0.5) * 2 * HL(), WATER + 3, Z0 + (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 220 + Math.random() * 300, (Math.random() - 0.5) * 80, 34 + Math.random() * 30, 1.2 + Math.random() * 1.2);
          }
        }
        prevY.set(l, pose.y);
      }

      // bobina: brilho ténue a pulsar com a potência; luz quente da lima
      const l9 = UP.limaAt(SLOT), tau9 = state.tau9;
      const T9 = l9 ? tempAt(tau9) : 25, inCoil = ph === "dwell" && state.tau9 >= T_ON;
      mCu.emissiveIntensity = inCoil ? (0.06 + 0.22 * heatOf(T9)) * (0.75 + 0.25 * Math.sin(clock * 2 * Math.PI * 3)) : 0;
      if (hot && hotH > 0.01) {
        hot.g.updateMatrixWorld(); tmp.set(0, 2 + P.h / 2 + 18, 0); hot.g.localToWorld(tmp);
        glowLight.position.copy(tmp); glowLight.intensity = 140000 * hotH * hotH; glowLight.color.setRGB(1, 0.45 + 0.35 * hotH, 0.15 + 0.2 * hotH);
      } else glowLight.intensity = 0;
      liveT.on = inCoil; liveT.T = T9;

      // partículas
      const k = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
      steam.o.material.uniforms.k.value = k; bubbles.o.material.uniforms.k.value = k;
      for (const ps of [steam, bubbles]) {
        const isSteam = ps === steam;
        for (let i = 0; i < ps.n; i++) {
          if (ps.life[i] <= 0) { ps.A[i] = 0; continue; }
          ps.age[i] += dt; const a = ps.age[i] / ps.life[i];
          if (a >= 1) { ps.life[i] = 0; ps.A[i] = 0; continue; }
          const j = 3 * i;
          if (isSteam) {
            ps.vel[j + 1] *= Math.max(0, 1 - dt * 0.9); ps.vel[j] *= 1 - dt * 0.8; ps.vel[j + 2] *= 1 - dt * 0.8;
            ps.P3[j] += ps.vel[j] * dt; ps.P3[j + 1] = Math.min(690, ps.P3[j + 1] + (ps.vel[j + 1] + 60) * dt); ps.P3[j + 2] += ps.vel[j + 2] * dt;
            ps.S[i] = ps.s0[i] * (1 + 2.6 * a); ps.A[i] = 0.78 * Math.min(1, a * 7) * Math.pow(1 - a, 1.6);
          } else {
            ps.P3[j] += (ps.vel[j] + Math.sin(clock * 9 + i) * 30) * dt; ps.P3[j + 1] += ps.vel[j + 1] * dt; ps.P3[j + 2] += ps.vel[j + 2] * dt;
            if (ps.P3[j + 1] > WATER - 3) { ps.life[i] = 0; ps.A[i] = 0; continue; }
            ps.S[i] = ps.s0[i]; ps.A[i] = 0.85 * Math.min(1, a * 10);
          }
        }
        ps.g.attributes.position.needsUpdate = true; ps.g.attributes.a.needsUpdate = true; ps.g.attributes.s.needsUpdate = true;
      }
      ringAge += dt;
      const ra = clamp(ringAge / 1.1); ring.scale.setScalar(30 + 330 * ease(ra)); ring.material.opacity = ringAge < 1.1 ? 0.55 * (1 - ra) : 0;
      waterTop.material.normalMap.offset.set(clock * 0.012, clock * 0.007);

      // revenido (slot 13): indutor desce, liga em baixa potência, revenido → acabamento "tempered"
      const l13 = UP.limaAt(13);
      const td13 = ph === "dwell" ? Math.min(t, UP.dwell) : -1;
      const down = td13 < 0 ? 0 : seg(td13, 0, 0.22) * (1 - seg(td13, 1.5, 1.72));
      tg.position.y = lerp(150, 2 + P.h + 6, down);
      temperOn = td13 >= 0.28 && td13 < 1.45 && !!l13;
      mCuT.emissiveIntensity = temperOn ? 0.1 + 0.06 * Math.sin(clock * 2 * Math.PI * 2) : 0;
      if (l13 && temperOn && dt > 0) UP.blendFinish(l13, "tempered", clamp(dt * 2.2));
      if (l13 && td13 >= 1.45 && l13.finishName !== "tempered") { UP.blendFinish(l13, "tempered", 1); l13.finishName = "tempered"; }

      // coluna luminosa do gerador
      setLamp(mLampA, inCoil && Math.sin(clock * 8) > -0.4); setLamp(mLampG, !inCoil); setLamp(mLampR, false);
      // refrigerador: ventiladores e temperatura da água
      waterT += ((inCoil ? 21.5 : 18.2) - waterT) * clamp(dt * 0.6);
      fanA += dt * 14; for (const f of fans) f.rotation.z = fanA;

      // ecrãs (≈ 12×/s e só quando algo muda)
      const now = performance.now();
      if (now - hmiT > 80) {
        const l10 = UP.limaAt(10), showPrev = !inCoil && ph === "dwell" && l10;
        const tau = showPrev ? tauOf(l10) : l9 ? tau9 : null;
        const Tcur = inCoil ? T9 : null;
        const pw = 40 + 80 * clamp((P.indT - 800) / 450), Tn = inCoil ? T9 : 0;
        const s = {
          on: inCoil, quench: !inCoil && tau != null && tau >= tauWater() && tau < tauWater() + P.quenchT + 0.4,
          kW: (Tn >= P.indT - 5 ? 0.38 : 1) * pw * (0.97 + 0.03 * Math.sin(clock * 11)), kHz: 18 + 8 * clamp((Tn - 650) / 250) + 0.1 * Math.sin(clock * 5),
          T: Tcur, tau, water: waterT, n: nQ,
        };
        const key = `${s.on}|${s.quench}|${Math.round(s.kW)}|${s.kHz.toFixed(1)}|${Tcur == null ? "-" : Math.round(Tcur)}|${tau == null ? "-" : tau.toFixed(2)}|${P.indT}|${P.quenchT}|${nQ}|${waterT.toFixed(1)}`;
        if (key !== hmiKey) { hmiKey = key; drawHMI(s); }
        hmiT = now;
        if ((chillT += 1) % 4 === 0) drawChiller(waterT, true);
        drawTemper(temperOn, temperOn ? 25 + 175 * seg(td13, 0.28, 1.2) : 25);
      }
    },
  });
}
