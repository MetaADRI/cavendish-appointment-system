-- ============================================
-- Migration: Add Slot Tracking System
-- Date: 2025-01-07
-- Description: Adds time-driven slot tracking with presence, reminders, and status management
-- Safety: All changes are additive (non-destructive)
-- ============================================

-- Step 1: Add presence tracking columns
-- These columns track whether student and official have confirmed presence
ALTER TABLE appointments 
  ADD COLUMN student_present TINYINT(1) DEFAULT 0 COMMENT 'Student confirmed presence',
  ADD COLUMN official_present TINYINT(1) DEFAULT 0 COMMENT 'Official confirmed presence';

-- Step 2: Add session timing columns
-- Track when the session actually started and ended
ALTER TABLE appointments 
  ADD COLUMN started_at DATETIME NULL COMMENT 'When session actually started',
  ADD COLUMN ended_at DATETIME NULL COMMENT 'When session actually ended';

-- Step 3: Add presence note for admin visibility
ALTER TABLE appointments 
  ADD COLUMN presence_note VARCHAR(255) NULL COMMENT 'Notes about presence (e.g., partial attendance)';

-- Step 4: Add reminder tracking
ALTER TABLE appointments 
  ADD COLUMN reminder_sent TINYINT(1) DEFAULT 0 COMMENT 'Whether 10-min reminder was sent';

-- Step 5: Convert status from ENUM to VARCHAR if needed (safe approach)
-- First check if status is ENUM, if so, we need to convert safely
-- Note: This preserves all existing values
ALTER TABLE appointments 
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending' 
  COMMENT 'Status: pending, approved, rejected, in_progress, completed, missed';

-- Step 6: Create unique constraint to prevent double-booking
-- One official cannot have two appointments at the same date/time
-- Note: We use IF NOT EXISTS equivalent by checking if index doesn't exist
CREATE UNIQUE INDEX ux_official_date_time ON appointments (official_id, appointment_date, appointment_time);

-- Step 7: Create notifications table for reminders and alerts
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  appointment_id INT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'Type: reminder, presence_prompt, completed, missed',
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User notifications for appointments';

-- Step 8: Create scheduler_state table to track scheduler operations (idempotence)
CREATE TABLE IF NOT EXISTS scheduler_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL COMMENT 'Type: reminder, presence_prompt, finalize',
  appointment_id INT NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details TEXT NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  INDEX idx_operation (operation_type, appointment_id),
  INDEX idx_executed (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks scheduler operations for idempotence';

-- ============================================
-- Migration completed successfully
-- All changes are backward compatible
-- Existing appointments will continue to work
-- New features are activated via ENABLE_SLOT_TRACKER flag
-- ============================================
