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

// Fix the hostname if it's incomplete
let dbHost = process.env.DB_HOST;
if (dbHost && !dbHost.includes('.render.com') && dbHost !== 'localhost') {
  console.log('⚠️  Fixing incomplete hostname...');
  dbHost = `${dbHost}.singapore-postgres.render.com`;
  console.log('📡 Using full hostname:', dbHost);
}

// Create connection configuration
const poolConfig = {
  host: dbHost || process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false  // Always use SSL for Render
  },
  connectionTimeoutMillis: 10000,
  max: 20,
  idleTimeoutMillis: 30000,
};

// If DATABASE_URL is provided, use it instead
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
  console.log('📡 Using DATABASE_URL for connection');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  });
  setupDatabase(pool);
} else {
  console.log('📡 Using individual database parameters');
  console.log('📡 Host:', poolConfig.host);
  console.log('📡 Database:', poolConfig.database);
  console.log('📡 User:', poolConfig.user);
  const pool = new Pool(poolConfig);
  setupDatabase(pool);
}

function setupDatabase(pool) {
  // Add error handler for the pool
  pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
  });

  // Test database connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database connection failed:');
      console.error('   Error:', err.message);
      console.error('   Code:', err.code);
      
      if (err.code === 'ENOTFOUND') {
        console.error('   ⚠️  DNS lookup failed. Make sure DB_HOST is complete.');
        console.error('   Expected: dpg-xxxxx.singapore-postgres.render.com');
        console.error('   Current:', poolConfig.host);
      } else if (err.code === '28P01') {
        console.error('   ⚠️  Authentication failed. Wrong password.');
        console.error('   💡 Reset password in Render dashboard');
      } else if (err.code === 'ECONNRESET') {
        console.error('   ⚠️  Connection reset. This may be a temporary issue.');
        console.error('   💡 Waiting 5 seconds and retrying...');
        setTimeout(() => {
          pool.connect();
        }, 5000);
      }
    } else {
      console.log('✅ Connected to PostgreSQL database');
      release();
      createTables(pool);
    }
  });

  // Create tables if they don't exist
  const createTables = async (pool) => {
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

  // Make pool available globally
  app.locals.pool = pool;
}

// Middleware to get pool
const getPool = (req, res, next) => {
  req.pool = app.locals.pool;
  next();
};

app.use(getPool);

/* ---------------- REGISTER ---------------- */

app.post("/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  const pool = req.pool;

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
  const pool = req.pool;

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
  const pool = req.pool;
  
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
  const pool = req.pool;

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
  const pool = req.pool;
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
  const pool = req.pool;
  
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

// [Keep all the other endpoints (monthly attendance, stats, etc.) exactly as they are in your current server.js]
// For brevity, I'm not including all of them here, but they should remain unchanged

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