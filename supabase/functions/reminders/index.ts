// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_) => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response("Missing env", { status: 500 });
  }

  const supa = createClient(url, key);

  // Finn kontrakter for i morgen
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ymd = tomorrow.toISOString().slice(0, 10);

  const { data: contracts, error: cErr } = await supa
    .from("contracts")
    .select("id,user_id,title,target_date")
    .eq("target_date", ymd);

  if (cErr) return new Response(cErr.message, { status: 500 });
  if (!contracts || contracts.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Hent push tokens
  const userIds = [...new Set(contracts.map((c: any) => c.user_id))];
  const { data: tokens, error: tErr } = await supa
    .from("push_tokens")
    .select("user_id,expo_push_token")
    .in("user_id", userIds);

  if (tErr) return new Response(tErr.message, { status: 500 });

  // Lag meldinger
  const messages =
    tokens?.flatMap((t: any) => {
      const mine = contracts.filter((c: any) => c.user_id === t.user_id);
      return mine.map((c: any) => ({
        to: t.expo_push_token,
        sound: "default",
        title: "Påminnelse",
        body: `I morgen (${c.target_date}): ${c.title}`,
      }));
    }) ?? [];

  // Send via Expo Push API
  if (messages.length > 0) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  }

  return new Response(JSON.stringify({ ok: true, sent: messages.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
