# SACCLI 3D — contrato para as estações da linha a montante

A página `saccli-correcao-3d.html` é gerada por `node build.mjs` a partir de `src/*.js` (concatenados por ordem
alfabética num único `<script type="module">`, com o Three.js r160 embutido). Cada estação da linha a montante
é **um único ficheiro novo** `src/55-<letra>-<nome>.js`. Não edites nenhum outro ficheiro.

## Regras
- Envolve TODO o código do teu ficheiro num bloco `{ ... }` (para não colidir com nomes globais de outras partes).
- Sem `import`. Usa só os globais listados abaixo. Escreve etiquetas em português de Portugal.
- Unidades: milímetros. `y` para cima. Chão em `y = FLOOR = -620`. Topo das esteiras em `y = 0`.
- Eixo `x` = sentido do fluxo (a lima avança para +x). Corredor da linha a montante em `z = UP.Z = -420`.
  O lado do operador / das câmaras por omissão é `+z` (põe painéis de comando e ecrãs virados para +z).
- Fica DENTRO da tua região (abaixo). Não ponhas nada sólido dentro do túnel da esteira:
  `z ∈ [-570, -270]` e `y ∈ [-620, 90]` ao longo da tua região — excepto peças que actuam de propósito na lima
  (rolos, cinzel, indentador, bocais), que podem descer até à lima, e estruturas em pórtico com pés fora desse z.
  A esteira tem pernas em `x = -10050, -9150, -8250, -7350, -6450, -5550, -4650, -3750, -2850` com `z = -420 ± 130`.
- Orçamento: ≤ 250 malhas por estação; reutiliza geometrias e materiais; não cries objectos por frame
  (aloca `Vector3`/`Color` uma vez). Partículas: `THREE.Points` com `BufferGeometry` (≤ 500 pontos).
  No máximo 1 `PointLight` por estação, sem sombras. Animação calma e realista.
- Qualidade visual: tem de se reconhecer a máquina real (estrutura, carenagens, motores, painel de comando,
  protecções, cabos/condutas, placas, parafusos/detalhes). Detalhe com propósito, sem ruído.

## Globais disponíveis
- `THREE`, `scene`, `camera`, `renderer`, `P` (parâmetros: `P.h`=10 espessura, `P.b`=25 largura, `P.a`, `P.speed`,
  `P.finish` = `"shot"` (granalha, cinza mate) ou `"wet"` (jato húmido, cinza metálico), `P.indT` temperatura de indução °C (1200), `P.quenchT` duração do choque em água em s (0,3)), `FLOOR`, `HALL`.
- Materiais prontos `mat.*`: alu, aluDark, belt, black, blue, chrome, brass, label, glass, steel, ledG, ledO, ledB,
  ledR, kukaWhite, kukaOrange, carbon, crate, crateRed, crateGreen, wood, carton, yellow, steelBlue, rackOrange,
  rackBlue, cabinet, furnace, dark, glow (laranja emissivo), lamp, skylight, window, wrap, cobot, cobotJoint, amr, cyan.
- `M(color, metalness=0.1, roughness=0.6, extra={})` → `MeshStandardMaterial`.
- `box(w, h, d, material, x=0, y=0, z=0, parent=scene, castShadow=true)` → `Mesh` (caixa centrada em x,y,z).
- `cyl(r, len, material, parent=scene, seg=24)` → `Mesh` cilindro ao longo de y, na origem (posiciona/roda depois).
- `unitMesh(material, geo=unitBox)`, `between(mesh, a, b, thick)` (estica uma malha unitária entre dois pontos),
  `beam(a, b, size, material, parent)`, `V(x,y,z)` → `Vector3`, `canvasTex(w, h, draw(ctx,w,h), repeat=[1,1])`,
  `teeth` (textura de dentes de lima), `ease(s)` (smoothstep), `gauss()`, `stripe(x0,z0,x1,z1,w=80,material)` (faixa no chão),
  `limaLen()` (= 270 mm por omissão).
- `addSystem({ update(dt), draw(dt) })` — `update` só corre sem pausa (dt já multiplicado pela velocidade);
  `draw` corre sempre, DEPOIS do sistema da linha (`UP`) ter colocado as limas → podes ajustar
  `l.g.position` / `l.g.rotation` da lima da tua estação no teu `draw` (ex.: mergulhar no óleo, passar nos rolos).
- `addTag({ text: string | () => string, at: () => Vector3, min?, max?, big?, when?: () => bool })` — etiqueta 3D.
  Usa `big: true, min: 2500` para o título numerado da estação (visto de longe) e etiquetas pequenas com `max: 3000`.
- `addView(key, label, cameraPos[x,y,z], target[x,y,z])` — botão de câmara no painel.

## A linha `UP`
- `UP.PITCH = 350`, `UP.xOf(slot) = -9600 + 350·slot`, slots `-1..20` (o 20 é o fim: a lima cai na caixa azul).
- Ciclo: paragem `UP.dwell = 1.8 s` (`UP.phase === "dwell"`) → avanço `UP.move = 0.9 s` (`UP.phase === "move"`,
  `UP.shift` 0→1). Pode ficar em espera longa se a caixa a jusante estiver cheia (`UP.waiting`).
- `UP.addStation({ slot, name, onDwell(l, s, dt), onMove(l, shift, dt) })` — `onDwell` é chamado a cada frame da paragem
  para a lima parada nesse slot, `s` = progresso 0..1 da paragem. Usa-o para mudar o aspecto da lima.
- `UP.limaAt(slot)`, `UP.limasIn(a, b)`, `UP.limas` (todas).
- Lima `l`: `l.g` (Group, posição `(x, 0, -420)`), comprimento ao longo de x centrado em `l.g`, espessura `P.h` em y
  (assenta em y = 2), largura `P.b` em z, espigão de 60 mm na ponta +x. Propriedades que controlam o aspecto:
  - `l.form` 0..1 — 0 = barra chata de aço bruta (secção RECTANGULAR — a lima nunca é redonda: 0.72·limaLen × 1.6·P.h × 0.9·P.b), ≥0.5 = forma de lima
    (afunilada, com espigão); entre 0.5 e 1 a lima "acha-se" (espessura de 2.4× a 1×).
  - `l.teeth` 0..1 — fracção do comprimento já picado (aparece uma camada de dentes desde a ponta).
  - `l.heat` 0..1 — incandescência (vermelho → laranja → amarelo). Mantém-se na lima de slot para slot.
  - Acabamento: `l.color` (THREE.Color), `l.metal`, `l.rough`. Usa `UP.blendFinish(l, nome, k)` com
    `nome ∈ raw | scale (escuro após têmpera em óleo) | tempered (revenido) | shot (granalha, cinza mate) | wet (jato húmido, cinza metálico)`.
  - `l.tested` (bool → marca verde no espigão), `l.hrc` (número), `l.finishName` (põe o nome do acabamento quando o terminares).
- `UP.guarantee(l)` corre sempre que a lima muda de slot e garante o estado mínimo depois de cada estação
  (forma completa a partir do slot 3, dentes a partir do 6, escura/sem calor a partir do 13/14, ensaiada a partir do 17,
  acabamento do jateamento no 20). A tua estação faz a transformação ANIMADA no seu slot; não dependas da garantia.

## Regiões (x) e slots
| Ficheiro | Estação | Região x | Slots |
|---|---|---|---|
| `src/55-a-laminagem.js` | 1 · Corte e laminagem — rolo de aço giratório (dá a forma da lima) | -9800 … -8720 | slot 1 (x = -9250); 0 e 2 de passagem |
| `src/55-b-picagem.js` | 2 · Picagem dos dentes (cinzel) | -8720 … -7670 | slot 4 (x = -8200) |
| `src/55-c-inducao.js` | 3 · Têmpera por indução até `P.indT` (1200 °C) → choque em água em `P.quenchT` (≈0,3 s) → revenido por indução | -7670 … -4520 | bobina no slot 9 (x = -6450); fosso sem esteira `UP.GAPS` x ∈ [-6280, -5590] com o tanque de água; a lima volta à esteira no slot 12 (x = -5400); revenido no slot 13 |
| `src/55-d-dureza.js` | 4 · Medição de dureza / rigidez (Rockwell HRC, força de ensaio em N) | -4520 … -3470 | slot 16 (x = -4000) |
| `src/55-e-jato.js` | 5 · Jateamento: granalha (cinza mate) ou jato húmido (cinza metálico) | -3470 … -2420 | slot 19 (x = -2950) |
Em z, mantém-te em `[-1250, 350]`.

## Testar a tua estação (obrigatório, repete até ficar bem)
```bash
cd "<pasta lima>"
node build.mjs --station=55-c-forno --out=/tmp/forno.html          # só a tua estação entre as 55-*
cat > /tmp/forno-act.json <<'EOF'
[["wait",3000],
 ["eval","(()=>{const s=window.__saccli;s.camera.position.set(-5600,900,700);s.controls.target.set(-6000,150,-420);s.controls.update();for(const id of ['hud','ctrl','charts','motors'])document.getElementById(id).classList.add('hidden');return 1})()"],
 ["wait",1500],["shot","/tmp/forno-1.png","body"],
 ["wait",1300],["shot","/tmp/forno-2.png","body"]]
EOF
node ~/.claude/skills/anatomy/scripts/drive.mjs /tmp/forno.html --actions /tmp/forno-act.json --width 1300 --height 820
```
- O resultado tem de terminar em `console: clean`. Lê as PNG com a ferramenta Read e critica-as como um engenheiro de fábrica.
- Inspeção: `window.__UP` (a linha), `window.__saccli.camera/controls`. Acelerar: `document.getElementById('speed').value=4; document.getElementById('speed').dispatchEvent(new Event('input'))`.
- Tira várias vistas (perto, de lado, de cima) e vários momentos (paragem a meio, avanço).
