-- Admin SMS Commands Audit Log Table
-- Tracks all SMS commands sent by admins for event control
-- Created: 2025-10-02

CREATE TABLE IF NOT EXISTS admin_sms_commands (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_users(id),
  admin_phone VARCHAR(20) NOT NULL,
  event_id INTEGER REFERENCES events(id),
  event_code VARCHAR(20),
  command_type VARCHAR(50) NOT NULL,
  command_text TEXT NOT NULL,
  parsed_command JSONB,
  executed BOOLEAN DEFAULT false,
  success BOOLEAN,
  response_message TEXT,
  error_message TEXT,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_admin_sms_commands_admin ON admin_sms_commands(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sms_commands_event ON admin_sms_commands(event_id);
CREATE INDEX IF NOT EXISTS idx_admin_sms_commands_created ON admin_sms_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sms_commands_phone ON admin_sms_commands(admin_phone);
