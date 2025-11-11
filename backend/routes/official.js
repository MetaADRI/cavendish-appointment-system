const express = require('express');
const pool = require('../config/database');
const { requireOfficial } = require('../middleware/auth');

const router = express.Router();

// Get official's appointments
router.get('/me/appointments', requireOfficial, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, u.full_name as student_name
      FROM appointments a
      JOIN users u ON a.student_id = u.id
      WHERE a.official_id = ?
    `;
    
    const params = [req.session.user.id];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const [appointments] = await pool.execute(query, params);

    res.json({ appointments });
  } catch (error) {
    console.error('Get official appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get official's availability
router.get('/me/availability', requireOfficial, async (req, res) => {
  try {
    const [availability] = await pool.execute(
      'SELECT day_of_week FROM official_availability WHERE official_id = ? ORDER BY FIELD(day_of_week, "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")',
      [req.session.user.id]
    );

    const days = availability.map(row => row.day_of_week);
    res.json({ days });
  } catch (error) {
    console.error('Get official availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update official's availability
router.post('/me/availability', requireOfficial, async (req, res) => {
  try {
    const { days } = req.body;

    if (!Array.isArray(days)) {
      return res.status(400).json({ error: 'Days must be an array' });
    }

    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const invalidDays = days.filter(day => !validDays.includes(day));
    
    if (invalidDays.length > 0) {
      return res.status(400).json({ error: 'Invalid day names provided' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete existing availability
      await connection.execute(
        'DELETE FROM official_availability WHERE official_id = ?',
        [req.session.user.id]
      );

      // Insert new availability
      if (days.length > 0) {
        const values = days.map(day => [req.session.user.id, day]);
        await connection.query(
          'INSERT INTO official_availability (official_id, day_of_week) VALUES ?',
          [values]
        );
      }

      await connection.commit();
      connection.release();

      res.json({ message: 'Availability updated successfully', days });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Update official availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;