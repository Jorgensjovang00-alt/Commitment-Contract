import { supabase } from './supabase';

export interface DisputeInput {
  contractId: string;
  reason: string;
  details?: string;
}

export async function createDispute(userId: string, input: DisputeInput) {
  const { data, error } = await supabase.from('disputes').insert({
    contract_id: input.contractId,
    user_id: userId,
    reason: input.reason,
    details: input.details ?? null,
  }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function hasOpenDispute(contractId: string): Promise<boolean> {
  const { data, error } = await supabase.from('disputes').select('id').eq('contract_id', contractId).eq('status', 'open').maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}
