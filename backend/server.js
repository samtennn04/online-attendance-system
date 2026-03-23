require('dotenv').config();
const path = require('path');
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios");
const cron = require('node-cron');
const fs = require('fs');

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

/* ---------------- DATABASE CONNECTION ---------------- */

let db;

// Check if we're in production (Render) or development
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  // Use PostgreSQL in production
  const { Pool } = require("pg");
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('📡 Using PostgreSQL (production)');
  
  db.connect((err) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
    } else {
      console.log('✅ Connected to PostgreSQL database');
      createTablesPostgres();
    }
  });
} else {
  // Use SQLite in development
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'attendance.db');
  const sqliteDb = new sqlite3.Database(dbPath);
  
  // Create a wrapper that mimics PostgreSQL's interface
  db = {
    query: (text, params) => {
      return new Promise((resolve, reject) => {
        // Convert PostgreSQL $1, $2 to SQLite ? placeholders
        let sql = text;
        if (params && params.length > 0) {
          // Replace $1, $2, etc. with ?
          for (let i = 0; i < params.length; i++) {
            sql = sql.replace(`$${i + 1}`, '?');
          }
        }
        
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || 
                         sql.trim().toUpperCase().startsWith('WITH');
        
        if (isSelect) {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows: rows });
          });
        } else {
          sqliteDb.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ rows: [], lastID: this.lastID });
          });
        }
      });
    },
    connect: (callback) => {
      callback(null, sqliteDb, () => {});
    }
  };
  
  console.log('📡 Using SQLite (development) at:', dbPath);
  
  // Create tables for SQLite
  sqliteDb.serialize(() => {
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      clock_in TIME,
      clock_out TIME,
      latitude REAL,
      longitude REAL,
      location_name TEXT,
      status TEXT DEFAULT 'present',
      is_absent BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('✅ SQLite tables ready');
  });
}

// PostgreSQL table creation
const createTablesPostgres = async () => {
  try {
    await db.query(`
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

    await db.query(`
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

    await db.query(`
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
    
    await db.query(
      "INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, datetime('now'))",
      [username, email, hash]
    );
    
    res.json({ 
      success: true,
      message: "User registered successfully"
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ message: "Email already registered" });
    }
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ---------------- LOGIN ---------------- */

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
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
  
  try {
    const result = await db.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2 ORDER BY id",
      [userId, today]
    );
    
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

// Helper function to get Bhutan time
const getBhutanTime = () => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();
  let bhutanHours = utcHours + 6;
  if (bhutanHours >= 24) bhutanHours -= 24;
  return `${String(bhutanHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:${String(utcSeconds).padStart(2, '0')}`;
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
      const road = comp.road || "";
      const place = comp.suburb || comp.neighbourhood || "";
      const city = comp.city || comp.town || "";
      location = [road, place, city].filter(Boolean).join(", ");
      if (!location) location = "Unknown Location";
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  const today = new Date().toISOString().split("T")[0];
  const time = getBhutanTime();

  try {
    const records = await db.query(
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
      await db.query(
        `UPDATE attendance 
         SET clock_out = $1, 
             location_name = location_name || ' → ' || $2, 
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
      const result = await db.query(
        `INSERT INTO attendance 
         (employee_id, date, clock_in, latitude, longitude, location_name, status, is_absent) 
         VALUES ($1, $2, $3, $4, $5, $6, 'present', false)`,
        [userId, today, time, latitude, longitude, location]
      );
      
      res.json({ 
        success: true,
        message: "Clock In Successful", 
        location: location,
        time: time,
        action: "clock_in",
        recordId: result.lastID
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
    const result = await db.query(
      "SELECT id, username, email, created_at FROM users ORDER BY username"
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
    const attendance = await db.query(
      `SELECT a.id, a.employee_id, u.username, a.date, a.clock_in, a.clock_out, a.location_name, a.status
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
      all_records: attendance.rows
    });
  } catch (err) {
    console.error('Error fetching today\'s attendance:', err);
    res.status(500).json({ message: "Error fetching attendance" });
  }
});

/* ---------------- STATIC FILE SERVING ---------------- */

const buildPath = path.join(__dirname, "build");

if (fs.existsSync(buildPath)) {
  console.log('✅ Build folder found, serving React app');
  app.use(express.static(buildPath));
  
  app.use((req, res, next) => {
    if (req.path.startsWith('/auth/') || 
        req.path.startsWith('/attendance/') || 
        req.path.startsWith('/admin/')) {
      return next();
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('⚠️ Build folder not found, API only mode');
}

app.use((req, res) => {
  if (req.path.startsWith('/auth/') || 
      req.path.startsWith('/attendance/') || 
      req.path.startsWith('/admin/')) {
    res.status(404).json({ message: 'API route not found' });
  } else {
    res.status(404).send('Not found');
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
  console.log("\n   👑 ADMIN (requires token):");
  console.log("   GET /admin/employees");
  console.log("   GET /admin/attendance/today");
  console.log("=".repeat(50));
});