// Supabase Edge Function: classify (004-C — retired, ping-only stub)
// Packet 004 moved to-do capture (U004-A) and grocery splitting (U004-B) into
// the client, deterministically. Nothing calls this function any more.
//
// It survives as a stub rather than a deleted directory because deleting the
// directory would not undeploy anything: deploy-supabase deploys what is in its
// checkout, so the live v12 would keep answering the webhook. Shipping this is
// what makes the endpoint inert.
//
// It reads NO secrets: no ANTHROPIC_API_KEY, no WEBHOOK_SECRET, no
// SUPABASE_SERVICE_ROLE_KEY. Those stay configured until Justin removes them.
// The classify-on-insert trigger is still live (Prep-3 drops it); its POST now
// gets a 410, which is the signal in net._http_response that it still fires.

const CLASSIFY_VERSION = "004-C";

const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://inbox.justin-dec.workers.dev",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: HEADERS });

  if (req.method === "GET" && new URL(req.url).searchParams.get("ping") === "1") {
    return json({ classify_version: CLASSIFY_VERSION, retired: true }, 200);
  }

  return json({ error: "classify is retired", classify_version: CLASSIFY_VERSION }, 410);
});
