# SACCLI 1.0.7 — Smart Automated Correction & Control Lima Interface

Simulação 3D interactiva (Three.js, um único ficheiro HTML, funciona sem internet) de uma fábrica de limas
de aço, centrada na célula SACCLI de correcção automática de limas tortas.

**Ver online:** https://saccli.vercel.app · https://osvaldowafulua.github.io/saccli/ · **Ficheiro:** [`index.html`](index.html)
(abre directamente no browser).

## Documentação 3D (visita guiada)

Na página, o botão **📖 Documentação 3D** abre uma visita guiada em 14 passos: a câmara voa até cada área e um painel
explica o que acontece (em português ou inglês, conforme o botão **PT | EN**). Pode avançar passo a passo ou deixar em
**Automático**. Os botões **Ver cada área** levam directamente a qualquer estação, e a velocidade da linha ajusta-se
no painel de parâmetros (0,5× a 6×).

## O que a simulação mostra

| Nº | Estação | O que acontece |
|---|---|---|
| 0 | Bobina de banda | banda contínua de aço (≈90 m, secção rectangular — a lima nunca é redonda) num desbobinador, endireitada por rolos; não há barras soltas |
| 1 | Laminagem + molde | os cilindros de aço apertam a banda até uma tira chata e direita e rodam sincronizados com o molde (avançam um passo e param); o molde de corte (prensa) corta a silhueta da lima — lâmina afunilada com espigão — e as aparas caem para o contentor |
| 2 | Picagem | cinzel pica os dentes ao longo do comprimento |
| 3 | Têmpera por indução | bobina de cobre aquece até **1200 °C** → choque térmico em **água** em fracções de segundo → revenido; HMI virada para o corredor do operador |
| 4 | Dureza / rigidez | ensaio Rockwell C (força em N) com HMI e rejeição |
| 5 | Jateamento | granalha (cinza mate) ou jato húmido (cinza metálico) |
| 6 | **SACCLI** | scanner 1 Keyence LJ-S (fixo, lê a lima toda) decide onde está torta → 2 pares de módulos seguram (guias lineares 250 N, depois bloqueadas), 1 par corrige (kN) → scanner 2 controla em tempo real pela tensão (δ − F/K) → lima sai direita (azul = dentro da tolerância, vermelho = fora); limas direitas passam OK sem correcção |
| 7 | Embalagem | KUKA KR DELTA → caixa verde (OK) / vermelha (NOK); robô delta passa as limas para caixas de cartão que fecham; cobot KUKA LBR iisy paletiza **3 × 4 × 2 = 24 caixas** por palete |
| 8 | Expedição | AMR leva a palete; **KUKA KMF 1500P** (empilhador autónomo) arruma-a no armário de paletes; cais de carga com camião encostado à porta lateral |
| 9 | Instalações | bloco compacto de contentores à esquerda da nave, só com as instalações de intervenção rápida: sala de almoço e manutenção (rés-do-chão), sala dos engenheiros e armazém de EPI (1.º andar, com escadas ao longo da fachada), WC, recepção logística e sala de limpeza na parede; zona de emergência (ponto de encontro, primeiros socorros, lava-olhos, extintores); portão sandwich na entrada; ventilação (extractores de cobertura, HVLS, ventiladores de parede); relógio de turno com sirene e luzes de alarme ao almoço (12:00) e no fim do turno (17:00) |
| 10 | Exterior | nave em painel sandwich com cobertura e letreiro luminoso **SACFILE** (letras vermelhas); escritório central em vidro e betão com 3 pisos (recepção + sala de visitas de clientes; administração, HSA + RH, contabilidade e compras; sala de reunião executiva); estacionamento, portaria com barreira, vedação; camião de encomendas (tractor + semi-reboque SACFILE) a carregar paletes no cais |

As caixas de entrada (azuis), OK (verdes) e NOK (vermelhas) circulam em ciclo fechado: enchem, avançam,
esvaziam e voltam vazias pelos corredores de retorno.

## Modelo físico da correcção

- Viga elástica–perfeitamente plástica; flexão em 3 pontos (torta em B) ou em consola (torta em A/C).
- `bend(F)` integra a curvatura; `forceFor(δ)` encontra a força por bissecção; o controlo em malha fechada
  pára quando a deformação residual prevista `δ − F/K` atinge o alvo, com ruído do sensor
  (LJ-S640: 10 µm; cabeça de alta precisão: 0,1 µm).
- Parâmetros no painel: espessura 10 mm, largura, tensão de cedência do aço temperado, erro inicial,
  tolerância (predefinição SACCLI 0,05 mm), sensor, temperatura de indução, tempo de têmpera em água, acabamento.

## Construir

```bash
cd sim && node build.mjs          # gera saccli-correcao-3d.html a partir de src/*.js (Three.js r160 embutido)
```

`sim/API.md` descreve o contrato usado por cada estação. A cópia na raiz (`index.html`) é a página publicada.

---

## English

Interactive 3D simulation (Three.js, single offline HTML file) of a steel-file factory centred on the SACCLI
automatic straightening cell: upstream line (flat bar feed → rolling → tooth cutting → induction hardening at
1200 °C with water quench → Rockwell hardness test → shot/wet blasting), the SACCLI cell (fixed Keyence 2D/3D
scanner decides where the file is bent, two module pairs clamp with 250 N linear guides, one pair corrects in the
kN range under closed-loop tension control from a second scanner), packing (KUKA KR DELTA robots, cartons, a
palletising cobot stacking 3 × 4 × 2 = 24 cartons) and shipping (AMR + KUKA KMF 1500P autonomous forklift storing
pallets in the rack).
