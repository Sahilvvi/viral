// Dev-only: renders each product (transparent PNG) + every reel card texture and POSTs them to /save → ./export
import * as THREE from 'three';
import { createScene, CARD_COUNT } from './scene.js';

const log = (m) => { document.getElementById('log').textContent += '\n' + m; };
const W = 1200, H = 1800;
await document.fonts.load('900 40px "Inter Tight"'); await document.fonts.load('italic 40px "Instrument Serif"');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.setClearColor(0, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const R = createScene(renderer);
R.cards.forEach((c) => (c.visible = false));
R.stars.visible = false; R.glow.visible = false; R.ring.visible = false; R.ring2.visible = false;
const cam = new THREE.PerspectiveCamera(28, W / H, .1, 100);

const save = async (name, blob) => { await fetch('/save?name=' + name, { method: 'POST', body: blob }); log('saved ' + name); };
const toBlob = (cv) => new Promise((r) => cv.toBlob(r, 'image/png'));

const angles = { hero: -0.42, alt: 0.55 };
for (const k of ['phone', 'bottle', 'buds', 'can']) {
  for (const key of Object.keys(R.products)) R.products[key].scale.setScalar(key === k ? 1 : 0.0001);
  for (const [an, ry] of Object.entries(angles)) {
    R.holder.position.set(0, 0, 0); R.holder.scale.setScalar(1);
    R.holder.rotation.set(0.04, ry, 0);
    R.holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(R.products[k]);
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const fitH = size.y * 1.12 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    const fitW = size.x * 1.12 / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
    const d = Math.max(fitH, fitW) + size.z;
    cam.position.set(ctr.x, ctr.y + size.y * .06, ctr.z + d); cam.lookAt(ctr);
    renderer.render(R.scene, cam);
    await save(`product-${k}-${an}.png`, await toBlob(canvas));
  }
}
await R.cardsReady;
for (let i = 0; i < CARD_COUNT; i++) await save(`card-${String(i).padStart(2, '0')}.png`, await toBlob(R.cards[i].material.map.image));
log('DONE');
