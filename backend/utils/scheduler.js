const pool = require('../config/database');

/**
 * Slot Tracking Scheduler
 * Handles time-driven appointment operations:
 * - Send reminders 10 minutes before
 * - Prompt presence at start time
 * - Finalize sessions after 30 minutes
 * 
 * All operations are idempotent (safe to run multiple times)
 */

let schedulerInterval = null;
let isRunning = false;

// Configuration from env
const SCHEDULER_INTERVAL = (parseInt(process.env.SCHEDULER_INTERVAL_SECONDS) || 30) * 1000;
const REMINDER_MINUTES = parseInt(process.env.REMINDER_MINUTES_BEFORE) || 10;
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION_MINUTES) || 30;

/**
 * Log with timestamp
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SCHEDULER] [${level}] ${message}`);
}

/**
 * Get current time in UTC (for database comparison)
 * Appointments are stored in UTC in the database
 */
function getCurrentUTC() {
  return new Date();
}

/**
 * Check if operation was already executed (idempotence)
 */
async function wasOperationExecuted(appointmentId, operationType) {
  const [rows] = await pool.execute(
    'SELECT id FROM scheduler_state WHERE appointment_id = ? AND operation_type = ?',
    [appointmentId, operationType]
  );
  return rows.length > 0;
}

/**
 * Mark operation as executed
 */
async function markOperationExecuted(appointmentId, operationType, details = null) {
  await pool.execute(
    'INSERT INTO scheduler_state (appointment_id, operation_type, details) VALUES (?, ?, ?)',
    [appointmentId, operationType, details]
  );
}

/**
 * Create notification for user
 */
async function createNotification(userId, appointmentId, type, message) {
  try {
    await pool.execute(
      'INSERT INTO notifications (user_id, appointment_id, type, message) VALUES (?, ?, ?, ?)',
      [userId, appointmentId, type, message]
    );
    log(`Notification created for user ${userId}: ${type}`);
  } catch (error) {
    log(`Failed to create notification: ${error.message}`, 'ERROR');
  }
}

/**
 * Send reminders 10 minutes before appointment
 */
async function processReminders() {
  const reminderTime = new Date(getCurrentUTC().getTime() + REMINDER_MINUTES * 60 * 1000);
  const reminderTimeEnd = new Date(reminderTime.getTime() + SCHEDULER_INTERVAL);

  try {
    // Find approved appointments starting in ~10 minutes that haven't been reminded
    const [appointments] = await pool.execute(`
      SELECT 
        a.id, a.appointment_code, a.student_id, a.official_id, 
        a.appointment_date, a.appointment_time, a.purpose,
        s.full_name as student_name, o.full_name as official_name
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users o ON a.official_id = o.id
      WHERE a.status = 'approved'
        AND a.reminder_sent = 0
        AND TIMESTAMP(a.appointment_date, a.appointment_time) BETWEEN ? AND ?
    `, [reminderTime, reminderTimeEnd]);

    for (const appt of appointments) {
      // Check idempotence
      if (await wasOperationExecuted(appt.id, 'reminder')) {
        continue;
      }

      const appointmentTime = new Date(`${appt.appointment_date} ${appt.appointment_time}`);
      const message = `Reminder: Your appointment (${appt.appointment_code}) starts in 10 minutes at ${appointmentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

      // Send to student
      await createNotification(appt.student_id, appt.id, 'reminder', message);
      
      // Send to official
      await createNotification(appt.official_id, appt.id, 'reminder', message);

      // Mark reminder as sent
      await pool.execute(
        'UPDATE appointments SET reminder_sent = 1 WHERE id = ?',
        [appt.id]
      );

      // Mark operation as executed
      await markOperationExecuted(appt.id, 'reminder', 'Reminders sent to both parties');

      log(`Reminder sent for appointment ${appt.appointment_code}`);
    }
  } catch (error) {
    log(`Error processing reminders: ${error.message}`, 'ERROR');
  }
}

/**
 * Prompt presence at appointment start time
 */
async function processPresencePrompts() {
  const now = getCurrentUTC();
  const windowEnd = new Date(now.getTime() + SCHEDULER_INTERVAL);

  try {
    // Find appointments starting now (within scheduler window)
    const [appointments] = await pool.execute(`
      SELECT 
        a.id, a.appointment_code, a.student_id, a.official_id,
        a.appointment_date, a.appointment_time, a.started_at,
        s.full_name as student_name, o.full_name as official_name
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users o ON a.official_id = o.id
      WHERE a.status = 'approved'
        AND a.started_at IS NULL
        AND TIMESTAMP(a.appointment_date, a.appointment_time) BETWEEN ? AND ?
    `, [now, windowEnd]);

    for (const appt of appointments) {
      // Check idempotence
      if (await wasOperationExecuted(appt.id, 'presence_prompt')) {
        continue;
      }

      const message = `Your appointment (${appt.appointment_code}) is starting now! Please confirm your presence.`;

      // Send presence prompt to student
      await createNotification(appt.student_id, appt.id, 'presence_prompt', message);
      
      // Send presence prompt to official
      await createNotification(appt.official_id, appt.id, 'presence_prompt', message);

      // Mark session as started (started_at timestamp)
      await pool.execute(
        'UPDATE appointments SET started_at = ? WHERE id = ?',
        [now, appt.id]
      );

      // Mark operation as executed
      await markOperationExecuted(appt.id, 'presence_prompt', 'Presence prompts sent');

      log(`Presence prompt sent for appointment ${appt.appointment_code}`);
    }
  } catch (error) {
    log(`Error processing presence prompts: ${error.message}`, 'ERROR');
  }
}

/**
 * Check presence and update status to in_progress
 */
async function checkPresenceStatus() {
  try {
    // Find appointments that have started but not yet in progress
    const [appointments] = await pool.execute(`
      SELECT id, appointment_code, student_present, official_present, student_id, official_id
      FROM appointments
      WHERE status = 'approved'
        AND started_at IS NOT NULL
        AND student_present = 1
        AND official_present = 1
    `);

    for (const appt of appointments) {
      // Both present - move to in_progress
      await pool.execute(
        'UPDATE appointments SET status = ? WHERE id = ?',
        ['in_progress', appt.id]
      );

      await createNotification(appt.student_id, appt.id, 'status_update', 
        `Your appointment (${appt.appointment_code}) is now in progress.`);
      await createNotification(appt.official_id, appt.id, 'status_update', 
        `Your appointment (${appt.appointment_code}) is now in progress.`);

      log(`Appointment ${appt.appointment_code} moved to in_progress`);
    }
  } catch (error) {
    log(`Error checking presence status: ${error.message}`, 'ERROR');
  }
}

/**
 * Finalize sessions after 30 minutes
 */
async function finalizeSessions() {
  const now = getCurrentUTC();

  try {
    // Find sessions that should end now (started_at + SESSION_DURATION minutes)
    const [appointments] = await pool.execute(`
      SELECT 
        a.id, a.appointment_code, a.student_id, a.official_id,
        a.student_present, a.official_present, a.started_at,
        s.full_name as student_name, o.full_name as official_name
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users o ON a.official_id = o.id
      WHERE a.status IN ('approved', 'in_progress')
        AND a.started_at IS NOT NULL
        AND a.ended_at IS NULL
        AND TIMESTAMPDIFF(MINUTE, a.started_at, ?) >= ?
    `, [now, SESSION_DURATION]);

    for (const appt of appointments) {
      // Check idempotence
      if (await wasOperationExecuted(appt.id, 'finalize')) {
        continue;
      }

      let newStatus = 'missed';
      let presenceNote = '';

      if (appt.student_present && appt.official_present) {
        // Both present
        newStatus = 'completed';
        presenceNote = 'Both parties present';
      } else if (appt.student_present || appt.official_present) {
        // Partial presence
        newStatus = 'completed';
        presenceNote = appt.student_present ? 
          `Student present, Official absent` : 
          `Official present, Student absent`;
      } else {
        // Nobody showed up
        newStatus = 'missed';
        presenceNote = 'Neither party confirmed presence';
      }

      // Update appointment
      await pool.execute(
        'UPDATE appointments SET status = ?, ended_at = ?, presence_note = ? WHERE id = ?',
        [newStatus, now, presenceNote, appt.id]
      );

      // Notify both parties
      const statusMessage = newStatus === 'completed' ? 
        `Your appointment (${appt.appointment_code}) has been completed.` :
        `Your appointment (${appt.appointment_code}) was marked as missed.`;

      await createNotification(appt.student_id, appt.id, newStatus, statusMessage);
      await createNotification(appt.official_id, appt.id, newStatus, statusMessage);

      // Mark operation as executed
      await markOperationExecuted(appt.id, 'finalize', presenceNote);

      log(`Appointment ${appt.appointment_code} finalized: ${newStatus} (${presenceNote})`);
    }
  } catch (error) {
    log(`Error finalizing sessions: ${error.message}`, 'ERROR');
  }
}

/**
 * Main scheduler tick - runs all checks
 */
async function schedulerTick() {
  if (isRunning) {
    log('Previous tick still running, skipping...', 'WARN');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    log('Scheduler tick started');

    // Run all scheduler tasks
    await processReminders();
    await processPresencePrompts();
    await checkPresenceStatus();
    await finalizeSessions();

    const duration = Date.now() - startTime;
    log(`Scheduler tick completed in ${duration}ms`);
  } catch (error) {
    log(`Scheduler tick failed: ${error.message}`, 'ERROR');
  } finally {
    isRunning = false;
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  const enabled = process.env.ENABLE_SLOT_TRACKER === 'true';
  
  if (!enabled) {
    log('Slot tracker is DISABLED (ENABLE_SLOT_TRACKER=false)', 'WARN');
    return;
  }

  if (schedulerInterval) {
    log('Scheduler already running', 'WARN');
    return;
  }

  log(`Starting scheduler (interval: ${SCHEDULER_INTERVAL}ms, reminder: ${REMINDER_MINUTES}min before, session: ${SESSION_DURATION}min)`);
  
  // Run immediately
  schedulerTick();
  
  // Then run at intervals
  schedulerInterval = setInterval(schedulerTick, SCHEDULER_INTERVAL);
  
  log('Scheduler started successfully');
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log('Scheduler stopped');
  }
}

/**
 * Get scheduler status (for health check)
 */
function getSchedulerStatus() {
  return {
    enabled: process.env.ENABLE_SLOT_TRACKER === 'true',
    running: schedulerInterval !== null,
    isProcessing: isRunning,
    config: {
      intervalSeconds: SCHEDULER_INTERVAL / 1000,
      reminderMinutes: REMINDER_MINUTES,
      sessionDuration: SESSION_DURATION
    }
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus
};
