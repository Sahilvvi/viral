import * as THREE from 'three';
import { createScene, CARD_COUNT, CATS } from './scene.js';
import { initSections } from './sections.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 768px)').matches;
gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) window.scrollTo(0, 0);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const range = (a, b, x) => clamp01((x - a) / (b - a));

// ---------------------------------------------------------------- smooth scroll
const lenis = new Lenis({ lerp: reduceMotion ? 0.14 : 0.085, wheelMultiplier: 0.95 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
window.__lenis = lenis;
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: id === '#launch' || id === '#tunnel' ? 0 : -20, duration: 1.6 });
  });
});
{
  const nav = document.getElementById('nav');
  let last = 0;
  ScrollTrigger.create({
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('hide', y > 500 && y > last);
      nav.classList.toggle('solid', y > 60);
      last = y;
    },
  });
}

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const R = createScene(renderer);
const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
let vw = canvas.clientWidth, vh = canvas.clientHeight;
function resize() { vw = canvas.clientWidth; vh = canvas.clientHeight; renderer.setSize(vw, vh, false); cam.aspect = vw / vh; cam.updateProjectionMatrix(); }
resize();
addEventListener('resize', () => { resize(); ScrollTrigger.refresh(); });
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });

// ---------------------------------------------------------------- stage poses
// Scroll maps to a continuous stage index s; each stage defines product / camera / card poses and we blend neighbours.
// 0 hero · 1 engine · 2 launch start · 3 launch end · 4 tunnel start · 5 tunnel end · 6 gone
const N = CARD_COUNT;
const TUNNEL_GAP = 2.5;
const TUNNEL_END_Z = 2 - N * TUNNEL_GAP - 4;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);
function lookQuat(from, to, out) { _m.lookAt(to, from, _up); return out.setFromRotationMatrix(_m); }

function productPose(k, t, wide) {
  switch (k) {
    case 0: return wide ? { p: [0, -4.15, 0], s: .8, glow: .6, ring: 1 } : { p: [0, -5.3, 0], s: .75, glow: .6, ring: 1 };
    case 1: return wide ? { p: [3.1, -.1, 0], s: 1.15, glow: .7, ring: .6 } : { p: [0, 2.2, 0], s: .8, glow: .6, ring: .5 };
    case 2: return wide ? { p: [.6, -1.6, 0], s: 1, glow: .7, ring: 0 } : { p: [0, -.6, 0], s: .8, glow: .7, ring: 0 };
    case 3: return { p: [wide ? .6 : 0, 9, -1], s: .9, glow: 1, ring: 0 };
    case 4: return { p: [0, 0, TUNNEL_END_Z], s: 1.5, glow: .7, ring: 0 };
    case 5: return { p: [0, -.2, TUNNEL_END_Z], s: 1.5, glow: .7, ring: 0 };
    default: return wide ? { p: [0, -.6, -5], s: 1.35, glow: .9, ring: 0 } : { p: [0, -1.2, -5], s: 1.2, glow: .9, ring: 0 };
  }
}
function cameraPose(k, wide) {
  const z = wide ? 12 : 17;
  switch (k) {
    case 0: return { p: [0, .4, z], l: [0, -.6, 0] };
    case 1: return { p: [0, 0, z], l: [0, 0, 0] };
    case 2: return { p: [0, .2, z], l: [0, 0, 0] };
    case 3: return { p: [0, 2.2, z], l: [0, 2.6, 0] };
    case 4: return { p: [0, 0, 10], l: [0, 0, 0] };
    case 5: return { p: [0, 0, TUNNEL_END_Z + 11], l: [0, 0, TUNNEL_END_Z] };
    default: return { p: [0, 0, wide ? 14 : 18], l: [0, 0, 0] };
  }
}
function cardPose(k, i, t, wide, out) {
  const p = out.p, q = out.q;
  let s = 1, o = 1;
  switch (k) {
    case 0: case 1: {
      const center = k === 0 ? (wide ? [0, -4, 0] : [0, -5.1, 0]) : (wide ? [3.1, -.1, 0] : [0, 2.2, 0]);
      const R = k === 0 ? (wide ? 5.8 : 3.8) : (wide ? 3 : 2.4);
      const a = i / N * Math.PI * 2 + t * (k === 0 ? .1 : .16);
      const tilt = k === 0 ? .19 : .5;
      p.set(center[0] + Math.cos(a) * R, center[1] + Math.sin(a) * R * tilt * .55 + Math.sin(a * 2 + t) * .08, center[2] + Math.sin(a) * R * (k === 0 ? .7 : .5));
      q.copy(cam.quaternion); _e.set(0, 0, Math.sin(a) * .12); _q.setFromEuler(_e); q.multiply(_q);
      s = k === 0 ? .95 : .55;
      o = k === 0 ? .95 : .8;
      break;
    }
    case 2: case 3: {
      const cols = N / 2, row = i % 2, col = Math.floor(i / 2);
      const phi = (col / (cols - 1) - .5) * (wide ? 2.3 : 1.6);
      const Rr = wide ? 10 : 9;
      const y = (row ? -1.25 : 1.25) * (k === 2 ? 1.15 : 1.15) + (k === 3 ? 2.4 : 0);
      p.set(Math.sin(phi) * Rr, y, 4 - Math.cos(phi) * Rr);
      lookQuat(p, new THREE.Vector3(0, y, 4), q);
      s = 1.45; o = k === 2 ? .35 : .9;
      break;
    }
    case 6: case 7: case 8: {
      // finale: the reels form a slow portal around the launch form
      const a = i / N * Math.PI * 2 + t * .07;
      p.set(Math.cos(a) * (wide ? 7.4 : 4.2), Math.sin(a) * (wide ? 4.6 : 6.6), -2 + Math.sin(a * 2 + t * .5) * .6);
      q.copy(cam.quaternion); _e.set(0, 0, Math.cos(a) * .15); _q.setFromEuler(_e); q.multiply(_q);
      s = wide ? 1.05 : .9; o = .9;
      break;
    }
    default: {
      const th = i * .85 + (k === 5 ? .4 : 0);
      const r = wide ? 2.9 : 2.2;
      p.set(Math.cos(th) * r * (wide ? 1.35 : 1), Math.sin(th) * r, 2 - i * TUNNEL_GAP);
      _e.set(0, 0, th + Math.PI / 2 + (i % 2 ? .1 : -.1)); q.setFromEuler(_e);
      s = 1.15; o = k >= 6 ? 0 : 1;
    }
  }
  out.s = s; out.o = o;
  return out;
}

// anchors (scroll px) for each stage
let anchors = [0, 1, 2, 3, 4, 5, 6];
const top = (el) => el.getBoundingClientRect().top + scrollY;
function computeAnchors() {
  const H = innerHeight;
  const eng = document.getElementById('engine'), lau = document.getElementById('launch'), tun = document.getElementById('tunnel');
  const a1 = top(eng) + eng.offsetHeight / 2 - H / 2;
  const a2 = top(lau), a3 = top(lau) + lau.offsetHeight - H;
  const a4 = top(tun), a5 = top(tun) + tun.offsetHeight - H;
  const con = document.getElementById('contact');
  const a8 = top(con) + H * .3;
  anchors = [0, a1, a2 + H * .05, a3, a4, a5, a5 + H * .9, a8 - H * .65, a8];
}
ScrollTrigger.addEventListener('refresh', computeAnchors);
computeAnchors();
function stageIndex(y) {
  if (y <= anchors[0]) return 0;
  for (let k = 0; k < anchors.length - 1; k++) {
    if (y < anchors[k + 1]) return k + (y - anchors[k]) / Math.max(1, anchors[k + 1] - anchors[k]);
  }
  return anchors.length - 1;
}

// ---------------------------------------------------------------- render loop
const A = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1, o: 1 };
const B = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1, o: 1 };
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), l1 = new THREE.Vector3(), l2 = new THREE.Vector3();
const lerpArr = (a, b, f, out) => out.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
const prevHolder = new THREE.Vector3();
let missionDim = 0;
const introZoom = { v: 1 };
let sSmooth = 0;
let last = performance.now();
const clock0 = performance.now();

function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const t = (now - clock0) / 1000;
  const wide = vw > 960;
  const sRaw = stageIndex(lenis.animatedScroll ?? scrollY);
  // big jumps (nav links, resume) snap instead of flying through every stage in between
  if (Math.abs(sRaw - sSmooth) > 1.2) sSmooth = sRaw;
  else sSmooth += (sRaw - sSmooth) * Math.min(1, dt * 8);
  const s = sSmooth;
  mouse.sx += (mouse.x - mouse.sx) * .05; mouse.sy += (mouse.y - mouse.sy) * .05;

  // visible through the tunnel, gone for the middle of the page, back for the finale
  const vis = s < 5 ? 1 : s < 6 ? 1 - (s - 5) : s < 7 ? 0 : clamp01(s - 7);
  const opacity = (1 - missionDim * .8) * vis;
  canvas.style.opacity = opacity.toFixed(3);
  if (opacity <= 0.001) { requestAnimationFrame(frame); return; }

  const k = Math.min(7, Math.floor(s)), f = smooth(s - k), k2 = Math.min(8, k + 1);

  // camera
  const c1 = cameraPose(k, wide), c2 = cameraPose(k2, wide);
  lerpArr(c1.p, c2.p, f, cam.position);
  lerpArr(c1.l, c2.l, f, l1);
  cam.position.z += introZoom.v * 14;
  cam.position.x += mouse.sx * .5; cam.position.y -= mouse.sy * .35;
  cam.lookAt(l1);
  cam.fov = 35; cam.updateProjectionMatrix();

  // product
  const p1 = productPose(k, t, wide), p2 = productPose(k2, t, wide);
  prevHolder.copy(R.holder.position);
  lerpArr(p1.p, p2.p, f, R.holder.position);
  // launch: ease the climb so it accelerates like a rocket
  if (s > 2 && s < 3) {
    const lp = s - 2;
    const climb = Math.pow(range(.62, 1, lp), 2.2);
    const pa = productPose(2, t, wide).p, pb = productPose(3, t, wide).p;
    R.holder.position.set(pa[0], pa[1] + (pb[1] - pa[1]) * climb + Math.sin(t * 40) * .02 * range(.45, .62, lp), pa[2] + (pb[2] - pa[2]) * climb);
  }
  R.holder.position.y += Math.sin(t * 1.1) * .08;
  R.holder.scale.setScalar(p1.s + (p2.s - p1.s) * f);
  R.holder.rotation.y = Math.sin(t * .45) * .75 + mouse.sx * .35;
  R.holder.rotation.x = mouse.sy * .1;
  R.glow.material.opacity = (p1.glow + (p2.glow - p1.glow) * f) * (R.getActive() === 'bottle' ? .4 : 1);
  R.glow.material.rotation = t * .1;
  R.ring.material.opacity = (p1.ring + (p2.ring - p1.ring) * f) * .7;
  R.ring2.material.opacity = (p1.ring + (p2.ring - p1.ring) * f) * .25;
  R.ring.rotation.z = t * .2;
  R.glow.quaternion.copy(cam.quaternion);

  // exhaust trail during the launch window
  if (s > 2.35 && s < 3.4) {
    const ignition = range(2.35, 2.62, s);
    v1.copy(R.holder.position); v1.y -= 1.5 * R.holder.scale.x;
    R.emit(v1, 520 * ignition, dt);
  }
  R.stepTrail(dt);

  // cards
  for (let i = 0; i < N; i++) {
    cardPose(k, i, t, wide, A); cardPose(k2, i, t, wide, B);
    // stagger card transitions a little for a more organic hand-off
    const fi = smooth(clamp01((s - k) * 1.25 - (i / N) * .25));
    const m = R.cards[i];
    m.position.lerpVectors(A.p, B.p, fi);
    m.quaternion.slerpQuaternions(A.q, B.q, fi);
    m.scale.setScalar(A.s + (B.s - A.s) * fi);
    m.material.opacity = A.o + (B.o - A.o) * fi;
    // in the launch window the wall lights up column by column after liftoff
    if (s > 2 && s < 3.2) {
      const col = Math.floor(i / 2) / (N / 2 - 1);
      const lit = range(.55 + Math.abs(col - .5) * .5, .8 + Math.abs(col - .5) * .5, s - 2);
      m.material.opacity = Math.max(m.material.opacity, .35 + lit * .65);
    }
  }
  R.stars.rotation.y = t * .01;
  renderer.render(R.scene, cam);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- category tabs + hero chip
const order = ['phone', 'bottle', 'buds', 'can'];
let catIdx = 0, userPicked = false;
const heroProduct = document.getElementById('heroProduct');
const engineCat = document.getElementById('engineCat');
const tabs = [...document.querySelectorAll('#catTabs button')];
function setCat(k, picked) {
  if (picked) userPicked = true;
  catIdx = order.indexOf(k);
  R.setCategory(k, gsap);
  tabs.forEach((b) => { b.classList.toggle('on', b.dataset.cat === k); b.setAttribute('aria-selected', b.dataset.cat === k); });
  gsap.timeline()
    .to([heroProduct, engineCat], { yPercent: -60, opacity: 0, duration: .22, ease: 'power2.in' })
    .add(() => { heroProduct.textContent = CATS[k].name; engineCat.textContent = CATS[k].label; })
    .fromTo([heroProduct, engineCat], { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .35, ease: 'power3.out' });
}
tabs.forEach((b) => b.addEventListener('click', () => { userPicked = true; setCat(b.dataset.cat); }));
setInterval(() => {
  if (userPicked || document.hidden || sSmooth > 1.6) return;
  setCat(order[(catIdx + 1) % order.length]);
}, 3600);

// ---------------------------------------------------------------- text helpers
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.append(w); return; }
          const o = document.createElement('span'); o.className = 'w';
          const i = document.createElement('span'); i.textContent = w; o.append(i); frag.append(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'svg') walk(n);
    });
  };
  walk(el);
  return el.querySelectorAll('.w > span');
}

// ---------------------------------------------------------------- intro
const loader = document.getElementById('loader');
document.body.classList.add('loading');
function intro() {
  const num = document.getElementById('loaderNum'), bar = document.getElementById('loaderBar');
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.to(o, { v: 100, duration: reduceMotion ? .4 : 1.3, ease: 'power2.inOut', onUpdate: () => { num.textContent = Math.round(o.v); bar.style.width = o.v + '%'; } })
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power4.inOut' })
    .add(() => { loader.remove(); document.body.classList.remove('loading'); }, '-=.1')
    .from('.hero-title .line > span', { yPercent: 110, duration: 1.1, stagger: .1, ease: 'power4.out' }, '-=.55')
    .from('.hero .reveal-up', { y: 30, opacity: 0, duration: .9, stagger: .08, ease: 'power3.out' }, '-=1.2')
    .from('.nav, .hero-chip, .scroll-hint', { opacity: 0, y: -10, duration: .8, stagger: .06 }, '-=.8')
    .to(introZoom, { v: 0, duration: 2.2, ease: 'power3.out' }, 1.1);
}

// ---------------------------------------------------------------- scroll choreography
function scrollFX() {
  // hero copy drifts up and fades as the reactor takes over
  gsap.to('.hero-copy', { yPercent: -25, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 30%', scrub: true } });
  gsap.to('.hero-chip', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: '30% top', end: '60% top', scrub: true } });

  // engine card
  gsap.from('.engine-card', { x: -60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '#engine', start: 'top 70%' } });
  gsap.from('.engine-card .spec-grid > div', { y: 24, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.spec-grid', start: 'top 85%' } });
  gsap.from('.engine-label', { opacity: 0, y: 20, duration: .8, scrollTrigger: { trigger: '#engine', start: 'top 40%' } });

  // launch sequence
  const steps = [...document.querySelectorAll('#launchSteps li')];
  const cdNum = document.getElementById('cdNum'), cdBar = document.getElementById('cdBar'), live = document.getElementById('launchLive');
  gsap.from('.launch-head > *', { y: 40, opacity: 0, stagger: .1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '#launch', start: 'top 60%' } });
  ScrollTrigger.create({
    trigger: '#launch', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      const p = st.progress;
      const idx = Math.min(3, Math.floor(p / .155));
      steps.forEach((li, i) => { li.classList.toggle('on', i === idx && p < .66); li.classList.toggle('done', i < idx || p >= .66); });
      const cd = Math.max(0, Math.ceil((1 - range(0, .62, p)) * 4));
      cdNum.textContent = String(cd).padStart(2, '0');
      cdBar.style.strokeDashoffset = 339.3 * (1 - range(0, .62, p));
      const l = range(.7, .8, p);
      live.style.opacity = l; live.style.transform = `translateY(${(1 - l) * 20}px)`;
    },
  });
  gsap.to('#countdown, .launch-head', { opacity: 0, y: -30, ease: 'none', scrollTrigger: { trigger: '#launch', start: '82% bottom', end: 'bottom bottom', scrub: true } });

  // mission: dim the 3D, highlight words as you read
  ScrollTrigger.create({
    trigger: '#mission', start: 'top 85%', end: 'bottom 15%',
    onUpdate: (st) => { missionDim = Math.sin(st.progress * Math.PI) ** .6; },
    onLeave: () => { missionDim = 0; }, onLeaveBack: () => { missionDim = 0; },
  });
  const mw = splitWords(document.getElementById('missionText'));
  mw.forEach((w) => w.parentElement.classList.add('w'));
  gsap.to(document.querySelectorAll('#missionText .w'), { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '#missionText', start: 'top 75%', end: 'bottom 40%', scrub: true } });
  gsap.from('.mission-cols p', { y: 30, opacity: 0, stagger: .12, duration: 1, scrollTrigger: { trigger: '.mission-cols', start: 'top 85%' } });

  // tunnel overlay
  const chips = gsap.utils.toArray('#tunnelChips span');
  ScrollTrigger.create({
    trigger: '#tunnel', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      const p = st.progress;
      gsap.set('.tt1', { opacity: 1 - range(.12, .28, p), scale: 1 + range(.12, .28, p) * .15 });
      chips.forEach((c, i) => {
        const a = .22 + i * .1;
        const v = range(a, a + .08, p) * (1 - range(.72, .8, p));
        gsap.set(c, { opacity: v, y: (1 - v) * 20 });
      });
      gsap.set('.tt2', { opacity: range(.82, .94, p), y: (1 - range(.82, .94, p)) * 30 });
    },
  });

  // generic split headings + reveals
  document.querySelectorAll('.split').forEach((h) => {
    const words = splitWords(h);
    gsap.from(words, { yPercent: 110, duration: 1, stagger: .045, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
  });
  // phone + floating cards
  gsap.fromTo('#phone', { rotateY: -24, rotateX: 10, y: 80 }, { rotateY: 14, rotateX: -4, y: -40, ease: 'none', scrollTrigger: { trigger: '#vex', start: 'top bottom', end: 'bottom top', scrub: true } });
  document.querySelectorAll('.float-card').forEach((c) => {
    gsap.fromTo(c, { y: 0 }, { y: () => parseFloat(c.dataset.speed) * innerHeight, ease: 'none', scrollTrigger: { trigger: '#vex', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(c, { opacity: 0, scale: .8, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '#vex', start: 'top 60%' } });
  });

}

// ---------------------------------------------------------------- micro-interactions
function micro() {
  if (matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.magnetic').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .4); });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
    document.querySelectorAll('.tilt').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        gsap.to(c, { rotateY: ((e.clientX - r.left) / r.width - .5) * 8, rotateX: -((e.clientY - r.top) / r.height - .5) * 8, transformPerspective: 1000, duration: .5 });
      });
      c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: .8, ease: 'elastic.out(1,.5)' }));
    });
  }

  // Vex chat
  const log = document.getElementById('vexLog');
  const answers = {
    'How fast can I launch?': 'Most launch films go from brief to master in 5–7 days. Teasers and reels can land sooner.',
    'What formats do I get?': 'Every cut in 9:16, 1:1 and 16:9 — hero film, teasers, hooks and ad variants, captioned and platform-ready.',
    'Do you do 3D renders?': 'Yes — photoreal 3D product renders, exploded views and turntables, blended right into your launch film.',
  };
  const bubble = (cls, text) => { const b = document.createElement('div'); b.className = 'bub ' + cls; b.textContent = text; log.append(b); gsap.from(b, { y: 12, opacity: 0, duration: .4 }); while (log.children.length > 4) log.firstChild.remove(); return b; };
  let busy = false;
  async function ask(q) {
    if (busy) return; busy = true;
    bubble('q', q);
    const a = bubble('a', '…');
    await new Promise((r) => setTimeout(r, 600));
    a.textContent = '';
    for (const ch of answers[q]) { a.textContent += ch; await new Promise((r) => setTimeout(r, 14)); }
    busy = false;
  }
  document.querySelectorAll('#vexQs button').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
  ScrollTrigger.create({ trigger: '#vexBox', start: 'top 75%', once: true, onEnter: () => ask('How fast can I launch?') });

  // reel: play when visible; fall back to a canvas loop if the HyperFrames render is missing
  const reel = document.getElementById('reel');
  const fallback = document.getElementById('reelFallback');
  const useFallback = () => {
    reel.style.display = 'none'; fallback.style.display = 'block';
    const ctx = fallback.getContext('2d');
    const imgs = R.cards.map((m) => m.material.map.image);
    let i = 0;
    const draw = () => { ctx.drawImage(imgs[i % imgs.length], -10, -10, 560, 1190); i++; };
    draw(); setInterval(draw, 900);
  };
  reel.addEventListener('error', useFallback, true);
  reel.querySelector('source').addEventListener('error', useFallback);
  ScrollTrigger.create({ trigger: '#vex', start: 'top bottom', end: 'bottom top', onToggle: (st) => { if (reel.style.display !== 'none') st.isActive ? reel.play().catch(() => {}) : reel.pause(); } });
}

// ---------------------------------------------------------------- boot
document.fonts.ready.then(() => {
  scrollFX();
  initSections({ setCat });
  micro();
  ScrollTrigger.refresh();
  computeAnchors();
  requestAnimationFrame(frame);
  intro();
});
