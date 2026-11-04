import type { SupabaseClient } from '@supabase/supabase-js';

/** What a form Server Action returns to `useActionState`. */
export type ActionState = { error?: string; success?: string } | null;

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type DbError = { message: string; code?: string };

function friendlyDbError(error: DbError) {
  if (error.code === '23505') return 'That code, number or name is already in use.';
  if (error.code === '23503') return 'This record is still used by other records, so it cannot be deleted.';
  if (error.code === '42501') return 'You do not have permission to do this.';
  return error.message;
}

/** Runs a mutation, turning anything it throws (auth, validation, database) into form state. */
export async function attempt(fn: () => Promise<string>): Promise<ActionState> {
  try {
    return { success: await fn() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Unwraps a Supabase response, throwing a readable error if it failed. */
export function check<T>(res: { data: T | null; error: DbError | null }): T {
  if (res.error) throw new Error(friendlyDbError(res.error));
  return res.data as T;
}

/** Like `check`, for `.update()/.delete()...select('id')`: RLS can silently match no rows. */
export function checkAffected(res: { data: unknown[] | null; error: DbError | null }) {
  const rows = check(res);
  if (!rows || rows.length === 0) throw new Error('Nothing was changed. The record may not exist or you lack permission.');
}

export function str(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

export function optStr(formData: FormData, name: string) {
  return str(formData, name) || null;
}

export function num(formData: FormData, name: string, fallback = 0) {
  const raw = str(formData, name);
  const value = Number(raw);
  return raw !== '' && Number.isFinite(value) ? value : fallback;
}

/** A non-negative number field; `null` when left blank. */
export function optAmount(formData: FormData, name: string, label: string) {
  const raw = str(formData, name);
  if (raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be zero or more.`);
  return value;
}

export function oneOf<T extends string>(formData: FormData, name: string, allowed: readonly T[], label: string): T {
  const value = str(formData, name);
  if (!(allowed as readonly string[]).includes(value)) throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

/** The org's first (main) location, used for stock and POS. */
export async function defaultLocationId(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', orgId)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error('Add a store location in Settings first.');
  return data.id as string;
}

/** Next code like R-004 for a table's `column`, based on the highest one used so far. */
export async function nextCode(supabase: SupabaseClient, table: string, column: string, orgId: string, prefix: string) {
  const { data } = await supabase.from(table).select(column).eq('org_id', orgId).ilike(column, `${prefix}-%`);
  const highest = ((data || []) as unknown as Record<string, string>[]).reduce((max, row) => {
    const n = Number(String(row[column]).slice(prefix.length + 1));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
}

/** A reference number that is unique without a round-trip, e.g. POS-M2K9QZ1A. */
export function referenceNumber(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 36).toString(36).toUpperCase()}`;
}
