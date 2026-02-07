import { supabase, CheckIn, ChatMessage, ValidationCard, Bitacora, Profile, DirectMessage } from '../lib/supabase';
import { getChatResponse, getValidationResponse, getBitacoraSummary } from './groq';

// ==================== VALIDATION CARDS ====================

export const getRandomValidation = async (category?: string): Promise<ValidationCard> => {
  let query = supabase.from('validation_cards').select('*');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('No validation cards found');

  // Pick random card
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
};

export const getAllValidations = async (): Promise<ValidationCard[]> => {
  const { data, error } = await supabase
    .from('validation_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// ==================== DAILY CHECK-INS ====================

export const createCheckIn = async (checkInData: {
  mood: 1 | 2 | 3;
  sleep_start?: string;
  sleep_end?: string;
  baby_wakeups?: number;
  brain_dump?: string;
}): Promise<CheckIn> => {
  // Get AI validation response
  const aiResponse = await getValidationResponse(
    checkInData.mood,
    checkInData.brain_dump
  );

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Insert check-in
  const { data, error } = await supabase
    .from('checkins')
    .insert([{
      ...checkInData,
      user_id: user.id,
      ai_response: aiResponse,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getCheckIns = async (limit: number = 7): Promise<CheckIn[]> => {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const getTodayCheckIn = async (): Promise<CheckIn | null> => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .gte('created_at', today)
    .lt('created_at', tomorrow)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// ==================== CHAT ====================

export const sendChatMessage = async (
  sessionId: string,
  content: string
): Promise<ChatMessage> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Save user message
  await supabase.from('chat_messages').insert([{
    session_id: sessionId,
    user_id: user.id,
    role: 'user',
    content,
  }]);

  // Get conversation history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(10);

  // Get AI response
  const aiResponse = await getChatResponse(content, history || []);

  // Save assistant message
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{
      session_id: sessionId,
      user_id: user.id,
      role: 'assistant',
      content: aiResponse,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getChatHistory = async (
  sessionId: string,
  limit: number = 50
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// ==================== COMMUNITY PRESENCE ====================

export const getCommunityPresence = async (): Promise<{
  online_count: number;
  sample_names: string[];
  message: string;
}> => {
  // Simulate community presence
  const currentHour = new Date().getHours();

  let baseCount: number;
  if (currentHour >= 20 || currentHour < 6) {
    baseCount = Math.floor(Math.random() * 75) + 45; // 45-120
  } else if (currentHour >= 6 && currentHour < 12) {
    baseCount = Math.floor(Math.random() * 35) + 25; // 25-60
  } else {
    baseCount = Math.floor(Math.random() * 25) + 15; // 15-40
  }

  const names = [
    'Marta', 'Ana', 'Lucía', 'Carmen', 'María', 'Paula', 'Laura',
    'Elena', 'Sara', 'Isabel', 'Sofía', 'Alba', 'Nuria', 'Andrea'
  ];

  const sampleNames = [];
  const shuffled = [...names].sort(() => 0.5 - Math.random());
  for (let i = 0; i < 3; i++) {
    sampleNames.push(shuffled[i]);
  }

  return {
    online_count: baseCount,
    sample_names: sampleNames,
    message: `${sampleNames[0]} y ${baseCount - 1} mamás más están despiertas contigo ahora mismo.`,
  };
};

// ==================== BITÁCORA (Sleep Coach Log) ====================

export const createBitacora = async (bitacoraData: any): Promise<Bitacora> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get day number (count existing bitacoras)
  const { count } = await supabase
    .from('bitacoras')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const dayNumber = (count || 0) + 1;

  // Generate AI summary
  const aiSummary = await getBitacoraSummary(bitacoraData);

  // Insert bitacora
  const { data, error } = await supabase
    .from('bitacoras')
    .insert([{
      ...bitacoraData,
      user_id: user.id,
      day_number: dayNumber,
      ai_summary: aiSummary,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getBitacoras = async (limit: number = 30): Promise<Bitacora[]> => {
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const getTodayBitacora = async (): Promise<Bitacora | null> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateBitacora = async (
  id: string,
  bitacoraData: any
): Promise<Bitacora> => {
  // Generate new AI summary
  const aiSummary = await getBitacoraSummary(bitacoraData);

  const { data, error } = await supabase
    .from('bitacoras')
    .update({
      ...bitacoraData,
      ai_summary: aiSummary,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getBitacoraById = async (id: string): Promise<Bitacora> => {
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get the assigned coach or the first available coach
 */
export async function getCoach(): Promise<Profile | null> {
  const { data: coach, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'coach')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching coach:', error);
    return null;
  }

  return coach;
}

/**
 * Get direct messages between current user and coach
 */
export async function getDirectMessages(): Promise<DirectMessage[]> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching direct messages:', error);
    return [];
  }

  return data || [];
}

/**
 * Send a direct message
 */
export async function sendDirectMessage(receiverId: string, content: string): Promise<DirectMessage | null> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      read: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending direct message:', error);
    return null;
  }

  return data;
}

/**
 * Subscribe to new direct messages
 */
export function subscribeToDirectMessages(callback: (msg: DirectMessage) => void) {
  return supabase
    .channel('direct_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      },
      (payload) => {
        callback(payload.new as DirectMessage);
      }
    )
    .subscribe();
}

export default supabase;
