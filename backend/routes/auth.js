const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { full_name, email, password, student_number } = req.body;

    // Validate input
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if student number already exists (if provided)
    if (student_number) {
      const [existingStudentNumber] = await pool.execute(
        'SELECT id FROM users WHERE student_number = ?',
        [student_number]
      );

      if (existingStudentNumber.length > 0) {
        return res.status(400).json({ error: 'Student number already exists' });
      }
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute(
      'INSERT INTO users (full_name, email, student_number, password_hash, role, status) VALUES (?, ?, ?, ?, "student", "pending")',
      [full_name, email, student_number || null, passwordHash]
    );

    res.status(201).json({ message: 'Account created — waiting admin approval' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if student account is approved
    if (user.role === 'student' && user.status !== 'active') {
      return res.status(401).json({ error: 'Account pending admin approval' });
    }

    // Set session
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    res.json({
      message: 'Login successful',
      user: req.session.user,
      redirect: user.role === 'admin' ? '/admin-dashboard' : 
               user.role === 'official' ? '/official-dashboard' : '/dashboard'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;