// ---------------------------------------------------------------------------
// SUPABASE CONFIGURATION
// The two values come from your ".env" file (see .env.example).
// If they are missing the site still works: Local Multiplayer is fully usable
// and Online Multiplayer shows a clear "needs Supabase" message instead of
// pretending to work.
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const looksValid = url.startsWith('https://') && !url.includes('YOUR-PROJECT') && anonKey.length > 20 && !anonKey.includes('YOUR-ANON');

export const isSupabaseConfigured = looksValid;

export const supabase = looksValid
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null;

// Every online feature starts here. Players are signed in anonymously, so they
// never need an email or password, but Supabase still gives each browser a
// private user id that the database uses to know who is the host.
export async function ensureSignedIn() {
  if (!supabase) throw new Error('Online play needs Supabase. See the README, step "Configure Supabase".');
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) return sessionData.session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error('Could not sign in. In Supabase turn on Authentication -> Sign In / Providers -> "Allow anonymous sign-ins". (' + error.message + ')');
  }
  return data.user;
}
