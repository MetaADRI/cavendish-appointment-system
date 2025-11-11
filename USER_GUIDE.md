# 📘 Cavendish Appointment System - User Guide

**Version 1.0.0** | Last Updated: November 2025

---

## 🎯 Introduction

The **Cavendish University Appointment System** is a comprehensive scheduling platform designed to streamline appointment booking between students and university officials. The system provides automated reminders, real-time notifications, presence tracking, and intelligent scheduling to ensure efficient communication and time management.

### What Does This System Do?

- **Schedules Appointments** between students and university officials
- **Sends Automated Reminders** 10 minutes before appointments
- **Tracks Presence** of both students and officials
- **Prevents Double-Booking** at the database level
- **Manages Official Availability** (weekly schedules)
- **Provides Real-Time Notifications** for all appointment updates
- **Automates Status Transitions** based on timing and presence
- **Maintains Audit Trails** of all scheduler operations

---

## 👥 User Roles

### 1. Students
- Book appointments with university officials
- View official availability schedules
- Receive appointment reminders
- Confirm presence for meetings
- Track appointment status in real-time

### 2. Officials
- Set weekly availability (which days they're available)
- Approve or reject appointment requests
- View all scheduled appointments
- Confirm presence for meetings
- Receive appointment notifications

### 3. Administrators
- Manage user accounts (approve/reject students)
- Monitor all appointments system-wide
- View system statistics
- Force-end appointments if needed
- Check scheduler health status

---

## 🚀 Getting Started

### For Students

#### Step 1: Create Account
1. Navigate to `http://localhost:3000/signup`
2. Fill in the registration form:
   - Full Name
   - Email Address (university email)
   - Student Number
   - Password (minimum 6 characters)
3. Click **Sign Up**
4. Wait for admin approval (status will change from "Pending" to "Active")

#### Step 2: Login
1. Go to `http://localhost:3000/login`
2. Enter your email and password
3. Click **Login**
4. You'll be redirected to the Student Dashboard

#### Step 3: View Official Availability
1. From homepage, click **"View Availability"**
2. Browse through all officials and their available days
3. This helps you know when to book appointments

#### Step 4: Book an Appointment
1. From your dashboard, scroll to **"New Appointment Request"**
2. Fill in the form:
   - **Select Official**: Choose from dropdown
   - **Purpose**: Describe why you need the meeting
   - **Date**: Select future date
   - **Time**: Choose from available slots (08:30 - 15:30)
   - **Mode**: Virtual or Physical meeting
3. Click **Submit Request**
4. You'll receive a unique appointment code (e.g., CAV-20251107-ABCD)
5. Wait for official to approve

#### Step 5: Track Your Appointments
In your dashboard, you'll see:
- **Pending Appointments**: Waiting for approval
- **Approved Appointments**: Confirmed by official
- **In-Progress**: Currently happening
- **Completed**: Successfully finished
- **Rejected**: Declined by official
- **Missed**: Neither party showed up

### For Officials

#### Step 1: Login
1. Use credentials provided by administrator
2. Go to `http://localhost:3000/login`
3. Enter email and password
4. Access Official Dashboard

#### Step 2: Set Your Availability
1. Click on **"Set Availability"** tab
2. Check the days you're available to meet students
3. Click **"Save Availability"**
4. Students can now see which days you're available

#### Step 3: Manage Appointment Requests
1. View **"Pending Requests"** section
2. Review each request:
   - Student name
   - Purpose of meeting
   - Requested date and time
3. Click **"Approve"** or **"Reject"**
4. Student receives notification of your decision

#### Step 4: View Your Schedule
- **"Approved Appointments"** tab shows all confirmed meetings
- See date, time, student name, and purpose
- Track which appointments are coming up

### For Administrators

#### Step 1: Login
- Email: `admin@cavendish.edu.zm`
- Password: `Admin123!` (change after first login)

#### Step 2: Manage Users
1. View **"User Management"** section
2. See all pending student registrations
3. Click **"Approve"** to activate accounts
4. Click **"Reject"** to deny registration

#### Step 3: Monitor Appointments
- View all appointments across the system
- See appointment statistics
- Track system usage

#### Step 4: Check Scheduler Health
- Access scheduler status endpoint
- Verify automated systems are running
- Monitor presence tracking data

---

## ⏰ Understanding the Slot Tracker System

### What is the Slot Tracker?

The Slot Tracker is an **automated time-driven scheduler** that manages appointments without manual intervention. It runs every 30 seconds in the background and handles three main tasks:

1. **Sending Reminders**
2. **Prompting Presence Confirmation**
3. **Finalizing Sessions**

### Fixed Time Slots

Appointments are scheduled in **30-minute slots** with the following times:
- 08:30 AM
- 09:30 AM
- 10:30 AM
- 11:30 AM
- 12:30 PM
- 01:30 PM
- 02:30 PM
- 03:30 PM

Each appointment lasts **30 minutes**, providing a 30-minute break between meetings.

### How the Slot Tracker Works

#### Phase 1: Appointment Booking (Manual)
```
Student creates request → Official approves → Appointment scheduled
```

#### Phase 2: Reminder (Automated - T-10 minutes)
**What Happens:**
- 10 minutes before appointment time
- System sends notification to BOTH student and official
- Message: "Reminder: Your appointment (CODE) starts in 10 minutes..."
- Appears as banner notification in dashboard
- Marked in database as `reminder_sent = 1`

**User Experience:**
- You'll see a yellow alert banner
- Contains appointment code and start time
- Automatically dismisses after 10 seconds
- Remains visible in notifications panel

#### Phase 3: Presence Prompt (Automated - T-0 minutes)
**What Happens:**
- Exactly at appointment start time
- System sends presence prompt to BOTH parties
- A modal dialog appears on screen
- Asks: "Are you present for this meeting?"

**User Experience:**
- Modal appears automatically (cannot be dismissed without answering)
- Two buttons:
  - **"Yes, I'm Present"** - Confirms attendance
  - **"No, I'm Absent"** - Records absence
- After clicking, modal closes
- Toast notification confirms: "Presence confirmed! ✓"
- Dashboard refreshes to show updated status

**What Your Click Does:**
- Marks `student_present = 1` or `official_present = 1` in database
- If BOTH click "Yes" → Status changes to **"In Progress"**
- If only ONE clicks "Yes" → Status stays "Approved" until session ends
- If NEITHER clicks → Status eventually becomes "Missed"

#### Phase 4: Session Finalization (Automated - T+30 minutes)
**What Happens:**
- 30 minutes after start time
- System checks presence status
- Automatically updates appointment status

**Possible Outcomes:**
1. **Both Present** → Status: `Completed`, Note: "Both parties present"
2. **Only Student Present** → Status: `Completed`, Note: "Student present, Official absent"
3. **Only Official Present** → Status: `Completed`, Note: "Official present, Student absent"
4. **Neither Present** → Status: `Missed`, Note: "Neither party confirmed presence"

**User Experience:**
- Notification appears: "Your appointment (CODE) has been completed."
- Dashboard updates automatically
- Appointment moves to completed/missed section

### Slot Tracker Timeline Example

**Scenario:** Appointment scheduled for 10:00 AM

| Time | Event | What You See |
|------|-------|--------------|
| 09:50 AM | **Reminder Sent** | Yellow banner: "Reminder: starts in 10 minutes" |
| 10:00 AM | **Presence Prompt** | Modal: "Are you present?" with Yes/No buttons |
| 10:00-10:30 AM | **Meeting In Progress** | Status badge shows "In Progress" (orange) |
| 10:30 AM | **Auto-Complete** | Notification: "Appointment completed" |

### How to Use the Slot Tracker Effectively

#### For Students:

1. **Book in Advance**
   - Schedule appointments at least 1 day ahead
   - System needs time to send reminders

2. **Watch for Reminders**
   - Keep dashboard open 10 minutes before
   - Check notifications panel regularly
   - Don't ignore the 10-minute warning

3. **Respond to Presence Prompt**
   - Click "Yes, I'm Present" immediately when modal appears
   - Don't close browser before appointment time
   - Modal requires your action

4. **Stay for Full Duration**
   - Appointments last 30 minutes
   - System tracks from start to end
   - Leaving early still counts as present

#### For Officials:

1. **Set Availability First**
   - Update weekly schedule regularly
   - Students can only book on available days
   - Change availability as needed

2. **Approve Promptly**
   - Check pending requests daily
   - Approval activates slot tracker
   - Rejected appointments won't trigger reminders

3. **Be Ready Before Time**
   - Login 10 minutes before
   - Watch for reminder notification
   - Prepare meeting materials in advance

4. **Confirm Presence**
   - Click "Yes, I'm Present" when modal appears
   - Both parties must confirm for "In Progress" status
   - Partial attendance is recorded

### Notification System

#### Types of Notifications:

1. **Reminder** (Yellow/Warning)
   - Sent 10 minutes before
   - Icon: Bell
   - Action: None required, just informative

2. **Presence Prompt** (Blue/Info)
   - Sent at start time
   - Icon: Alarm
   - Action: Required - click Yes/No

3. **Status Update** (Blue/Info)
   - When status changes
   - Icon: Info circle
   - Action: None, just informative

4. **Completed** (Green/Success)
   - When appointment finishes successfully
   - Icon: Check circle
   - Action: None

5. **Missed** (Red/Danger)
   - When appointment was missed
   - Icon: Exclamation triangle
   - Action: None, but review why

#### Where Notifications Appear:

1. **Banner Notifications** (Top-right corner)
   - Auto-appear for new notifications
   - Fade out after 10 seconds
   - Can be manually dismissed

2. **Notifications Panel** (Dashboard)
   - Shows last 5 notifications
   - Displays unread count badge
   - Click to mark as read

3. **Presence Modal** (Center screen)
   - Only for presence prompts
   - Cannot be dismissed without action
   - Blocks other interactions until answered

### Double-Booking Prevention

**How It Works:**
- Database enforces unique constraint
- Only ONE appointment per official per time slot
- Checked at database level (cannot be bypassed)

**What You See:**
- If slot is taken: Error message "Time slot already booked"
- Must choose different time
- System won't let you proceed

**Why It Matters:**
- Prevents scheduling conflicts
- Ensures officials aren't overbooked
- Maintains appointment integrity

---

## 🔒 Cybersecurity Features

The system implements multiple security layers to protect user data and prevent unauthorized access:

### 1. Password Security

**Bcrypt Hashing:**
- All passwords are hashed using bcrypt algorithm
- Hash rounds: 10 (industry standard)
- Passwords are NEVER stored in plain text
- Even database administrators cannot see your password
- One-way encryption (cannot be reversed)

**Password Requirements:**
- Minimum 6 characters
- Must include letters and numbers (recommended)
- Validated on both client and server side

**Example:**
```
Your password: "MyPassword123"
Stored in database: "$2b$10$rX8kZ3Y..."
```

### 2. Authentication & Session Management

**Session-Based Authentication:**
- Secure session cookies
- 24-hour session expiration
- Auto-logout after timeout
- Server-side session storage

**How It Works:**
1. You login → Server creates session
2. Session ID stored in encrypted cookie
3. Every request validates session
4. Logout destroys session immediately

**Security Benefits:**
- Sessions cannot be guessed or forged
- Automatic timeout prevents unauthorized access
- Secure cookie flags prevent theft

### 3. SQL Injection Prevention

**Parameterized Queries:**
- All database queries use prepared statements
- User input is never directly concatenated into SQL
- Parameters are escaped automatically
- Prevents malicious SQL code injection

**Example of Protection:**
```javascript
// SAFE - What we use
pool.execute('SELECT * FROM users WHERE email = ?', [userEmail]);

// UNSAFE - What we DON'T use
pool.execute('SELECT * FROM users WHERE email = "' + userEmail + '"');
```

**What This Prevents:**
- Attackers cannot inject SQL commands
- Database structure remains hidden
- Data cannot be extracted through input fields

### 4. Role-Based Access Control (RBAC)

**Access Levels:**
- **Student**: Can only access own data and create appointments
- **Official**: Can access assigned appointments and manage availability
- **Admin**: Can access all system functions

**Middleware Protection:**
- `requireAuth`: Ensures user is logged in
- `requireStudent`: Verifies student role
- `requireOfficial`: Verifies official role
- `requireAdmin`: Verifies admin role

**What This Prevents:**
- Students cannot access admin functions
- Officials cannot modify other officials' data
- Unauthorized API access blocked

**Example:**
- If student tries to access `/api/admin/users` → **403 Forbidden**
- Each endpoint checks role before execution

### 5. Data Validation

**Input Validation:**
- Email format verification
- Date and time validation
- Required field checking
- Data type enforcement

**Server-Side Validation:**
- All inputs validated on server (not just client)
- Rejects invalid data before database interaction
- Returns clear error messages

**What This Prevents:**
- Malformed data in database
- Invalid appointment times
- System crashes from bad input

### 6. HTTPS Ready

**SSL/TLS Support:**
- Session cookies can be marked "secure"
- Ready for HTTPS deployment
- Encrypts data in transit

**Current Status:**
- Development: HTTP (localhost)
- Production: HTTPS recommended

### 7. CSRF Protection

**Session Token Validation:**
- Each session has unique token
- Requests must include valid session
- Cross-site requests blocked

**What This Prevents:**
- Malicious websites cannot make requests on your behalf
- Form submissions must come from our application

### 8. XSS Prevention

**Content Security:**
- User inputs are escaped in HTML
- No inline JavaScript execution
- Safe rendering of user-generated content

**What This Prevents:**
- Malicious scripts in appointment purposes
- Code injection through text fields

### 9. Database Security

**Connection Security:**
- Environment variables for credentials
- No hardcoded passwords
- Separate development/production configs

**Backup System:**
- Automatic backup before migrations
- Point-in-time recovery capability
- Stored in secure location

### 10. Audit Trailing

**Scheduler Operations:**
- All automated actions logged
- Timestamps for every operation
- Idempotence tracking (prevents duplicate actions)

**Tables:**
- `scheduler_state`: Tracks all scheduler operations
- `notifications`: Records all notifications sent
- Cannot be manipulated retroactively

**Benefits:**
- Full visibility of system actions
- Debugging capabilities
- Accountability for all operations

### Security Best Practices for Users

#### For All Users:
1. **Use Strong Passwords**
   - Mix letters, numbers, symbols
   - Don't use common words
   - Change default passwords

2. **Logout When Done**
   - Click logout button
   - Don't just close browser
   - Especially on shared computers

3. **Keep Credentials Private**
   - Don't share passwords
   - Don't write passwords down
   - Use password manager if needed

4. **Verify URLs**
   - Ensure you're on correct site
   - Check for HTTPS in production
   - Beware of phishing

#### For Administrators:
1. **Change Default Password Immediately**
   - Default admin password: `Admin123!`
   - Change on first login
   - Use complex password

2. **Regular Security Audits**
   - Review user accounts
   - Check for suspicious activity
   - Monitor failed login attempts

3. **Database Backups**
   - Run `node scripts/backup_database.js` daily
   - Store backups securely
   - Test restoration process

4. **Update Dependencies**
   - Run `npm audit` regularly
   - Update packages with security patches
   - Monitor for vulnerabilities

---

## 📊 Dashboard Features

### Student Dashboard

**Sections:**
1. **New Appointment Request**
   - Form to create appointments
   - Real-time official availability check
   - Success confirmation with appointment code

2. **Notifications Panel** (if enabled)
   - Shows unread count badge
   - Last 5 notifications displayed
   - Mark as read functionality

3. **Upcoming Appointments** (if enabled)
   - Next 24 hours displayed
   - Shows date, time, official name
   - Status badges (color-coded)

4. **My Appointments**
   - All appointments listed
   - Filtered by status
   - Shows appointment codes
   - Purpose and mode displayed

**Status Colors:**
- **Pending**: Gray
- **Approved**: Blue
- **In Progress**: Orange
- **Completed**: Green
- **Rejected**: Red
- **Missed**: Dark Red

### Official Dashboard

**Sections:**
1. **Pending Requests**
   - Awaiting your approval
   - Student details visible
   - Quick approve/reject buttons

2. **Approved Appointments**
   - All confirmed meetings
   - Chronologically ordered
   - Student contact info

3. **Set Availability**
   - Weekly schedule checkboxes
   - Sunday through Saturday
   - Save button updates immediately

### Admin Dashboard

**Sections:**
1. **System Statistics**
   - Total active students
   - Total appointments
   - System health metrics

2. **User Management**
   - Pending registrations
   - Approve/reject controls
   - User status overview

3. **Appointments Overview**
   - All appointments visible
   - Filter by status
   - Presence tracking data

4. **Scheduler Health**
   - Check if slot tracker running
   - View scheduler configuration
   - Monitor automated tasks

---

## ✅ Best Practices

### For Effective Appointment Management

1. **Plan Ahead**
   - Book at least 24 hours in advance
   - Check official availability first
   - Choose appropriate time slots

2. **Be Specific in Purpose**
   - Clear, concise description
   - Include relevant details
   - Helps official prepare

3. **Respond to Notifications**
   - Check dashboard before appointments
   - Confirm presence promptly
   - Don't ignore reminders

4. **Choose Mode Carefully**
   - Virtual: Online meetings (Teams, Zoom, etc.)
   - Physical: In-person at office
   - Specify location in purpose if physical

5. **Respect Time**
   - Be on time (login 5 minutes early)
   - Stay for full 30 minutes
   - Cancel if unable to attend

### For Officials

1. **Keep Availability Updated**
   - Review weekly schedule regularly
   - Update for holidays/leaves
   - Students rely on accurate info

2. **Review Requests Daily**
   - Don't let requests pile up
   - Approve/reject within 24 hours
   - Communicate if need to reschedule

3. **Prepare for Meetings**
   - Review appointment purpose
   - Gather necessary materials
   - Login before appointment time

---

## 🔍 Troubleshooting

### "I didn't receive a reminder"

**Possible Reasons:**
1. Slot tracker not enabled (`ENABLE_SLOT_TRACKER=false`)
2. Appointment created less than 10 minutes before time
3. Browser/tab was closed
4. Network connectivity issue

**Solutions:**
- Check if slot tracker is enabled (admin can verify)
- Book appointments well in advance
- Keep dashboard open before appointments

### "Presence modal didn't appear"

**Possible Reasons:**
1. Browser blocking popups
2. JavaScript disabled
3. Slot tracker disabled
4. Not logged in at appointment time

**Solutions:**
- Allow popups from the site
- Enable JavaScript
- Stay logged in during appointment time
- Refresh page if needed

### "Appointment shows 'Missed' but I was present"

**Reason:**
- You didn't click "Yes, I'm Present" when modal appeared
- Presence must be confirmed digitally, not just physically attending

**Solution:**
- Always click the presence confirmation button
- Set phone reminder 5 minutes before to login

### "Cannot book appointment - slot already taken"

**Reason:**
- Database prevents double-booking
- Another student booked that exact time

**Solution:**
- Choose different time slot
- Check official availability for other days

---

## 📞 Support & Help

### Getting Help

**For Technical Issues:**
- Contact system administrator
- Email: admin@cavendish.edu.zm
- Check README.md for common issues

**For Account Issues:**
- Student registration: Wait for admin approval
- Login problems: Verify credentials
- Password reset: Contact admin

**For Appointment Issues:**
- Booking conflicts: Choose different time
- Official not responding: Contact admin
- System errors: Report to administrator

---

## 🎯 System Capabilities Summary

### What the System CAN Do:
✅ Schedule appointments in fixed 30-minute slots  
✅ Send automated reminders 10 minutes before  
✅ Prompt both parties to confirm presence  
✅ Automatically transition appointment status  
✅ Prevent double-booking at database level  
✅ Track official weekly availability  
✅ Display real-time notifications  
✅ Provide audit trail of all operations  
✅ Secure authentication and authorization  
✅ Manage multiple user roles  
✅ Auto-complete appointments after 30 minutes  
✅ Record partial attendance (one party present)  
✅ Generate unique appointment codes  
✅ Poll for updates every 20 seconds  
✅ Store all times in UTC for accuracy  

### What the System CANNOT Do:
❌ Send email notifications (not implemented)  
❌ Send SMS reminders (not implemented)  
❌ Video conferencing integration (not implemented)  
❌ Custom time slots (fixed at 30 minutes)  
❌ Recurring appointments (each must be booked separately)  
❌ Calendar export (iCal, Google Calendar)  
❌ Password reset via email (admin must reset)  
❌ Real-time chat (uses polling, not WebSocket)  

---

**End of User Guide**

*For technical documentation, see README.md*  
*For testing instructions, see TEST_SLOT_TRACKER.md*  
*For implementation details, see SLOT_TRACKER_IMPLEMENTATION.md*

**System Version:** 1.0.0  
**Last Updated:** November 2025  
**Built for:** Cavendish University Zambia