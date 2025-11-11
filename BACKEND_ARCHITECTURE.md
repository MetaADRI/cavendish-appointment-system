# 🏗️ Backend Architecture Guide

**Complete Guide to Backend Files and Frontend-Backend Interactions**

---

## 📋 Overview

This guide explains how each backend file works and how the frontend interacts with them.

**Backend Structure:**
```
backend/
├── config/
│   └── database.js          # MySQL connection pool
├── middleware/
│   └── auth.js              # Authentication guards
├── routes/
│   ├── auth.js              # Login, signup, logout
│   ├── student.js           # Student endpoints
│   ├── official.js          # Official endpoints
│   ├── appointments.js      # Appointment management
│   ├── admin.js             # Admin functions
│   └── public.js            # Public data
└── utils/
    └── scheduler.js         # Automated slot tracker
```

---

## 1. Server Entry Point - `server.js`

### Purpose
Main application entry point that starts the server and connects all components.

### What It Does
- Loads environment variables (`.env` file)
- Configures Express middleware (JSON parsing, sessions, static files)
- Mounts API routes (`/api/auth`, `/api/students`, etc.)
- Serves HTML pages (`index.html`, `login.html`, etc.)
- Starts the slot tracker scheduler

### Real Scenario: Student Opens Homepage

**Flow:**
```
Browser → http://localhost:3000
  ↓
server.js matches: app.get('/', ...)
  ↓
Sends: public/index.html
  ↓
Browser loads HTML
  ↓
HTML requests: styles.css, logo.png, etc.
  ↓
server.js serves via: express.static('public')
```

---

## 2. Database Config - `backend/config/database.js`

### Purpose
Creates reusable MySQL connection pool for all database operations.

### What It Does
```javascript
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cavendish_appointment_system',
    connectionLimit: 10  // Max 10 concurrent connections
});
```

### Why Connection Pooling?
- **Without:** Each request creates new connection (SLOW)
- **With:** Connections are reused (FAST)

### How Other Files Use It
```javascript
const pool = require('../config/database');
const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

### Real Scenario: Multiple Students Booking Simultaneously
```
Student A → Connection #1 → Query → Returns to pool
Student B → Connection #2 → Query → Returns to pool
Student C → Connection #3 → Query → Returns to pool
Student D → Reuses Connection #1 (no need to create new one!)
```

---

## 3. Auth Middleware - `backend/middleware/auth.js`

### Purpose
Protects API routes from unauthorized access.

### The 4 Guard Functions

**1. requireAuth** - Must be logged in (any role)
**2. requireStudent** - Must be student
**3. requireOfficial** - Must be official
**4. requireAdmin** - Must be admin

### How It Works
```javascript
function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next(); // Allow request to proceed
}
```

### Real Scenario: Student Tries Admin Endpoint

```
Student → GET /api/admin/users
  ↓
Hits middleware: requireAdmin
  ↓
Checks role: 'student' ≠ 'admin'
  ↓
Returns: 403 Forbidden
  ↓
Request NEVER reaches actual handler
```

### Real Scenario: Admin Accesses Same Endpoint

```
Admin → GET /api/admin/users
  ↓
Hits middleware: requireAdmin
  ↓
Checks role: 'admin' = 'admin' ✓
  ↓
Calls next() → Proceeds to handler
  ↓
Handler executes and returns users
```

---

## 4. Route Files

---

### 4.1 Auth Routes - `backend/routes/auth.js`

Handles: Registration, login, logout, session checking

#### `POST /api/auth/signup` - Register Student

**Frontend Sends:**
```javascript
fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        full_name: "John Doe",
        email: "john@student.cavendish.edu.zm",
        student_number: "2024001",
        password: "MyPassword123"
    })
});
```

**Backend Process:**
1. Validates all fields present
2. Checks email doesn't exist
3. Hashes password with bcrypt (10 rounds)
4. Inserts user: `role='student'`, `status='pending'`
5. Returns success

**Real Scenario:**
- Student fills signup form → Clicks "Sign Up"
- Frontend calls endpoint → Backend creates account
- Status is 'pending' → Admin must approve before student can login

#### `POST /api/auth/login` - User Login

**Frontend Sends:**
```javascript
fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
});
```

**Backend Process:**
1. Find user by email
2. Compare password with bcrypt
3. Check status (pending/rejected/active)
4. Create session: `req.session.user = { id, name, email, role }`
5. Return user data

**Backend Response:**
```json
{
  "user": {
    "id": 5,
    "full_name": "John Doe",
    "role": "student"
  }
}
```

**Real Scenario:**
- User enters credentials → Clicks "Login"
- Backend validates → Creates session
- Frontend redirects to `/dashboard` (for students) or `/official-dashboard` (for officials)

#### `GET /api/auth/me` - Check Current User

**No Auth Required** (This IS the auth check!)

**Backend Process:**
1. Check if `req.session.user` exists
2. If yes → Return user data
3. If no → Return 401 error

**Real Scenario:**
- Student opens dashboard page
- Dashboard JavaScript calls this endpoint immediately
- If 200 OK → Show dashboard
- If 401 → Redirect to login page

---

### 4.2 Student Routes - `backend/routes/student.js`

All endpoints require `requireStudent` middleware.

#### `GET /api/students/officials` - Get Active Officials

**Backend Query:**
```sql
SELECT * FROM users WHERE role='official' AND status='active'
```

**Frontend Receives:**
```json
{
  "officials": [
    { "id": 2, "full_name": "Dr. Precious Mate", "title": "Dean of Students" }
  ]
}
```

**Real Scenario:**
- Student dashboard loads
- Needs to populate "Select Official" dropdown in appointment form
- Calls this endpoint → Receives official list → Populates dropdown

#### `GET /api/students/me/appointments` - Get My Appointments

**Backend Query:**
```sql
SELECT a.*, u.full_name as official_name, u.title as official_title
FROM appointments a
JOIN users u ON a.official_id = u.id
WHERE a.student_id = ?
```

**Real Scenario:**
- Student opens dashboard
- "My Appointments" section calls this endpoint
- Displays all appointments with status badges (pending/approved/completed)

---

### 4.3 Official Routes - `backend/routes/official.js`

All endpoints require `requireOfficial` middleware.

#### `GET /api/officials/me/appointments` - Get My Appointments

**Backend Process:**
1. Get official's ID from session
2. Query appointments assigned to them
3. Separate into pending and approved

**Real Scenario:**
- Official logs in → Dashboard loads
- Shows two tabs: "Pending Requests" (needs action) and "Approved Appointments" (scheduled)

#### `GET /api/officials/me/availability` - Get My Availability

**Backend Query:**
```sql
SELECT day_of_week FROM official_availability WHERE official_id = ?
```

**Returns:** `["Monday", "Tuesday", "Friday"]`

**Real Scenario:**
- Official clicks "Set Availability" tab
- Frontend calls this → Checks appropriate day checkboxes
- Official sees current schedule

#### `POST /api/officials/me/availability` - Update Availability

**Frontend Sends:**
```json
{ "days": ["Monday", "Wednesday", "Friday"] }
```

**Backend Process:**
1. Delete all existing availability for this official
2. Insert new rows for each selected day

**Real Scenario:**
- Official changes available days → Clicks "Save"
- Backend updates → Students see updated schedule on availability page

---

### 4.4 Appointments Routes - `backend/routes/appointments.js`

The busiest file! Handles booking, approval, presence, notifications.

#### `POST /api/appointments` - Create Appointment

**Middleware:** `requireStudent`

**Frontend Sends:**
```json
{
  "official_id": 2,
  "purpose": "Career guidance",
  "appointment_date": "2025-11-15",
  "appointment_time": "10:30:00",
  "mode": "Virtual"
}
```

**Backend Process:**
1. Validate official exists and is active
2. **Check for double-booking:**
   ```sql
   SELECT id FROM appointments 
   WHERE official_id = ? AND appointment_date = ? AND appointment_time = ?
     AND status IN ('pending', 'approved')
   ```
3. If slot taken → Error: "Time slot already booked"
4. Generate code: `CAV-20251110-ABCD`
5. Insert with status='pending'

**Real Scenario:**
- Student fills form → Clicks "Submit"
- Backend checks availability → Creates appointment
- Official sees request in "Pending Requests" section

#### `PUT /api/appointments/:id/status` - Approve/Reject

**Middleware:** `requireOfficial`

**Frontend Sends:**
```json
{ "status": "approved" }
```

**Backend Process:**
```sql
UPDATE appointments SET status = ? 
WHERE id = ? AND official_id = ?
```

**Security:** `AND official_id = ?` ensures officials can only update THEIR appointments!

**Real Scenario:**
- Official clicks "Approve" button on pending request
- Backend updates status → Slot tracker starts monitoring
- Student sees status change to "Approved" in dashboard

#### `POST /api/appointments/:id/presence` - Mark Presence

**Middleware:** `requireAuth` (both students and officials)

**Frontend Sends:**
```json
{ "present": true }
```

**Backend Process:**
1. Get appointment from database
2. Verify user is part of appointment
3. Update appropriate field:
   - Student → `student_present = 1`
   - Official → `official_present = 1`

**THE MAGIC SCENARIO:**

**Time: 10:00 AM (Start time)**

1. Scheduler sends presence prompts (see section 5)
2. Modal appears on both screens: "Are you present?"
3. Student clicks "Yes" → Frontend calls endpoint → `student_present = 1`
4. Official clicks "Yes" → Frontend calls endpoint → `official_present = 1`
5. Next scheduler tick detects both = 1
6. Status automatically changes to 'in_progress' ⚡
7. At 10:30 AM → Scheduler finalizes → Status = 'completed'

#### `GET /api/appointments/notifications` - Get Notifications

**Middleware:** `requireAuth`

**Backend Query:**
```sql
SELECT * FROM notifications 
WHERE user_id = ? 
ORDER BY created_at DESC LIMIT 20
```

**Real Scenario:**
- `slot-tracker.js` polls this endpoint every 20 seconds
- New notification appears → Frontend displays banner
- If type='presence_prompt' → Shows modal automatically

---

### 4.5 Admin Routes - `backend/routes/admin.js`

All endpoints require `requireAdmin` middleware.

#### `GET /api/admin/users` - Get All Users

**Returns:** All users (students, officials, admins)

**Real Scenario:**
- Admin dashboard shows "User Management" section
- Displays pending registrations
- Admin clicks "Approve" → Calls next endpoint

#### `PUT /api/admin/users/:id/status` - Update User Status

**Frontend Sends:**
```json
{ "status": "active" }
```

**Backend Process:**
```sql
UPDATE users SET status = ? WHERE id = ?
```

**Real Scenario:**
- New student registers → Status = 'pending'
- Admin approves → Status = 'active'
- Student can now login!

---

### 4.6 Public Routes - `backend/routes/public.js`

No authentication required!

#### `GET /api/public/statistics` - System Stats

**Returns:**
```json
{
  "activeStudents": 156,
  "totalAppointments": 342
}
```

**Real Scenario:**
- Homepage shows statistics section
- Calls this endpoint → Displays live numbers

#### `GET /api/public/officials/availability` - All Officials' Availability

**Backend Process:**
1. Get all active officials
2. For each, get their available days
3. Return combined data

**Returns:**
```json
{
  "officials": [
    {
      "id": 2,
      "full_name": "Dr. Precious Mate",
      "title": "Dean of Students",
      "available_days": ["Monday", "Wednesday", "Friday"]
    }
  ]
}
```

**Real Scenario:**
- Visitor clicks "View Availability" on homepage
- Opens `availability.html` (no login needed!)
- Frontend calls this endpoint → Displays official cards with available days

---

## 5. Scheduler Service - `backend/utils/scheduler.js`

### Purpose
**THE AUTOMATION ENGINE!** Runs every 30 seconds and manages the entire appointment lifecycle automatically.

### The 4 Core Functions

#### Function 1: `processReminders()` - T-10 Minutes

**What It Does:**
Finds appointments starting in ~10 minutes and sends reminders.

**SQL:**
```sql
SELECT * FROM appointments
WHERE status = 'approved'
  AND reminder_sent = 0
  AND TIMESTAMP(appointment_date, appointment_time) BETWEEN NOW()+10min AND NOW()+10min+30sec
```

**Real Scenario:**

**Time: 09:50 AM**
- Appointment at 10:00 AM exists
- Scheduler runs → Detects it's 10 minutes away
- Creates notifications for both student and official
- Sets `reminder_sent = 1`
- Frontend polls notifications → Sees new reminder
- Displays yellow banner: "⏰ Starts in 10 minutes!"

#### Function 2: `processPresencePrompts()` - T-0 (Start Time)

**What It Does:**
At appointment start time, prompts both parties to confirm presence.

**SQL:**
```sql
SELECT * FROM appointments
WHERE status = 'approved'
  AND started_at IS NULL
  AND TIMESTAMP(appointment_date, appointment_time) BETWEEN NOW() AND NOW()+30sec
```

**Real Scenario:**

**Time: 10:00:00 AM**
- Scheduler runs → Detects appointment starting NOW
- Creates `presence_prompt` notifications
- Sets `started_at = NOW()`
- Frontend detects notification type
- **Automatically shows modal:** "Are you present?"
- Student clicks "Yes" → Calls `/api/appointments/:id/presence`
- Official clicks "Yes" → Calls same endpoint
- Both presence flags now set to 1

#### Function 3: `checkPresenceStatus()` - Check Both Present

**What It Does:**
Checks if both parties confirmed presence and transitions to 'in_progress'.

**SQL:**
```sql
SELECT * FROM appointments
WHERE status = 'approved'
  AND student_present = 1
  AND official_present = 1
```

**Real Scenario:**

**Time: 10:00:15 AM (15 seconds after start)**
- Both clicked "Yes, I'm Present"
- Scheduler runs → Detects both flags set
- Updates: `status = 'in_progress'`
- Dashboards refresh → Status badge turns orange
- "In Progress" displayed!

#### Function 4: `finalizeSessions()` - T+30 Minutes

**What It Does:**
After 30 minutes, finalizes the appointment based on presence.

**SQL:**
```sql
SELECT * FROM appointments
WHERE status IN ('approved', 'in_progress')
  AND started_at IS NOT NULL
  AND TIMESTAMPDIFF(MINUTE, started_at, NOW()) >= 30
```

**Decision Logic:**
- Both present = 1 → Status: 'completed', Note: "Both parties present"
- Only student = 1 → Status: 'completed', Note: "Student present, Official absent"
- Only official = 1 → Status: 'completed', Note: "Official present, Student absent"
- Both = 0 → Status: 'missed', Note: "Neither party confirmed presence"

**Real Scenario:**

**Time: 10:30 AM**
- 30 minutes elapsed since start
- Scheduler runs → Checks presence flags
- Both were present → Status = 'completed'
- Creates completion notifications
- Dashboards refresh → Green "Completed" badge
- Appointment archived!

### Idempotence (Safety Feature)

Every operation is tracked in `scheduler_state` table:

**Before executing:**
```sql
SELECT id FROM scheduler_state 
WHERE appointment_id = 15 AND operation_type = 'reminder'
```

**If found** → Skip (already done)
**If not found** → Execute and insert record

**Why This Matters:**
- Server can restart mid-operation safely
- No duplicate reminders sent
- No duplicate notifications
- Operations never execute twice

---

## 6. Database Initialization - `initDatabase.js`

### Purpose
Sets up database from scratch: creates tables and seeds initial users.

### What It Does
1. Creates `users` table
2. Creates `appointments` table
3. Seeds admin account (admin@cavendish.edu.zm / Admin123!)
4. Seeds official account (dean@cavendish.edu.zm / Dean123!)

### When to Run
```bash
node initDatabase.js
```

**Run when:**
- First time setting up system
- Need to reset database
- Tables were dropped

---

## 7. Migration Scripts

### `migrate_add_availability.js`

**Purpose:** Adds `official_availability` table

**Creates:**
```sql
CREATE TABLE official_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    official_id INT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    FOREIGN KEY (official_id) REFERENCES users(id)
);
```

**When:** After initial setup, when adding availability feature

### `migrate_slot_tracking.js`

**Purpose:** Adds slot tracker features

**Changes:**
- Adds presence columns to `appointments`
- Creates `notifications` table
- Creates `scheduler_state` table
- Adds unique constraint for double-booking prevention

**When:** When enabling slot tracker feature

---

## 8. Frontend-Backend Interaction Flow

### Complete Scenario: Student Books Appointment

```
1. Student Dashboard Loads
   └─> frontend/dashboard.html loads
   └─> JavaScript calls GET /api/auth/me
       └─> backend/routes/auth.js checks session
       └─> Returns user data
   └─> JavaScript calls GET /api/students/officials
       └─> backend/routes/student.js queries officials
       └─> Returns official list
       └─> Populates dropdown

2. Student Fills Form
   └─> Selects official, date, time, purpose
   └─> Clicks "Submit Request"
   └─> frontend calls POST /api/appointments
       └─> backend/routes/appointments.js receives request
       └─> Checks double-booking (queries database via pool)
       └─> Generates appointment code
       └─> Inserts into database
       └─> Returns success with code

3. Official Dashboard Shows Request
   └─> Official opens dashboard
   └─> Calls GET /api/officials/me/appointments
       └─> backend/routes/official.js queries their appointments
       └─> Returns pending and approved lists
       └─> Displays in two sections

4. Official Approves
   └─> Clicks "Approve" button
   └─> frontend calls PUT /api/appointments/15/status
       └─> backend/routes/appointments.js checks middleware
       └─> requireOfficial passes ✓
       └─> Updates appointment status = 'approved'
       └─> Returns success

5. Scheduler Takes Over (10 Minutes Before)
   └─> backend/utils/scheduler.js tick runs
   └─> processReminders() detects appointment in 10 min
   └─> Creates notification records in database
   └─> frontend slot-tracker.js polls GET /api/appointments/notifications
       └─> backend/routes/appointments.js returns notifications
       └─> frontend displays banner

6. Appointment Start Time
   └─> Scheduler tick runs
   └─> processPresencePrompts() detects start time
   └─> Creates presence_prompt notifications
   └─> frontend polls notifications
       └─> Detects type='presence_prompt'
       └─> Shows modal automatically
   └─> Student clicks "Yes, I'm Present"
       └─> frontend calls POST /api/appointments/15/presence {present:true}
           └─> backend sets student_present = 1
   └─> Official clicks "Yes, I'm Present"
       └─> frontend calls POST /api/appointments/15/presence {present:true}
           └─> backend sets official_present = 1

7. Status Changes to In Progress
   └─> Scheduler tick runs
   └─> checkPresenceStatus() detects both flags = 1
   └─> Updates status = 'in_progress'
   └─> Creates notifications
   └─> frontend polls → Sees status update → Refreshes dashboard

8. Session Completes
   └─> 30 minutes pass
   └─> Scheduler tick runs
   └─> finalizeSessions() detects 30 min elapsed
   └─> Updates status = 'completed'
   └─> Sets ended_at timestamp
   └─> Records presence_note
   └─> Creates completion notifications
   └─> frontend polls → Shows "Completed" badge
```

---

## Summary: How Everything Connects

**1. User Actions (Frontend)**
- Trigger by clicking buttons, filling forms
- JavaScript makes fetch() calls to API endpoints

**2. Server Routes (Backend)**
- Receive requests at specific URLs
- Pass through middleware for authentication
- Execute business logic
- Query database via connection pool
- Return JSON responses

**3. Database**
- Stores all data (users, appointments, notifications)
- Accessed through connection pool
- Enforces constraints (unique, foreign keys)

**4. Scheduler (Automated)**
- Runs independently every 30 seconds
- Monitors appointment times
- Creates notifications
- Updates statuses
- No frontend interaction needed!

**5. Session Management**
- Created at login
- Stored in server memory
- Validated by middleware
- Destroyed at logout

**This creates a fully automated, secure, real-time appointment system!** 🎉

---

**End of Backend Architecture Guide**

*For user instructions, see USER_GUIDE.md*  
*For installation, see README.md*  
*For testing, see TEST_SLOT_TRACKER.md*
