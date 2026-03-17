require('dotenv').config();
const path = require('path');
const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios");
const cron = require('node-cron');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

app.use(express.json());

// Middleware to handle ngrok warning
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

/* ---------------- POSTGRESQL CONNECTION ---------------- */

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection and create tables
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
    createTables();
  }
});

// Create tables if they don't exist
const createTables = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

    // Create attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        clock_in TIME,
        clock_out TIME,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        location_name TEXT,
        status VARCHAR(50) DEFAULT 'present',
        is_absent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Attendance table ready');

    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
      ON attendance(employee_id, date)
    `);
    console.log('✅ Indexes created');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
  }
};

/* ---------------- REGISTER ---------------- */

app.post("/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (!email.endsWith("@gmail.com")) {
    return res.status(400).json({ message: "Email must be gmail.com" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    
    await pool.query(
      "INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, NOW())",
      [username, email, hash]
    );
    
    res.json({ 
      success: true,
      message: "User registered successfully"
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === '23505') { // PostgreSQL duplicate key error
      return res.status(400).json({ message: "Email already registered" });
    }
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ---------------- LOGIN ---------------- */

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || "employee" },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role || "employee" 
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ---------------- JWT VERIFY ---------------- */

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token provided" });

  const token = auth.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
}

/* ---------------- ADMIN VERIFY ---------------- */

function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token provided" });

  const token = auth.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    req.user = decoded;
    next();
  });
}

/* ---------------- ATTENDANCE STATUS CHECK ---------------- */

app.get("/attendance/status", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`📊 Checking attendance status for user ${userId} on ${today}`);
  
  try {
    const result = await pool.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2 ORDER BY id",
      [userId, today]
    );
    
    console.log(`📊 Found ${result.rows.length} records for today`);
    
    if (result.rows.length === 0) {
      return res.json({ 
        status: "not_started",
        hasClockedIn: false, 
        hasClockedOut: false,
        message: "Not clocked in yet",
        canClockIn: true,
        canClockOut: false
      });
    }
    
    // Check if there's a record with clock_in but no clock_out
    const hasIncomplete = result.rows.some(r => r.clock_in && !r.clock_out);
    
    // Check if there's a completed record (both clock_in and clock_out)
    const hasCompleted = result.rows.some(r => r.clock_in && r.clock_out);
    
    if (hasCompleted) {
      const completedRecord = result.rows.find(r => r.clock_in && r.clock_out);
      return res.json({ 
        status: "completed",
        hasClockedIn: true, 
        hasClockedOut: true,
        clockInTime: completedRecord?.clock_in,
        clockOutTime: completedRecord?.clock_out,
        message: "Attendance already completed for today",
        canClockIn: false,
        canClockOut: false
      });
    } else if (hasIncomplete) {
      const incompleteRecord = result.rows.find(r => r.clock_in && !r.clock_out);
      return res.json({ 
        status: "clocked_in",
        hasClockedIn: true, 
        hasClockedOut: false,
        clockInTime: incompleteRecord?.clock_in,
        message: "Clocked in, ready for clock out",
        canClockIn: false,
        canClockOut: true,
        recordId: incompleteRecord.id
      });
    } else {
      return res.json({ 
        status: "unknown",
        hasClockedIn: result.rows.some(r => r.clock_in), 
        hasClockedOut: result.rows.some(r => r.clock_out),
        message: "Unknown attendance status",
        canClockIn: !result.rows.some(r => r.clock_in),
        canClockOut: result.rows.some(r => r.clock_in) && !result.rows.some(r => r.clock_out)
      });
    }
  } catch (err) {
    console.error("Error checking attendance status:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ---------------- HELPER FUNCTION FOR IST TIME ---------------- */

// Helper function to get IST time (UTC+5:30) for recording attendance
const getISTTime = () => {
  const now = new Date();
  
  // Get UTC time components
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();
  
  // IST is UTC+5:30
  let istHours = utcHours + 5;
  let istMinutes = utcMinutes + 30;
  
  // Handle minute overflow (if minutes >= 60)
  if (istMinutes >= 60) {
    istMinutes -= 60;
    istHours += 1;
  }
  
  // Handle hour overflow (if hours >= 24)
  if (istHours >= 24) {
    istHours -= 24;
  }
  
  // Format with leading zeros
  const formattedHours = String(istHours).padStart(2, '0');
  const formattedMinutes = String(istMinutes).padStart(2, '0');
  const formattedSeconds = String(utcSeconds).padStart(2, '0');
  
  const istTimeString = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  
  console.log(`🕒 UTC Time: ${utcHours}:${utcMinutes}:${utcSeconds} → IST Time: ${istTimeString}`);
  
  return istTimeString;
};

/* ---------------- ATTENDANCE WITH LOCATION FORMATTING ---------------- */

app.post("/attendance", verifyToken, async (req, res) => {
  const { qrData, latitude, longitude } = req.body;
  const userId = req.user.id;

  if (qrData !== "GATE_ATTENDANCE") {
    return res.status(400).json({ success: false, message: "Invalid QR" });
  }

  let location = "Unknown";

  try {
    if (latitude && longitude && latitude !== 0 && longitude !== 0) {
      const geo = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.GEOCODE_KEY}`
      );
      const comp = geo.data.results[0]?.components;

      let road = comp.road || "";
      if (road) {
        road = road.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
        road = road.toLowerCase().split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }

      const place = comp.suburb || comp.neighbourhood || comp.quarter || comp.area || "";
      const formattedPlace = place ? place.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') : "";

      const city = comp.city || comp.town || comp.village || "";
      const formattedCity = city ? city.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') : "";

      const addressParts = [];
      if (road) addressParts.push(road);
      if (formattedPlace) addressParts.push(formattedPlace);
      if (formattedCity) addressParts.push(formattedCity);

      location = addressParts.join(", ");

      if (location === "") {
        const allParts = [
          comp.road,
          comp.suburb,
          comp.neighbourhood,
          comp.quarter,
          comp.city,
          comp.town,
          comp.village,
          comp.county
        ].filter(Boolean);
        location = allParts.slice(0, 3).join(", ");
      }
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  const today = new Date().toISOString().split("T")[0];
  // Use IST time instead of UTC
  const time = getISTTime();
  
  console.log(`⏰ Time being stored in database: ${time}`);

  console.log("=".repeat(50));
  console.log(`📝 Processing attendance for user ${userId} on ${today} at ${time} IST`);
  console.log(`📍 Location: ${location}`);

  try {
    // Check if attendance already exists for today
    const records = await pool.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2 ORDER BY id",
      [userId, today]
    );

    console.log(`📊 Found ${records.rows.length} records for today`);

    // Check if there's already a completed record (both clock_in and clock_out)
    const completedRecord = records.rows.find(r => r.clock_in && r.clock_out);
    
    if (completedRecord) {
      console.log(`⚠️ Employee ${userId} has already completed attendance for today`);
      return res.status(400).json({ 
        success: false,
        message: "You have already completed your attendance for today"
      });
    }

    // Check if there's an incomplete record (clock_in but no clock_out)
    const incompleteRecord = records.rows.find(r => r.clock_in && !r.clock_out);

    if (incompleteRecord) {
      // This is CLOCK OUT
      console.log(`✅ Found incomplete record ID ${incompleteRecord.id} - Processing clock out`);
      
      await pool.query(
        `UPDATE attendance 
         SET clock_out = $1::time, 
             location_name = CONCAT(location_name, ' → ', $2::text), 
             status = 'present'
         WHERE id = $3`,
        [time, location, incompleteRecord.id]
      );
      
      console.log(`✅ Clock out successful for user ${userId} at ${time} IST`);
      
      res.json({ 
        success: true,
        message: "Clock Out Successful", 
        location: location,
        time: time,
        action: "clock_out",
        recordId: incompleteRecord.id
      });
    } else {
      // No incomplete record found - This is CLOCK IN
      console.log("✅ No incomplete records found - Creating clock in");
      
      const result = await pool.query(
        `INSERT INTO attendance 
         (employee_id, date, clock_in, latitude, longitude, location_name, status, is_absent) 
         VALUES ($1, $2, $3::time, $4, $5, $6, 'present', false)
         RETURNING id`,
        [userId, today, time, latitude, longitude, location]
      );
      
      console.log(`✅ Clock in successful for user ${userId} at ${time} IST`);
      
      res.json({ 
        success: true,
        message: "Clock In Successful", 
        location: location,
        time: time,
        action: "clock_in",
        recordId: result.rows[0].id
      });
    }
  } catch (err) {
    console.error("Attendance error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Database error"
    });
  }
});

/* ---------------- ADMIN LOGIN ---------------- */

app.post("/auth/admin-login", (req, res) => {
  const { password } = req.body;
  if (password === "admin123") {
    const token = jwt.sign(
      { role: "admin" },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    return res.json({ success: true, token });
  }
  res.status(401).json({ message: "Wrong password" });
});

/* ---------------- ADMIN EMPLOYEES ---------------- */

app.get("/admin/employees", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at FROM users ORDER BY username"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: "Error fetching employees" });
  }
});

/* ---------------- TODAY'S ATTENDANCE - FORCE RAW TIME ---------------- */

app.get("/admin/attendance/today", verifyAdmin, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // First get all employees
    const employees = await pool.query(
      "SELECT id, username, email, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at FROM users ORDER BY username"
    );

    // Get today's attendance - FORCE RAW TIME
    const attendance = await pool.query(
      `SELECT 
          a.id,
          a.employee_id,
          u.username,
          TO_CHAR(a.date, 'YYYY-MM-DD') as date,
          LPAD(EXTRACT(HOUR FROM a.clock_in)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(MINUTE FROM a.clock_in)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(SECOND FROM a.clock_in)::text, 2, '0') as clock_in,
          LPAD(EXTRACT(HOUR FROM a.clock_out)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(MINUTE FROM a.clock_out)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(SECOND FROM a.clock_out)::text, 2, '0') as clock_out,
          a.location_name,
          a.status
        FROM attendance a
        JOIN users u ON a.employee_id = u.id
        WHERE a.date = $1
        ORDER BY a.created_at DESC`,
      [today]
    );
    
    res.json({
      success: true,
      date: today,
      total_records: attendance.rows.length,
      all_records: attendance.rows,
      employees: employees.rows
    });
  } catch (err) {
    console.error('Error fetching today\'s attendance:', err);
    res.status(500).json({ message: "Error fetching attendance" });
  }
});

/* ---------------- MARK ABSENT EMPLOYEES FUNCTION ---------------- */

const markAbsentEmployees = async (date) => {
  const today = new Date().toISOString().split('T')[0];
  
  if (date === today) {
    console.log(`⚠️ Skipping absent marking for ${date} - system was reset today`);
    return;
  }

  console.log(`📝 Marking absent employees for ${date}`);

  try {
    // First, get all employees
    const employees = await pool.query("SELECT id FROM users");
    
    if (employees.rows.length === 0) {
      console.log("No employees found");
      return;
    }

    // Then, get all employees who have attendance for this date
    const presentEmployees = await pool.query(
      "SELECT DISTINCT employee_id FROM attendance WHERE date = $1",
      [date]
    );

    // Create a Set of present employee IDs
    const presentSet = new Set(presentEmployees.rows.map(e => e.employee_id));

    // Find absent employees (all employees - present employees)
    const absentEmployees = employees.rows.filter(emp => !presentSet.has(emp.id));

    if (absentEmployees.length === 0) {
      console.log(`✅ No absent employees for ${date}`);
      return;
    }

    console.log(`📊 Found ${absentEmployees.length} absent employees for ${date}`);

    // Insert absent records for each absent employee
    for (const emp of absentEmployees) {
      await pool.query(
        `INSERT INTO attendance 
         (employee_id, date, status, is_absent, created_at) 
         VALUES ($1, $2, 'absent', true, NOW())`,
        [emp.id, date]
      );
    }
    
    console.log(`✅ Marked ${absentEmployees.length} employees absent for ${date}`);
  } catch (err) {
    console.error("Error marking absent employees:", err);
  }
};

/* ---------------- END OF DAY REPORT ---------------- */

app.post("/admin/end-of-day", verifyAdmin, async (req, res) => {
  const { date } = req.body;
  
  // Use today's date if no date provided
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  console.log("=".repeat(50));
  console.log(`📋 Generating End of Day Report for ${targetDate}`);
  console.log("=".repeat(50));

  try {
    // First, mark absent employees
    await markAbsentEmployees(targetDate);

    // Then generate the full report
    const results = await pool.query(
      `SELECT 
        u.id as employee_id,
        u.username,
        u.email,
        TO_CHAR(a.clock_in, 'HH24:MI:SS') as clock_in,
        TO_CHAR(a.clock_out, 'HH24:MI:SS') as clock_out,
        a.location_name,
        a.status,
        a.is_absent,
        a.created_at
      FROM users u
      LEFT JOIN attendance a ON u.id = a.employee_id AND a.date = $1
      ORDER BY u.username`,
      [targetDate]
    );

    // Format the results
    const report = results.rows.map(row => ({
      employee_id: row.employee_id,
      username: row.username,
      email: row.email,
      date: targetDate,
      clock_in: row.clock_in || null,
      clock_out: row.clock_out || null,
      location: row.location_name || "—",
      status: row.is_absent ? "absent" : (row.clock_in ? (row.clock_out ? "present" : "partial") : "absent"),
      is_absent: row.is_absent || false
    }));

    // Calculate stats
    const present = report.filter(r => r.status === "present").length;
    const partial = report.filter(r => r.status === "partial").length;
    const absent = report.filter(r => r.status === "absent").length;

    res.json({
      success: true,
      date: targetDate,
      report: report,
      stats: {
        total: report.length,
        present,
        partial,
        absent
      },
      message: `End of day report generated for ${targetDate}`
    });
  } catch (err) {
    console.error("Error generating end of day report:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error generating report" 
    });
  }
});

/* ---------------- MONTHLY ATTENDANCE - FORCE RAW TIME ---------------- */

app.get("/admin/attendance/monthly/:year/:month", verifyAdmin, async (req, res) => {
  const { year, month } = req.params;
  
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid year or month parameters" 
    });
  }

  console.log(`📅 Fetching monthly attendance for ${year}-${month}`);

  try {
    // First get all employees with their registration dates
    const employees = await pool.query(
      "SELECT id, username, email, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at FROM users ORDER BY username"
    );

    // Get attendance records - FORCE RAW TIME by extracting components
    const attendanceRecords = await pool.query(
      `SELECT 
          a.id,
          a.employee_id,
          u.username,
          u.email as employee_email,
          TO_CHAR(a.date, 'YYYY-MM-DD') as date,
          LPAD(EXTRACT(HOUR FROM a.clock_in)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(MINUTE FROM a.clock_in)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(SECOND FROM a.clock_in)::text, 2, '0') as clock_in,
          LPAD(EXTRACT(HOUR FROM a.clock_out)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(MINUTE FROM a.clock_out)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(SECOND FROM a.clock_out)::text, 2, '0') as clock_out,
          a.location_name,
          a.status,
          a.is_absent,
          a.created_at as record_created_at
        FROM attendance a
        JOIN users u ON a.employee_id = u.id
        WHERE EXTRACT(YEAR FROM a.date) = $1 AND EXTRACT(MONTH FROM a.date) = $2
        ORDER BY a.date DESC, a.created_at DESC`,
      [yearNum, monthNum]
    );
    
    console.log(`✅ Found ${attendanceRecords.rows.length} attendance records for ${year}-${month}`);
    
    // Log the first record's clock_in to verify
    if (attendanceRecords.rows.length > 0) {
      console.log("⏰ First record clock_in from DB:", attendanceRecords.rows[0].clock_in);
    }
    
    res.json({
      success: true,
      year: yearNum,
      month: monthNum,
      employees: employees.rows,
      attendance: attendanceRecords.rows,
      total_records: attendanceRecords.rows.length
    });
  } catch (err) {
    console.error("Error fetching monthly attendance:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching attendance records" 
    });
  }
});
/* ---------------- EMPLOYEE FULL HISTORY ---------------- */

app.get("/admin/employee/:id/history", verifyAdmin, async (req, res) => {
  const employeeId = req.params.id;

  try {
    // First get employee details
    const userResult = await pool.query(
      "SELECT id, username, email, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at FROM users WHERE id = $1",
      [employeeId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employee = userResult.rows[0];

    // Then get all attendance records (including absent)
    const attendanceResult = await pool.query(
      `SELECT 
          id,
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          a.clock_in::text as clock_in,
          a.clock_out::text as clock_out,
          location_name,
          status,
          is_absent,
          created_at as record_created_at
         FROM attendance a
         WHERE employee_id = $1
         ORDER BY date DESC, created_at DESC`,
      [employeeId]
    );

    res.json({
      employee,
      attendance: attendanceResult.rows,
      total_records: attendanceResult.rows.length,
      registered_date: employee.created_at
    });
  } catch (err) {
    console.error("Error fetching employee attendance:", err);
    res.status(500).json({ message: "Error fetching attendance" });
  }
});

/* ---------------- DELETE EMPLOYEE ---------------- */

app.delete("/admin/employees/:id", verifyAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    // Delete employee (attendance will cascade due to ON DELETE CASCADE)
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    
    res.json({ 
      success: true,
      message: "Employee deleted successfully" 
    });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: "Error deleting employee" });
  }
});

/* ---------------- TEST ENDPOINT ---------------- */

app.get("/admin/test", verifyAdmin, (req, res) => {
  res.json({ 
    message: "Admin API is working",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/admin/employees",
      "/admin/attendance/today",
      "/admin/attendance/monthly/:year/:month",
      "/admin/employee/:id/history",
      "/admin/stats",
      "/admin/attendance/years",
      "/admin/attendance/date-range",
      "/admin/attendance/all",
      "/admin/attendance/range",
      "/admin/end-of-day"
    ]
  });
});

/* ---------------- TEST ENDPOINT TO CHECK DATABASE TIMES ---------------- */
app.get("/admin/test-times", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, employee_id, date, 
          LPAD(EXTRACT(HOUR FROM clock_in)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(MINUTE FROM clock_in)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(SECOND FROM clock_in)::text, 2, '0') as clock_in,
          LPAD(EXTRACT(HOUR FROM clock_out)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(MINUTE FROM clock_out)::text, 2, '0') || ':' || 
          LPAD(EXTRACT(SECOND FROM clock_out)::text, 2, '0') as clock_out
       FROM attendance 
       ORDER BY id DESC 
       LIMIT 5`
    );
    
    console.log("📋 Last 5 attendance records from DB:");
    result.rows.forEach(row => {
      console.log(`ID ${row.id}: date=${row.date}, clock_in=${row.clock_in}, clock_out=${row.clock_out}`);
    });
    
    res.json({
      success: true,
      records: result.rows
    });
  } catch (err) {
    console.error("Error fetching test times:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- GET DATE RANGE OF ATTENDANCE RECORDS ---------------- */

app.get("/admin/attendance/date-range", verifyAdmin, async (req, res) => {
  console.log("📅 Fetching min and max dates from attendance records");

  try {
    const result = await pool.query(
      "SELECT MIN(date) as minDate, MAX(date) as maxDate FROM attendance"
    );

    res.json({
      success: true,
      minDate: result.rows[0].mindate,
      maxDate: result.rows[0].maxdate
    });
  } catch (err) {
    console.error("Error fetching date range:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching date range" 
    });
  }
});

/* ---------------- DELETE ALL ATTENDANCE RECORDS ---------------- */

app.delete("/admin/attendance/all", verifyAdmin, async (req, res) => {
  console.log("=".repeat(50));
  console.log("🗑️ DELETING ALL ATTENDANCE RECORDS");
  console.log("=".repeat(50));

  try {
    // First, get count of records to be deleted
    const countResult = await pool.query("SELECT COUNT(*) as total FROM attendance");
    const totalRecords = parseInt(countResult.rows[0].total);

    // Delete all attendance records
    await pool.query("DELETE FROM attendance");

    console.log(`✅ Deleted ${totalRecords} attendance records`);
    
    res.json({ 
      success: true,
      message: `Successfully deleted ${totalRecords} attendance records`,
      deletedCount: totalRecords
    });
  } catch (err) {
    console.error("Error deleting all attendance records:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting attendance records" 
    });
  }
});

/* ---------------- DELETE ATTENDANCE RECORDS BY DATE RANGE ---------------- */

app.delete("/admin/attendance/range", verifyAdmin, async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ 
      success: false, 
      message: "Start date and end date are required" 
    });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid date format. Use YYYY-MM-DD" 
    });
  }

  // Validate that startDate is not after endDate
  if (startDate > endDate) {
    return res.status(400).json({ 
      success: false, 
      message: "Start date cannot be after end date" 
    });
  }

  console.log("=".repeat(50));
  console.log(`🗑️ DELETING ATTENDANCE RECORDS FROM ${startDate} TO ${endDate}`);
  console.log("=".repeat(50));

  try {
    // First, get count of records to be deleted in the date range
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM attendance WHERE date BETWEEN $1 AND $2",
      [startDate, endDate]
    );
    
    const totalRecords = parseInt(countResult.rows[0].total);

    if (totalRecords === 0) {
      return res.json({ 
        success: true,
        message: `No attendance records found between ${startDate} and ${endDate}`,
        deletedCount: 0
      });
    }

    // Delete attendance records in the date range
    await pool.query(
      "DELETE FROM attendance WHERE date BETWEEN $1 AND $2",
      [startDate, endDate]
    );

    console.log(`✅ Deleted ${totalRecords} attendance records from ${startDate} to ${endDate}`);
    
    res.json({ 
      success: true,
      message: `Successfully deleted ${totalRecords} attendance records from ${startDate} to ${endDate}`,
      deletedCount: totalRecords,
      startDate: startDate,
      endDate: endDate
    });
  } catch (err) {
    console.error("Error deleting attendance records:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting attendance records" 
    });
  }
});

/* ---------------- GET AVAILABLE YEARS ---------------- */

app.get("/admin/attendance/years", verifyAdmin, async (req, res) => {
  console.log("📅 Fetching available years from attendance records");

  try {
    const result = await pool.query(
      "SELECT DISTINCT EXTRACT(YEAR FROM date) as year FROM attendance ORDER BY year DESC"
    );

    const years = result.rows.map(r => parseInt(r.year));
    console.log("✅ Available years:", years);

    res.json({
      success: true,
      years: years
    });
  } catch (err) {
    console.error("Error fetching years:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching years" 
    });
  }
});

/* ---------------- GET STATISTICS ---------------- */

app.get("/admin/stats", verifyAdmin, async (req, res) => {
  console.log("📊 Fetching dashboard statistics");

  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    // Get total employees
    const employeeResult = await pool.query("SELECT COUNT(*) as total FROM users");
    const totalEmployees = parseInt(employeeResult.rows[0].total);

    // Get today's attendance
    const todayResult = await pool.query(
      `SELECT 
          COUNT(*) as total_today,
          SUM(CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN 1 ELSE 0 END) as present_today,
          SUM(CASE WHEN (clock_in IS NOT NULL AND clock_out IS NULL) OR (clock_in IS NULL AND clock_out IS NOT NULL) THEN 1 ELSE 0 END) as partial_today,
          COUNT(DISTINCT employee_id) as employees_with_records_today
        FROM attendance 
        WHERE date = $1`,
      [today]
    );

    const presentToday = parseInt(todayResult.rows[0].present_today) || 0;
    const partialToday = parseInt(todayResult.rows[0].partial_today) || 0;
    const employeesWithRecords = parseInt(todayResult.rows[0].employees_with_records_today) || 0;
    const absentToday = totalEmployees - employeesWithRecords;

    // Get monthly totals
    const monthResult = await pool.query(
      `SELECT 
          COUNT(*) as total_month,
          SUM(CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN 1 ELSE 0 END) as present_month,
          SUM(CASE WHEN (clock_in IS NOT NULL AND clock_out IS NULL) OR (clock_in IS NULL AND clock_out IS NOT NULL) THEN 1 ELSE 0 END) as partial_month
        FROM attendance 
        WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
      [year, month]
    );

    const daysInMonth = new Date(year, month, 0).getDate();
    const totalPossibleRecords = totalEmployees * daysInMonth;
    const presentMonth = parseInt(monthResult.rows[0].present_month) || 0;
    const partialMonth = parseInt(monthResult.rows[0].partial_month) || 0;
    const totalRecords = parseInt(monthResult.rows[0].total_month) || 0;
    const absentMonth = totalPossibleRecords - totalRecords;

    res.json({
      success: true,
      stats: {
        totalEmployees,
        today: {
          present: presentToday,
          partial: partialToday,
          absent: absentToday,
          total: presentToday + partialToday,
          employees_with_records: employeesWithRecords
        },
        month: {
          present: presentMonth,
          partial: partialMonth,
          absent: absentMonth,
          total: totalRecords,
          possible: totalPossibleRecords
        }
      }
    });
  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).json({ message: "Error fetching statistics" });
  }
});

/* ---------------- AUTOMATIC END OF DAY SCHEDULER ---------------- */

// Schedule end of day report at 11:59 PM every day
cron.schedule('59 23 * * *', () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  console.log('🕛 Running automatic end of day attendance marking for', yesterday);
  markAbsentEmployees(yesterday);
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

console.log("⏰ Scheduled end of day job set for 11:59 PM daily (marking previous day's absent)");

app.get("/", (req, res) => {
  res.send("Attendance System Backend is Running ✅");
});

// Serve React static files
const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

// For any request that doesn't match an API route, serve the React app
app.use((req, res, next) => {
  // Check if the request is for an API route
  if (req.path.startsWith('/admin') || 
      req.path.startsWith('/auth') || 
      req.path.startsWith('/attendance')) {
    return next(); // Continue to API routes
  }
  
  // For all other routes (including /login), serve the React app
  res.sendFile(path.join(buildPath, 'index.html'));
});

// 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("=".repeat(50));
  console.log("\n📡 Available endpoints:");
  console.log("   🔐 PUBLIC:");
  console.log("   POST /auth/register");
  console.log("   POST /login");
  console.log("   POST /auth/admin-login");
  console.log("   POST /attendance");
  console.log("   GET /attendance/status");
  console.log("\n   👑 ADMIN (requires token):");
  console.log("   GET /admin/test");
  console.log("   GET /admin/test-times");
  console.log("   GET /admin/employees");
  console.log("   GET /admin/attendance/today");
  console.log("   GET /admin/attendance/monthly/:year/:month");
  console.log("   GET /admin/employee/:id/history");
  console.log("   GET /admin/stats");
  console.log("   GET /admin/attendance/years");
  console.log("   GET /admin/attendance/date-range");
  console.log("   DELETE /admin/employees/:id");
  console.log("   DELETE /admin/attendance/all");
  console.log("   DELETE /admin/attendance/range");
  console.log("   POST /admin/end-of-day");
  console.log("=".repeat(50));
});