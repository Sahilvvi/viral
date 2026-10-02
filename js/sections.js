// Lower-page choreography: work stack, services coverflow, live review room, process stage,
// platform marquees, vision cards and the launch form. Called once from main.js after fonts load.
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const range = (a, b, x) => clamp01((x - a) / (b - a));
const prand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // deterministic 0..1
const hoverable = matchMedia('(hover: hover)').matches;

// play a <video> only while its section is on screen
function playWhenVisible(video, trigger) {
  ScrollTrigger.create({
    trigger, start: 'top bottom', end: 'bottom top',
    onToggle: (st) => {
      if (st.isActive) { video.preload = 'auto'; video.play().catch(() => {}); } else video.pause();
    },
  });
}

// scroll velocity → marquee speed boost (shared)
function velocityBoost(tweens, skewTargets = []) {
  const proxy = { skew: 0 };
  const skewSetters = skewTargets.map((t) => gsap.quickSetter(t, 'skewX', 'deg'));
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = self.getVelocity() / 400;
      const boost = 1 + Math.min(6, Math.abs(v));
      tweens.forEach((tw) => { tw.timeScale(boost * Math.sign(v || 1)); gsap.to(tw, { timeScale: 1, duration: 1.2, ease: 'power2.out', overwrite: true }); });
      const sk = gsap.utils.clamp(-8, 8, v * -1.4);
      if (Math.abs(sk) > Math.abs(proxy.skew)) {
        proxy.skew = sk;
        gsap.to(proxy, { skew: 0, duration: .8, ease: 'power3', overwrite: true, onUpdate: () => skewSetters.forEach((s) => s(proxy.skew)) });
      }
    },
  });
}

// ---------------------------------------------------------------- WORK
function workFX() {
  const wt = gsap.to('.wt-track', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  velocityBoost([wt], ['.wt-track']);
  const cards = gsap.utils.toArray('.scard');
  cards.forEach((card, i) => {
    const media = card.querySelector('.scard-media');
    gsap.fromTo(media, { clipPath: 'inset(14% 12% 14% 12% round 28px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: card, start: 'top 95%', end: 'top 35%', scrub: true },
    });
    const img = card.querySelector('.sc-img');
    if (img) gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(card.querySelectorAll('.scard-meta > *'), { y: 40, opacity: 0, duration: .9, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 60%' } });
    // the card underneath recedes as the next one stacks over it
    if (i < cards.length - 1) {
      gsap.to(card, {
        scale: .9, y: -20, filter: 'brightness(.45) saturate(.7)', ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 15%', scrub: true },
      });
    }
  });
  const v = document.querySelector('.sc-phone video');
  if (v) playWhenVisible(v, '.sc-reel');
  // record timecode
  const tc = document.querySelector('.tc-num');
  let n = 0;
  if (tc) setInterval(() => { n = (n + 1) % 60; tc.textContent = String(n).padStart(2, '0'); }, 1000);
  // storyboard selection boxes hunt across the board
  const spots = [[8, 14], [40, 48], [66, 18], [22, 56], [70, 58], [40, 10]];
  gsap.utils.toArray('.sb-box').forEach((b, i) => {
    const tl = gsap.timeline({ repeat: -1, delay: i * .6 });
    for (let k = 1; k <= spots.length; k++) {
      const [x, y] = spots[(i * 2 + k) % spots.length];
      tl.to(b, { left: x + '%', top: y + '%', duration: 1.1, ease: 'power3.inOut' }).to(b, { scale: 1.06, duration: .2, yoyo: true, repeat: 1 }, '+=.6');
    }
  });
}

// ---------------------------------------------------------------- SERVICES (coverflow)
function servicesFX() {
  const track = document.getElementById('track');
  const cards = gsap.utils.toArray('.svc');
  const now = document.getElementById('svcNow');
  const bar = document.getElementById('svcBar');
  const ghost = document.querySelector('.svc-ghost');
  let active = -1;
  const flow = () => {
    const cx = innerWidth / 2;
    let best = 0, bestD = 1e9;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = (r.left + r.width / 2 - cx) / innerWidth;
      const ad = Math.min(1, Math.abs(d));
      gsap.set(c, { rotateY: gsap.utils.clamp(-38, 38, -d * 60), scale: 1 - ad * .16, opacity: 1 - ad * .55, z: -ad * 220 });
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
    });
    if (best !== active) {
      active = best;
      cards.forEach((c, i) => c.classList.toggle('active', i === best));
      now.textContent = String(best + 1).padStart(2, '0');
      gsap.fromTo(now, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .35, ease: 'power3.out' });
    }
  };
  gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth), ease: 'none',
    scrollTrigger: {
      trigger: '#services', start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true,
      onUpdate: (st) => { bar.style.transform = `scaleX(${st.progress})`; gsap.set(ghost, { xPercent: -st.progress * 40 }); },
    },
    onUpdate: flow,
  });
  flow();
  gsap.from('.gallery-head > *', { y: 40, opacity: 0, stagger: .1, duration: 1, scrollTrigger: { trigger: '#services', start: 'top 60%' } });
}

// ---------------------------------------------------------------- REVIEW ROOM (interactive)
function editorFX() {
  const $ = (id) => document.getElementById(id);
  const video = $('edVideo'), wrap = $('edWrap'), pinsEl = $('edPins'), list = $('edList'), markers = $('edMarkers');
  const head = $('edHead'), timeline = $('edTimeline'), timeEl = $('edTime'), playBtn = $('edPlay');
  const form = $('edForm'), input = $('edInput'), at = $('edAt'), count = $('edCount'), hint = $('edHint'), stage = $('edStage');
  const FPS = 30;
  let dur = 15, pending = null, selected = -1, dragging = false, userTouched = false;
  const tc = (t) => { const s = Math.floor(t), f = Math.floor((t - s) * FPS); return `00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };
  const short = (t) => `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * FPS)).padStart(2, '0')}`;
  const comments = [
    { t: 1.1, x: .5, y: .38, who: 'Aarav', c: '#ff3d9a', text: 'Hold the countdown ring a beat longer before the flash.' },
    { t: 3.7, x: .42, y: .52, who: 'Riya', c: '#8b5cff', text: 'This hook slaps — keep the light sweep on the glass.' },
    { t: 10.3, x: .55, y: .48, who: 'Kabir', c: '#2fd3a0', text: 'Can we also export a 4:5 for Meta feed?', done: false },
  ];
  // waveform
  const wave = $('edWave');
  for (let i = 0; i < 110; i++) { const b = document.createElement('i'); b.style.height = (20 + 80 * Math.abs(Math.sin(i * .37) * prand(i))) + '%'; wave.appendChild(b); }

  function render() {
    count.textContent = comments.filter((c) => !c.done).length;
    list.innerHTML = '';
    markers.innerHTML = '';
    pinsEl.innerHTML = '';
    comments.forEach((c, i) => {
      const li = document.createElement('li');
      li.className = (i === selected ? 'sel ' : '') + (c.done ? 'done' : '');
      li.innerHTML = `<span class="ava" style="--c:${c.c}">${c.who[0]}</span><div><div class="who">${c.who}<span class="mono">${short(c.t)}</span></div><div class="txt"></div></div><button class="res" type="button" aria-label="Resolve">✓</button>`;
      li.querySelector('.txt').textContent = c.text;
      li.addEventListener('click', () => { seek(c.t); video.pause(); selected = i; render(); });
      li.querySelector('.res').addEventListener('click', (e) => { e.stopPropagation(); c.done = !c.done; render(); });
      list.appendChild(li);
      const m = document.createElement('i'); m.style.left = (c.t / dur * 100) + '%'; m.style.setProperty('--c', c.c); markers.appendChild(m);
      const p = document.createElement('div'); p.className = 'pin'; p.dataset.i = i;
      p.style.left = c.x * 100 + '%'; p.style.top = c.y * 100 + '%'; p.style.setProperty('--c', c.c);
      p.innerHTML = `<b><span>${c.who === 'You' ? 'Y' : c.who[0]}</span></b>`;
      p.addEventListener('click', (e) => { e.stopPropagation(); selected = i; seek(c.t); video.pause(); render(); });
      pinsEl.appendChild(p);
    });
    if (pending) {
      const p = document.createElement('div'); p.className = 'pin pending hot';
      p.style.left = pending.x * 100 + '%'; p.style.top = pending.y * 100 + '%';
      p.innerHTML = '<b><span>+</span></b>';
      pinsEl.appendChild(p);
    }
    updatePins();
    const sel = list.querySelector('.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function updatePins() {
    const t = video.currentTime;
    pinsEl.querySelectorAll('.pin[data-i]').forEach((p) => {
      const c = comments[+p.dataset.i];
      p.classList.toggle('faded', !(Math.abs(c.t - t) < .9 || +p.dataset.i === selected) || c.done);
    });
  }
  function seek(t) { video.currentTime = Math.max(0, Math.min(dur - .01, t)); tick(); }
  function tick() {
    const t = video.currentTime || 0;
    head.style.left = (t / dur * 100) + '%';
    timeEl.textContent = tc(t);
    if (!pending) at.textContent = short(t);
    updatePins();
  }
  video.addEventListener('loadedmetadata', () => { dur = video.duration || 15; render(); });
  video.addEventListener('timeupdate', tick);
  video.addEventListener('play', () => playBtn.classList.add('on'));
  video.addEventListener('pause', () => playBtn.classList.remove('on'));
  gsap.ticker.add(() => { if (!video.paused) tick(); });
  playBtn.addEventListener('click', () => { userTouched = true; video.paused ? video.play() : video.pause(); });

  wrap.addEventListener('click', (e) => {
    const r = wrap.getBoundingClientRect();
    pending = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    userTouched = true;
    video.pause();
    at.textContent = short(video.currentTime);
    selected = -1;
    render();
    input.focus({ preventScroll: true });
    gsap.to(hint, { opacity: 0, duration: .3 });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    const pos = pending || { x: .5, y: .5 };
    comments.push({ t: video.currentTime, x: pos.x, y: pos.y, who: 'You', c: '#ff7a2f', text });
    comments.sort((a, b) => a.t - b.t);
    selected = comments.findIndex((c) => c.text === text && c.who === 'You');
    pending = null; input.value = '';
    render();
    const li = list.querySelector('.sel');
    if (li) gsap.from(li, { x: 30, opacity: 0, duration: .5, ease: 'back.out(2)' });
  });

  // scrubbable timeline
  const scrubTo = (e) => { const r = timeline.getBoundingClientRect(); seek(clamp01((e.clientX - r.left) / r.width) * dur); };
  timeline.addEventListener('pointerdown', (e) => { dragging = true; userTouched = true; video.pause(); timeline.setPointerCapture(e.pointerId); scrubTo(e); });
  timeline.addEventListener('pointermove', (e) => { if (dragging) scrubTo(e); });
  timeline.addEventListener('pointerup', () => { dragging = false; });

  // approve the cut
  const approve = $('edApprove');
  approve.addEventListener('click', () => {
    const on = !approve.classList.contains('done');
    approve.classList.toggle('done', on);
    approve.querySelector('.lbl').textContent = on ? 'Approved' : 'Approve v4';
    if (!on) return;
    const r = approve.getBoundingClientRect();
    const colors = ['#ff2d3d', '#ffb36b', '#ff3d9a', '#2bff88', '#8b5cff', '#fff'];
    for (let i = 0; i < 28; i++) {
      const d = document.createElement('i'); d.className = 'burst';
      d.style.background = colors[i % colors.length];
      d.style.left = r.left + r.width / 2 + 'px'; d.style.top = r.top + r.height / 2 + 'px';
      document.body.appendChild(d);
      const a = (i / 28) * Math.PI * 2, dist = 60 + prand(i) * 90;
      gsap.to(d, { x: Math.cos(a) * dist, y: Math.sin(a) * dist + 40, rotation: prand(i + 9) * 540, opacity: 0, duration: 1 + prand(i + 3) * .6, ease: 'power3.out', onComplete: () => d.remove() });
    }
  });

  // collaborator cursors drift between their own notes and the frame
  const cursors = gsap.utils.toArray('.collab .cursor');
  cursors.forEach((cur, i) => {
    let k = i;
    const move = () => {
      const sr = stage.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      k++;
      const mine = comments.filter((c) => c.who === ['Aarav', 'Riya', 'Kabir'][i]);
      let x, y;
      if (mine.length && k % 2) { x = wr.left - sr.left + mine[0].x * wr.width + 10; y = wr.top - sr.top + mine[0].y * wr.height + 6; }
      else { x = sr.width * (.12 + prand(k * 7 + i) * .76); y = sr.height * (.12 + prand(k * 13 + i) * .76); }
      gsap.to(cur, { x, y, duration: 1.4 + prand(k + i) * 1.4, ease: 'power2.inOut', onComplete: () => gsap.delayedCall(.4 + prand(k) * .8, move) });
    };
    gsap.set(cur, { x: stage.clientWidth * (.2 + i * .25), y: stage.clientHeight * (.25 + i * .18) });
    move();
  });

  gsap.from('#editor', { y: 80, opacity: 0, rotateX: 10, transformPerspective: 1400, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '#editor', start: 'top 85%' } });
  ScrollTrigger.create({
    trigger: '#editor', start: 'top 70%', end: 'bottom top',
    onToggle: (st) => { if (st.isActive) { video.preload = 'auto'; if (!userTouched) video.play().catch(() => {}); } else video.pause(); },
  });
  render();
  tick();
}

// ---------------------------------------------------------------- PROCESS (pinned stage)
function processFX() {
  const steps = gsap.utils.toArray('#procSteps li');
  const panels = gsap.utils.toArray('.pv');
  const dots = gsap.utils.toArray('.ps-dots i');
  const label = document.getElementById('psLabel');
  const bar = document.getElementById('procBar');
  const names = ['SCRIPT', 'STORYBOARD', 'GENERATION', 'POST', 'DELIVERY'];
  const docLines = gsap.utils.toArray('#procDoc p');
  const totalChars = docLines.reduce((n, p) => n + p.dataset.t.length, 0);
  const board = gsap.utils.toArray('.board figure');
  const gens = gsap.utils.toArray('.gen figure');
  const genBar = document.getElementById('genBar');
  const raw = document.getElementById('gradeRaw'), gline = document.getElementById('gradeLine');
  const mixer = document.getElementById('mixer');
  for (let i = 0; i < 18; i++) mixer.appendChild(document.createElement('i'));
  const mix = [...mixer.children];
  const dels = gsap.utils.toArray('.deliver figure');
  const toast = document.querySelector('.pv5 .toast');
  let cur = -1;

  const show = (i) => {
    if (i === cur) return;
    panels.forEach((p, k) => {
      if (k === i) gsap.fromTo(p, { autoAlpha: 0, y: 40, scale: .97 }, { autoAlpha: 1, y: 0, scale: 1, duration: .6, ease: 'power3.out', overwrite: true });
      else if (k === cur) gsap.to(p, { autoAlpha: 0, y: -30, duration: .35, ease: 'power2.in', overwrite: true });
      else gsap.set(p, { autoAlpha: 0 });
    });
    steps.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); });
    dots.forEach((d, k) => d.classList.toggle('on', k <= i));
    label.textContent = `0${i + 1} · ${names[i]}`;
    cur = i;
  };
  const scrubStep = (i, l) => {
    if (i === 0) {
      let n = Math.floor(l * 1.25 * totalChars);
      docLines.forEach((p) => {
        const t = p.dataset.t, k = Math.max(0, Math.min(t.length, n));
        p.textContent = t.slice(0, k);
        p.classList.toggle('caret', k > 0 && k < t.length);
        n -= t.length;
      });
    } else if (i === 1) {
      board.forEach((f, k) => { const v = range(k / 8, k / 8 + .2, l); gsap.set(f, { opacity: v, y: (1 - v) * 30, rotate: (1 - v) * (k % 2 ? 6 : -6), scale: .9 + v * .1 }); });
    } else if (i === 2) {
      gens.forEach((f, k) => { const v = range(.1 + k * .12, .45 + k * .12, l); gsap.set(f.querySelector('img'), { filter: `blur(${(1 - v) * 16}px) saturate(${.2 + v * .8})`, opacity: .35 + v * .65 }); });
      genBar.style.transform = `scaleX(${range(.05, .85, l)})`;
      gens[2].classList.toggle('sel', l > .85);
    } else if (i === 3) {
      const x = 100 - range(.05, .9, l) * 100;
      raw.style.clipPath = `inset(0 ${100 - x}% 0 0)`;
      gline.style.left = x + '%';
      mix.forEach((b, k) => { b.style.height = (15 + 80 * Math.abs(Math.sin(k * .9 + l * 14)) * (.5 + prand(k) * .5)) + '%'; });
    } else if (i === 4) {
      dels.forEach((f, k) => { const v = range(k * .2, k * .2 + .25, l); gsap.set(f, { opacity: v, scale: .6 + v * .4, y: (1 - v) * 40 }); gsap.set(f.querySelector('i'), { scale: range(k * .2 + .2, k * .2 + .3, l) }); });
      const tv = range(.7, .85, l); gsap.set(toast, { opacity: tv, y: (1 - tv) * 20 });
    }
  };
  ScrollTrigger.create({
    trigger: '#process', start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      const p = st.progress;
      const i = Math.min(4, Math.floor(p * 5));
      show(i);
      scrubStep(i, clamp01(p * 5 - i));
      bar.style.transform = `scaleX(${p})`;
    },
  });
  show(0); scrubStep(0, 0);
  gsap.from('.proc-left > *:not(ol)', { y: 40, opacity: 0, stagger: .1, duration: 1, scrollTrigger: { trigger: '#process', start: 'top 60%' } });
  gsap.from('#procStage', { y: 80, opacity: 0, scale: .95, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '#process', start: 'top 60%' } });
}

// ---------------------------------------------------------------- PLATFORMS
function platformsFX() {
  const words = gsap.utils.toArray('#platTicker span');
  const tl = gsap.timeline({ repeat: -1 });
  words.forEach((w) => {
    tl.fromTo(w, { yPercent: 110 }, { yPercent: 0, duration: .55, ease: 'back.out(1.6)' })
      .to(w, { yPercent: -110, duration: .4, ease: 'power3.in' }, '+=1.1');
  });
  const r1 = document.querySelector('#mrow1 .mtrack'), r2 = document.querySelector('#mrow2 .mtrack');
  r1.innerHTML += r1.innerHTML; r2.innerHTML += r2.innerHTML;
  const t1 = gsap.to(r1, { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
  const t2 = gsap.fromTo(r2, { xPercent: -50 }, { xPercent: 0, duration: 44, ease: 'none', repeat: -1 });
  velocityBoost([t1, t2], [r1, r2]);
  gsap.from('.plat-head > *', { y: 40, opacity: 0, stagger: .1, duration: 1, scrollTrigger: { trigger: '#platforms', start: 'top 70%' } });
  gsap.from('.mrow', { x: (i) => (i ? 200 : -200), opacity: 0, duration: 1.2, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '#platforms', start: 'top 60%' } });
}

// ---------------------------------------------------------------- VISION
function visionFX() {
  // crew → team: a scattered crew of dots converges into a tight team of five, and back
  const box = document.getElementById('vCrew');
  const dots = [];
  for (let i = 0; i < 30; i++) { const d = document.createElement('i'); box.appendChild(d); dots.push(d); }
  const place = () => {
    const w = box.clientWidth, h = box.clientHeight;
    dots.forEach((d, i) => gsap.set(d, { x: w * (.1 + (i % 6) * .16), y: h * (.18 + Math.floor(i / 6) * .16), opacity: .5 }));
    const tl = gsap.timeline({ repeat: -1, repeatDelay: .6, yoyo: true });
    dots.forEach((d, i) => {
      const k = i % 5, a = (k / 5) * Math.PI * 2;
      tl.to(d, { x: w / 2 + Math.cos(a) * 34, y: h / 2 + Math.sin(a) * 34, opacity: i < 5 ? 1 : 0, scale: i < 5 ? 1.8 : .4, background: i < 5 ? '#ff2d3d' : '#ff8a7a', duration: 1.2, ease: 'power3.inOut' }, .2 + prand(i) * .4);
    });
  };
  place();
  gsap.from('.vcard', { y: 100, rotateX: 28, opacity: 0, duration: 1.2, stagger: .15, ease: 'power3.out', transformOrigin: '50% 100%', scrollTrigger: { trigger: '.vision-grid', start: 'top 85%' } });
  gsap.utils.toArray('.vcard').forEach((c, i) => {
    gsap.fromTo(c, { y: 40 * (i - 1) }, { y: -40 * (i - 1), ease: 'none', scrollTrigger: { trigger: '.vision-grid', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

// spotlight + tilt for any .spot card
function spotlights() {
  if (!hoverable) return;
  document.querySelectorAll('.spot').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
      gsap.to(c, { rotateY: ((e.clientX - r.left) / r.width - .5) * 8, rotateX: -((e.clientY - r.top) / r.height - .5) * 8, transformPerspective: 1000, duration: .5 });
    });
    c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: .8, ease: 'elastic.out(1,.5)' }));
  });
}

// ---------------------------------------------------------------- FINAL CTA
function finalFX(setCat) {
  const words = gsap.utils.toArray('#finalTitle > span, #finalTitle > em');
  gsap.set('#finalTitle > em', { opacity: .15 });
  gsap.to(words, { opacity: 1, stagger: .2, ease: 'none', scrollTrigger: { trigger: '#finalTitle', start: 'top 85%', end: 'top 35%', scrub: true } });
  gsap.from('.final-sub, .contact', { y: 50, opacity: 0, stagger: .12, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '#contact', start: 'top 55%' } });
  gsap.from('.contact .chip', { scale: .6, opacity: 0, duration: .5, stagger: .03, ease: 'back.out(2)', scrollTrigger: { trigger: '.contact', start: 'top 75%' } });

  document.querySelectorAll('#cfCat .chip').forEach((c) => c.addEventListener('click', () => {
    document.querySelectorAll('#cfCat .chip').forEach((o) => o.classList.toggle('on', o === c));
    if (c.dataset.cat) setCat(c.dataset.cat, true);
  }));
  document.querySelectorAll('#cfPlat .chip').forEach((c) => c.addEventListener('click', () => c.classList.toggle('on')));

  const form = document.getElementById('contactForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    // TODO(go-live): send the form (name, email, date, category, platforms) to the booking tool / inbox.
    const done = document.getElementById('cfDone'), num = document.getElementById('cfNum');
    gsap.timeline()
      .to('.launch-btn .rocket', { x: 260, y: -220, rotation: -20, opacity: 0, duration: .7, ease: 'power3.in' })
      .add(() => { done.hidden = false; })
      .fromTo(done, { opacity: 0 }, { opacity: 1, duration: .4 })
      .fromTo('.cf-ring circle', { strokeDashoffset: 326.7 }, { strokeDashoffset: 0, duration: 1.8, ease: 'none' }, '<')
      .to({ v: 3 }, { v: 0, duration: 1.8, ease: 'none', onUpdate() { num.textContent = String(Math.ceil(this.targets()[0].v)).padStart(2, '0'); } }, '<')
      .add(() => { num.textContent = 'GO'; })
      .from('.cf-done h3, .cf-done p', { y: 20, opacity: 0, stagger: .1, duration: .5 });
  });
}

export function initSections({ setCat }) {
  workFX();
  servicesFX();
  editorFX();
  processFX();
  platformsFX();
  visionFX();
  spotlights();
  finalFX(setCat);
}
