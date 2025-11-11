const express = require('express');
const pool = require('../config/database');
const { requireStudent, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get active officials (available to authenticated users for appointment booking)
router.get('/officials', requireAuth, async (req, res) => {
  try {
    const [officials] = await pool.execute(
      'SELECT id, full_name, email, title FROM users WHERE role = "official" AND status = "active" ORDER BY full_name ASC'
    );

    res.json({ officials });
  } catch (error) {
    console.error('Get active officials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student profile
router.get('/me', requireStudent, (req, res) => {
  res.json({ user: req.session.user });
});

// Get student's appointments
router.get('/me/appointments', requireStudent, async (req, res) => {
  try {
    const [appointments] = await pool.execute(`
      SELECT a.*, u.full_name as official_name
      FROM appointments a
      JOIN users u ON a.official_id = u.id
      WHERE a.student_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, [req.session.user.id]);

    res.json({ appointments });
  } catch (error) {
    console.error('Get student appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;