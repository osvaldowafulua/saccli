// =====================================================================
// Arranque: Three.js r160 vem embutido na página (funciona sem internet)
// =====================================================================
const THREE = window.THREE;   // carregado pelo script clássico embutido antes deste módulo

// Controlo de órbita próprio (rodar, mover, zoom; rato e toque), sem dependências externas
class Orbit {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom; this.target = new THREE.Vector3();
    this.enableDamping = true; this.damping = 0.14;
    this.minDistance = 100; this.maxDistance = 14000; this.minPolarAngle = 0.03; this.maxPolarAngle = Math.PI * 0.48;
    this.sph = new THREE.Spherical(); this.dTheta = 0; this.dPhi = 0; this.zoom = 1; this.pan = new THREE.Vector3();
    const st = { mode: null, x: 0, y: 0, pts: new Map(), dist: 0 };
    dom.style.touchAction = "none";
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener("pointerdown", (e) => {
      dom.setPointerCapture(e.pointerId);
      st.pts.set(e.pointerId, [e.clientX, e.clientY]);
      st.mode = e.button === 2 || e.shiftKey || st.pts.size === 2 ? "pan" : "rot";
      st.x = e.clientX; st.y = e.clientY;
      if (st.pts.size === 2) { const [a, b] = [...st.pts.values()]; st.dist = Math.hypot(a[0] - b[0], a[1] - b[1]); }
    });
    dom.addEventListener("pointermove", (e) => {
      if (!st.pts.has(e.pointerId)) return;
      st.pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (st.pts.size === 2) { const [a, b] = [...st.pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (st.dist) this.zoom *= st.dist / Math.max(1, d); st.dist = d; }
      const dx = e.clientX - st.x, dy = e.clientY - st.y; st.x = e.clientX; st.y = e.clientY;
      if (st.mode === "rot" && st.pts.size === 1) { this.dTheta -= (2 * Math.PI * dx) / dom.clientHeight; this.dPhi -= (2 * Math.PI * dy) / dom.clientHeight; }
      else if (st.mode === "pan") this.panBy(dx, dy);
    });
    const up = (e) => { st.pts.delete(e.pointerId); if (!st.pts.size) st.mode = null; st.dist = 0; };
    dom.addEventListener("pointerup", up); dom.addEventListener("pointercancel", up);
    dom.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom *= Math.pow(0.95, -e.deltaY / 40); }, { passive: false });
  }
  panBy(dx, dy) {
    const dist = this.camera.position.distanceTo(this.target) * Math.tan((this.camera.fov / 2) * Math.PI / 180);
    this.camera.updateMatrix();
    const left = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    this.pan.addScaledVector(left, (-2 * dx * dist) / this.dom.clientHeight).addScaledVector(up, (2 * dy * dist) / this.dom.clientHeight);
  }
  update() {
    const off = this.camera.position.clone().sub(this.target);
    this.sph.setFromVector3(off);
    const k = this.enableDamping ? this.damping : 1;
    this.sph.theta += this.dTheta * k; this.sph.phi += this.dPhi * k;
    this.sph.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.sph.phi));
    this.sph.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.sph.radius * Math.pow(this.zoom, k)));
    this.target.addScaledVector(this.pan, k);
    off.setFromSpherical(this.sph);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
    this.dTheta *= 1 - k; this.dPhi *= 1 - k; this.zoom = Math.pow(this.zoom, 1 - k); this.pan.multiplyScalar(1 - k);
  }
}

// Ambiente de reflexos (sala simples com painéis de luz), substitui o RoomEnvironment
function makeEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 30), new THREE.MeshBasicMaterial({ color: 0x80868e, side: THREE.BackSide }));
  env.add(room);
  const glow = (c, s) => { const m = new THREE.MeshBasicMaterial({ color: c }); m.color.multiplyScalar(s); return m; };
  for (const [x, z, w, d] of [[0, 0, 10, 3], [-8, 6, 4, 2], [8, -6, 4, 2], [-8, -6, 3, 3]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), glow(0xffffff, 6)); p.position.set(x, 5.9, z); env.add(p);
  }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 12), glow(0xdfe7f0, 2.2)); wall.position.set(14.9, 1, 0); env.add(wall);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.1, 30), new THREE.MeshBasicMaterial({ color: 0x3a3d42 })); floor.position.y = -5.9; env.add(floor);
  return new THREE.PMREMGenerator(renderer).fromScene(env, 0.04).texture;
}

// =====================================================================
// Mundo: registo de sistemas animados, etiquetas e vistas (usado por todas as estações)
// =====================================================================
const World = { systems: [], views: [], tags: [] };
// sistema: { update(dt) — só corre sem pausa, dt já escalado pela velocidade; draw(dt) — corre sempre }
function addSystem(s) { World.systems.push(s); return s; }
// vista de câmara com botão no painel
function addView(key, label, pos, target) { World.views.push({ key, label, pos, target }); }
// etiqueta 3D: { text: string | () => string, at: () => Vector3, min?, max?, big?, when?: () => bool }
function addTag(t) {
  const el = document.createElement("div");
  el.className = "tag" + (t.big ? " big" : "");
  document.body.appendChild(el);
  const tag = { min: 0, max: Infinity, ...t, el };
  World.tags.push(tag);
  return tag;
}

// Ícones Lucide (SVG inline, traço 2 px, cor do texto) para os botões — sem emojis
const LUCIDE = {
  "book-open": '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>', "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>', pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
};
function icon(name) { return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUCIDE[name]}</svg>`; }
