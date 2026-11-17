// Server-only: the open site uses one shared workspace. All reads/writes go through
// server functions with the privileged client; the database has no public (anon) access.
export const WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

export async function workspace() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { supabase: supabaseAdmin, userId: WORKSPACE_ID };
}
