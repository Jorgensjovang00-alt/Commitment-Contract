import { supabase } from './supabase';
import type { Contract, CheckIn, CreateContractInput } from '../types/contract';

interface DbContract {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  value_ore: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  target_date?: string | null;
  created_at: string;
  updated_at: string;
}

interface DbCheckIn {
  id: string;
  contract_id: string;
  user_id: string;
  checkin_time: string;
  notes: string | null;
}

function mapDbToContract(c: DbContract, checkIns: DbCheckIn[] = []): Contract {
  return {
    id: c.id,
    status: c.status,
    title: c.title,
    description: c.description ?? undefined,
    valueNok: Math.round((c.value_ore || 0) / 100),
    targetDate: c.target_date ?? undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    checkIns: (checkIns || []).map(ci => ({ id: ci.id, checkinTime: ci.checkin_time, notes: ci.notes ?? undefined })),
  };
}

export async function loadActiveContract(userId: string): Promise<Contract | undefined> {
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const c = contracts?.[0] as DbContract | undefined;
  if (!c) return undefined;
  const { data: checkins, error: e2 } = await supabase
    .from('checkins')
    .select('*')
    .eq('contract_id', c.id)
    .order('checkin_time', { ascending: false });
  if (e2) throw e2;
  return mapDbToContract(c, (checkins || []) as DbCheckIn[]);
}

export async function loadHistory(userId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []) as DbContract[];
  return rows.map(mapDbToContract);
}

export async function createDbContract(userId: string, input: CreateContractInput): Promise<Contract> {
  const payload = {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    value_ore: Math.round(input.valueNok * 100),
    status: 'active' as const,
    target_date: input.targetDate ?? null,
  };
  const { data, error } = await supabase
    .from('contracts')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return mapDbToContract(data as DbContract, []);
}

export async function insertCheckIn(contractId: string, userId: string, notes?: string): Promise<CheckIn> {
  const payload = {
    contract_id: contractId,
    user_id: userId,
    checkin_time: new Date().toISOString(),
    notes: notes ?? null,
  };
  const { data, error } = await supabase
    .from('checkins')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  const row = data as DbCheckIn;
  return { id: row.id, checkinTime: row.checkin_time, notes: row.notes ?? undefined };
}

export async function updateContractStatus(contractId: string, status: 'completed' | 'cancelled'): Promise<void> {
  const { error } = await supabase
    .from('contracts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', contractId);
  if (error) throw error;
}

export async function getPaymentIntentId(_contractId: string): Promise<string | undefined> {
  return undefined;
}

export interface DbPaymentRow {
  id: string;
  contract_id: string;
  payer_id: string;
  amount_ore: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  processed_at: string | null;
}

export async function loadPaymentsForUser(userId: string): Promise<DbPaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('payer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DbPaymentRow[];
}
