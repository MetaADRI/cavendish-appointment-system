const express = require('express');
const pool = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const router = express.Router();

// ==================== STUDENT USER MANAGEMENT ====================

// Get users (students) - with optional status filter
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT id, full_name, email, student_number, role, status, created_at FROM users WHERE role = "student"';
    const params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [users] = await pool.execute(query, params);
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve user (student)
router.put('/users/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      'UPDATE users SET status = "active" WHERE id = ? AND role = "student"',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject user (student)
router.put('/users/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      'UPDATE users SET status = "rejected" WHERE id = ? AND role = "student"',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all appointments
router.get('/appointments', requireAdmin, async (req, res) => {
  try {
    const [appointments] = await pool.execute(`
      SELECT 
        a.id,
        a.appointment_code,
        a.appointment_date,
        a.appointment_time,
        a.mode,
        a.status,
        a.purpose,
        a.created_at,
        s.full_name as student_name,
        s.email as student_email,
        o.full_name as official_name,
        o.email as official_email
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users o ON a.official_id = o.id
      ORDER BY a.created_at DESC
    `);
    
    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== OFFICIALS MANAGEMENT ====================

// Create new official
router.post('/officials', requireAdmin, async (req, res) => {
  try {
    const { full_name, email, password, title } = req.body;

    // Validate input
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into database
    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, title, password_hash, role, status) VALUES (?, ?, ?, ?, "official", "active")',
      [full_name, email, title || null, passwordHash]
    );

    res.status(201).json({
      id: result.insertId,
      full_name,
      email,
      title,
      role: 'official',
      status: 'active'
    });
  } catch (error) {
    console.error('Create official error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all officials
router.get('/officials', requireAdmin, async (req, res) => {
  try {
    const [officials] = await pool.execute(
      'SELECT id, full_name, email, title, status, created_at FROM users WHERE role = "official" ORDER BY created_at DESC'
    );

    res.json({ officials });
  } catch (error) {
    console.error('Get officials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate official
router.put('/officials/:id/deactivate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'UPDATE users SET status = "rejected" WHERE id = ? AND role = "official"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Official not found' });
    }

    res.json({ message: 'Official deactivated successfully' });
  } catch (error) {
    console.error('Deactivate official error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate official
router.put('/officials/:id/activate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'UPDATE users SET status = "active" WHERE id = ? AND role = "official"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Official not found' });
    }

    res.json({ message: 'Official activated successfully' });
  } catch (error) {
    console.error('Activate official error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete official
router.delete('/officials/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ? AND role = "official"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Official not found' });
    }

    res.json({ message: 'Official deleted successfully' });
  } catch (error) {
    console.error('Delete official error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
