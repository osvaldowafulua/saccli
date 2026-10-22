// =====================================================================
// Etiquetas
// =====================================================================
let phase = "work", t = 0, paused = false, shift = 0, job = null;
const runLog = [];
const limaAt = (k) => limas.find((l) => l.state === "belt" && l.k === k);
const fillingCrate = () => outCrates.find((c) => c.state === "filling" || c.state === "arriving");
[
  { text: "Scanner 1 · Keyence LJ-S640 fixo (lê a lima inteira)", at: () => V(SCAN1_X, 960, 0), max: 4500 },
  { text: () => { const l = limaAt(SCAN1_K); return l ? `Medição 3D · comprimento ${limaLen().toFixed(2)} mm · largura ${P.b.toFixed(2)} mm · espessura ${P.h.toFixed(2)} mm · flecha ${l.meas1 !== undefined ? fmtUm(um(l.meas1)) + " em " + l.pt : "…"}` : ""; },
    at: () => V(SCAN1_X, 120, 0), max: 3500, when: () => phase === "work" && limaAt(SCAN1_K) && t > 0.3 && t < DUR.scan + 0.8 },
  { text: "Módulos A1·B1·C1", at: () => V(MOD_X, 130, -(HOUSE_IN + HOUSE_D / 2)), max: 3200 },
  { text: "Módulos A2·B2·C2", at: () => V(MOD_X, 130, HOUSE_IN + HOUSE_D / 2), max: 3200 },
  { text: "Scanner 2 · metade A–B", at: () => V(heads2[0].x, S2_Y + 70, 0), max: 1800 },
  { text: "Scanner 2 · metade B–C", at: () => V(heads2[1].x, S2_Y + 70, 0), max: 1800 },
  { text: "A", at: () => V(MOD_X - P.a, 110, 0), max: 1500 },
  { text: "B", at: () => V(MOD_X, 110, 0), max: 1500 },
  { text: "C", at: () => V(MOD_X + P.a, 110, 0), max: 1500 },
  { text: "KUKA KR DELTA · entrada", at: () => V(IN_X, 800, -210), max: 6000 },
  { text: "KUKA KR DELTA · saída", at: () => V(950, 800, 210), max: 6000 },
  { text: () => { const c = inputCrate(); return `Caixa de entrada · ${c ? c.n : 0}/${CAP_IN}`; }, at: () => V(BIN_IN.x, 90, BIN_IN.z - 140), max: 3500 },
  { text: () => { const c = fillCrate(); return c ? `A encher · ${c.n}/${CAP_IN}` : "Enchimento · à espera de caixa vazia"; }, at: () => V(FILL_X, 110, BIN_IN.z + 150), max: 4000 },
  { text: "Retorno das caixas de entrada vazias", at: () => V((FILL_X + BIN_IN.x) / 2, 40, RET_Z - 150), max: 3500 },
  { text: "Elevador · verdes vazias voltam por baixo", at: () => V(GREEN_END, ROLLER_Y + 330, OUT_Z), max: 5000 },
  { text: "Elevador · verdes sobem para encher", at: () => V(GREEN_START, ROLLER_Y + 330, OUT_Z), max: 4000 },
  { text: "Retrabalho (NOK)", at: () => V(NOK_END + 520, 330, NOK_POS.z), max: 6000 },
  { text: () => { const c = fillingCrate(); return `Caixa OK · ${c ? c.n : 0}/${CAP_CRATE}`; }, at: () => V(OK_X, 90, OUT_Z + 130), max: 4000 },
  { text: () => `Rejeitadas (NOK) · ${nokCount}`, at: () => V(NOK_POS.x, 90, NOK_POS.z), max: 4000 },
  { text: "Robô de embalagem · caixa verde → caixa de cartão", at: () => V(PACK_X, 800, 620), max: 7000 },
  { text: () => { const k = cartons.find((o) => o.state === "open" || o.state === "closing"); return k ? (k.state === "closing" ? "Caixa de cartão · a fechar" : `Caixa de cartão · ${k.n}/${CAP_CARTON}`) : "Caixa de cartão"; }, at: () => V(PACK_X, 120, CART_Z + 130), max: 5000 },
  { text: "Caixas verdes (internas) voltam vazias", at: () => V(GREEN_END - 100, 90, OUT_Z - 140), max: 5000 },
  { text: () => `Cobot KUKA LBR iisy · paletiza 3 × 4 × 2 = ${SLOTS.length} caixas`, at: () => V(COB.base.x, 900, COB.base.z), max: 9000 },
  { text: () => `Palete · ${station.pallet ? station.pallet.crates.length : 0}/${SLOTS.length} caixas de cartão`, at: () => V(P_ST.x, FLOOR + 900, P_ST.z), max: 9000 },
  { text: "AMR · leva as paletes", at: () => V(amr.x, FLOOR + 700, amr.z), max: 12000 },
  { text: () => (FL.waiting.length ? "Expedição · palete à espera do KMF 1500P" : "Expedição"), at: () => V(D_ST.x, FLOOR + 1300, D_ST.z), max: 14000 },
  { text: "KUKA KMF 1500P · empilhador autónomo", at: () => V(FL.x, FLOOR + 2800, FL.z), max: 12000 },
  { text: () => `Armário de paletes · ${rackSlots.filter((s) => s.pallet && !(FL.pallet === s.pallet)).length}/${rackSlots.length} lugares`, at: () => V(4200, FLOOR + 4600, -5600), max: 16000 },
  { text: "Paletes vazias", at: () => V(E_ST.x, FLOOR + 900, E_ST.z), max: 14000 },
  { text: "Armário eléctrico · HMI SACCLI", at: () => V(300, FLOOR + 2250, -1380), max: 9000 },
  { text: "6 · SACCLI — correção automática", at: () => V(-200, FLOOR + 2600, 0), min: 3500, big: true },
  { text: "7 · Embalagem em cartão + paletização", at: () => V(2700, FLOOR + 2100, 500), min: 3500, big: true },
  { text: "8 · Expedição (AMR) e armário (KMF 1500P)", at: () => V(8200, FLOOR + 2400, 400), min: 3500, big: true },
  { text: "Armazém", at: () => V(0, FLOOR + 4700, -6100), min: 2500, big: true },
].forEach(addTag);

