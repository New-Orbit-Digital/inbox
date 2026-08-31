// Supabase Edge Function: health (packet 001, U001-B)
// Read-only deployment beacon: what code is live, which migrations the database
// has, and how many rows sit in the three tables the app depends on. No auth,
// no writes, no model calls, and never any row contents — counts only.
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by the
// edge runtime. The service role is needed because migration_versions() is
// granted to service_role only.
//   ?ping=1 → version alone, no database access.

import { createClient } from "npm:@supabase/supabase-js@2";

const HEALTH_VERSION = "001-B";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const HEADERS = { ...CORS, "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface MigrationRow {
  version: string;
  name: string | null;
}

// head:true keeps this a count — no row ever leaves the database.
async function countRows(table: string, column: string): Promise<number> {
  const { count, error } = await db.from(table)
    .select(column, { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: HEADERS });
  }
  if (req.method !== "GET") {
    return json({ error: "GET only", health_version: HEALTH_VERSION }, 405);
  }

  // Liveness probe: proves which version is deployed without touching the database.
  if (new URL(req.url).searchParams.get("ping") === "1") {
    return json({ health_version: HEALTH_VERSION });
  }

  try {
    const { data, error } = await db.rpc("migration_versions", { p_limit: 5 });
    if (error) throw new Error(error.message);

    // Newest first, as the function orders them.
    const migrations = ((data ?? []) as MigrationRow[])
      .map((r) => (r.name ? `${r.version}_${r.name}` : r.version));

    // todo_tags and grocery_prefs have no id column; count over "*" instead.
    const [messages, todo_tags, grocery_prefs] = await Promise.all([
      countRows("messages", "id"),
      countRows("todo_tags", "*"),
      countRows("grocery_prefs", "*"),
    ]);

    return json({
      app: "inbox",
      health_version: HEALTH_VERSION,
      migrations,
      tables: { messages, todo_tags, grocery_prefs },
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("health check failed:", err);
    return json({
      error: err instanceof Error ? err.message : String(err),
      health_version: HEALTH_VERSION,
    }, 500);
  }
});
