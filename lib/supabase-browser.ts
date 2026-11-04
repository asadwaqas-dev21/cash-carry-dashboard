import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMockClient } from './supabase-mock';
import { hasSupabase, supabaseKey, supabaseUrl } from './supabase-env';

if (!hasSupabase) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Using an offline mock client.');
}

// Stores the session in cookies (not localStorage) so the server sees the same user.
export const supabaseBrowser: SupabaseClient = hasSupabase
  ? createBrowserClient(supabaseUrl!, supabaseKey!)
  : createMockClient();
