import { supabase } from './supabase';

export async function createStubAuthorization(contractId: string, amountNok: number, method: 'card'|'apple_pay'|'vipps' = 'card'): Promise<void> {
  const fakeIntent = `stub_${contractId}_${Date.now()}`;
  const { error } = await supabase
    .from('payments')
    .insert({
      contract_id: contractId,
      stripe_payment_intent_id: fakeIntent,
      status: 'authorized',
      method,
    });
  if (error) throw error;
}

export async function authorizePaymentViaEdge(contractId: string, amountNok: number, method: 'card'|'apple_pay'|'vipps') {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/authorize`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contract_id: contractId, amount_nok: amountNok, method }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ client_secret: string; payment_intent_id: string }>;
}

export async function capturePayment(paymentIntentId: string): Promise<boolean> {
  try {
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/capture`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_intent_id: paymentIntentId }) });
    if (res.ok) {
      await supabase.from('payments').update({ status: 'captured' }).eq('stripe_payment_intent_id', paymentIntentId);
      return true;
    }
  } catch {}
  return false;
}

export async function cancelPayment(paymentIntentId: string): Promise<boolean> {
  try {
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/cancel`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_intent_id: paymentIntentId }) });
    if (res.ok) {
      await supabase.from('payments').update({ status: 'canceled' }).eq('stripe_payment_intent_id', paymentIntentId);
      return true;
    }
  } catch {}
  return false;
}
