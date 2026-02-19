-- Audit Logging System for Mamá Respira
-- Migration: 006_audit_logs.sql

-- ==================== AUDIT LOGS TABLE ====================

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES auth.users ON DELETE SET NULL,
    action      TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
    ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
    ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON audit_logs(created_at DESC);

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own audit logs (via the client)
CREATE POLICY "Users can insert own audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own logs
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Coaches can view all audit logs for monitoring
CREATE POLICY "Coaches can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'coach'
        )
    );

-- Nobody can UPDATE or DELETE audit logs (immutable)

-- ==================== CLEANUP ====================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
BEGIN
    -- Keep 90 days of audit history
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE audit_logs IS 'Immutable security audit trail for all user actions';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than 90 days. Run weekly.';
