// =====================================================================
// Exterior da fábrica SACFILE: revestimento exterior da nave (painel sandwich) com cobertura, letreiro luminoso
// SACFILE em letras vermelhas, escritório central em vidro e betão, estacionamento, camião de encomendas no cais,
// arruamentos, passeios e vegetação. A câmara pode sair da nave (vistas "Exterior" e "Escritório").
// =====================================================================
{
  const GY = FLOOR - 2, X = HALL.x, Z = HALL.z, H = HALL.h, TOP = FLOOR + H;
  const mAsph = M(0x3f4347, 0.05, 0.9), mKerb = M(0xc9ccd0, 0.1, 0.8), mGrass = M(0x4f7d3a, 0, 0.95), mConc = M(0xb8b4ad, 0.05, 0.75);
  const mPost = M(0x3b4148, 0.4, 0.5);
  const mGlassF = M(0x6fa8d6, 0.9, 0.08, { transparent: true, opacity: 0.55 }), mMullion = M(0x1f2933, 0.6, 0.4), mPanel = M(0xd3d8de, 0.4, 0.55);
  const mRed = M(0xe11d2e, 0.1, 0.45, { emissive: 0xff2030, emissiveIntensity: 1.6 });

  // ---------- terreno: asfalto à volta da nave, relva mais longe, passeios
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * X + 70000, 2 * Z + 70000), mGrass); ground.rotation.x = -Math.PI / 2; ground.position.y = GY - 40; ground.receiveShadow = true; scene.add(ground);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(2 * X + 30000, 2 * Z + 30000), mAsph); yard.rotation.x = -Math.PI / 2; yard.position.y = GY - 20; yard.receiveShadow = true; scene.add(yard);
  box(2 * X + 30000, 150, 300, mKerb, 0, GY + 55, Z + 15000, scene, false); box(2 * X + 30000, 150, 300, mKerb, 0, GY + 55, -Z - 15000, scene, false);
  box(300, 150, 2 * Z + 30000, mKerb, X + 15000, GY + 55, 0, scene, false); box(300, 150, 2 * Z + 30000, mKerb, -X - 15000, GY + 55, 0, scene, false);

  // ---------- revestimento exterior da nave: painéis sandwich horizontais, soco de betão, cobertura a duas águas com beirais
  const extTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d6dbe1"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = "#b8c0c8"; g.fillRect(0, y, w, 5); g.fillStyle = "#e9edf1"; g.fillRect(0, y + 5, w, 3); } }, [1, 1]);
  const extWall = (len, x, z, rot) => {
    const g = new THREE.Group(); g.position.set(x, FLOOR, z); g.rotation.y = rot; scene.add(g);
    const t = extTex.clone(); t.needsUpdate = true; t.repeat.set(len / 2000, H / 2000);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, H + 500), M(0xffffff, 0.3, 0.55, { map: t })); p.position.set(0, (H + 500) / 2, 0); p.receiveShadow = true; g.add(p);
    box(len, 1400, 160, M(0x8e9298, 0.05, 0.85), 0, 700, -60, g, false);                        // soco de betão
    box(len - 2000, 900, 40, mat.window, 0, 5200, -10, g, false);                                // fita de janelas
    for (let xx = -len / 2 + 1000; xx < len / 2 - 900; xx += 2000) box(80, 900, 60, mat.steelBlue, xx, 5200, -20, g, false);
    box(len, 300, 60, M(0x1f4f9e, 0.1, 0.6), 0, 1450, -20, g, false);                            // faixa azul da marca
    box(len + 200, 400, 300, M(0x9aa0a6, 0.3, 0.6), 0, H + 450, -100, g, false);                 // platibanda / beiral
    return g;
  };
  extWall(2 * X + 300, 0, -Z - 150, Math.PI); extWall(2 * X + 300, 0, Z + 150, 0);
  extWall(2 * Z + 300, -X - 150, 0, -Math.PI / 2); extWall(2 * Z + 300, X + 150, 0, Math.PI / 2);
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
    FLOORS.forEach(([t1, t2], f) => {
      const tex = canvasTex(1024, 192, (g, w, h) => { g.fillStyle = "rgba(20,28,40,0.85)"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffffff"; g.font = "800 60px Arial"; g.fillText(tr(t1), 30, 80); g.fillStyle = "#cfe3f7"; g.font = "600 40px Arial"; g.fillText(tr(t2), 30, 150); });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(6400, 1200), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); pl.position.set(OX + 3000, FLOOR + f * FH + 2000, OZ + D / 2 + 90); scene.add(pl);
      // interior: pavimento, mesas e cadeiras simplificadas (vê-se através do vidro)
      for (let k = 0; k < 4; k++) { box(1800, 40, 900, mat.wood, OX - W / 2 + 3000 + k * 3000, FLOOR + f * FH + 1150, OZ + (f === 2 ? 0 : -1500), scene, false); for (const sx of [-1, 1]) box(60, 720, 60, mPost, OX - W / 2 + 3000 + k * 3000 + sx * 800, FLOOR + f * FH + 780, OZ + (f === 2 ? 0 : -1500), scene, false); }
      if (f === 2) box(6000, 60, 1800, M(0x3b2a1e, 0.1, 0.6), OX + 2000, FLOOR + f * FH + 1150, OZ, scene, false);   // mesa de reunião executiva
      addTag({ text: `${t1} · ${t2}`, at: () => V(OX + 3000, FLOOR + f * FH + 2900, OZ + D / 2 + 300), max: 30000 });
    });
    addTag({ text: "Escritório central SACFILE · vidro e betão · 3 pisos", at: () => V(OX, FLOOR + N * FH + 2200, OZ), min: 2000, max: 90000, big: true });
  }

  // ---------- estacionamento: lugares marcados em frente ao escritório, carros, passadeira e postes de iluminação
  {
    const PX0 = 8000, PZ = Z + 6000, N = 10, BW = 2600, BL = 5000;
    box(N * BW + 400, 10, BL + 400, M(0x2f3337, 0.05, 0.9), PX0 + (N * BW) / 2, GY + 2, PZ, scene, false);
    for (let i = 0; i <= N; i++) box(120, 12, BL, mat.label, PX0 + i * BW, GY + 10, PZ, scene, false);
    const car = (x, z, c, rot) => {
      const g = new THREE.Group(); g.position.set(x, GY, z); g.rotation.y = rot; scene.add(g);
      box(4300, 520, 1800, M(c, 0.6, 0.35), 0, 560, 0, g); box(2400, 560, 1650, M(0x1a2430, 0.5, 0.15), -150, 1100, 0, g);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(330, 220, mat.black, g, 18); w.rotation.x = Math.PI / 2; w.position.set(sx * 1400, 330, sz * 900); }
      box(300, 150, 80, mat.ledR, -2160, 700, 650, g, false); box(300, 150, 80, mat.ledR, -2160, 700, -650, g, false);
    };
    [[0, 0x2b5fb3], [1, 0xe5e7eb], [3, 0x1f2937], [4, 0xb91c1c], [6, 0x9ca3af], [7, 0x2f6fdc], [9, 0xf59e0b]].forEach(([i, c]) => car(PX0 + (i + 0.5) * BW, PZ, c, Math.PI / 2));
    for (let i = 0; i < 6; i++) box(600, 40, 2200, mat.label, PX0 - 1800, GY + 8, PZ - 4200 + i * 900, scene, false);   // passadeira
    for (const x of [PX0 - 600, PX0 + N * BW + 600, -14000]) { cyl(70, 7000, mat.alu, scene, 12).position.set(x, GY + 3500, PZ + BL / 2 + 800); box(900, 160, 320, mat.dark, x + 350, GY + 7000, PZ + BL / 2 + 800); box(700, 20, 240, mat.lamp, x + 350, GY + 6910, PZ + BL / 2 + 800, scene, false); }
    addTag({ text: "Estacionamento · colaboradores e visitantes", at: () => V(PX0 + (N * BW) / 2, GY + 2500, PZ), max: 40000 });
  }

  // ---------- camião de encomendas no cais (+x): tractor + semi-reboque encostado à porta do cais (a traseira está dentro da nave)
  {
    const DZ = 2200, RX = X + 600;                                                                // o reboque começa dentro (DX+600) e sai pela porta
    const g = new THREE.Group(); g.position.set(RX + 1000, FLOOR + 150, DZ); scene.add(g);      // continuação do reboque, encostado ao primeiro troço
    box(11500, 2600, 2550, M(0xf1f1ee, 0.2, 0.5), 5750, 1300, 0, g);                           // caixa
    box(11500, 120, 2550, mat.dark, 5750, 2680, 0, g, false);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(5000, 1100), new THREE.MeshBasicMaterial({ map: signTex(1024, 256), transparent: true, toneMapped: false })); logo.position.set(5750, 1500, 1290); g.add(logo);
    box(11000, 300, 2300, mat.dark, 5750, 150, 0, g);                                            // chassis
    for (const x of [8200, 9600]) for (const s of [-1, 1]) { const w = cyl(520, 380, mat.black, g, 24); w.rotation.x = Math.PI / 2; w.position.set(x, -150 + 520 - 150, s * 1050); }
    for (const s of [-1, 1]) { const leg = box(140, 900, 140, mat.alu, 2800, -300, s * 800, g); }   // apoios (recolhidos)
    // tractor
    const t = new THREE.Group(); t.position.set(RX + 1000 + 11500 + 300, FLOOR + 150, DZ); scene.add(t);
    box(2300, 2400, 2500, M(0xb91c1c, 0.3, 0.4), 1150, 1700, 0, t);                               // cabina vermelha
    box(1500, 1200, 2450, M(0x1a2430, 0.5, 0.15), 1550, 2200, 0, t, false);                       // vidros
    box(2000, 500, 2400, M(0x8b1a1a, 0.3, 0.5), 2250, 500, 0, t);                                 // pára-choques/grelha
    box(3600, 300, 2300, mat.dark, 1000, 150, 0, t);
    for (const x of [-700, 1600]) for (const s of [-1, 1]) { const w = cyl(520, 380, mat.black, t, 24); w.rotation.x = Math.PI / 2; w.position.set(x, 220, s * 1050); }
    cyl(120, 1200, mat.alu, t, 12).position.set(-200, 3000, -900);                                // escape
    for (const s of [-1, 1]) box(300, 200, 120, mat.lamp, 2360, 900, s * 900, t, false);
    addTag({ text: "Camião de encomendas · a carregar paletes de limas no cais", at: () => V(RX + 7000, FLOOR + 4200, DZ), max: 40000 });
  }

  // ---------- portaria e vedação do recinto, árvores
  {
    box(3000, 2800, 2600, mConc, X + 9000, GY + 1400, Z + 13000); box(2200, 1200, 60, M(0x254e7a, 0.6, 0.2, { transparent: true, opacity: 0.7 }), X + 9000, GY + 1700, Z + 14320, scene, false);
    box(3400, 300, 3000, M(0x9aa0a6, 0.3, 0.6), X + 9000, GY + 2950, Z + 13000, scene, false);
    const arm = box(6000, 120, 120, M(0xfbbf24, 0.2, 0.5), X + 4000, GY + 1100, Z + 13000); for (let i = 0; i < 5; i++) box(600, 124, 124, M(0xdc2626, 0.2, 0.5), X + 1500 + i * 1200, GY + 1100, Z + 13000, scene, false);
    cyl(140, 1100, mat.dark, scene, 12).position.set(X + 7100, GY + 550, Z + 13000);
    for (let x = -X - 14000; x <= X + 14000; x += 2500) { cyl(40, 2000, mat.dark, scene, 8).position.set(x, GY + 1000, Z + 15200); cyl(40, 2000, mat.dark, scene, 8).position.set(x, GY + 1000, -Z - 15200); }
    for (const z of [-Z - 15200, Z + 15200]) box(2 * X + 28000, 1800, 20, M(0x4b5563, 0.2, 0.6, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, GY + 1100, z, scene, false);
    const tree = (x, z, s = 1) => { cyl(90 * s, 1800 * s, M(0x5b3a1e, 0, 0.9), scene, 8).position.set(x, GY + 900 * s, z); const c = new THREE.Mesh(new THREE.SphereGeometry(1500 * s, 12, 10), M(0x3f7a33, 0, 0.9)); c.position.set(x, GY + 2900 * s, z); c.castShadow = true; scene.add(c); };
    [[-16000, 2000, 1.1], [-16000, -3000, 1], [-16000, 7000, 0.9], [-9000, 12500, 1], [-13000, 12500, 1.2], [20000, -9000, 1], [16000, -12000, 1.1], [-4000, -12500, 1], [4000, -12500, 1.1]].forEach(([x, z, s]) => tree(x, z, s));
  }

  addTag({ text: "10 · Exterior · SACFILE", at: () => V(0, FLOOR + H + 3200, Z + 2500), min: 4000, max: 80000, big: true });
  addTag({ text: "Portaria · controlo de acessos", at: () => V(X + 9000, GY + 4200, Z + 13000), max: 40000 });
  addView("ext", "Exterior", [38000, 12000, 30000], [0, 1500, 3000]);
  addView("office", "Escritório", [12000, 5000, 32000], [-2500, 3500, 16500]);
  addView("dock", "Cais · camião", [30000, 6000, 14000], [16000, 1200, 2200]);
  window.__ext = true;
}
