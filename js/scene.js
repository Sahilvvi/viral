// ViralX launch reactor: one Three.js scene reused by every scroll stage.
// Procedural only (no external models) so it loads instantly and stays on-brand.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const CARD_COUNT = 18;
export const CATS = {
  phone: { name: 'Smartphone', label: 'Gadget launch' },
  bottle: { name: 'Glow serum', label: 'Beauty launch' },
  buds: { name: 'Earbuds', label: 'Audio launch' },
  can: { name: 'Energy drink', label: 'Beverage launch' },
};

// ---------------------------------------------------------------- canvas helpers
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// ---------------------------------------------------------------- reel card textures
// Each card is a believable launch reel: lit studio backdrop, the real product render with a floor
// reflection, caption-box hook, creator header, action rail and music line. Product images load async;
// the card is drawn once without them and redrawn (needsUpdate) as soon as they arrive.
const KINDS = ['phone', 'bottle', 'buds', 'can'];
const LOOK = {
  phone: { bg: ['#1a0409', '#7d0d2a', '#ff5a3d'], accent: '#ff3d4d', handle: 'nova.mobile', word: 'NOVA' },
  bottle: { bg: ['#1e0613', '#9c2550', '#ffb3c6'], accent: '#ff6f9a', handle: 'vxlabs.skin', word: 'GLOW' },
  buds: { bg: ['#07061c', '#3d2aa8', '#c8b8ff'], accent: '#8b6bff', handle: 'pulse.audio', word: 'PULSE' },
  can: { bg: ['#1a0503', '#c2181f', '#ffb36b'], accent: '#ff8a2f', handle: 'volt.energy', word: 'VOLT' },
};
const HOOKS = [
  ['POV:', 'you found *it*'], ["It's finally", '*HERE*'], ['Wait for', 'the *drop*'], ['Launch day', 'is *today*'],
  ['Built', '*different*'], ['Unbox it', 'with *me*'], ['The one', 'everyone *wants*'], ['Zero sugar.', 'All *volt*.'],
  ['Sound', '*on*'], ['Meet', 'the *new* one'], ['Tap in', 'before it *sells*'], ['This changes', '*everything*'],
  ['Watch', 'till the *end*'], ['Made for', '*launch* day'], ['Glow', 'in *60* seconds'], ['Pre-order', 'is *live*'],
  ['First look', 'in *4K*'], ['You asked.', 'We *built* it'],
];
let productImages = null;
function loadProductImages() {
  if (productImages) return productImages;
  const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  productImages = Promise.all(KINDS.flatMap((k) => ['hero', 'alt'].map((a) => load(`assets/products/product-${k}-${a}.webp`).then((im) => [`${k}-${a}`, im]))))
    .then((pairs) => Object.fromEntries(pairs));
  return productImages;
}
function drawCaption(ctx, lines, cx, y, accent) {
  // TikTok-style caption: each line on its own rounded box; *word* gets the accent box
  ctx.font = '800 40px Inter Tight, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  lines.forEach((line, li) => {
    const parts = line.split(/(\*[^*]+\*)/).filter(Boolean);
    const widths = parts.map((p) => ctx.measureText(p.replace(/\*/g, '')).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const lh = 62, ly = y + li * (lh + 8);
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    rr(ctx, cx - total / 2 - 20, ly - lh / 2, total + 40, lh, 14); ctx.fill();
    let x = cx - total / 2;
    parts.forEach((p, pi) => {
      const hot = p.startsWith('*');
      const t = p.replace(/\*/g, '');
      if (hot) { ctx.fillStyle = accent; rr(ctx, x - 6, ly - lh / 2 + 7, widths[pi] + 12, lh - 14, 10); ctx.fill(); }
      ctx.fillStyle = hot ? '#fff' : '#120a10';
      ctx.textAlign = 'left'; ctx.fillText(t, x, ly + 2);
      x += widths[pi];
    });
  });
  ctx.textBaseline = 'alphabetic';
}
function icon(ctx, kind, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 10;
  ctx.beginPath();
  if (kind === 'heart') { ctx.moveTo(0, 14); ctx.bezierCurveTo(-26, -4, -14, -26, 0, -12); ctx.bezierCurveTo(14, -26, 26, -4, 0, 14); ctx.fill(); }
  else if (kind === 'chat') { ctx.ellipse(0, -2, 20, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-16, 22); ctx.lineTo(0, 13); ctx.fill(); }
  else if (kind === 'share') { ctx.moveTo(-18, 14); ctx.quadraticCurveTo(-14, -8, 8, -8); ctx.lineTo(8, -18); ctx.lineTo(24, -2); ctx.lineTo(8, 14); ctx.lineTo(8, 4); ctx.quadraticCurveTo(-8, 2, -18, 14); ctx.fill(); }
  else if (kind === 'save') { ctx.moveTo(-14, -18); ctx.lineTo(14, -18); ctx.lineTo(14, 20); ctx.lineTo(0, 8); ctx.lineTo(-14, 20); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawCard(ctx, i, imgs) {
  const W = 540, H = 960;
  const kind = KINDS[i % 4], L = LOOK[kind];
  const img = imgs && imgs[`${kind}-${Math.floor(i / 4) % 2 ? 'alt' : 'hero'}`];
  ctx.clearRect(0, 0, W, H);
  ctx.save(); rr(ctx, 4, 4, W - 8, H - 8, 44); ctx.clip();
  // studio backdrop: wall + floor split at the horizon
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, L.bg[0]); g.addColorStop(.66, L.bg[1]); g.addColorStop(.67, L.bg[0]); g.addColorStop(1, '#050306');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, H * .46, 20, W / 2, H * .46, W * .75);
  g.addColorStop(0, L.bg[2] + 'cc'); g.addColorStop(.45, L.bg[1] + '66'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // ghost brand word texture
  ctx.save(); ctx.globalAlpha = .1; ctx.fillStyle = '#fff'; ctx.font = 'italic 900 150px Inter Tight, Arial Black, sans-serif'; ctx.textAlign = 'center';
  for (let r = 0; r < 4; r++) ctx.fillText(L.word, W / 2 + (r % 2 ? 60 : -60), 300 + r * 140);
  ctx.restore();
  // light streak
  g = ctx.createLinearGradient(0, 0, W, H * .6);
  g.addColorStop(.35, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // floor glow + contact shadow
  g = ctx.createRadialGradient(W / 2, H * .7, 10, W / 2, H * .7, 260);
  g.addColorStop(0, L.bg[2] + '88'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, H * .6, W, H * .3);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(W / 2, H * .73, 150, 20, 0, 0, Math.PI * 2); ctx.fill();
  // product + reflection
  if (img) {
    const ph = H * .39, pw = ph * img.width / img.height, s = Math.min(1, (W * .7) / pw);
    const dw = pw * s, dh = ph * s, dx = (W - dw) / 2, dy = H * .725 - dh;
    ctx.save(); ctx.shadowColor = L.accent; ctx.shadowBlur = 50; ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
    const rc = document.createElement('canvas'); rc.width = Math.ceil(dw); rc.height = Math.ceil(dh * .35);
    const r2 = rc.getContext('2d');
    r2.translate(0, dh); r2.scale(1, -1); r2.drawImage(img, 0, 0, dw, dh);
    r2.setTransform(1, 0, 0, 1, 0, 0); r2.globalCompositeOperation = 'destination-in';
    const fg = r2.createLinearGradient(0, 0, 0, rc.height); fg.addColorStop(0, 'rgba(0,0,0,.28)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    r2.fillStyle = fg; r2.fillRect(0, 0, rc.width, rc.height);
    ctx.drawImage(rc, dx, H * .725 + 4);
  }
  // shades for UI legibility
  g = ctx.createLinearGradient(0, 0, 0, 230); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 230);
  g = ctx.createLinearGradient(0, H - 260, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.8)');
  ctx.fillStyle = g; ctx.fillRect(0, H - 260, W, 260);
  // story progress
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(ctx, 26 + k * 124, 26, 116, 6, 3); ctx.fill();
    if (k < (i % 4)) { ctx.fillStyle = '#fff'; rr(ctx, 26 + k * 124, 26, 116, 6, 3); ctx.fill(); }
    if (k === i % 4) { ctx.fillStyle = '#fff'; rr(ctx, 26 + k * 124, 26, 30 + (i * 23) % 80, 6, 3); ctx.fill(); }
  }
  // creator header
  g = ctx.createLinearGradient(30, 52, 86, 108); g.addColorStop(0, '#ffb36b'); g.addColorStop(.5, '#ff2d3d'); g.addColorStop(1, '#ff3d9a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(58, 80, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = L.bg[0]; ctx.beginPath(); ctx.arc(58, 80, 21, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '800 18px Inter Tight, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(L.word[0], 58, 87);
  ctx.textAlign = 'left'; ctx.font = '700 22px Inter Tight, Arial, sans-serif'; ctx.fillText(L.handle, 96, 76);
  ctx.font = '500 17px Inter Tight, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('Launch film · ViralX', 96, 98);
  ctx.fillStyle = L.accent; rr(ctx, W - 118, 60, 92, 38, 19); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '800 17px Inter Tight, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(i % 3 ? 'NEW' : '● LIVE', W - 72, 85);
  // hook
  drawCaption(ctx, HOOKS[i % HOOKS.length], W / 2, 196, L.accent);
  // action rail
  ['heart', 'chat', 'save', 'share'].forEach((k, n) => icon(ctx, k, W - 50, H * .5 + n * 78));
  // music disc
  ctx.save(); ctx.translate(W - 50, H - 70);
  ctx.fillStyle = '#18121a'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = L.accent; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // caption + music line
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 23px Inter Tight, Arial, sans-serif';
  ctx.fillText('@' + L.handle, 28, H - 116);
  ctx.font = '500 20px Inter Tight, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.fillText('The launch everyone is talking about', 28, H - 86);
  ctx.font = '500 18px Inter Tight, Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText('♪  original audio · launch mix', 28, H - 54);
  ctx.restore();
  // rim
  rr(ctx, 4, 4, W - 8, H - 8, 44); ctx.lineWidth = 4;
  g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, L.accent);
  ctx.strokeStyle = g; ctx.stroke();
}
export function makeCardTexture(i, renderer) {
  const c = document.createElement('canvas');
  c.width = 540; c.height = 960;
  const ctx = c.getContext('2d');
  drawCard(ctx, i, null);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.userData.ready = Promise.all([loadProductImages(), document.fonts.ready]).then(([imgs]) => { drawCard(ctx, i, imgs); tex.needsUpdate = true; });
  return tex;
}

function screenTexture() {
  const W = 400, H = 820, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  let g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0614'); g.addColorStop(.5, '#a3123a'); g.addColorStop(1, '#ff6a3d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, H * .45, 10, W / 2, H * .45, 260);
  g.addColorStop(0, 'rgba(255,220,200,.9)'); g.addColorStop(1, 'rgba(255,220,200,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = '900 120px Inter Tight, Arial Black, sans-serif'; ctx.fillText('VX', W / 2, H * .5);
  ctx.font = '600 30px Inter Tight, Arial, sans-serif'; ctx.fillText('LAUNCH DAY', W / 2, H * .5 + 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function labelTexture() {
  const W = 1024, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#ff2d3d'); g.addColorStop(.5, '#ff6a3d'); g.addColorStop(1, '#ff2d3d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#120408'; ctx.fillRect(0, H * .72, W, H * .28);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.font = 'italic 900 128px Inter Tight, Arial Black, sans-serif';
  ctx.fillText('VOLT', W * .25, H * .58); ctx.fillText('VOLT', W * .75, H * .58);
  ctx.font = '700 44px Inter Tight, Arial, sans-serif';
  ctx.fillText('ZERO SUGAR · LAUNCH EDITION', W / 2, H * .9);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.2, 'rgba(255,120,90,.8)');
  g.addColorStop(.5, 'rgba(255,45,61,.25)'); g.addColorStop(1, 'rgba(255,45,61,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- products
function buildProducts() {
  const products = {};
  // phone
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 3.1, 0.2, 6, 0.2),
      new THREE.MeshPhysicalMaterial({ color: 0x2b2630, metalness: .9, roughness: .28, clearcoat: 1, clearcoatRoughness: .1 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.94),
      new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }));
    screen.position.z = 0.102;
    const back = new THREE.Group();
    const camMat = new THREE.MeshPhysicalMaterial({ color: 0x0a080c, metalness: .5, roughness: .15, clearcoat: 1 });
    const bump = new THREE.Mesh(new RoundedBoxGeometry(.62, .62, .06, 4, .14), new THREE.MeshPhysicalMaterial({ color: 0x3a3440, metalness: .9, roughness: .3 }));
    bump.position.set(-.34, 1.08, -.12); back.add(bump);
    for (const [x, y] of [[-.48, 1.22], [-.2, 1.22], [-.48, .94]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .08, 24), camMat);
      l.rotation.x = Math.PI / 2; l.position.set(x, y, -.16); back.add(l);
    }
    g.add(body, screen, back);
    g.rotation.set(-.12, -.5, .18);
    products.phone = g;
  }
  // serum bottle: dropper bottle with real glass wall, liquid, ribbed gold collar, rubber bulb, pipette and wrap label
  {
    const g = new THREE.Group();
    // smooth outer silhouette (x = radius, y = height), sampled from a spline so the shoulder curves cleanly
    const outerCurve = new THREE.SplineCurve([
      new THREE.Vector2(0.001, -1.45), new THREE.Vector2(.5, -1.45), new THREE.Vector2(.7, -1.36), new THREE.Vector2(.76, -1.15),
      new THREE.Vector2(.76, .35), new THREE.Vector2(.72, .62), new THREE.Vector2(.52, .86), new THREE.Vector2(.3, .98),
      new THREE.Vector2(.27, 1.08), new THREE.Vector2(.27, 1.22),
    ]);
    const outer = outerCurve.getPoints(80);
    // inner wall: same curve pulled inward so the glass has visible thickness
    const inner = outer.map((p) => new THREE.Vector2(Math.max(.001, p.x - .07), p.y + (p.y < -1.3 ? .12 : 0))).reverse();
    const shell = [...outer, new THREE.Vector2(.21, 1.22), ...inner];
    // crisp "fake" glass: thin transparent shell with strong env reflections + fresnel rim (reads better than
    // transmission on a transparent canvas, where there is nothing behind the bottle to refract)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: .05, roughness: .03, transparent: true, opacity: .14, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 3, specularIntensity: 1, side: THREE.DoubleSide,
    });
    const glass = new THREE.Mesh(new THREE.LatheGeometry(shell, 96), glassMat);
    const rimMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xffc4d2) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uColor; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.6); gl_FragColor = vec4(uColor * f * 1.6, f); }',
    });
    const rim = new THREE.Mesh(new THREE.LatheGeometry(outer, 96), rimMat);
    rim.renderOrder = 4;
    glass.renderOrder = 3;
    // liquid follows the inner wall up to the fill line, then a flat meniscus
    const fillY = .42;
    const liq = inner.slice().reverse().filter((p) => p.y <= fillY).map((p) => new THREE.Vector2(Math.max(.001, p.x - .012), p.y));
    liq.push(new THREE.Vector2(liq[liq.length - 1].x, fillY), new THREE.Vector2(.001, fillY));
    const liquid = new THREE.Mesh(new THREE.LatheGeometry(liq, 96), new THREE.MeshPhysicalMaterial({
      color: 0xb3123a, roughness: .12, clearcoat: 1, clearcoatRoughness: .05, emissive: 0x6a0820, emissiveIntensity: .9,
      sheen: .35, sheenColor: new THREE.Color(0xff6a88), transparent: true, opacity: .96,
    }));
    // glass pipette dipping into the serum
    const pipMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .02, transparent: true, opacity: .35, envMapIntensity: 2.5, clearcoat: 1, depthWrite: false });
    const pipette = new THREE.Mesh(new THREE.CylinderGeometry(.075, .05, 2.2, 32, 1, true), pipMat);
    pipette.position.y = .1;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 8), liquid.material);
    drop.position.y = -1.0;
    // ribbed gold collar
    const collarGeo = new THREE.CylinderGeometry(.34, .34, .52, 160, 6);
    const pos = collarGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r > .2) { const k = (r + Math.sin(a * 60) * .008) / r; pos.setX(i, x * k); pos.setZ(i, z * k); }
    }
    collarGeo.computeVertexNormals();
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0b46a, metalness: 1, roughness: .2, clearcoat: .6, clearcoatRoughness: .15 });
    const collar = new THREE.Mesh(collarGeo, gold);
    collar.position.y = 1.44;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(.33, .035, 16, 96), gold);
    lip.rotation.x = Math.PI / 2; lip.position.y = 1.19;
    const lipTop = lip.clone(); lipTop.position.y = 1.7; lipTop.scale.setScalar(.92);
    // rubber bulb: lathe so it narrows at the waist and domes on top
    const bulbPts = new THREE.SplineCurve([
      new THREE.Vector2(.27, 1.7), new THREE.Vector2(.25, 1.82), new THREE.Vector2(.21, 1.95), new THREE.Vector2(.26, 2.15),
      new THREE.Vector2(.25, 2.38), new THREE.Vector2(.15, 2.55), new THREE.Vector2(.001, 2.6),
    ]).getPoints(40);
    const bulb = new THREE.Mesh(new THREE.LatheGeometry(bulbPts, 64), new THREE.MeshPhysicalMaterial({
      color: 0x1b1418, roughness: .42, clearcoat: .35, clearcoatRoughness: .4, sheen: 1, sheenColor: new THREE.Color(0x553040), sheenRoughness: .5,
    }));
    // wrap label on the front of the body
    const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 640;
    const x = lc.getContext('2d');
    x.fillStyle = '#f6efe9'; x.fillRect(0, 0, 1024, 640);
    x.fillStyle = '#ff2d3d'; x.fillRect(0, 0, 1024, 14); x.fillRect(0, 626, 1024, 14);
    x.fillStyle = '#1a0f14'; x.textAlign = 'center';
    x.font = '800 54px Inter Tight, Arial, sans-serif'; x.fillText('V X   L A B S', 512, 110);
    x.font = 'italic 400 190px Instrument Serif, Georgia, serif'; x.fillText('Glow', 512, 300);
    x.font = '700 58px Inter Tight, Arial, sans-serif'; x.fillText('SERUM', 512, 390);
    x.fillStyle = '#7a6a70'; x.font = '500 36px Inter Tight, Arial, sans-serif';
    x.fillText('Niacinamide 10%  ·  Hyaluronic', 512, 470); x.fillText('30 ml  /  1.0 fl oz', 512, 530);
    const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(.772, .772, 1.05, 96, 1, true, -1.15, 2.3),
      new THREE.MeshPhysicalMaterial({ map: lt, roughness: .55, clearcoat: .3, side: THREE.FrontSide }));
    label.position.y = -.42;
    g.add(liquid, pipette, drop, label, glass, rim, collar, lip, lipTop, bulb);
    g.position.y = -.35;
    g.scale.setScalar(.86);
    g.rotation.set(.06, 0, .14);
    products.bottle = g;
  }
  // earbuds: closed pebble case with two buds floating above it
  {
    const g = new THREE.Group();
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f2f5, roughness: .16, clearcoat: 1, clearcoatRoughness: .06, sheen: .3, sheenColor: new THREE.Color(0xffd6e0) });
    const caseMesh = new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.5, 1, 10, .48), white);
    // seam = a squashed copy of the case so its footprint keeps the rounded corners
    const seam = new THREE.Mesh(caseMesh.geometry, new THREE.MeshStandardMaterial({ color: 0x8e8792, roughness: .6 }));
    seam.scale.set(1.004, .012, 1.008); seam.position.y = .16;
    const led = new THREE.Mesh(new THREE.CircleGeometry(.05, 24), new THREE.MeshBasicMaterial({ color: 0xff2d3d, toneMapped: false }));
    led.position.set(0, -.15, .502);
    const ledGlow = new THREE.Mesh(new THREE.CircleGeometry(.12, 24), new THREE.MeshBasicMaterial({ color: 0xff2d3d, transparent: true, opacity: .25, toneMapped: false }));
    ledGlow.position.set(0, -.15, .501);
    const logo = new THREE.Mesh(new THREE.TorusGeometry(.13, .012, 8, 48), new THREE.MeshStandardMaterial({ color: 0xc9c2cc, metalness: .8, roughness: .3 }));
    logo.position.set(0, -.5, .505);
    g.add(caseMesh, seam, led, ledGlow, logo);
    const budMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: .7 });
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0xff2d3d, roughness: .3, clearcoat: 1 });
    for (const [x, y, z, rz, ry] of [[-.62, 1.55, .25, .5, .5], [.66, 1.3, .1, -.45, -.6]]) {
      const bud = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(.34, 48, 24), budMat);
      head.scale.set(1, .92, .9);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.17, 32, 16), tipMat);
      tip.scale.set(1, 1, .6); tip.position.set(0, .02, .3);
      const stem = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .62, 8, 24), budMat);
      stem.position.set(0, -.5, -.02);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .05, 24), capMat);
      cap.position.set(0, -.86, -.02);
      bud.add(head, tip, stem, cap);
      bud.position.set(x, y, z); bud.rotation.set(.1, ry, rz);
      g.add(bud);
    }
    g.position.y = -.35;
    g.rotation.set(.12, -.35, 0);
    products.buds = g;
  }
  // can
  {
    const g = new THREE.Group();
    const label = new THREE.MeshPhysicalMaterial({ map: labelTexture(), metalness: .6, roughness: .25, clearcoat: 1 });
    const alu = new THREE.MeshPhysicalMaterial({ color: 0xcfc8d0, metalness: 1, roughness: .2 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, 2.6, 64, 1, true), label);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.68, .82, .22, 64), alu); top.position.y = 1.41;
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(.82, .7, .2, 64), alu); bot.position.y = -1.4;
    const lidTop = new THREE.Mesh(new THREE.CircleGeometry(.68, 64), alu); lidTop.rotation.x = -Math.PI / 2; lidTop.position.y = 1.52;
    body.rotation.y = -1.45; // centre one "VOLT" on the camera at the hero angle
    g.add(body, top, bot, lidTop);
    g.rotation.set(.12, 0, -.22);
    products.can = g;
  }
  return products;
}

// ---------------------------------------------------------------- scene
export function createScene(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const key = new THREE.DirectionalLight(0xffe2d6, 2.2); key.position.set(4, 6, 6); scene.add(key);
  const rimR = new THREE.PointLight(0xff2d3d, 40, 18, 2); rimR.position.set(-4, 1, -2); scene.add(rimR);
  const rimV = new THREE.PointLight(0x8b5cff, 30, 18, 2); rimV.position.set(4, -2, -3); scene.add(rimV);

  // product rig: holder (stage pose) > spinner (idle spin) > products
  const holder = new THREE.Group();
  const spinner = new THREE.Group();
  holder.add(spinner);
  scene.add(holder);
  const products = buildProducts();
  for (const [k, p] of Object.entries(products)) {
    const wrap = new THREE.Group(); wrap.add(p); wrap.userData.k = k;
    wrap.scale.setScalar(k === 'phone' ? 1 : 0.0001);
    spinner.add(wrap); products[k] = wrap;
  }
  const glowTex = glowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 }));
  glow.scale.setScalar(7); glow.position.z = -1.2; holder.add(glow);

  // pedestal ring under product (hero)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, .015, 8, 160), new THREE.MeshBasicMaterial({ color: 0xff4d5d, transparent: true, opacity: .7, toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -2.1; holder.add(ring);
  const ring2 = ring.clone(); ring2.material = ring.material.clone(); ring2.scale.setScalar(1.35); ring2.material.opacity = .25; ring2.position.y = -2.1; holder.add(ring2);

  // cards
  const cardGeo = new THREE.PlaneGeometry(0.9, 1.6);
  const cards = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const m = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: makeCardTexture(i, renderer), transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
    m.renderOrder = 2;
    scene.add(m); cards.push(m);
  }

  // starfield
  const STARS = 1400;
  const sp = new Float32Array(STARS * 3), sc = new Float32Array(STARS * 3);
  const palette = [new THREE.Color(0xffffff), new THREE.Color(0xff6a7a), new THREE.Color(0xb48cff), new THREE.Color(0xffb36b)];
  for (let i = 0; i < STARS; i++) {
    const r = 14 + Math.random() * 40, th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
    sp.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * .7, r * Math.sin(ph) * Math.sin(th) - 20], i * 3);
    const c = palette[Math.random() < .6 ? 0 : 1 + (i % 3)]; sc.set([c.r, c.g, c.b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: .09, vertexColors: true, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(stars);

  // launch trail particles
  const TRAIL = 700;
  const tp = new Float32Array(TRAIL * 3), tc = new Float32Array(TRAIL * 3);
  const vel = new Float32Array(TRAIL * 3), life = new Float32Array(TRAIL).fill(0);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const trail = new THREE.Points(tg, new THREE.PointsMaterial({ size: .16, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  trail.frustumCulled = false;
  scene.add(trail);
  let head = 0;
  const hot = new THREE.Color(0xfff0d0), mid = new THREE.Color(0xff6a3d), cold = new THREE.Color(0x8a1530), tmpC = new THREE.Color();
  function emit(origin, rate, dt) {
    const n = Math.floor(rate * dt + Math.random());
    for (let k = 0; k < n; k++) {
      const i = head; head = (head + 1) % TRAIL;
      tp[i * 3] = origin.x + (Math.random() - .5) * .5; tp[i * 3 + 1] = origin.y; tp[i * 3 + 2] = origin.z + (Math.random() - .5) * .5;
      vel[i * 3] = (Math.random() - .5) * 1.6; vel[i * 3 + 1] = -3 - Math.random() * 4; vel[i * 3 + 2] = (Math.random() - .5) * 1.6;
      life[i] = 1;
    }
  }
  function stepTrail(dt) {
    for (let i = 0; i < TRAIL; i++) {
      if (life[i] <= 0) { tc[i * 3] = tc[i * 3 + 1] = tc[i * 3 + 2] = 0; continue; }
      life[i] -= dt * .9;
      tp[i * 3] += vel[i * 3] * dt; tp[i * 3 + 1] += vel[i * 3 + 1] * dt; tp[i * 3 + 2] += vel[i * 3 + 2] * dt;
      vel[i * 3] *= .985; vel[i * 3 + 2] *= .985;
      const l = Math.max(0, life[i]);
      if (l > .6) tmpC.copy(mid).lerp(hot, (l - .6) / .4); else tmpC.copy(cold).lerp(mid, l / .6);
      tmpC.multiplyScalar(l);
      tc[i * 3] = tmpC.r; tc[i * 3 + 1] = tmpC.g; tc[i * 3 + 2] = tmpC.b;
    }
    tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true;
  }

  // category swap
  let active = 'phone';
  function setCategory(k, gsap) {
    if (k === active) return;
    const from = products[active], to = products[k];
    active = k;
    gsap.to(from.scale, { x: .0001, y: .0001, z: .0001, duration: .45, ease: 'back.in(1.6)' });
    gsap.fromTo(to.scale, { x: .0001, y: .0001, z: .0001 }, { x: 1, y: 1, z: 1, duration: .9, delay: .35, ease: 'elastic.out(1, .6)' });
    gsap.fromTo(spinner.rotation, { y: spinner.rotation.y }, { y: spinner.rotation.y + Math.PI * 2, duration: 1.3, ease: 'power3.inOut' });
  }

  const cardsReady = Promise.all(cards.map((m) => m.material.map.userData.ready));
  return { scene, holder, spinner, glow, ring, ring2, cards, cardsReady, stars, emit, stepTrail, setCategory, products, getActive: () => active };
}
