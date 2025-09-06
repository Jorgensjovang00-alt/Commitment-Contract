// Supabase Edge Function: cancel
// POST body: { payment_intent_id: string }
// Returns: { canceled: boolean }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { payment_intent_id } = await req.json();
    if (!payment_intent_id) return new Response('Bad Request', { status: 400 });
    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secret) return new Response('Stripe secret not configured', { status: 500 });

    const resp = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (!resp.ok) return new Response(await resp.text(), { status: resp.status });
    return new Response(JSON.stringify({ canceled: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
