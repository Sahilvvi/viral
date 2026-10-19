// Shared behaviour for every page (homepage included): mobile menu, header auth state,
// newsletter, scroll reveals, filter chips and the contact form.
import { configured, currentUser, saveLead, subscribe } from './supabase.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------------- mobile menu
const menuBtn = $('[data-menu-btn]');
if (menuBtn) {
  const toggle = (open) => {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn.addEventListener('click', () => toggle(!document.body.classList.contains('menu-open')));
  $$('#mobileMenu a').forEach((a) => a.addEventListener('click', () => toggle(false)));
  addEventListener('keydown', (e) => e.key === 'Escape' && toggle(false));
}

// ---------------- sticky header on inner pages (the homepage handles its own in main.js)
const nav = $('#nav');
if (nav && document.body.classList.contains('page')) {
  const onScroll = () => nav.classList.toggle('solid', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---------------- header: swap Log in / Get started for Dashboard when signed in
if (configured) {
  currentUser().then((u) => {
    if (!u) return;
    $$('[data-guest]').forEach((el) => (el.hidden = true));
    $$('[data-user]').forEach((el) => (el.hidden = false));
  }).catch(() => {});
}

// ---------------- reveal on scroll
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
$$('.rv').forEach((el) => io.observe(el));

// ---------------- filter chips: <div class="filters" data-filter="#grid"> + items with data-tags="a b"
$$('[data-filter]').forEach((bar) => {
  const items = $$(bar.dataset.filter + ' [data-tags]');
  bar.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('.chip', bar).forEach((c) => c.classList.toggle('on', c === chip));
    const f = chip.dataset.f;
    items.forEach((it) => {
      const show = f === 'all' || it.dataset.tags.split(' ').includes(f);
      it.toggleAttribute('data-hide', !show);
      if (show) it.classList.add('in');
    });
  });
});

// ---------------- helpers for forms
export function msg(el, text, ok) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg ' + (ok ? 'ok' : 'err');
}

// ---------------- newsletter (footer)
$$('[data-newsletter]').forEach((form) => {
  const out = form.parentElement.querySelector('.form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return msg(out, 'Please enter a valid email.', false);
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      await subscribe(email, location.pathname);
      form.reset();
      msg(out, "You're in. First issue lands next month.", true);
    } catch (err) {
      msg(out, err.message || 'Something went wrong — please try again.', false);
    } finally { btn.disabled = false; }
  });
});

// ---------------- contact page form
const cform = $('#contactPageForm');
if (cform) {
  const out = $('#contactMsg');
  $$('.chips.pick', cform).forEach((g) => g.addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    if (g.dataset.multi) c.classList.toggle('on');
    else $$('.chip', g).forEach((o) => o.classList.toggle('on', o === c));
  }));
  cform.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!cform.reportValidity()) return;
    const fd = new FormData(cform);
    const lead = {
      name: fd.get('name'), email: fd.get('email'), company: fd.get('company') || null,
      category: $('[data-group="category"] .chip.on', cform)?.textContent || null,
      platforms: $$('[data-group="platforms"] .chip.on', cform).map((c) => c.textContent),
      budget: fd.get('budget') || null, launch_date: fd.get('launch_date') || null,
      message: fd.get('message') || null, source: 'contact-page',
    };
    const btn = cform.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const how = await saveLead(lead);
      if (how === 'saved') { cform.reset(); msg(out, "Thanks — we've got your brief. Expect a reply within one working day.", true); }
    } catch (err) {
      msg(out, 'Could not send: ' + (err.message || 'unknown error') + '. You can also email us directly.', false);
    } finally { btn.disabled = false; }
  });
}
