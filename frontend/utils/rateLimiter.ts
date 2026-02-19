import { supabase } from '../lib/supabase';

interface RateLimitConfig {
    action: string;
    maxRequests: number;
    windowMinutes: number;
}

/**
 * Rate Limiter para prevenir abuso de la API
 */
export class RateLimiter {
    /**
     * Verificar si el usuario puede realizar una acción
     */
    private static async checkLimit(config: RateLimitConfig): Promise<boolean> {
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) {
                // Si no hay usuario autenticado, denegar
                return false;
            }

            const { data, error } = await supabase.rpc('check_rate_limit', {
                p_user_id: user.id,
                p_action: config.action,
                p_max_requests: config.maxRequests,
                p_window_minutes: config.windowMinutes
            });

            if (error) {
                console.error('Rate limit check failed:', error);
                // Fail open: permitir en caso de error para no bloquear usuarios
                return true;
            }

            return data === true;
        } catch (error) {
            console.error('Rate limiter exception:', error);
            return true; // Fail open
        }
    }

    /**
     * Verificar si puede enviar un mensaje
     * Límite: 30 mensajes por hora
     */
    static async canSendMessage(): Promise<boolean> {
        return this.checkLimit({
            action: 'send_message',
            maxRequests: 30,
            windowMinutes: 60
        });
    }

    /**
     * Verificar si puede crear una bitácora
     * Límite: 10 bitácoras por día
     */
    static async canCreateBitacora(): Promise<boolean> {
        return this.checkLimit({
            action: 'create_bitacora',
            maxRequests: 10,
            windowMinutes: 1440 // 24 horas
        });
    }

    /**
     * Verificar si puede subir un archivo
     * Límite: 5 uploads por hora
     */
    static async canUploadFile(): Promise<boolean> {
        return this.checkLimit({
            action: 'upload_file',
            maxRequests: 5,
            windowMinutes: 60
        });
    }

    /**
     * Verificar si puede crear un check-in
     * Límite: 20 check-ins por día
     */
    static async canCreateCheckIn(): Promise<boolean> {
        return this.checkLimit({
            action: 'create_checkin',
            maxRequests: 20,
            windowMinutes: 1440
        });
    }

    /**
     * Verificar si puede hacer una llamada a la API de chat
     * Límite: 50 mensajes de chat por hora
     */
    static async canSendChatMessage(): Promise<boolean> {
        return this.checkLimit({
            action: 'send_chat_message',
            maxRequests: 50,
            windowMinutes: 60
        });
    }

    /**
     * Mensaje de error estándar para mostrar al usuario
     */
    static getRateLimitMessage(action: string): string {
        const messages: Record<string, string> = {
            send_message: 'Has enviado demasiados mensajes. Por favor, espera unos minutos.',
            create_bitacora: 'Has creado demasiadas bitácoras hoy. Intenta mañana.',
            upload_file: 'Has subido demasiados archivos. Espera un momento.',
            create_checkin: 'Has creado demasiados check-ins hoy. Intenta más tarde.',
            send_chat_message: 'Has enviado demasiados mensajes al chat. Espera un momento.'
        };

        return messages[action] || 'Has excedido el límite de uso. Por favor, espera un momento.';
    }
}
