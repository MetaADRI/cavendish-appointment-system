const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get public statistics for homepage
router.get('/statistics', async (req, res) => {
  try {
    // Count active students
    const [studentsResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "student" AND status = "active"'
    );
    
    // Count total appointments
    const [appointmentsResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM appointments'
    );
    
    // Count active officials
    const [officialsResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "official" AND status = "active"'
    );

    res.json({
      activeStudents: studentsResult[0].count,
      totalAppointments: appointmentsResult[0].count,
      activeOfficials: officialsResult[0].count
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all officials' availability (public)
router.get('/officials/availability', async (req, res) => {
  try {
    // Get all active officials with their availability
    const [officials] = await pool.execute(`
      SELECT 
        u.id, 
        u.full_name, 
        u.title, 
        u.email,
        GROUP_CONCAT(oa.day_of_week ORDER BY FIELD(oa.day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') SEPARATOR ',') as available_days
      FROM users u
      LEFT JOIN official_availability oa ON u.id = oa.official_id
      WHERE u.role = 'official' AND u.status = 'active'
      GROUP BY u.id, u.full_name, u.title, u.email
      ORDER BY u.full_name ASC
    `);

    // Format the response
    const formattedOfficials = officials.map(official => ({
      id: official.id,
      full_name: official.full_name,
      title: official.title,
      email: official.email,
      available_days: official.available_days ? official.available_days.split(',') : []
    }));

    res.json({ officials: formattedOfficials });
  } catch (error) {
    console.error('Get officials availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
