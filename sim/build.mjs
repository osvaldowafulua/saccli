// Junta src/*.js e o Three.js embutido num único HTML autónomo: saccli-correcao-3d.html
// Uso: node build.mjs [--only=50-upstream,55-x]   (sem --only junta tudo)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "src");
const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) || "saccli-correcao-3d.html";
const only = process.argv.find((a) => a.startsWith("--station="))?.slice(10);   // testar uma estação isolada: só essa entre as 55-*
const files = readdirSync(SRC).filter((f) => f.endsWith(".js") && (!only || !f.startsWith("55-") || f.startsWith(only))).sort();
const three = readFileSync(join(HERE, "vendor/three.module.min.js"), "utf8");
if (/<\/script/i.test(three)) throw new Error("three.js contém </script>");
let js = "";
for (const f of files) {
  const code = readFileSync(join(SRC, f), "utf8");
  if (/<\/script/i.test(code)) throw new Error(`${f} contém </script>`);
  js += `\n// ----- ${f} -----\n` + code;
}
// Three.js embutido como script clássico (sem blob:, sem import): o "export{a as B,...}" final vira um objecto global THREE
const ex = three.lastIndexOf("export{");
const body = three.slice(0, ex), list = three.slice(ex + 7, three.indexOf("}", ex));
const obj = list.split(",").map((e) => { const [a, b] = e.trim().split(/\s+as\s+/); return `${b || a}:${a}`; }).join(",");
const threeClassic = `window.THREE=(function(){"use strict";${body}\nreturn {${obj}};})();`;
const html =
  readFileSync(join(SRC, "00-head.html"), "utf8") +
  `<script>${threeClassic}</script>\n<script type="module">\n` +
  js +
  "\n" + readFileSync(join(SRC, "99-tail.html"), "utf8");
writeFileSync(resolve(HERE, out), html);
console.log(`wrote ${out} · ${files.length} partes · ${(html.length / 1024).toFixed(0)} KB`);
