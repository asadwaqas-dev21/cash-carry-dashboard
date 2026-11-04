import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createMockClient } from './supabase-mock';
import { hasSupabase, supabaseKey, supabaseUrl } from './supabase-env';

if (!hasSupabase) {
  console.warn(
    'Supabase credentials are missing. Using an offline mock client with empty data. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  );
}

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * It acts as the signed-in user (read from the auth cookies), so RLS policies
 * decide what each role can see and change. Create one per request.
 */
export async function createClient(): Promise<SupabaseClient> {
  if (!hasSupabase) return createMockClient();

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
