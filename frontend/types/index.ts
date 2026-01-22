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

// ==================== BITÁCORA TYPES (Sleep Coach Log) ====================

export interface NapEntry {
  laid_down_time?: string;      // 🛏 acosté a las
  fell_asleep_time?: string;    // 😴 Se durmió a las
  how_fell_asleep?: string;     // 💤 Cómo se durmió
  woke_up_time?: string;        // 😊 Se despertó
  duration_minutes?: number;    // ⏰ Duración
}

export interface NightWaking {
  time?: string;                // Hora del despertar
  duration_minutes?: number;    // Cuánto duró
  what_was_done?: string;       // Qué hiciste
}

export interface DailyBitacora {
  id: string;
  user_id: string;
  day_number: number;                       // Bitácora del día #
  date: string;                             // Fecha del registro
  
  // Mañana anterior
  previous_day_wake_time?: string;          // ☀️ Hora de despertar día anterior
  
  // Siestas
  nap_1?: NapEntry;
  nap_2?: NapEntry;
  nap_3?: NapEntry;
  
  // Alimentación
  how_baby_ate?: string;                    // 🥑🥛 Cómo comió a lo largo del día
  
  // Rutina nocturna
  relaxing_routine_start?: string;          // 🫧 Rutina relajante (hora que comenzó)
  baby_mood?: string;                       // 😁 Humor
  last_feeding_time?: string;               // ⏰ Última toma del día
  laid_down_for_bed?: string;               // 🛏 Le acosté
  fell_asleep_at?: string;                  // Se durmió
  time_to_fall_asleep_minutes?: number;     // Tardó en dormirse
  
  // Despertares nocturnos
  number_of_wakings?: number;               // # de Despertares
  night_wakings?: NightWaking[];            // Detalles de cada despertar
  
  // Mañana siguiente
  morning_wake_time?: string;               // ☀️ Hora de despertar hoy por la mañana
  
  // Notas adicionales
  notes?: string;
  
  // AI summary for coach
  ai_summary?: string;
  
  created_at: string;
  updated_at: string;
}

export interface DailyBitacoraCreate {
  day_number?: number;
  date: string;
  previous_day_wake_time?: string;
  nap_1?: NapEntry;
  nap_2?: NapEntry;
  nap_3?: NapEntry;
  how_baby_ate?: string;
  relaxing_routine_start?: string;
  baby_mood?: string;
  last_feeding_time?: string;
  laid_down_for_bed?: string;
  fell_asleep_at?: string;
  time_to_fall_asleep_minutes?: number;
  number_of_wakings?: number;
  night_wakings?: NightWaking[];
  morning_wake_time?: string;
  notes?: string;
}

// Options for how baby fell asleep
export const HOW_FELL_ASLEEP_OPTIONS = [
  'Brazos',
  'Pecho',
  'Meciendo',
  'Cuna/Cama',
  'Cochecito',
  'Carro',
  'Solo/a',
  'Otro',
];

// Options for how baby ate
export const HOW_BABY_ATE_OPTIONS = [
  'Muy bien',
  'Bien',
  'Regular',
  'Poco',
  'Muy poco',
];

// Options for baby mood
export const BABY_MOOD_OPTIONS = [
  'Muy contento',
  'Contento',
  'Tranquilo',
  'Irritable',
  'Muy irritable',
  'Cansado',
];
