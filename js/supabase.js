// Lazily loads supabase-js so pages that never touch auth don't pay for it.
import { SUPABASE_URL, SUPABASE_ANON_KEY, CONTACT_EMAIL } from './config.js';

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
let client;

export async function sb() {
  if (!configured) return null;
  if (!client) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  }
  return client;
}

export async function currentUser() {
  const c = await sb();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user ?? null;
}

// Store a lead (contact / launch form). Without Supabase, hand off to the visitor's mail app.
export async function saveLead(lead, { mailtoFallback = true } = {}) {
  const c = await sb();
  if (c) {
    const { error } = await c.from('leads').insert(lead);
    if (error) throw error;
    return 'saved';
  }
  if (!mailtoFallback) return 'skipped';
  const lines = Object.entries(lead).filter(([, v]) => v).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('New launch enquiry — ' + (lead.name || ''))}&body=${encodeURIComponent(lines.join('\n'))}`;
  return 'mailto';
}

export async function subscribe(email, source) {
  const c = await sb();
  if (!c) throw new Error('Newsletter sign-ups open shortly — email ' + CONTACT_EMAIL + ' to be added.');
  const { error } = await c.from('newsletter').insert({ email, source });
  if (error && error.code !== '23505') throw error; // 23505 = already subscribed, treat as success
}
