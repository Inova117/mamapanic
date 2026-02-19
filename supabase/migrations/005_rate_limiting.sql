-- Rate Limiting System for Mamá Respira
-- Migration: 005_rate_limiting.sql

-- ==================== RATE LIMITS TABLE ====================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    action TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
    ON rate_limits(user_id, action, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
    ON rate_limits(window_start);

-- ==================== RATE LIMIT FUNCTION ====================

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_requests INTEGER,
    p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMP;
BEGIN
    v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Contar requests en la ventana de tiempo
    SELECT COALESCE(SUM(count), 0) INTO v_count
    FROM rate_limits
    WHERE user_id = p_user_id
        AND action = p_action
        AND window_start > v_window_start;
    
    -- Si excede el límite, rechazar
    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Registrar el request
    INSERT INTO rate_limits (user_id, action, window_start)
    VALUES (p_user_id, p_action, NOW())
    ON CONFLICT DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== CLEANUP FUNCTION ====================

-- Función para limpiar registros antiguos (ejecutar diariamente)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios rate limits
CREATE POLICY "Users can view own rate limits"
    ON rate_limits FOR SELECT
    USING (auth.uid() = user_id);

-- Solo el sistema puede insertar (via función)
CREATE POLICY "System can insert rate limits"
    ON rate_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Coaches pueden ver todos los rate limits (para monitoreo)
CREATE POLICY "Coaches can view all rate limits"
    ON rate_limits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- ==================== COMENTARIOS ====================

COMMENT ON TABLE rate_limits IS 'Tracks API usage for rate limiting';
COMMENT ON FUNCTION check_rate_limit IS 'Verifies if user can perform action within rate limit';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes rate limit records older than 7 days';
