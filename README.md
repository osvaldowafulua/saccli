# SACCLI 1.0.7 — Smart Automated Correction & Control Lima Interface

Simulação 3D interactiva (Three.js, um único ficheiro HTML, funciona sem internet) de uma fábrica de limas
de aço, centrada na célula SACCLI de correcção automática de limas tortas.

**Ver online:** https://osvaldowafulua.github.io/saccli/ · **Ficheiro:** [`index.html`](index.html)
(abre directamente no browser).

## O que a simulação mostra

| Nº | Estação | O que acontece |
|---|---|---|
| 0 | Alimentação | barras chatas de aço (secção rectangular — a lima nunca é redonda) |
| 1 | Laminagem | rolo de aço giratório dá a forma da lima (afunilada, com espigão) |
| 2 | Picagem | cinzel pica os dentes ao longo do comprimento |
| 3 | Têmpera por indução | bobina de cobre aquece até **1200 °C** → choque térmico em **água** em fracções de segundo → revenido; HMI virada para o corredor do operador |
| 4 | Dureza / rigidez | ensaio Rockwell C (força em N) com HMI e rejeição |
| 5 | Jateamento | granalha (cinza mate) ou jato húmido (cinza metálico) |
| 6 | **SACCLI** | scanner 1 Keyence LJ-S (fixo, lê a lima toda) decide onde está torta → 2 pares de módulos seguram (guias lineares 250 N, depois bloqueadas), 1 par corrige (kN) → scanner 2 controla em tempo real pela tensão (δ − F/K) → lima sai direita (azul = dentro da tolerância, vermelho = fora); limas direitas passam OK sem correcção |
| 7 | Embalagem | KUKA KR DELTA → caixa verde (OK) / vermelha (NOK); robô delta passa as limas para caixas de cartão que fecham; cobot KUKA LBR iisy paletiza **3 × 4 × 2 = 24 caixas** por palete |
| 8 | Expedição | AMR leva a palete; **KUKA KMF 1500P** (empilhador autónomo) arruma-a no armário de paletes |

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
