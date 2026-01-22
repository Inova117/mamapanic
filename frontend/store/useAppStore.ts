import { create } from 'zustand';
import { CrisisPhase, CommunityPresence, DailyCheckIn } from '../types';

interface AppState {
  // Crisis Mode
  crisisPhase: CrisisPhase;
  setCrisisPhase: (phase: CrisisPhase) => void;
  
  // Community Presence
  communityPresence: CommunityPresence | null;
  setCommunityPresence: (presence: CommunityPresence | null) => void;
  
  // Chat
  chatSessionId: string;
  setChatSessionId: (id: string) => void;
  
  // Today's Check-in
  todayCheckIn: DailyCheckIn | null;
  setTodayCheckIn: (checkIn: DailyCheckIn | null) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Crisis Mode
  crisisPhase: 'idle',
  setCrisisPhase: (phase) => set({ crisisPhase: phase }),
  
  // Community Presence
  communityPresence: null,
  setCommunityPresence: (presence) => set({ communityPresence: presence }),
  
  // Chat - generate unique session per app launch
  chatSessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  setChatSessionId: (id) => set({ chatSessionId: id }),
  
  // Today's Check-in
  todayCheckIn: null,
  setTodayCheckIn: (checkIn) => set({ todayCheckIn: checkIn }),
  
  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
