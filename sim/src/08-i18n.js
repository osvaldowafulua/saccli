// =====================================================================
// Idioma: PT (por omissão) / EN. tr(s) traduz uma frase; setLang(l) muda o idioma em toda a página.
// - texto estático do HUD: nós de texto recolhidos em i18nInit() e reescritos a partir do original PT
// - texto dinâmico (HUD, etiquetas 3D, ecrãs HMI): passa sempre por tr()
// - placas/ecrãs desenhados em canvas: canvasTex() regista os que usaram tr() e redesenha-os ao mudar
// =====================================================================
const LANG = { cur: "pt", rev: 0, used: false, canvases: [], hooks: [], nodes: [], attrs: [], title: "" };
{
  const q = new URLSearchParams(location.search).get("lang");
  if (q && q.toLowerCase().startsWith("en")) LANG.cur = "en";
}

// frases exactas PT → EN (inglês industrial)
const I18N_EXACT = {
  // ---- HUD (00-head.html)
  "SACCLI · Linha de correção 3D": "SACCLI · 3D correction line",
  "SACCLI · Linha de correção de limas": "SACCLI · File correction line",
  "0 barras → 1 laminagem → 2 picagem → 3 têmpera → 4 dureza → 5 jateamento → 6 SACCLI (scanner 1 manda · 2 pares seguram, 1 corrige · scanner 2 controla) → 7 embalagem + palete → 8 expedição AMR":
    "0 bars → 1 rolling → 2 tooth cutting → 3 hardening → 4 hardness → 5 blasting → 6 SACCLI (scanner 1 commands · 2 pairs clamp, 1 corrects · scanner 2 controls) → 7 packing + pallet → 8 AMR shipping",
  "À espera da primeira lima…": "Waiting for the first file…",
  "Lima": "File",
  "Erro medido (scanner 1)": "Measured error (scanner 1)",
  "Força no actuador": "Actuator force",
  "Flecha medida (scanner 2)": "Measured deflection (scanner 2)",
  "Tensão na secção crítica": "Stress at critical section",
  "retorno previsto δ − F/K:": "predicted spring-back δ − F/K:",
  "alvo": "target",
  "Passagem": "Pass",
  "Erro final medido (scanner 2)": "Final measured error (scanner 2)",
  "Erro real (simulação)": "True error (simulation)",
  "Só com força fixa (malha aberta)": "Fixed force only (open loop)",
  "OK / NOK / paletes expedidas": "OK / NOK / pallets shipped",
  "azul = dentro da tolerância": "blue = within tolerance",
  "vermelho = fora / tensão alta": "red = out / high stress",
  "❚❚ Pausa": "❚❚ Pause",
  "▶ Continuar": "▶ Resume",
  "Fábrica": "Factory",
  "Célula": "Cell",
  "Módulo": "Module",
  "Expedição": "Shipping",
  "Topo": "Top",
  "Painéis": "Panels",
  "Arraste para rodar · roda para zoom · botão direito para mover · espaço pausa.": "Drag to rotate · wheel to zoom · right button to pan · space pauses.",
  "Parâmetros": "Parameters",
  "Tudo é recalculado ao mexer.": "Everything is recalculated as you adjust.",
  "Tolerância SACCLI 0,05 mm": "SACCLI tolerance 0.05 mm",
  "0,5 µm": "0.5 µm",
  "Espessura h (direção da correção)": "Thickness h (correction direction)",
  "Largura b": "Width b",
  "Distância A–B = B–C": "Distance A–B = B–C",
  "Aço temperado": "Hardened steel",
  "Cedência nominal σy (≈55 HRC)": "Nominal yield σy (≈55 HRC)",
  "Variação de σy entre limas": "σy variation between files",
  "Módulo de elasticidade E": "Young's modulus E",
  "Máquina": "Machine",
  "Força máx. do actuador de correção": "Max. correction actuator force",
  "Força necessária": "Required force",
  "250 N em tudo": "250 N everywhere",
  "Aperto dos pares que seguram (guia linear)": "Clamping force of the holding pairs (linear guide)",
  "Sensor dos scanners": "Scanner sensor",
  "Keyence LJ-S640 · repetibilidade Z 10 µm": "Keyence LJ-S640 · Z repeatability 10 µm",
  "Sensor de alta precisão · 0,1 µm": "High-precision sensor · 0.1 µm",
  "Produção": "Production",
  "Têmpera por indução: temperatura": "Induction hardening: temperature",
  "Choque térmico em água: duração": "Water quench: duration",
  "Acabamento do jateamento": "Blasting finish",
  "Granalha seca · cinza mate especial": "Dry shot blasting · special matte grey",
  "Jato húmido (líquido) · cinza metálico": "Wet blasting (slurry) · metallic grey",
  "Limas que já chegam direitas": "Files arriving already straight",
  "Erro máx. das limas tortas": "Max. error of bent files",
  "Tolerância": "Tolerance",
  "Ampliação visual do erro": "Visual error magnification",
  "Velocidade": "Speed",
  "Resultado do modelo (lima nominal)": "Model result (nominal file)",
  "Módulos A1–C2 (dos dois lados da esteira)": "Modules A1–C2 (both sides of the conveyor)",
  "azul segura (bloqueado)": "blue clamps (locked)",
  "laranja corrige": "orange corrects",
  "vermelho acima do actuador": "red above actuator limit",
  "Força × flecha (scanner 2)": "Force × deflection (scanner 2)",
  "Sobe elástico, cede, alivia em linha recta: o que fica é a correção": "Rises elastically, yields, unloads in a straight line: what remains is the correction",
  "Perfil da lima (A → C)": "File profile (A → C)",
  // ---- 90-ui.js
  "Ver cada área": "View each area", "0 · Alimentação": "0 · Bar feed", "1 · Laminagem": "1 · Rolling", "2 · Picagem": "2 · Tooth cutting", "3 · Têmpera": "3 · Hardening",
  "3 · Painel da têmpera": "3 · Hardening panel", "4 · Dureza": "4 · Hardness", "5 · Jateamento": "5 · Blasting", "6 · SACCLI": "6 · SACCLI", "6 · Módulos A–C": "6 · Modules A–C",
  "6 · Caixas e robôs": "6 · Crates and robots", "7 · Embalagem e palete": "7 · Packing and pallet", "8 · Expedição (AMR)": "8 · Shipping (AMR)", "8 · Armário (KMF 1500P)": "8 · Rack (KMF 1500P)",
  "Linha a montante · 1 lima produzida": "Upstream line · 1 file produced",
  "⏩ Acelerar linha 6×": "⏩ Speed up line 6×", "▶ Velocidade normal 1×": "▶ Normal speed 1×", "Velocidade da linha": "Line speed",
  "Acelera toda a linha de produção": "Speeds up the whole production line", "Português": "Portuguese", "English": "English",
  "corrige": "corrects", "segura": "clamps", "livre": "free", "tol ±": "tol ±", "0,5×": "0.5×",
  "Torta em B · segura A+C, corrige B": "Bent at B · clamp A+C, correct B",
  "Torta em A ou C · segura 2 pares, corrige a ponta": "Bent at A or C · clamp 2 pairs, correct the tip",
  "Início da cedência": "Yield onset",
  "Força p/ corrigir": "Force to correct",
  "Reacção no par que segura (bloqueado)": "Reaction at the holding pair (locked)",
  "Curso do actuador sob carga": "Actuator stroke under load",
  "Actuador de": "Actuator rated",
  "chega": "sufficient",
  "não chega": "insufficient",
  "Medição": "Measurement",
  "Sensor": "Sensor",
  "sensor de alta precisão": "high-precision sensor",
  "Repetibilidade vs tolerância": "Repeatability vs tolerance",
  "O sensor resolve a tolerância?": "Does the sensor resolve the tolerance?",
  "sim": "yes",
  "não": "no",
  "Força elástica (volta ao sítio)": "Elastic force (springs back)",
  "3 pontos: 0,5 µm / 5 µm": "3-point: 0.5 µm / 5 µm",
  "Consola: 0,5 µm / 5 µm": "Cantilever: 0.5 µm / 5 µm",
  "O actuador de correção precisa de ~": "The correction actuator needs ~",
  ". Com ": ". With ",
  " a lima só flete de forma elástica e volta torta.": " the file only flexes elastically and springs back bent.",
  "O ": "The ",
  " tem repetibilidade de ": " has a repeatability of ",
  " µm: não consegue garantir ±": " µm: it cannot guarantee ±",
  " µm. Para 0,5 µm é preciso um sensor de deslocamento/confocal de alta precisão.": " µm. For 0.5 µm a high-precision displacement/confocal sensor is needed.",
  "Os pares que seguram fecham com ": "The holding pairs close with ",
  " (guia linear) e depois ficam bloqueados (fuso auto-bloqueante/travão), porque a reacção chega a ": " (linear guide) and are then locked (self-locking screw/brake), because the reaction reaches ",
  "O scanner 2 mede a flecha δ e a força F em tempo real e pára quando δ − F/K = erro; assim a variação de ±": "Scanner 2 measures deflection δ and force F in real time and stops when δ − F/K = error; so the ±",
  "% na dureza não estraga a correção.": "% hardness variation does not spoil the correction.",
  "cedência": "yield",
  "limite actuador": "actuator limit",
  "scanner 2 · ao vivo": "scanner 2 · live",
  "scanner 1": "scanner 1",
  "corrige": "corrects",
  "segura": "clamps",
  "livre": "free",
  "reacção ": "reaction ",
  "tol ±": "tol ±",
  "paletes ": "pallets ",
  "Esteira avança uma lima": "Conveyor indexes one file",
  "Scanner 1 manda a ordem": "Scanner 1 issues the order",
  "Fechar os pares que seguram": "Close the clamping pairs",
  "A corrigir na esteira — scanner 2 a medir": "Correcting on the conveyor — scanner 2 measuring",
  "Parar: retorno previsto = erro": "Stop: predicted spring-back = error",
  "Aliviar — retorno elástico": "Unload — elastic spring-back",
  "Scanner 2 confirma": "Scanner 2 confirms",
  "OK no scanner 1 — passa sem correção": "OK at scanner 1 — passes without correction",
  "OK — corrigida, segue na esteira": "OK — corrected, continues on the conveyor",
  "NOK — actuador sem força para passar a cedência": "NOK — actuator too weak to reach yield",
  "NOK — rejeitar": "NOK — reject",
  "Parar: limite do actuador atingido": "Stop: actuator limit reached",
  "Torta em ": "Bent at ",
  " → segurar ": " → clamp ",
  " · corrigir com ": " · correct with ",
  "A ler o scanner 1…": "Reading scanner 1…",
  "Lima direita (": "Straight file (",
  ", dentro de ±": ", within ±",
  "segue sem correção": "continues without correction",
  " · σy real ": " · actual σy ",
  " · plástico": " · plastic",
  " · elástico": " · elastic",
  // ---- 70-tags.js
  "Scanner 1 · Keyence LJ-S640 fixo (lê a lima inteira)": "Scanner 1 · fixed Keyence LJ-S640 (reads the whole file)",
  "Módulos A1·B1·C1": "Modules A1·B1·C1",
  "Módulos A2·B2·C2": "Modules A2·B2·C2",
  "Scanner 2 · metade A–B": "Scanner 2 · half A–B",
  "Scanner 2 · metade B–C": "Scanner 2 · half B–C",
  "KUKA KR DELTA · entrada": "KUKA KR DELTA · infeed",
  "KUKA KR DELTA · saída": "KUKA KR DELTA · outfeed",
  "Enchimento · à espera de caixa vazia": "Filling · waiting for an empty crate",
  "Retorno das caixas de entrada vazias": "Empty input crates return",
  "Elevador · verdes vazias voltam por baixo": "Lift · empty green crates return underneath",
  "Elevador · verdes sobem para encher": "Lift · green crates go up to be filled",
  "Retrabalho (NOK)": "Rework (NOK)",
  "Robô de embalagem · caixa verde → caixa de cartão": "Packing robot · green crate → carton",
  "Caixa de cartão · a fechar": "Carton · closing",
  "Caixa de cartão": "Carton",
  "Caixas verdes (internas) voltam vazias": "Green (internal) crates return empty",
  "AMR · leva as paletes": "AMR · carries the pallets",
  "Expedição · palete à espera do KMF 1500P": "Shipping · pallet waiting for the KMF 1500P",
  "KUKA KMF 1500P · empilhador autónomo": "KUKA KMF 1500P · autonomous forklift",
  "Paletes vazias": "Empty pallets",
  "Armário eléctrico · HMI SACCLI": "Electrical cabinet · SACCLI HMI",
  "6 · SACCLI — correção automática": "6 · SACCLI — automatic correction",
  "7 · Embalagem em cartão + paletização": "7 · Carton packing + palletising",
  "8 · Expedição (AMR) e armário (KMF 1500P)": "8 · Shipping (AMR) and rack (KMF 1500P)",
  "Armazém": "Warehouse",
  // ---- 40-logistics.js / 50-upstream.js
  "KMF 1500P · armário": "KMF 1500P · rack",
  "AUTO · 1500 kg": "AUTO · 1500 kg",
  "Nav laser OK": "Laser nav OK",
  "0 · Alimentação de barras de aço": "0 · Steel bar feed",
  "Linha a montante · em espera (caixa azul cheia)": "Upstream line · waiting (blue crate full)",
  "Linha a montante": "Upstream line",
  // ---- 55-a laminagem
  "MOLDE DE CALIBRAGEM · MATRIZ": "SIZING DIE · LOWER DIE", "MOLDE DE CALIBRAGEM · PUNÇÃO": "SIZING DIE · PUNCH",
  "Molde de calibragem · forma final da lima (lâmina + espigão)": "Sizing die · final file shape (blade + tang)", "A calibrar no molde": "Sizing in the die", "Molde aberto": "Die open",
  "em espera": "idle",
  "LAMINADOR DUO  L1": "DUO ROLLING MILL  L1",
  "Cilindros Ø330 × 420 mm": "Rolls Ø330 × 420 mm",
  "Força máx. 600 kN · 18 rpm": "Max. force 600 kN · 18 rpm",
  "Aperto hidráulico AGC · 2 × 300 kN": "Hydraulic AGC screw-down · 2 × 300 kN",
  "REDUTOR + CAIXA DE PINHÕES": "GEARBOX + PINION STAND",
  "i = 40 · 2 saídas Ø150": "i = 40 · 2 outputs Ø150",
  "Óleo ISO VG 320 · 38 L": "Oil ISO VG 320 · 38 L",
  "Variador": "Drive",
  "LAMINADOR DUO L1 · LAMINAGEM": "DUO ROLLING MILL L1 · ROLLING",
  "VELOCIDADE": "SPEED",
  "FOLGA": "GAP",
  "FORÇA": "FORCE",
  "Barra a entrar no batente": "Bar entering the stop",
  "Em espera": "Idle",
  "em espera": "idle",
  "Barra na mordedura": "Bar in the roll bite",
  "Aperto hidráulico (AGC)": "Hydraulic screw-down (AGC)",
  "A laminar · espigão → corpo → ponta": "Rolling · tang → body → tip",
  "Esboço pronto · folga a abrir": "Blank done · gap opening",
  "Perfil da peça (espessura ×6) · alvo a tracejado": "Part profile (thickness ×6) · target dashed",
  "eixo dos cilindros": "roll axis",
  "1 · Laminagem — rolo de aço giratório": "1 · Rolling — rotating steel roll",
  "Cilindros de trabalho Ø330 × 420 mm · 18 rpm": "Work rolls Ø330 × 420 mm · 18 rpm",
  "Motor 22 kW + redutor / caixa de pinhões": "22 kW motor + gearbox / pinion stand",
  "Veios cardã": "Cardan shafts",
  "Barra chata → esboço afunilado com espigão": "Flat bar → tapered blank with tang",
  "Laminagem": "Rolling",
  // ---- 55-b picagem
  "PICADORA DE LIMAS": "FILE CUTTING MACHINE",
  "came de 6 ressaltos · 720 golpes/min": "6-lobe cam · 720 strokes/min",
  "cinzel HSS · avanço por fuso de esferas": "HSS chisel · ball-screw feed",
  "CINZEL": "CHISEL",
  "picado bastardo": "bastard cut",
  "10 dentes/cm": "10 teeth/cm",
  "Comando": "Control",
  "PERIGO": "DANGER",
  "cinzel em": "chisel in",
  "movimento": "motion",
  "Carro a regressar · lima a avançar": "Carriage returning · file indexing",
  "Em espera · sem lima": "Idle · no file",
  "Bigorna em apoio · cinzel a descer": "Anvil raised · chisel lowering",
  "A picar · 1.º corte (65°)": "Cutting · 1st cut (65°)",
  "Cinzel a recuar": "Chisel retracting",
  "Linha em espera (caixa cheia)": "Line waiting (crate full)",
  "Picagem concluída": "Cutting complete",
  "Picagem dos dentes": "Tooth cutting",
  "PICAGEM · CINZEL": "TOOTH CUTTING · CHISEL",
  "GOLPES / MIN": "STROKES / MIN",
  "Carro X": "Carriage X",
  "Cinzel": "Chisel",
  "a bater": "striking",
  "recolhido": "retracted",
  "Bigorna": "Anvil",
  "em apoio": "raised",
  "em baixo": "lowered",
  "Óleo de corte": "Cutting oil",
  "névoa ON": "mist ON",
  "OFF": "OFF",
  "Golpes": "Strokes",
  "ponta": "tip",
  "espigão": "tang",
  "picado bastardo · 10 dentes/cm · cinzel 12°": "bastard cut · 10 teeth/cm · chisel 12°",
  "2 · Picagem dos dentes": "2 · Tooth cutting",
  "Cinzel · recolhido": "Chisel · retracted",
  "Volante + embraiagem · motor 7,5 kW": "Flywheel + clutch · 7.5 kW motor",
  "Picagem": "Tooth cutting",
  // ---- 55-c indução
  "TRANSFORMADOR": "TRANSFORMER",
  "de adaptação 12:1": "matching 12:1",
  "8 kV·A · água": "8 kV·A · water",
  "Perigo": "Danger",
  "AT / AF": "HV / HF",
  "alta tensão": "high voltage",
  "GERADOR DE INDUÇÃO · FONTE AC MF": "INDUCTION GENERATOR · MF AC SOURCE",
  "REFRIGERADOR": "CHILLER",
  "circuito fechado · 30 kW": "closed circuit · 30 kW",
  "TANQUE DE TÊMPERA": "QUENCH TANK",
  "água · 450 L · 25 °C": "water · 450 L · 25 °C",
  "Têmpera por indução": "Induction hardening",
  "Revenido por indução": "Induction tempering",
  "GERADOR DE INDUÇÃO · MF": "INDUCTION GENERATOR · MF",
  "A AQUECER": "HEATING",
  "TÊMPERA EM ÁGUA": "WATER QUENCH",
  "PRONTO": "READY",
  "POTÊNCIA": "POWER",
  "FREQUÊNCIA": "FREQUENCY",
  "TEMPERATURA DA PEÇA": "PART TEMPERATURE",
  "aquecimento por indução": "induction heating",
  "ÁGUA DA BOBINA": "COIL WATER",
  "caudal 32 L/min · 3,2 bar": "flow 32 L/min · 3.2 bar",
  "REVENIDO": "TEMPERING",
  "4,5 kW · 30 kHz": "4.5 kW · 30 kHz",
  "Bobina de indução (cobre, arrefecida a água)": "Induction coil (copper, water-cooled)",
  "Fonte AC / gerador de indução": "AC source / induction generator",
  "Fonte AC / gerador de indução · HMI para o corredor do operador": "AC source / induction generator · HMI facing the operator aisle",
  "Consola · curva de temperatura": "Console · temperature curve",
  "Água de resfriamento da bobina (entrada · saída)": "Coil cooling water (inlet · outlet)",
  "Refrigerador · circuito fechado": "Chiller · closed circuit",
  "Tanque de têmpera (água)": "Quench tank (water)",
  "Elevador de raspadores": "Scraper elevator",
  "Extração de vapor": "Steam extraction",
  "Revenido por indução · ~200 °C": "Induction tempering · ~200 °C",
  "Indução": "Induction",
  "Indução · painel": "Induction · panel",
  // ---- 55-d dureza
  "cabeça de ensaio": "test head",
  "célula 2 kN": "2 kN load cell",
  "DURÓMETRO ROCKWELL": "ROCKWELL HARDNESS TESTER",
  "diamante 120° · EN ISO 6508": "120° diamond · EN ISO 6508",
  "Última: — HRC": "Last: — HRC",
  "Em espera · lima a avançar": "Idle · file indexing",
  "Aproximação do indentador": "Indenter approach",
  "Pré-carga F₀ = 98 N": "Preload F₀ = 98 N",
  "A aplicar a carga total": "Applying full load",
  "Carga total · permanência": "Full load · dwell",
  "Retorno à pré-carga F₀": "Return to preload F₀",
  "Leitura da profundidade h": "Reading depth h",
  "Recuo do indentador": "Indenter retracting",
  "Ensaio concluído": "Test complete",
  "Dureza Rockwell C": "Rockwell C hardness",
  "Ensaio n.º ": "Test no. ",
  "FORÇA DE ENSAIO": "TEST FORCE",
  "Bigorna: ": "Anvil: ",
  "  ·  rejeitadas: ": "  ·  rejected: ",
  "RESULTADO": "RESULT",
  "RESULTADO ANTERIOR": "PREVIOUS RESULT",
  "✓ OK  (mín. 55 HRC)": "✓ OK  (min. 55 HRC)",
  "✗ MACIA → rejeição": "✗ SOFT → reject",
  "HRC = 100 − h / 0,002 mm": "HRC = 100 − h / 0.002 mm",
  " · média ": " · mean ",
  "Lima aprovada": "File approved",
  "Lima rejeitada": "File rejected",
  "4 · Dureza / rigidez — Rockwell C · 1471 N": "4 · Hardness / stiffness — Rockwell C · 1471 N",
  "Rejeição · HRC < 55": "Reject · HRC < 55",
  "Dureza": "Hardness",
  // ---- 55-e jato
  "JATEAMENTO DE LIMAS": "FILE BLASTING",
  "Cabine de passagem · cinza especial": "Pass-through cabinet · special grey",
  "Granalha 2 × 11 kW  ·  jato húmido 2 bicos": "Shot 2 × 11 kW  ·  wet blast 2 nozzles",
  "Projecção de abrasivo": "Abrasive projection",
  "Não abrir em marcha": "Do not open while running",
  "Use protecção auditiva": "Wear hearing protection",
  "11 kW · 3000 rpm": "11 kW · 3000 rpm",
  "roda Ø 360 · 8 pás": "wheel Ø 360 · 8 blades",
  "SILO DE GRANALHA": "SHOT SILO",
  "aço S230 · 450 kg": "S230 steel · 450 kg",
  "COLECTOR DE PÓ": "DUST COLLECTOR",
  "8 cartuchos · pulsos de ar": "8 cartridges · air pulses",
  "TANQUE DE LAMA": "SLURRY TANK",
  "óxido de alumínio + água": "aluminium oxide + water",
  "GRANALHA": "SHOT",
  "HÚMIDO": "WET",
  "LIGAR": "START",
  "PARAR": "STOP",
  "EMERG.": "EMERG.",
  "Jateamento": "Blasting",
  "A avançar · lima a entrar": "Indexing · file entering",
  "Sem lima na câmara": "No file in the chamber",
  "Lima na câmara · cortinas fechadas": "File in the chamber · curtains closed",
  "Sopro de limpeza (ar)": "Clean-off blow (air)",
  "Enxaguamento e sopro (ar)": "Rinse and blow-off (air)",
  "JATEAMENTO · cinza especial": "BLASTING · special grey",
  "MODO": "MODE",
  "GRANALHA SECA": "DRY SHOT",
  "JATO HÚMIDO": "WET BLAST",
  "→ cinza mate especial": "→ special matte grey",
  "→ cinza metálico": "→ metallic grey",
  "Turbina 1": "Turbine 1",
  "Turbina 2": "Turbine 2",
  "Granalha": "Shot",
  "S230 · 2 × 90 kg/min": "S230 · 2 × 90 kg/min",
  "Colector ΔP": "Collector ΔP",
  "1,2 kPa": "1.2 kPa",
  "Bomba de lama": "Slurry pump",
  "Ar dos bicos": "Nozzle air",
  "fechado": "closed",
  "Bicos": "Nozzles",
  "2 × Ø 8 mm · oscilam": "2 × Ø 8 mm · oscillating",
  "Lama": "Slurry",
  "óxido de alumínio": "aluminium oxide",
  "Entrada": "Inlet",
  "Lima agora": "File now",
  "Alvo": "Target",
  "Acabamento: cinza mate (Ra ≈ 1,6 µm)": "Finish: matte grey (Ra ≈ 1.6 µm)",
  "Acabamento: cinza metálico acetinado": "Finish: satin metallic grey",
  "5 · Jateamento — cinza especial": "5 · Blasting — special grey",
  "Modo: jato húmido (cinza metálico)": "Mode: wet blasting (metallic grey)",
  "Modo: granalha (cinza mate)": "Mode: shot blasting (matte grey)",
};

// fragmentos para frases dinâmicas com números (substituição de sub-frases inteiras, da mais longa para a mais curta)
const I18N_PHRASES = [
  // notas do painel de resultados (frases com números)
  ["O actuador de correção precisa de ~", "The correction actuator needs ~"], [" a lima só flete de forma elástica e volta torta.", " the file only bends elastically and springs back bent."], [". Com ", ". With "],
  [" tem repetibilidade de ", " has a repeatability of "], [" µm: não consegue garantir ±", " µm: it cannot guarantee ±"], [" µm. Para 0,5 µm é preciso um sensor de deslocamento/confocal de alta precisão.", " µm. For 0.5 µm a high-precision displacement/confocal sensor is needed."],
  ["Os pares que seguram fecham com ", "The holding pairs close with "], [" (guia linear) e depois ficam bloqueados (fuso auto-bloqueante/travão), porque a reacção chega a ", " (linear guide) and are then locked (self-locking screw/brake), because the reaction reaches "],
  ["O scanner 2 mede a flecha δ e a força F em tempo real e pára quando δ − F/K = erro; assim a variação de ±", "Scanner 2 measures the deflection δ and the force F in real time and stops when δ − F/K = error; so the ±"], ["% na dureza não estraga a correção.", "% hardness variation does not spoil the correction."],
  ["Torta em B · segura A+C, corrige B", "Bent at B · clamps A+C, corrects B"], ["Torta em A ou C · segura 2 pares, corrige a ponta", "Bent at A or C · clamps 2 pairs, corrects the tip"],
  ["Medição 3D · comprimento ", "3D measurement · length "], [" · largura ", " · width "], [" · espessura ", " · thickness "], [" · flecha ", " · deflection "],
  ["Caixa de entrada · ", "Input crate · "], ["A encher · ", "Filling · "], ["Caixa OK · ", "OK crate · "], ["Rejeitadas (NOK) · ", "Rejected (NOK) · "],
  ["Caixa de cartão · ", "Carton · "], ["Cobot KUKA LBR iisy · paletiza ", "Cobot KUKA LBR iisy · palletises "],
  [" caixas de cartão", " cartons"], [" caixas", " boxes"], ["Palete · ", "Pallet · "], ["Armário de paletes · ", "Pallet rack · "], [" lugares", " slots"],
  ["Linha a montante · ", "Upstream line · "], [" limas produzidas", " files produced"],
  ["Esboços: ", "Blanks: "], ["Aperto hidráulico (AGC) · folga ", "Hydraulic screw-down (AGC) · gap "], ["A laminar · ", "Rolling · "],
  ["Limas picadas: ", "Files cut: "], ["DENTES PICADOS · ", "TEETH CUT · "], ["Cinzel · ", "Chisel · "], [" golpes/min", " strokes/min"],
  ["3 · Têmpera por indução — ", "3 · Induction hardening — "], [" °C → água", " °C → water"], ["Peça: ", "Part: "],
  ["têmpera em água: ", "water quench: "], ["Bobina Ø104 mm · ", "Coil Ø104 mm · "], [" espiras · água ", " turns · water "], ["Peças temperadas: ", "Parts hardened: "],
  ["Última: ", "Last: "], ["Ensaio n.º ", "Test no. "], ["Bigorna: ", "Anvil: "], ["  ·  rejeitadas: ", "  ·  rejected: "], [" · média ", " · mean "],
  ["Limas jateadas: ", "Files blasted: "], ["TURBINA ", "TURBINE "], ["A jatear com granalha ", "Shot blasting "], ["Jato húmido em curso ", "Wet blasting in progress "],
  ["Força p/ corrigir ", "Force to correct "], ["Actuador de ", "Actuator rated "], ["não chega", "insufficient"], [" · σy real ", " · actual σy "],
  ["Torta em ", "Bent at "], [" → segurar ", " → clamp "], [" · corrigir com ", " · correct with "], ["Lima direita (", "Straight file ("], [", dentro de ±", ", within ±"],
  ["segue sem correção", "continues without correction"], [" · plástico", " · plastic"], [" · elástico", " · elastic"], ["reacção ", "reaction "], ["paletes ", "pallets "],
  ["em espera", "idle"], ["em apoio", "raised"], ["em baixo", "lowered"], [" em ", " at "],
].sort((a, b) => b[0].length - a[0].length);

const _tCache = new Map();
function tr(s) {
  LANG.used = true;                                   // marca que este desenho/texto depende do idioma
  if (LANG.cur === "pt" || typeof s !== "string") return s;
  let r = _tCache.get(s);
  if (r !== undefined) return r;
  r = I18N_EXACT[s];
  if (r === undefined) {
    r = s;
    for (const [a, b] of I18N_PHRASES) if (r.includes(a)) r = r.split(a).join(b);
  }
  if (_tCache.size > 4000) _tCache.clear();
  _tCache.set(s, r);
  return r;
}

// ids com conteúdo dinâmico (reescrito por renderHUD/renderResults com tr()); não entram na lista de nós estáticos
const I18N_DYNAMIC_IDS = new Set(["play", "phase", "order", "limaId", "eMeas", "force", "defl", "stress", "pred", "target", "pass", "eFinal", "eTrue", "eOpen", "counts", "res", "explain", "mgrid"]);
function i18nCollect() {
  LANG.nodes.length = 0; LANG.attrs.length = 0;
  for (const id of ["hud", "ctrl", "charts", "motors", "stationViews"]) {
    const root = document.getElementById(id);
    if (!root) continue;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentElement;
      if (!p || !n.nodeValue.trim()) continue;
      if (I18N_DYNAMIC_IDS.has(p.id) || /^v[A-Z]/.test(p.id) || p.closest("#res, #explain, #mgrid")) continue;
      if (n.__pt === undefined) n.__pt = n.nodeValue;
      LANG.nodes.push(n);
    }
    for (const el of root.querySelectorAll("[title], [placeholder]")) {
      for (const a of ["title", "placeholder"]) if (el.hasAttribute(a)) LANG.attrs.push([el, a, el.getAttribute(a)]);
    }
  }
}
function setLang(l) {
  LANG.cur = l === "en" ? "en" : "pt";
  LANG.rev++; _tCache.clear();
  document.documentElement.lang = LANG.cur;
  const pt = document.getElementById("langPt"), en = document.getElementById("langEn");
  if (pt) pt.classList.toggle("active", LANG.cur === "pt");
  if (en) en.classList.toggle("active", LANG.cur === "en");
  if (LANG.title) document.title = tr(LANG.title);
  for (const n of LANG.nodes) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(n.__pt);
    n.nodeValue = m[1] + tr(m[2]) + m[3];
  }
  for (const [el, a, v] of LANG.attrs) el.setAttribute(a, tr(v));
  for (const fn of LANG.canvases) fn();            // placas e ecrãs desenhados uma vez em canvas
  for (const fn of LANG.hooks) fn();               // re-render do HUD dinâmico (registado em 90-ui.js)
}
// chamado no fim de 90-ui.js, depois de os botões das vistas existirem
function i18nInit() {
  LANG.title = document.title;
  i18nCollect();
  const pt = document.getElementById("langPt"), en = document.getElementById("langEn");
  if (pt) pt.onclick = () => setLang("pt");
  if (en) en.onclick = () => setLang("en");
  setLang(LANG.cur);
}
window.tr = tr; window.setLang = setLang; window.LANG = LANG;
