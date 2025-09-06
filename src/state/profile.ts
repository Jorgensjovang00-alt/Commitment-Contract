import { supabase } from './supabase';

export async function upsertConsents(userId: string, { terms, privacy }: { terms?: boolean; privacy?: boolean }) {
  const fields: any = { user_id: userId, updated_at: new Date().toISOString() };
  if (terms) fields.accepted_terms_at = new Date().toISOString();
  if (privacy) fields.accepted_privacy_at = new Date().toISOString();
  const { error } = await supabase.from('profiles').upsert(fields, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function registerPushToken(userId: string, token: string, platform?: string) {
  await supabase.from('push_tokens').insert({ user_id: userId, expo_push_token: token, platform: platform ?? null });
}
