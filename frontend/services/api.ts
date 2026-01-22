import axios from 'axios';
import { 
  ValidationCard, 
  DailyCheckIn, 
  DailyCheckInCreate, 
  ChatMessage, 
  CommunityPresence,
  DailyBitacora,
  DailyBitacoraCreate
} from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Validation Cards
export const getRandomValidation = async (category?: string): Promise<ValidationCard> => {
  const params = category ? { category } : {};
  const response = await api.get('/validations/random', { params });
  return response.data;
};

export const getAllValidations = async (): Promise<ValidationCard[]> => {
  const response = await api.get('/validations');
  return response.data;
};

// Daily Check-ins
export const createCheckIn = async (checkIn: DailyCheckInCreate): Promise<DailyCheckIn> => {
  const response = await api.post('/checkins', checkIn);
  return response.data;
};

export const getCheckIns = async (limit: number = 7): Promise<DailyCheckIn[]> => {
  const response = await api.get('/checkins', { params: { limit } });
  return response.data;
};

export const getTodayCheckIn = async (): Promise<DailyCheckIn | null> => {
  try {
    const response = await api.get('/checkins/today');
    return response.data;
  } catch (error) {
    return null;
  }
};

// Chat
export const sendChatMessage = async (sessionId: string, content: string): Promise<ChatMessage> => {
  const response = await api.post('/chat', {
    session_id: sessionId,
    content,
  });
  return response.data;
};

export const getChatHistory = async (sessionId: string, limit: number = 50): Promise<ChatMessage[]> => {
  const response = await api.get(`/chat/${sessionId}`, { params: { limit } });
  return response.data;
};

// Community Presence
export const getCommunityPresence = async (): Promise<CommunityPresence> => {
  const response = await api.get('/community/presence');
  return response.data;
};

// ==================== BITÁCORA (Sleep Coach Log) ====================

export const createBitacora = async (bitacora: DailyBitacoraCreate): Promise<DailyBitacora> => {
  const response = await api.post('/bitacora', bitacora);
  return response.data;
};

export const getBitacoras = async (limit: number = 30): Promise<DailyBitacora[]> => {
  const response = await api.get('/bitacora', { params: { limit } });
  return response.data;
};

export const getTodayBitacora = async (): Promise<DailyBitacora | null> => {
  try {
    const response = await api.get('/bitacora/today');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const updateBitacora = async (id: string, bitacora: DailyBitacoraCreate): Promise<DailyBitacora> => {
  const response = await api.put(`/bitacora/${id}`, bitacora);
  return response.data;
};

export const getBitacoraById = async (id: string): Promise<DailyBitacora> => {
  const response = await api.get(`/bitacora/${id}`);
  return response.data;
};

export default api;
