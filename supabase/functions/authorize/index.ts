// Supabase Edge Function: authorize
// POST body: { contract_id: string, amount_nok: number, method?: 'card'|'apple_pay'|'vipps' }
// Returns: { client_secret: string, payment_intent_id: string }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { contract_id, amount_nok, method } = await req.json();
    if (!contract_id || !amount_nok) return new Response('Bad Request', { status: 400 });

    const secret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secret) return new Response('Stripe secret not configured', { status: 500 });

    const form = new URLSearchParams();
    form.set('amount', String(Math.round(amount_nok * 100)));
    form.set('currency', 'nok');
    form.set('capture_method', 'manual');
    // Limit methods when specified
    if (method === 'vipps') {
      form.append('payment_method_types[]', 'vipps');
    } else {
      // Apple Pay går via card i Stripe; PaymentSheet håndterer wallet
      form.append('payment_method_types[]', 'card');
    }

    const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(text, { status: resp.status });
    }
    const pi = await resp.json();

    // Insert payments row using service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceKey) {
      const supa = createClient(supabaseUrl, serviceKey);
      await supa.from('payments').insert({
        contract_id: contract_id,
        stripe_payment_intent_id: pi.id,
        status: 'requires_action',
        method: method ?? 'card',
      });
    }

    return new Response(JSON.stringify({ client_secret: pi.client_secret, payment_intent_id: pi.id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
