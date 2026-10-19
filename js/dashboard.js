// Client portal: list your launch projects, submit a new brief, account settings.
import { sb, configured, currentUser } from './supabase.js';
import { msg } from './page.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STEPS = ['brief', 'production', 'review', 'delivered'];
const LABEL = { brief: 'Brief received', production: 'In production', review: 'In review', delivered: 'Delivered' };
const THUMB = { Gadget: 'phone', Beauty: 'bottle', Audio: 'buds', Beverage: 'can' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function main() {
  if (!configured) { $('#setupNote').hidden = false; $('#dashApp').hidden = true; return; }
  const user = await currentUser();
  if (!user) { location.replace('/login/?next=/dashboard/'); return; }
  const c = await sb();

  const name = user.user_metadata?.full_name || user.email.split('@')[0];
  $('#dashName').textContent = name.split(' ')[0];
  $('#userName').textContent = name;
  $('#userEmail').textContent = user.email;
  $('#userAv').textContent = name[0].toUpperCase();
  $('#acctEmail').value = user.email;
  $('#acctName').value = user.user_metadata?.full_name || '';
  $('#acctCompany').value = user.user_metadata?.company || '';
  if (new URLSearchParams(location.search).get('welcome')) $('#welcome').hidden = false;

  // tabs
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-tab]').forEach((o) => o.classList.toggle('on', o === b));
    $$('.dash-pane').forEach((p) => (p.hidden = p.id !== b.dataset.tab));
  }));

  async function load() {
    const { data, error } = await c.from('projects').select('*').order('created_at', { ascending: false });
    const list = $('#projList');
    if (error) { list.innerHTML = `<div class="empty"><h3>Couldn't load projects</h3><p>${esc(error.message)}</p></div>`; return; }
    const count = (s) => data.filter((p) => p.status === s).length;
    $('#kTotal').textContent = data.length;
    $('#kProd').textContent = count('production') + count('review');
    $('#kDone').textContent = count('delivered');
    const next = data.filter((p) => p.launch_date && new Date(p.launch_date) >= new Date()).sort((a, b) => a.launch_date.localeCompare(b.launch_date))[0];
    $('#kNext').textContent = next ? new Date(next.launch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
    if (!data.length) {
      list.innerHTML = `<div class="empty"><h3>No launches yet</h3><p>Submit your first brief — we reply within one working day with a launch plan.</p><button class="btn btn-primary" style="margin-top:18px" data-new>Start a launch brief</button></div>`;
    } else {
      list.innerHTML = data.map((p) => {
        const i = STEPS.indexOf(p.status);
        const img = THUMB[p.category] ? `<img src="/assets/products/product-${THUMB[p.category]}-hero.webp" alt="" />` : '';
        return `<article class="proj">
          <div class="thumb">${img}</div>
          <div><h3>${esc(p.title)}</h3>
            <small>${esc(p.package || 'Package TBD')} · ${esc((p.formats || []).join(' · ') || 'formats TBD')}${p.launch_date ? ' · launches ' + esc(new Date(p.launch_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })) : ''}</small>
            <div class="steps-bar">${STEPS.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>
          </div>
          <span class="status ${p.status}">${LABEL[p.status]}</span>
        </article>`;
      }).join('');
    }
    $$('[data-new]').forEach((b) => (b.onclick = openNew));
  }

  // new brief modal
  const modal = $('#briefModal'), bform = $('#briefForm'), bout = $('#briefMsg');
  function openNew() { modal.hidden = false; bform.title.focus(); }
  $$('[data-new]').forEach((b) => (b.onclick = openNew));
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => (modal.hidden = true)));
  modal.addEventListener('click', (e) => e.target === modal && (modal.hidden = true));
  $$('.chips.pick', bform).forEach((g) => g.addEventListener('click', (e) => {
    const ch = e.target.closest('.chip'); if (!ch) return;
    if (g.dataset.multi) ch.classList.toggle('on'); else $$('.chip', g).forEach((o) => o.classList.toggle('on', o === ch));
  }));
  bform.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!bform.reportValidity()) return;
    const fd = new FormData(bform);
    const row = {
      title: fd.get('title'), brief: fd.get('brief'), links: fd.get('links') || null,
      launch_date: fd.get('launch_date') || null, package: fd.get('package') || null,
      category: $('[data-group="category"] .chip.on', bform)?.textContent || null,
      formats: $$('[data-group="formats"] .chip.on', bform).map((x) => x.textContent),
    };
    const btn = bform.querySelector('[type=submit]'); btn.disabled = true;
    const { error } = await c.from('projects').insert(row);
    btn.disabled = false;
    if (error) return msg(bout, error.message, false);
    bform.reset(); modal.hidden = true; bout.className = 'form-msg';
    await load();
  });

  // account
  $('#acctForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await c.auth.updateUser({ data: { full_name: $('#acctName').value, company: $('#acctCompany').value } });
    msg($('#acctMsg'), error ? error.message : 'Saved.', !error);
  });
  $$('[data-signout]').forEach((b) => b.addEventListener('click', async () => { await c.auth.signOut(); location.assign('/'); }));

  await load();
}
main();
