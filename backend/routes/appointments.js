const express = require('express');
const pool = require('../config/database');
const { requireStudent, requireOfficial, requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Generate unique appointment code
function generateAppointmentCode() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CAV-${dateStr}-${random}`;
}

// Create appointment
router.post('/', requireStudent, async (req, res) => {
  try {
    const { purpose, appointment_date, appointment_time, mode, official_id } = req.body;

    if (!purpose || !appointment_date || !appointment_time || !mode || !official_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify official exists and is active
    const [officials] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND role = "official" AND status = "active"',
      [official_id]
    );

    if (officials.length === 0) {
      return res.status(400).json({ error: 'Selected official is not available' });
    }

    const officialId = official_id;

    // Check for existing appointment at same time
    const [existingAppointments] = await pool.execute(
      'SELECT id FROM appointments WHERE official_id = ? AND appointment_date = ? AND appointment_time = ? AND status IN ("pending", "approved")',
      [officialId, appointment_date, appointment_time]
    );

    if (existingAppointments.length > 0) {
      return res.status(400).json({ error: 'Time slot already booked' });
    }

    const appointment_code = generateAppointmentCode();

    // Create appointment
    await pool.execute(
      'INSERT INTO appointments (appointment_code, student_id, official_id, purpose, appointment_date, appointment_time, mode, status) VALUES (?, ?, ?, ?, ?, ?, ?, "pending")',
      [appointment_code, req.session.user.id, officialId, purpose, appointment_date, appointment_time, mode]
    );

    res.status(201).json({ 
      message: 'Appointment request submitted successfully', 
      appointment_code 
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment status
router.put('/:id/status', requireOfficial, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [result] = await pool.execute(
      'UPDATE appointments SET status = ? WHERE id = ? AND official_id = ?',
      [status, id, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: `Appointment ${status} successfully` });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark presence for appointment (NEW - SLOT TRACKER)
router.post('/:id/presence', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { present } = req.body;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    if (typeof present !== 'boolean') {
      return res.status(400).json({ error: 'Present must be true or false' });
    }

    // Get appointment and verify user is part of it
    const [appointments] = await pool.execute(
      'SELECT id, student_id, official_id, status, student_present, official_present FROM appointments WHERE id = ?',
      [id]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointments[0];

    // Determine which field to update based on user role
    let updateField = null;
    if (userRole === 'student' && appointment.student_id === userId) {
      updateField = 'student_present';
    } else if (userRole === 'official' && appointment.official_id === userId) {
      updateField = 'official_present';
    } else {
      return res.status(403).json({ error: 'Not authorized for this appointment' });
    }

    // Update presence
    const presentValue = present ? 1 : 0;
    await pool.execute(
      `UPDATE appointments SET ${updateField} = ? WHERE id = ?`,
      [presentValue, id]
    );

    // Get updated appointment
    const [updated] = await pool.execute(
      'SELECT student_present, official_present, status FROM appointments WHERE id = ?',
      [id]
    );

    res.json({ 
      message: 'Presence updated', 
      appointment: updated[0]
    });
  } catch (error) {
    console.error('Update presence error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming appointments (NEW - SLOT TRACKER)
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    // Get appointments for next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let query = '';
    let params = [];

    if (userRole === 'student') {
      query = `
        SELECT 
          a.*, 
          u.full_name as official_name, 
          u.title as official_title
        FROM appointments a
        JOIN users u ON a.official_id = u.id
        WHERE a.student_id = ?
          AND TIMESTAMP(a.appointment_date, a.appointment_time) BETWEEN ? AND ?
          AND a.status IN ('approved', 'in_progress')
        ORDER BY a.appointment_date, a.appointment_time
      `;
      params = [userId, now, tomorrow];
    } else if (userRole === 'official') {
      query = `
        SELECT 
          a.*, 
          u.full_name as student_name
        FROM appointments a
        JOIN users u ON a.student_id = u.id
        WHERE a.official_id = ?
          AND TIMESTAMP(a.appointment_date, a.appointment_time) BETWEEN ? AND ?
          AND a.status IN ('approved', 'in_progress')
        ORDER BY a.appointment_date, a.appointment_time
      `;
      params = [userId, now, tomorrow];
    } else {
      return res.json({ appointments: [] });
    }

    const [appointments] = await pool.execute(query, params);
    res.json({ appointments });
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notifications for user (NEW - SLOT TRACKER)
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { limit = 20, unread_only = 'false' } = req.query;

    let query = `
      SELECT 
        n.id, n.type, n.message, n.is_read, n.created_at,
        n.appointment_id, a.appointment_code
      FROM notifications n
      LEFT JOIN appointments a ON n.appointment_id = a.id
      WHERE n.user_id = ?
    `;

    if (unread_only === 'true') {
      query += ' AND n.is_read = 0';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ?';

    const [notifications] = await pool.execute(query, [userId, parseInt(limit)]);
    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read (NEW - SLOT TRACKER)
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Force end appointment (NEW - SLOT TRACKER)
router.post('/:id/force-end', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['completed', 'missed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be completed or missed' });
    }

    const now = new Date();
    await pool.execute(
      'UPDATE appointments SET status = ?, ended_at = ?, presence_note = ? WHERE id = ?',
      [status, now, note || 'Manually ended by admin', id]
    );

    res.json({ message: 'Appointment ended successfully' });
  } catch (error) {
    console.error('Force end appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;