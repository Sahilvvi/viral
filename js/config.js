// Public Supabase settings (Project Settings → API). The anon key is safe to ship to the browser:
// row-level security in supabase/schema.sql decides what it can read and write.
// Leave empty and the auth pages show a "being set up" notice instead of failing.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Fallback inbox when Supabase isn't configured yet (forms open a pre-filled email instead).
export const CONTACT_EMAIL = 'hello@viralx.in';
