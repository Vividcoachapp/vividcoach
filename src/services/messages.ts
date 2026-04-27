import { supabase } from './supabase';

const DISPLAY_LIMIT = 50;
export const CONTEXT_LIMIT = 20;

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export async function loadMessages(
  userId: string,
  coachId: number,
): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content')
    .eq('user_id', userId)
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
    .limit(DISPLAY_LIMIT);

  if (error) throw error;
  return ((data ?? []) as StoredMessage[]).reverse();
}

export async function saveMessage(
  userId: string,
  coachId: number,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ user_id: userId, coach_id: coachId, role, content });

  if (error) console.warn('[messages] save failed:', error.message);
}
