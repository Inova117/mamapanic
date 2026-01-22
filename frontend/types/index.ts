// MAMÁ RESPIRA - TypeScript Types

export interface ValidationCard {
  id: string;
  message_es: string;
  message_en?: string;
  category: string;
  created_at: string;
}

export interface DailyCheckIn {
  id: string;
  user_id: string;
  mood: number; // 1=sad, 2=neutral, 3=happy
  sleep_start?: string;
  sleep_end?: string;
  baby_wakeups?: number;
  brain_dump?: string;
  ai_response?: string;
  created_at: string;
}

export interface DailyCheckInCreate {
  mood: number;
  sleep_start?: string;
  sleep_end?: string;
  baby_wakeups?: number;
  brain_dump?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface CommunityPresence {
  online_count: number;
  sample_names: string[];
  message: string;
}

export type MoodType = 1 | 2 | 3;

export type CrisisPhase = 'idle' | 'breathing' | 'validation' | 'community';

export interface BreathingState {
  phase: 'inhale' | 'hold' | 'exhale' | 'rest';
  count: number;
  cycle: number;
}
