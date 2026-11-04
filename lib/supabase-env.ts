export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Without credentials the app runs against an offline mock client with a demo owner.
export const hasSupabase = Boolean(supabaseUrl && supabaseKey);
