import type { SupabaseClient } from '@supabase/supabase-js';

// Offline stand-in used when Supabase env vars are missing: every query resolves
// to empty data and auth reports a signed-in demo user, so the UI can run locally.

const demoUser = { id: 'demo-user', email: 'demo@local.test' };
const demoSession = { user: demoUser, access_token: 'demo', refresh_token: 'demo' };

function queryBuilder() {
  let single = false;
  const result = () => ({ data: single ? null : [], error: null, count: 0, status: 200, statusText: 'OK' });

  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
            Promise.resolve(result()).then(resolve, reject);
        }
        if (prop === 'single' || prop === 'maybeSingle') {
          single = true;
        }
        return () => builder;
      },
    }
  );
  return builder;
}

export function createMockClient(): SupabaseClient {
  const mock = {
    from: () => queryBuilder(),
    rpc: () => queryBuilder(),
    auth: {
      getSession: async () => ({ data: { session: demoSession }, error: null }),
      getUser: async () => ({ data: { user: demoUser }, error: null }),
      signInWithPassword: async () => ({ data: { user: demoUser, session: demoSession }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
  return mock as unknown as SupabaseClient;
}
