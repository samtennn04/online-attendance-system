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

// Log which connection method we're using
console.log('🔍 Checking database configuration...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DB_HOST exists:', !!process.env.DB_HOST);

let poolConfig;

// Always prefer DATABASE_URL if available
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
  console.log('📡 Using DATABASE_URL for connection');
  console.log('📡 Database host:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0]);
  
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false  // Required for Render PostgreSQL
    },
    connectionTimeoutMillis: 10000,
    max: 20,
    idleTimeoutMillis: 30000,
  };
} else if (process.env.DB_HOST) {
  let fullHost = process.env.DB_HOST;
  
  if (!fullHost.includes('.render.com') && !fullHost.includes('.')) {
    console.log('⚠️  DB_HOST appears to be incomplete, adding domain...');
    fullHost = `${fullHost}.singapore-postgres.render.com`;
    console.log('📡 Using full host:', fullHost);
  }
  
  console.log('📡 Using individual database parameters');
  console.log('📡 Host:', fullHost);
  console.log('📡 Database:', process.env.DB_NAME);
  console.log('📡 User:', process.env.DB_USER);
  
  poolConfig = {
    host: fullHost,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    max: 20,
    idleTimeoutMillis: 30000,
  };
} else {
  console.error('❌ No database configuration found!');
  console.error('   Please set DATABASE_URL or DB_HOST in .env file');
  process.exit(1);
}

// Create the pool
const pool = new Pool(poolConfig);

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

// Test database connection with retry logic
let connectionAttempts = 0;
const maxAttempts = 3;

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Test query to verify connection
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database time:', result.rows[0].current_time);
    
    client.release();
    await createTables();
    return true;
  } catch (err) {
    connectionAttempts++;
    console.error(`❌ Database connection failed (attempt ${connectionAttempts}/${maxAttempts}):`);
    console.error('   Error:', err.message);
    
    if (err.code === 'ENOTFOUND') {
      console.error('   ⚠️  DNS lookup failed. Check if database hostname is correct.');
      console.error('   Expected format: dpg-xxxxx.singapore-postgres.render.com');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('   ⚠️  Connection refused. Database might be paused or firewall blocking.');
    } else if (err.code === '28P01') {
      console.error('   ⚠️  Authentication failed. Wrong username or password.');
      console.error('   💡 Tip: Check your database credentials in Render dashboard');
    } else if (err.code === 'ETIMEDOUT') {
      console.error('   ⚠️  Connection timeout. Database might be slow to respond.');
    }
    
    if (connectionAttempts < maxAttempts) {
      console.log(`   🔄 Retrying in 5 seconds... (${connectionAttempts}/${maxAttempts})`);
      setTimeout(testConnection, 5000);
    } else {
      console.error('   ⚠️  Max connection attempts reached.');
      console.error('   💡 To fix authentication:');
      console.error('      1. Go to Render dashboard');
      console.error('      2. Open your PostgreSQL database');
      console.error('      3. Go to "Settings" → "Database Credentials"');
      console.error('      4. Click "Reset Password" to generate new credentials');
      console.error('      5. Copy the new External Connection String');
      console.error('      6. Update your .env file with the new DATABASE_URL');
      console.error('      7. Restart the server');
    }
  }
};

// Start the connection test
testConnection();

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
    
    console.log('✅ Database setup complete!');
    
  } catch (err) {
    console.error('❌ Error creating tables:', err);
  }
};

/* ---------------- TEST DATABASE CONNECTION ENDPOINT ---------------- */

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database_name');
    res.json({
      success: true,
      message: "Database connected successfully!",
      time: result.rows[0].current_time,
      database: result.rows[0].database_name,
      status: "Connected"
    });
  } catch (err) {
    console.error("Database test error:", err);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: err.message
    });
  }
});

/* ---------------- GET DATABASE STATUS ---------------- */

app.get("/db-status", async (req, res) => {
  try {
    const testResult = await pool.query('SELECT 1 as connected');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const attendanceCount = await pool.query('SELECT COUNT(*) FROM attendance');
    
    res.json({
      success: true,
      database: {
        connected: true,
        status: "Online",
        tables: {
          users: parseInt(userCount.rows[0].count),
          attendance: parseInt(attendanceCount.rows[0].count)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      database: {
        connected: false,
        error: err.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

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
    if (err.code === '23505') {
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
    
    const hasIncomplete = result.rows.some(r => r.clock_in && !r.clock_out);
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

// Helper function to get Bhutan time (UTC+6)
const getBhutanTime = () => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();
  
  let bhutanHours = utcHours + 6;
  let bhutanMinutes = utcMinutes;
  
  if (bhutanHours >= 24) {
    bhutanHours -= 24;
  }
  
  const formattedHours = String(bhutanHours).padStart(2, '0');
  const formattedMinutes = String(bhutanMinutes).padStart(2, '0');
  const formattedSeconds = String(utcSeconds).padStart(2, '0');
  
  const bhutanTimeString = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  
  console.log(`🕒 UTC Time: ${utcHours}:${utcMinutes}:${utcSeconds} → Bhutan Time: ${bhutanTimeString}`);
  
  return bhutanTimeString;
};

/* ---------------- ATTENDANCE WITH LOCATION ---------------- */

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
  const time = getBhutanTime();
  
  console.log("=".repeat(50));
  console.log(`📝 Processing attendance for user ${userId} on ${today} at ${time} Bhutan Time`);
  console.log(`📍 Location: ${location}`);

  try {
    const records = await pool.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2 ORDER BY id",
      [userId, today]
    );

    const completedRecord = records.rows.find(r => r.clock_in && r.clock_out);
    
    if (completedRecord) {
      return res.status(400).json({ 
        success: false,
        message: "You have already completed your attendance for today"
      });
    }

    const incompleteRecord = records.rows.find(r => r.clock_in && !r.clock_out);

    if (incompleteRecord) {
      await pool.query(
        `UPDATE attendance 
         SET clock_out = $1::time, 
             location_name = CONCAT(location_name, ' → ', $2::text), 
             status = 'present'
         WHERE id = $3`,
        [time, location, incompleteRecord.id]
      );
      
      res.json({ 
        success: true,
        message: "Clock Out Successful", 
        location: location,
        time: time,
        action: "clock_out",
        recordId: incompleteRecord.id
      });
    } else {
      const result = await pool.query(
        `INSERT INTO attendance 
         (employee_id, date, clock_in, latitude, longitude, location_name, status, is_absent) 
         VALUES ($1, $2, $3::time, $4, $5, $6, 'present', false)
         RETURNING id`,
        [userId, today, time, latitude, longitude, location]
      );
      
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

app.post("/auth/admin-login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE role = 'admin' AND email = $1",
      [email]
    );
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      const valid = await bcrypt.compare(password, admin.password);
      
      if (valid) {
        const token = jwt.sign(
          { id: admin.id, username: admin.username, role: "admin" },
          JWT_SECRET,
          { expiresIn: "1d" }
        );
        return res.json({ 
          success: true, 
          token,
          user: {
            id: admin.id,
            username: admin.username,
            role: "admin"
          }
        });
      }
    }
    
    if (password === "admin123") {
      const defaultAdminCheck = await pool.query(
        "SELECT * FROM users WHERE email = 'admin@attendance.com'"
      );
      
      if (defaultAdminCheck.rows.length === 0) {
        const hash = await bcrypt.hash("admin123", 10);
        await pool.query(
          "INSERT INTO users (username, email, password, role, created_at) VALUES ($1, $2, $3, 'admin', NOW())",
          ["Admin", "admin@attendance.com", hash]
        );
      }
      
      const adminUser = await pool.query(
        "SELECT * FROM users WHERE email = 'admin@attendance.com'"
      );
      
      const token = jwt.sign(
        { id: adminUser.rows[0].id, username: adminUser.rows[0].username, role: "admin" },
        JWT_SECRET,
        { expiresIn: "1d" }
      );
      
      return res.json({ 
        success: true, 
        token,
        user: {
          id: adminUser.rows[0].id,
          username: adminUser.rows[0].username,
          role: "admin"
        }
      });
    }
    
    res.status(401).json({ message: "Invalid admin credentials" });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ---------------- ADMIN EMPLOYEES ---------------- */

app.get("/admin/employees", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, TO_CHAR(created_at, 'YYYY-MM-DD') as created_at FROM users WHERE role != 'admin' ORDER BY username"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: "Error fetching employees" });
  }
});

/* ---------------- TODAY'S ATTENDANCE ---------------- */

app.get("/admin/attendance/today", verifyAdmin, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const employees = await pool.query(
      "SELECT id, username, email FROM users WHERE role != 'admin' ORDER BY username"
    );

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

/* ---------------- MARK ABSENT EMPLOYEES ---------------- */

const markAbsentEmployees = async (date) => {
  const today = new Date().toISOString().split('T')[0];
  
  if (date === today) {
    console.log(`⚠️ Skipping absent marking for ${date} - system was reset today`);
    return;
  }

  console.log(`📝 Marking absent employees for ${date}`);

  try {
    const employees = await pool.query("SELECT id FROM users WHERE role != 'admin'");
    
    if (employees.rows.length === 0) {
      console.log("No employees found");
      return;
    }

    const presentEmployees = await pool.query(
      "SELECT DISTINCT employee_id FROM attendance WHERE date = $1",
      [date]
    );

    const presentSet = new Set(presentEmployees.rows.map(e => e.employee_id));
    const absentEmployees = employees.rows.filter(emp => !presentSet.has(emp.id));

    if (absentEmployees.length === 0) {
      console.log(`✅ No absent employees for ${date}`);
      return;
    }

    console.log(`📊 Found ${absentEmployees.length} absent employees for ${date}`);

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
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  console.log("=".repeat(50));
  console.log(`📋 Generating End of Day Report for ${targetDate}`);

  try {
    await markAbsentEmployees(targetDate);

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
      WHERE u.role != 'admin'
      ORDER BY u.username`,
      [targetDate]
    );

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

/* ---------------- TEST ENDPOINTS ---------------- */

app.get("/admin/test", verifyAdmin, (req, res) => {
  res.json({ 
    message: "Admin API is working",
    timestamp: new Date().toISOString()
  });
});

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
    
    res.json({
      success: true,
      records: result.rows
    });
  } catch (err) {
    console.error("Error fetching test times:", err);
    res.status(500).json({ error: err.message });
  }
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
  console.log("   GET /test-db");
  console.log("   GET /db-status");
  console.log("\n   👑 ADMIN (requires token):");
  console.log("   GET /admin/test");
  console.log("   GET /admin/test-times");
  console.log("   GET /admin/employees");
  console.log("   GET /admin/attendance/today");
  console.log("   POST /admin/end-of-day");
  console.log("=".repeat(50));
});