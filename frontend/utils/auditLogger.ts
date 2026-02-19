import { supabase } from '../lib/supabase';

export type AuditAction =
    | 'message_sent'
    | 'message_received'
    | 'bitacora_created'
    | 'bitacora_updated'
    | 'checkin_created'
    | 'profile_updated'
    | 'avatar_uploaded'
    | 'session_started'
    | 'session_ended'
    | 'suspicious_activity'
    | 'rate_limit_hit';

export type AuditResource =
    | 'direct_message'
    | 'chat_message'
    | 'bitacora'
    | 'checkin'
    | 'profile'
    | 'storage'
    | 'auth'
    | 'security';

/**
 * Lightweight audit logger – fire-and-forget, never blocks the UI
 */
export class AuditLogger {
    /**
     * Log a generic security event
     */
    static async log(
        action: AuditAction,
        resource: AuditResource,
        resourceId?: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        try {
            await supabase.from('audit_logs').insert({
                action,
                resource_type: resource,
                resource_id: resourceId ?? null,
                metadata: metadata ?? {},
            });
        } catch {
            // Never throw – audit logging must not break the user flow
        }
    }

    // ─── Convenience helpers ──────────────────────────────────────────────────

    static logMessageSent(messageId: string, recipientId: string) {
        return this.log('message_sent', 'direct_message', messageId, { recipient_id: recipientId });
    }

    static logBitacoraCreated(bitacoraId: string) {
        return this.log('bitacora_created', 'bitacora', bitacoraId);
    }

    static logCheckInCreated(checkInId: string) {
        return this.log('checkin_created', 'checkin', checkInId);
    }

    static logProfileUpdated(fieldsChanged: string[]) {
        return this.log('profile_updated', 'profile', undefined, { fields_changed: fieldsChanged });
    }

    static logAvatarUploaded() {
        return this.log('avatar_uploaded', 'storage');
    }

    static logSessionStarted() {
        return this.log('session_started', 'auth');
    }

    static logSessionEnded() {
        return this.log('session_ended', 'auth');
    }

    static logSuspiciousActivity(reason: string, details?: Record<string, unknown>) {
        return this.log('suspicious_activity', 'security', undefined, { reason, ...details });
    }

    static logRateLimitHit(action: string) {
        return this.log('rate_limit_hit', 'security', undefined, { blocked_action: action });
    }
}
