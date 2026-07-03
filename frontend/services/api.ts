import { supabase, CheckIn, ChatMessage, ValidationCard, Bitacora, Profile, DirectMessage } from '../lib/supabase';
import { DailyBitacora } from '../types';
import { getChatResponse, getValidationResponse, getBitacoraSummary, FALLBACK_MESSAGE } from './groq';
import { DebugLogger } from '../utils/debugLogger';
import { localDateString, localDayRange } from '../utils/date';

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
  sleep_hours?: number;
  baby_wakeups?: number;
  brain_dump?: string;
}): Promise<CheckIn> => {
  // Verify auth first (don't spend a Groq call if we can't save anyway).
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  // Get AI validation response
  const aiResponse = await getValidationResponse(
    checkInData.mood,
    checkInData.brain_dump
  );

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
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Use LOCAL day bounds so "today" matches the mother's calendar day, not UTC.
  const { start, end } = localDayRange();
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', start)
    .lt('created_at', end)
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
  // Use getSession() — reads localStorage, NO network call, never gets aborted by Android keyboard
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  DebugLogger.info('[Chat] getSession:', user?.id?.substring(0, 8) ?? 'no session');
  if (!user) throw new Error('Not authenticated');


  // Fetch prior context BEFORE inserting the new message (so it isn't sent
  // twice) — the most recent 10 messages, returned in chronological order.
  const { data: recent, error: historyError } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (historyError) DebugLogger.warn('[Chat] History fetch failed:', historyError.message);
  const history = (recent || []).slice().reverse();

  // Save user message (non-blocking: ignore insert errors)
  const { error: userInsertError } = await supabase.from('chat_messages').insert([{
    session_id: sessionId,
    user_id: user.id,
    role: 'user',
    content,
  }]);
  if (userInsertError) DebugLogger.warn('[Chat] User msg insert failed:', userInsertError.message);

  DebugLogger.info('[Chat] Calling getChatResponse...');
  const aiResponse = await getChatResponse(content, history);
  DebugLogger.info('[Chat] Got response, length:', aiResponse.length);

  // Don't persist the AI fallback/error message — otherwise a transient Groq
  // outage saves "no pude responder…" into history forever. Show it this
  // session only (local id, not written to the DB).
  if (aiResponse === FALLBACK_MESSAGE) {
    return {
      id: `local_${Date.now()}`,
      session_id: sessionId,
      user_id: user.id,
      role: 'assistant',
      content: aiResponse,
      created_at: new Date().toISOString(),
    } as ChatMessage;
  }

  // Save assistant message and return it
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

  if (error) {
    DebugLogger.error('[Chat] Assistant insert failed:', error.message, error.code);
    return {
      id: `local_${Date.now()}`,
      session_id: sessionId,
      user_id: user.id,
      role: 'assistant',
      content: aiResponse,
      created_at: new Date().toISOString(),
    } as ChatMessage;
  }

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
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  // Local calendar date (not UTC) so "today" matches the mother's day.
  const dateStr: string = bitacoraData.date || localDateString();

  // One entry per (user, date). Reuse the day_number when editing an existing
  // day; otherwise assign the next one. UNIQUE(user_id, date) + the upsert
  // below guarantee no duplicate rows per day (root-cause fix, not a band-aid).
  const { data: existing } = await supabase
    .from('bitacoras')
    .select('day_number')
    .eq('user_id', user.id)
    .eq('date', dateStr)
    .maybeSingle();

  let dayNumber: number;
  if (existing) {
    dayNumber = existing.day_number;
  } else {
    const { count } = await supabase
      .from('bitacoras')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    dayNumber = (count || 0) + 1;
  }

  // Map the nested form shape onto the flat DB columns. `!= null` keeps a
  // legitimate 0 (e.g. 0 night wakings) instead of dropping it.
  const dbPayload: any = { date: dateStr };
  if (bitacoraData.previous_day_wake_time) dbPayload.previous_day_wake_time = bitacoraData.previous_day_wake_time;
  if (bitacoraData.how_baby_ate) dbPayload.how_baby_ate = bitacoraData.how_baby_ate;
  if (bitacoraData.relaxing_routine_start) dbPayload.relaxing_routine_start = bitacoraData.relaxing_routine_start;
  if (bitacoraData.baby_mood) dbPayload.baby_mood = bitacoraData.baby_mood;
  if (bitacoraData.last_feeding_time) dbPayload.last_feeding_time = bitacoraData.last_feeding_time;
  if (bitacoraData.laid_down_for_bed) dbPayload.laid_down_for_bed = bitacoraData.laid_down_for_bed;
  if (bitacoraData.fell_asleep_at) dbPayload.fell_asleep_at = bitacoraData.fell_asleep_at;
  if (bitacoraData.time_to_fall_asleep_minutes != null) dbPayload.time_to_fall_asleep_minutes = bitacoraData.time_to_fall_asleep_minutes;
  if (bitacoraData.number_of_wakings != null) dbPayload.number_of_wakings = bitacoraData.number_of_wakings;
  if (bitacoraData.morning_wake_time) dbPayload.morning_wake_time = bitacoraData.morning_wake_time;
  if (bitacoraData.notes) dbPayload.notes = bitacoraData.notes;

  const mapNap = (nap: any, n: number) => {
    if (!nap) return;
    if (nap.duration_minutes != null) dbPayload[`nap_${n}_duration_minutes`] = nap.duration_minutes;
    if (nap.laid_down_time) dbPayload[`nap_${n}_laid_down`] = nap.laid_down_time;
    if (nap.fell_asleep_time) dbPayload[`nap_${n}_fell_asleep`] = nap.fell_asleep_time;
    if (nap.how_fell_asleep) dbPayload[`nap_${n}_how_fell_asleep`] = nap.how_fell_asleep;
    if (nap.woke_up_time) dbPayload[`nap_${n}_woke_up`] = nap.woke_up_time;
  };
  mapNap(bitacoraData.nap_1, 1);
  mapNap(bitacoraData.nap_2, 2);
  mapNap(bitacoraData.nap_3, 3);

  if (bitacoraData.night_wakings) dbPayload.night_wakings = bitacoraData.night_wakings;

  // Generate AI summary from the FLAT payload (getBitacoraSummary reads flat
  // column names), with a 5s timeout — never block the save on Groq.
  let aiSummary = 'Registro guardado exitosamente.';
  try {
    const summaryPromise = getBitacoraSummary(dbPayload);
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('AI summary timeout')), 5000)
    );
    aiSummary = await Promise.race([summaryPromise, timeoutPromise]);
  } catch {
    // keep the default summary
  }

  const { data, error } = await supabase
    .from('bitacoras')
    .upsert(
      [{ ...dbPayload, user_id: user.id, day_number: dayNumber, ai_summary: aiSummary }],
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) {
    DebugLogger.error('[Bitacora] upsert failed:', error.message);
    throw error;
  }
  return data;
};

// Ordered by the calendar `date` (not created_at) so a back-filled/edited older
// day sorts to its real place instead of jumping to the top. RLS scopes rows to
// the caller (a regular user sees only their own).
export const getBitacoras = async (limit: number = 30): Promise<Bitacora[]> => {
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// One client's bitácoras for the coach timeline — newest day first, paginated by
// a `before` cursor (pass the oldest `date` already loaded to get the next page).
// Authorized by the "Coaches can view all bitacoras" RLS policy. Returns the rich
// DailyBitacora shape (select * has every column the detail view reads).
export const getClientBitacoras = async (
  userId: string,
  limit: number = 14,
  before?: string,
): Promise<DailyBitacora[]> => {
  let q = supabase
    .from('bitacoras')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('date', before);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as DailyBitacora[];
};

export const getTodayBitacora = async (): Promise<Bitacora | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Local date + explicit user scope. With UNIQUE(user_id, date) there is at
  // most one row, so the previous order+limit band-aid is no longer needed.
  const today = localDateString();
  const { data, error } = await supabase
    .from('bitacoras')
    .select('*')
    .eq('user_id', user.id)
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
  // Only the safe public columns — never expose the coach's email to clients.
  const { data: coach, error } = await supabase
    .from('profiles')
    .select('id, name, picture, role')
    .eq('role', 'coach')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching coach:', error);
    return null;
  }

  // Intentionally a partial Profile (no email/timestamps) — safe public subset.
  return (coach as Profile | null);
}

/**
 * Get direct messages between current user and coach
 */
export async function getDirectMessages(): Promise<DirectMessage[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    DebugLogger.warn('[DM] getDirectMessages: no session');
    return [];
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: true });

  if (error) {
    DebugLogger.error('[DM] getDirectMessages error:', error.message);
    return [];
  }

  DebugLogger.info('[DM] Loaded messages:', data?.length ?? 0);
  return data || [];
}

/**
 * Get ONLY the thread between the current user and one other person (coach↔client),
 * newest `limit` messages, returned oldest→newest for display. Replaces the old
 * pattern of pulling the caller's ENTIRE cross-client history on every 5s poll.
 */
export async function getThreadMessages(otherUserId: string, limit: number = 200): Promise<DirectMessage[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user || !otherUserId) return [];

  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),` +
      `and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    DebugLogger.error('[DM] getThreadMessages error:', error.message);
    return [];
  }
  // Fetched newest-first to honour the LIMIT; flip to chronological for the UI.
  return (data || []).reverse();
}

/**
 * Send a direct message
 */
export async function sendDirectMessage(receiverId: string, content: string): Promise<DirectMessage | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  DebugLogger.info('[DM] sendDirectMessage from:', user?.id?.substring(0, 8) ?? 'no session', 'to:', receiverId.substring(0, 8));
  if (!user) {
    DebugLogger.error('[DM] No session — cannot send message');
    return null;
  }

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
    DebugLogger.error('[DM] Insert error:', error.message, error.code);
    return null;
  }

  DebugLogger.info('[DM] Message sent OK, id:', data.id.substring(0, 8));
  return data;
}

/**
 * Mark every unread message FROM `otherUserId` TO the current user as read.
 * (Clears the coach's unread badge, which previously grew forever.)
 */
export async function markMessagesRead(otherUserId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user || !otherUserId) return;

  const { error } = await supabase
    .from('direct_messages')
    .update({ read: true })
    .eq('receiver_id', user.id)
    .eq('sender_id', otherUserId)
    .eq('read', false);

  if (error) DebugLogger.warn('[DM] markMessagesRead failed:', error.message);
}

/**
 * Permanently delete the current user's account and all their data.
 * Calls the `delete-account` Edge Function (which uses the service role).
 */
export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No hay sesión activa');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL || ''}/functions/v1/delete-account`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`No se pudo eliminar la cuenta (${resp.status}): ${t.slice(0, 150)}`);
  }
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
