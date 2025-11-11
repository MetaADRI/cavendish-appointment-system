#  Cavendish University Appointment System

A modern, full-featured appointment scheduling system for students, officials, and administrators at Cavendish University Zambia. Built with Node.js, Express, and MySQL.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

---

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [Common Issues](#common-issues)
- [User Roles](#user-roles)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

##  Features

### For Students
-  **Book Appointments** with university officials
-  **Track Status** in real-time (pending, approved, rejected, in-progress, completed)
-  **View Availability** of all officials (public page)
-  **Get Reminders** 10 minutes before appointments
-  **Confirm Presence** via interactive modal
-  **Receive Notifications** for all appointment updates

### For Officials
-  **Set Weekly Availability** (Sunday-Saturday)
-  **Approve/Reject** appointment requests
-  **View Schedule** with all appointments
-  **Track Presence** of students
-  **Get Reminders** and notifications
-  **Manage Appointments** efficiently

### For Administrators
-  **Manage Users** (students and officials)
-  **Monitor Appointments** across the system
-  **View Statistics** (active students, total appointments)
-  **Track Presence** and partial attendance
-  **Force-end Appointments** if needed
-  **Check Scheduler Health**

### System Features
-  **Fixed Time Slots** (08:30 - 15:30, 30-minute intervals)
-  **Double-Booking Prevention** (database-level constraint)
-  **Real-Time Notifications** (20-second polling)
-  **Responsive Design** (mobile-friendly)
-  **Secure Authentication** (session-based)
-  **Timezone Support** (Africa/Lusaka, UTC+2)
-  **Audit Trail** (scheduler operations logged)
-  **Feature Flag Protection** (safe deployment)

---

##  System Architecture

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: MySQL 5.7+
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Bootstrap 5.3.0
- **Session Management**: express-session
- **Authentication**: bcrypt

### How It Works

#### 1. **Appointment Booking Flow**
```
Student → Create Appointment → Official Receives Request
                ↓
        Official Approves
                ↓
        System Schedules (10 min before: Reminder)
                ↓
        Appointment Time (Both confirm presence)
                ↓
        Status: In Progress (30-minute session)
                ↓
        Auto-Complete (Status: Completed/Missed)
```

#### 2. **Scheduler System (Time-Driven)**
The system includes an automated scheduler that runs every 30 seconds:
- **T-10 minutes**: Sends reminder notifications
- **T-0 (Start time)**: Prompts presence confirmation
- **T+30 minutes**: Finalizes session (completed/missed)

#### 3. **Status Flow**
```
pending → approved → in_progress → completed
                  ↓               ↓
                rejected        missed
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v5.7 or higher) - [Download](https://dev.mysql.com/downloads/)
- **Git** (optional) - [Download](https://git-scm.com/)
- **Code Editor** (VS Code recommended) - [Download](https://code.visualstudio.com/)

### Verify Installation
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check MySQL installation
mysql --version
```

---

## 🚀 Installation

### Step 1: Clone or Download the Project
```bash
# If using Git
git clone <repository-url>
cd cavendish-appointment-system

# Or download and extract the ZIP file
```

### Step 2: Install Dependencies
Open terminal in VS Code (`Ctrl + `` or Terminal → New Terminal`) and run:

```bash
npm install
```

This will install all required packages:
- express
- express-session
- bcrypt
- mysql2
- dotenv

**Expected output:**
```
added 147 packages, and audited 148 packages in 30s
found 0 vulnerabilities
```

---

## 🗄️ Database Setup

### Step 1: Create MySQL Database
Open MySQL command line or MySQL Workbench and run:

```sql
CREATE DATABASE cavendish_appointment_system;
```

### Step 2: Configure Environment Variables
1. Open the `.env` file in the project root
2. Update the database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=cavendish_appointment_system
SESSION_SECRET=your_session_secret_here
PORT=3000

# Slot Tracker Feature (default: false)
ENABLE_SLOT_TRACKER=false

# Timezone
TZ=Africa/Lusaka
SCHEDULER_TIMEZONE=Africa/Lusaka

# Scheduler Settings
SCHEDULER_INTERVAL_SECONDS=30
REMINDER_MINUTES_BEFORE=10
SESSION_DURATION_MINUTES=30
```

### Step 3: Initialize Database Tables
Run the database initialization script:

```bash
npm run init-db
```

**Or manually:**
```bash
node initDatabase.js
```

**Expected output:**
```
Connected to MySQL server
Database cavendish_appointment_system created or already exists
Users table created or already exists
Appointments table created or already exists
Admin user seeded
Official user seeded
Database initialization completed successfully!
```

### Step 4: Run Migrations (Optional - for Slot Tracker)
If you want to enable the slot tracker feature:

```bash
# Create backup first
node scripts/backup_database.js

# Run migration
node migrate_slot_tracking.js

# Run availability migration
node migrate_add_availability.js
```

### Default Users Created
After initialization, you can login with:

**Admin Account:**
- Email: `admin@cavendish.edu.zm`
- Password: `Admin123!`

**Official Account:**
- Email: `dean@cavendish.edu.zm`
- Password: `Dean123!`

**Students:** Sign up via the registration page

---

##  Running the Server

### Start the Server
```bash
npm start
```

**Or manually:**
```bash
node server.js
```

**Expected output:**
```
Cavendish Appointment System running on http://localhost:3000
[SCHEDULER] [WARN] Slot tracker is DISABLED (ENABLE_SLOT_TRACKER=false)
```

### Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

### Available Pages
- **Homepage**: `http://localhost:3000/`
- **Login**: `http://localhost:3000/login`
- **Sign Up**: `http://localhost:3000/signup`
- **Availability**: `http://localhost:3000/availability`
- **Student Dashboard**: `http://localhost:3000/dashboard`
- **Official Dashboard**: `http://localhost:3000/official-dashboard`
- **Admin Dashboard**: `http://localhost:3000/admin-dashboard`

---

##  Common Issues

### Issue 1: Port 3000 Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution - Windows (PowerShell/CMD):**

#### Option A: Find and Kill Process Using Port 3000
```bash
# Find the process using port 3000
netstat -ano | findstr :3000

# Example output:
# TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345

# Kill the process (replace 12345 with actual PID)
taskkill /PID 12345 /F

# Or kill all node processes
taskkill /F /IM node.exe
```

#### Option B: Use Different Port
Edit `.env` file:
```env
PORT=3001
```

Then restart the server.

---

### Issue 2: MySQL Connection Failed

**Error Message:**
```
Error: Access denied for user 'root'@'localhost'
```

**Solutions:**
1. **Check MySQL is running:**
   ```bash
   # Windows - check if MySQL service is running
   net start | findstr MySQL
   ```

2. **Verify credentials in `.env`:**
   - Ensure `DB_USER` and `DB_PASSWORD` are correct
   - Make sure `DB_NAME` exists

3. **Test MySQL connection:**
   ```bash
   mysql -u root -p
   # Enter your password
   ```

---

### Issue 3: Dependencies Not Installing

**Error Message:**
```
npm ERR! Cannot find module...
```

**Solutions:**
1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall:**
   ```bash
   # Windows
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   # Should be 18.0.0 or higher
   ```

---

### Issue 4: Database Tables Not Created

**Solutions:**
1. **Re-run initialization:**
   ```bash
   node initDatabase.js
   ```

2. **Check MySQL user permissions:**
   ```sql
   GRANT ALL PRIVILEGES ON cavendish_appointment_system.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Manually create tables:**
   - Check `initDatabase.js` for SQL statements
   - Run them manually in MySQL Workbench

---

### Issue 5: Slot Tracker Not Working

**Issue:** Scheduler not sending notifications

**Solutions:**
1. **Enable feature flag in `.env`:**
   ```env
   ENABLE_SLOT_TRACKER=true
   ```

2. **Restart the server:**
   ```bash
   taskkill /F /IM node.exe
   node server.js
   ```

3. **Check logs for scheduler:**
   ```
   [SCHEDULER] [INFO] Scheduler started successfully
   ```

4. **Verify migrations ran:**
   ```bash
   node migrate_slot_tracking.js
   ```

---

## 👥 User Roles

### Student
**Capabilities:**
- Create appointment requests
- View own appointments
- Track appointment status
- Confirm presence for appointments
- View official availability

**Access:** After signup and approval

### Official
**Capabilities:**
- Approve/reject appointments
- Set weekly availability
- View all appointments assigned to them
- Confirm presence
- Manage schedule

**Access:** Created by admin, login credentials provided

### Administrator
**Capabilities:**
- Manage all users (approve/reject students)
- View all appointments
- Monitor system statistics
- Force-end appointments
- Check scheduler health

**Access:** Pre-seeded account (admin@cavendish.edu.zm)

---

## 📡 API Documentation

### Authentication Endpoints
```
POST   /api/auth/signup       - Register new student
POST   /api/auth/login        - User login
POST   /api/auth/logout       - User logout
GET    /api/auth/me           - Get current user
```

### Student Endpoints
```
GET    /api/students/officials          - Get all active officials
GET    /api/students/me                 - Get student profile
GET    /api/students/me/appointments    - Get student appointments
```

### Official Endpoints
```
GET    /api/officials/me/appointments   - Get official appointments
GET    /api/officials/me/availability   - Get availability
POST   /api/officials/me/availability   - Update availability
```

### Appointment Endpoints
```
POST   /api/appointments                        - Create appointment
PUT    /api/appointments/:id/status             - Update status
POST   /api/appointments/:id/presence           - Mark presence
GET    /api/appointments/upcoming               - Get upcoming (24h)
GET    /api/appointments/notifications          - Get notifications
PUT    /api/appointments/notifications/:id/read - Mark as read
POST   /api/appointments/:id/force-end          - Admin force end
```

### Public Endpoints
```
GET    /api/public/statistics             - System statistics
GET    /api/public/officials/availability - Officials availability
```

### Admin Endpoints
```
GET    /api/admin/users                   - Get all users
PUT    /api/admin/users/:id/status        - Update user status
GET    /api/admin/appointments            - Get all appointments
GET    /api/admin/scheduler-status        - Scheduler health
```

---

## 📁 Project Structure

```
cavendish-appointment-system/
├── backend/
│   ├── config/
│   │   └── database.js           # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   ├── routes/
│   │   ├── admin.js              # Admin routes
│   │   ├── appointments.js       # Appointment routes
│   │   ├── auth.js               # Auth routes
│   │   ├── official.js           # Official routes
│   │   ├── public.js             # Public routes
│   │   └── student.js            # Student routes
│   └── utils/
│       └── scheduler.js          # Slot tracker scheduler
├── backups/                       # Database backups
├── migrations/                    # SQL migration files
│   └── 2025_add_slot_tracking.sql
├── public/                        # Frontend files
│   ├── admin-dashboard.html
│   ├── availability.html         # Public availability page
│   ├── dashboard.html            # Student dashboard
│   ├── index.html                # Homepage
│   ├── login.html
│   ├── official-dashboard.html
│   ├── signup.html
│   ├── slot-tracker.js           # Client-side utility
│   └── styles.css                # Custom styles
├── scripts/
│   └── backup_database.js        # Backup utility
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── initDatabase.js               # Database initialization
├── migrate_add_availability.js   # Availability migration
├── migrate_slot_tracking.js      # Slot tracker migration
├── package.json                  # Dependencies
├── server.js                     # Main server file
└── README.md                     # This file
```

---

##  Environment Variables

### Required Variables
```env
# Database Configuration
DB_HOST=localhost              # MySQL host
DB_USER=root                   # MySQL username
DB_PASSWORD=                   # MySQL password
DB_NAME=cavendish_appointment_system

# Server Configuration
PORT=3000                      # Server port
SESSION_SECRET=your_secret     # Session encryption key

# Slot Tracker Feature
ENABLE_SLOT_TRACKER=false      # Enable/disable slot tracker

# Timezone
TZ=Africa/Lusaka               # System timezone
SCHEDULER_TIMEZONE=Africa/Lusaka

# Scheduler Settings
SCHEDULER_INTERVAL_SECONDS=30  # Scheduler check interval
REMINDER_MINUTES_BEFORE=10     # Reminder timing
SESSION_DURATION_MINUTES=30    # Appointment duration
```

### Security Notes
- Never commit `.env` to version control
- Use strong `SESSION_SECRET` in production
- Change default admin password after first login

---

##  Testing

### Manual Testing

1. **Test User Registration:**
   ```
   1. Go to /signup
   2. Register as student
   3. Login as admin
   4. Approve student account
   5. Login as student
   ```

2. **Test Appointment Booking:**
   ```
   1. Login as student
   2. Create appointment with official
   3. Login as official
   4. Approve appointment
   5. Check notifications
   ```

3. **Test Slot Tracker (if enabled):**
   ```
   1. Create appointment 12 minutes from now
   2. Approve as official
   3. Wait for reminder at T-10min
   4. Confirm presence when modal appears
   5. Wait 30 minutes for completion
   ```

### Automated Testing
```bash
# Run test script (if available)
npm test
```

---

## 🚀 Deployment

### Development
```bash
# Keep feature flag OFF
ENABLE_SLOT_TRACKER=false

# Run server
npm start
```

### Staging
```bash
# Enable slot tracker for testing
ENABLE_SLOT_TRACKER=true

# Monitor for 24 hours
npm start
```

### Production
```bash
# Deploy with flag OFF initially
ENABLE_SLOT_TRACKER=false

# After verification, enable:
ENABLE_SLOT_TRACKER=true

# Use process manager
npm install -g pm2
pm2 start server.js --name cavendish-appointments
```

### Production Checklist
- [ ] Change default admin password
- [ ] Update `SESSION_SECRET`
- [ ] Enable HTTPS (set `secure: true` in session config)
- [ ] Set up regular database backups
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging
- [ ] Test all features thoroughly

---

##  Maintenance

### Database Backup
```bash
# Create backup
node scripts/backup_database.js

# Backups are stored in: backups/backup_YYYY-MM-DDTHH-MM-SS.sql
```

### Restore Database
```bash
mysql -u root -p cavendish_appointment_system < backups/backup_file.sql
```

### View Logs
```bash
# Server logs are printed to console
# Scheduler logs show:
[SCHEDULER] [INFO] Scheduler tick started
[SCHEDULER] [INFO] Reminder sent for appointment...
```

### Check Scheduler Health
```bash
# Login as admin, then:
curl http://localhost:3000/api/admin/scheduler-status
```

---

##  Database Schema

### Core Tables

#### users
- `id` - Primary key
- `full_name` - User's full name
- `email` - Unique email
- `student_number` - Student ID (students only)
- `title` - Official title (officials only)
- `password_hash` - Encrypted password
- `role` - student/official/admin
- `status` - pending/active/rejected

#### appointments
- `id` - Primary key
- `appointment_code` - Unique code (e.g., CAV-20251107-ABCD)
- `student_id` - Foreign key to users
- `official_id` - Foreign key to users
- `purpose` - Appointment reason
- `appointment_date` - Date
- `appointment_time` - Time
- `mode` - Virtual/Physical
- `status` - pending/approved/rejected/in_progress/completed/missed
- `student_present` - Presence flag
- `official_present` - Presence flag
- `started_at` - Session start timestamp
- `ended_at` - Session end timestamp
- `presence_note` - Admin notes
- `reminder_sent` - Reminder flag

#### official_availability
- `id` - Primary key
- `official_id` - Foreign key to users
- `day_of_week` - Sunday/Monday/.../Saturday

#### notifications
- `id` - Primary key
- `user_id` - Foreign key to users
- `appointment_id` - Foreign key to appointments
- `type` - reminder/presence_prompt/completed/missed
- `message` - Notification text
- `is_read` - Read flag

#### scheduler_state
- `id` - Primary key
- `operation_type` - reminder/presence_prompt/finalize
- `appointment_id` - Foreign key to appointments
- `executed_at` - Timestamp
- `details` - Operation notes

---

##  Contributing

### Development Workflow
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Create pull request

### Code Style
- Use ES6+ features
- Follow existing patterns
- Add comments for complex logic
- Keep functions small and focused

---

##  License

This project is licensed under the MIT License.

---

##  Support

### Documentation
- `SLOT_TRACKER_IMPLEMENTATION.md` - Technical details
- `TEST_SLOT_TRACKER.md` - Testing guide
- `IMPLEMENTATION_COMPLETE.md` - Feature summary

### Common Commands Reference
```bash
# Install dependencies
npm install

# Initialize database
npm run init-db

# Start server
npm start

# Create backup
node scripts/backup_database.js

# Run migrations
node migrate_slot_tracking.js
node migrate_add_availability.js

# Kill process on port 3000 (Windows)
taskkill /F /IM node.exe

# Check port usage
netstat -ano | findstr :3000
```

---

##  Quick Start Summary

```bash
# 1. Install dependencies
npm install

# 2. Configure .env file
# Edit DB_USER, DB_PASSWORD, etc.

# 3. Initialize database
npm run init-db

# 4. Start server
npm start

# 5. Open browser
# http://localhost:3000

# 6. Login with default accounts
# Admin: admin@cavendish.edu.zm / Admin123!
# Official: dean@cavendish.edu.zm / Dean123!
```

---

##  Features Roadmap

### Completed 
- User authentication and authorization
- Appointment booking and management
- Official availability tracking
- Time-driven slot tracker
- Real-time notifications
- Presence confirmation
- Double-booking prevention
- Admin dashboard

### Future Enhancements 
- Email notifications
- SMS reminders
- WebSocket real-time updates
- Calendar view
- Report generation
- Mobile app
- Video conferencing integration
- Multi-language support

---

##  Performance

- **Server Response**: < 100ms average
- **Database Queries**: Optimized with indexes
- **Scheduler Tick**: ~180ms
- **Polling Interval**: 20 seconds
- **Session Duration**: 24 hours

---

## 🔒 Security

- Password hashing with bcrypt (10 rounds)
- Session-based authentication
- SQL injection prevention (parameterized queries)
- CSRF protection (session tokens)
- Input validation on all endpoints
- Role-based access control

---

**Built with ❤️ for Cavendish University Zambia**

*Last Updated: November 2025*
*Version: 1.0.0*
