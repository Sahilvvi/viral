// Sign up, log in, password reset. Pages: /signup/, /login/, /reset-password/.
import { sb, configured, currentUser } from './supabase.js';
import { msg } from './page.js';

const form = document.querySelector('[data-auth]');
const out = document.getElementById('authMsg');
const mode = form?.dataset.auth;
const next = new URLSearchParams(location.search).get('next') || '/dashboard/';
const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/';

if (!configured) {
  document.getElementById('setupNote')?.removeAttribute('hidden');
  form?.querySelectorAll('button, input').forEach((el) => (el.disabled = true));
  document.querySelectorAll('.oauth button').forEach((el) => (el.disabled = true));
} else {
  // Already signed in? Skip the form (except on reset, which needs the recovery session).
  if (mode !== 'reset') currentUser().then((u) => u && location.replace(safeNext));

  document.querySelectorAll('[data-oauth]').forEach((b) => b.addEventListener('click', async () => {
    const c = await sb();
    const { error } = await c.auth.signInWithOAuth({ provider: b.dataset.oauth, options: { redirectTo: location.origin + safeNext } });
    if (error) msg(out, error.message, false);
  }));

  const forgot = document.getElementById('forgotLink');
  forgot?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!email) { form.email.focus(); return msg(out, 'Enter your email above, then tap “Forgot password?” again.', false); }
    const c = await sb();
    const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/reset-password/' });
    msg(out, error ? error.message : 'Check your inbox for a reset link.', !error);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const c = await sb();
    const fd = new FormData(form);
    try {
      if (mode === 'signup') {
        const { data, error } = await c.auth.signUp({
          email: fd.get('email'), password: fd.get('password'),
          options: { data: { full_name: fd.get('name'), company: fd.get('company') || '' }, emailRedirectTo: location.origin + '/dashboard/' },
        });
        if (error) throw error;
        if (data.session) location.assign('/dashboard/?welcome=1');
        else { form.reset(); msg(out, 'Almost there — we sent a confirmation link to your email.', true); }
      } else if (mode === 'login') {
        const { error } = await c.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
        if (error) throw error;
        location.assign(safeNext);
      } else if (mode === 'reset') {
        if (fd.get('password') !== fd.get('confirm')) throw new Error('Passwords do not match.');
        const { error } = await c.auth.updateUser({ password: fd.get('password') });
        if (error) throw error;
        msg(out, 'Password updated. Taking you to your dashboard…', true);
        setTimeout(() => location.assign('/dashboard/'), 1200);
      }
    } catch (err) {
      msg(out, err.message || 'Something went wrong.', false);
    } finally { btn.disabled = false; }
  });
}
