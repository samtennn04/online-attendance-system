require('dotenv').config();
const path = require('path');
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios");
const cron = require('node-cron'); // Added for automatic scheduling

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

const PORT = 5000;
const JWT_SECRET = "secretkey";

/* ---------------- MYSQL CONNECTION ---------------- */

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "Samsam04!",
//   database: "attendance_system"
// });

// db.connect(err => {
//   if (err) console.log("DB error:", err);
//   else console.log("MySQL Connected");
// });

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
    return res.status(400).json({ message: "Password must be 8 characters" });
  }

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())",
    [username, email, hash],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Email already registered" });
        }
        return res.status(500).json({ message: "Registration failed" });
      }
      res.json({ message: "User registered successfully" });
    }
  );
});

/* ---------------- LOGIN ---------------- */

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err, result) => {
      if (result.length === 0) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = result[0];
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
        token,
        user: { id: user.id, username: user.username, role: user.role || "employee" }
      });
    }
  );
});

/* ---------------- JWT VERIFY ---------------- */

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token" });

  const token = auth.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

/* ---------------- ADMIN VERIFY ---------------- */

function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token" });

  const token = auth.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    req.user = decoded;
    next();
  });
}

/* ---------------- ATTENDANCE STATUS CHECK - FIXED ---------------- */

app.get("/attendance/status", verifyToken, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`📊 Checking attendance status for user ${userId} on ${today}`);
  
  db.query(
    "SELECT * FROM attendance WHERE employee_id = ? AND date = ? ORDER BY id",
    [userId, today],
    (err, results) => {
      if (err) {
        console.error("Error checking attendance status:", err);
        return res.status(500).json({ error: "Database error" });
      }
      
      console.log(`📊 Found ${results.length} records for today`);
      
      if (results.length === 0) {
        // No records today
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
      const hasIncomplete = results.some(r => r.clock_in && !r.clock_out);
      
      // Check if there's a completed record (both clock_in and clock_out)
      const hasCompleted = results.some(r => r.clock_in && r.clock_out);
      
      if (hasCompleted) {
        // Already completed attendance for today
        return res.json({ 
          status: "completed",
          hasClockedIn: true, 
          hasClockedOut: true,
          clockInTime: results.find(r => r.clock_in)?.clock_in,
          clockOutTime: results.find(r => r.clock_out)?.clock_out,
          message: "Attendance already completed for today",
          canClockIn: false,
          canClockOut: false
        });
      } else if (hasIncomplete) {
        // Has clocked in but not out
        const incompleteRecord = results.find(r => r.clock_in && !r.clock_out);
        return res.json({ 
          status: "clocked_in",
          hasClockedIn: true, 
          hasClockedOut: false,
          clockInTime: incompleteRecord?.clock_in,
          message: "Clocked in, ready for clock out",
          canClockIn: false,
          canClockOut: true
        });
      } else {
        // Has some other record (shouldn't happen, but just in case)
        return res.json({ 
          status: "unknown",
          hasClockedIn: results.some(r => r.clock_in), 
          hasClockedOut: results.some(r => r.clock_out),
          message: "Unknown attendance status",
          canClockIn: !results.some(r => r.clock_in),
          canClockOut: results.some(r => r.clock_in) && !results.some(r => r.clock_out)
        });
      }
    }
  );
});

/* ---------------- ATTENDANCE WITH LOCATION FORMATTING - FIXED ---------------- */

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
  const now = new Date();
  const time = now.toTimeString().split(" ")[0];

  console.log("=".repeat(50));
  console.log(`📝 Processing attendance for user ${userId} on ${today} at ${time}`);
  console.log(`📍 Location: ${location}`);

  // Check if attendance already exists for today
  db.query(
    "SELECT * FROM attendance WHERE employee_id=? AND date=? ORDER BY id",
    [userId, today],
    (err, records) => {
      if (err) {
        console.error("Error checking attendance:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      console.log(`📊 Found ${records.length} records for today`);

      // Check if there's already a completed record (both clock_in and clock_out)
      const completedRecord = records.find(r => r.clock_in && r.clock_out);
      
      if (completedRecord) {
        console.log(`⚠️ Employee ${userId} has already completed attendance for today`);
        return res.status(400).json({ 
          success: false,
          message: "You have already completed your attendance for today"
        });
      }

      // Check if there's an incomplete record (clock_in but no clock_out)
      const incompleteRecord = records.find(r => r.clock_in && !r.clock_out);

      if (incompleteRecord) {
        // This is CLOCK OUT
        console.log(`✅ Found incomplete record ID ${incompleteRecord.id} - Processing clock out`);
        
        db.query(
          `UPDATE attendance 
          SET clock_out=?, location_name=CONCAT(location_name, ' → ', ?), status='present'
          WHERE id=?`,
          [time, location, incompleteRecord.id],
          (err, result) => {
            if (err) {
              console.error("Clock out error:", err);
              return res.status(500).json({ 
                success: false,
                message: "Failed to clock out"
              });
            }
            
            console.log(`✅ Clock out successful for user ${userId}`);
            
            res.json({ 
              success: true,
              message: "Clock Out Successful", 
              location: location,
              time: time,
              action: "clock_out"
            });
          }
        );
      } else {
        // No incomplete record found - This is CLOCK IN
        console.log("✅ No incomplete records found - Creating clock in");
        
        db.query(
          `INSERT INTO attendance 
          (employee_id, date, clock_in, latitude, longitude, location_name, status, is_absent) 
          VALUES (?, ?, ?, ?, ?, ?, 'present', 0)`,
          [userId, today, time, latitude, longitude, location],
          (err, result) => {
            if (err) {
              console.error("Clock in error:", err);
              return res.status(500).json({ 
                success: false,
                message: "Failed to clock in"
              });
            }
            
            console.log(`✅ Clock in successful for user ${userId}`);
            
            res.json({ 
              success: true,
              message: "Clock In Successful", 
              location: location,
              time: time,
              action: "clock_in"
            });
          }
        );
      }
    }
  );
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
    return res.json({ token });
  }
  res.status(401).json({ message: "Wrong password" });
});

/* ---------------- ADMIN EMPLOYEES ---------------- */

app.get("/admin/employees", verifyAdmin, (req, res) => {
  db.query(
    "SELECT id, username, email, DATE_FORMAT(created_at, '%Y-%m-%d') as created_at FROM users ORDER BY username",
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error fetching employees" });
      }
      res.json(result);
    }
  );
});

/* ---------------- TODAY'S ATTENDANCE - UPDATED ---------------- */

app.get("/admin/attendance/today", verifyAdmin, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // First get all employees
  db.query(
    "SELECT id, username, email, DATE_FORMAT(created_at, '%Y-%m-%d') as created_at FROM users ORDER BY username",
    (err, employees) => {
      if (err) {
        console.error("Error fetching employees:", err);
        return res.status(500).json({ message: "Error fetching employees" });
      }

      // Then get today's attendance
      db.query(
        `SELECT 
          a.id,
          a.employee_id,
          u.username,
          DATE_FORMAT(a.date, '%Y-%m-%d') as date,
          TIME_FORMAT(a.clock_in, '%H:%i:%s') as clock_in,
          TIME_FORMAT(a.clock_out, '%H:%i:%s') as clock_out,
          a.location_name,
          a.status
        FROM attendance a
        JOIN users u ON a.employee_id = u.id
        WHERE a.date = ?
        ORDER BY a.created_at DESC`,
        [today],
        (err, results) => {
          if (err) {
            console.error("Error fetching today's attendance:", err);
            return res.status(500).json({ message: "Error fetching attendance" });
          }
          
          res.json({
            success: true,
            date: today,
            total_records: results.length,
            all_records: results,
            employees: employees
          });
        }
      );
    }
  );
});

/* ---------------- MARK ABSENT EMPLOYEES FUNCTION - UPDATED ---------------- */

const markAbsentEmployees = (date) => {
  const today = new Date().toISOString().split('T')[0];
  
  // 🚫 DON'T mark absent for today if we just deleted everything
  // This ensures after delete, today stays empty
  if (date === today) {
    console.log(`⚠️ Skipping absent marking for ${date} - system was reset today`);
    return;
  }

  console.log(`📝 Marking absent employees for ${date}`);

  // First, get all employees
  db.query(
    "SELECT id FROM users",
    (err, employees) => {
      if (err) {
        console.error("Error fetching employees:", err);
        return;
      }

      if (employees.length === 0) {
        console.log("No employees found");
        return;
      }

      // Then, get all employees who have attendance for this date
      db.query(
        "SELECT DISTINCT employee_id FROM attendance WHERE date = ?",
        [date],
        (err, presentEmployees) => {
          if (err) {
            console.error("Error fetching present employees:", err);
            return;
          }

          // Create a Set of present employee IDs
          const presentSet = new Set(presentEmployees.map(e => e.employee_id));

          // Find absent employees (all employees - present employees)
          const absentEmployees = employees.filter(emp => !presentSet.has(emp.id));

          if (absentEmployees.length === 0) {
            console.log(`✅ No absent employees for ${date}`);
            return;
          }

          console.log(`📊 Found ${absentEmployees.length} absent employees for ${date}`);

          // Insert absent records for each absent employee
          let insertedCount = 0;
          absentEmployees.forEach(emp => {
            db.query(
              `INSERT INTO attendance 
              (employee_id, date, status, is_absent, created_at) 
              VALUES (?, ?, 'absent', 1, NOW())`,
              [emp.id, date],
              (err, result) => {
                if (err) {
                  console.error(`Error marking absent for employee ${emp.id}:`, err);
                } else {
                  insertedCount++;
                  if (insertedCount === absentEmployees.length) {
                    console.log(`✅ Marked ${insertedCount} employees absent for ${date}`);
                  }
                }
              }
            );
          });
        }
      );
    }
  );
};

/* ---------------- END OF DAY REPORT ---------------- */

app.post("/admin/end-of-day", verifyAdmin, (req, res) => {
  const { date } = req.body;
  
  // Use today's date if no date provided
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  console.log("=".repeat(50));
  console.log(`📋 Generating End of Day Report for ${targetDate}`);
  console.log("=".repeat(50));

  // First, mark absent employees
  markAbsentEmployees(targetDate);

  // Then generate the full report
  db.query(
    `SELECT 
      u.id as employee_id,
      u.username,
      u.email,
      a.clock_in,
      a.clock_out,
      a.location_name,
      a.status,
      a.is_absent,
      a.created_at
    FROM users u
    LEFT JOIN attendance a ON u.id = a.employee_id AND a.date = ?
    ORDER BY u.username`,
    [targetDate],
    (err, results) => {
      if (err) {
        console.error("Error generating end of day report:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error generating report" 
        });
      }

      // Helper function to format time
      const formatTime = (time) => {
        if (!time) return null;
        return time;
      };

      // Format the results
      const report = results.map(row => ({
        employee_id: row.employee_id,
        username: row.username,
        email: row.email,
        date: targetDate,
        clock_in: row.clock_in ? formatTime(row.clock_in) : null,
        clock_out: row.clock_out ? formatTime(row.clock_out) : null,
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
    }
  );
});

/* ---------------- MONTHLY ATTENDANCE WITH ABSENT RECORDS ---------------- */

app.get("/admin/attendance/monthly/:year/:month", verifyAdmin, (req, res) => {
  const { year, month } = req.params;
  
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid year or month parameters" 
    });
  }

  console.log(`📅 Fetching monthly attendance for ${year}-${month} (including absent records)`);

  // First get all employees with their registration dates
  db.query(
    "SELECT id, username, email, DATE_FORMAT(created_at, '%Y-%m-%d') as created_at FROM users ORDER BY username",
    (err, employees) => {
      if (err) {
        console.error("Error fetching employees:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error fetching employees" 
        });
      }

      // Then get all attendance records for the month (including absent)
      db.query(
        `SELECT 
          a.id,
          a.employee_id,
          u.username,
          u.email as employee_email,
          DATE_FORMAT(a.date, '%Y-%m-%d') as date,
          TIME_FORMAT(a.clock_in, '%H:%i:%s') as clock_in,
          TIME_FORMAT(a.clock_out, '%H:%i:%s') as clock_out,
          a.location_name,
          a.status,
          a.is_absent,
          a.created_at as record_created_at
        FROM attendance a
        JOIN users u ON a.employee_id = u.id
        WHERE YEAR(a.date) = ? AND MONTH(a.date) = ?
        ORDER BY a.date DESC, a.created_at DESC`,
        [yearNum, monthNum],
        (err, attendanceRecords) => {
          if (err) {
            console.error("Error fetching monthly attendance:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Error fetching attendance records" 
            });
          }
          
          console.log(`✅ Found ${attendanceRecords.length} attendance records for ${year}-${month}`);
          
          // Return both employees and attendance records
          res.json({
            success: true,
            year: yearNum,
            month: monthNum,
            employees: employees,
            attendance: attendanceRecords,
            total_records: attendanceRecords.length
          });
        }
      );
    }
  );
});

/* ---------------- EMPLOYEE FULL HISTORY - UPDATED ---------------- */

app.get("/admin/employee/:id/history", verifyAdmin, (req, res) => {
  const employeeId = req.params.id;

  // First get employee details
  db.query(
    "SELECT id, username, email, DATE_FORMAT(created_at, '%Y-%m-%d') as created_at FROM users WHERE id = ?",
    [employeeId],
    (err, userResult) => {
      if (err || userResult.length === 0) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const employee = userResult[0];

      // Then get all attendance records (including absent)
      db.query(
        `SELECT 
          id,
          DATE_FORMAT(date, '%Y-%m-%d') as date,
          TIME_FORMAT(clock_in, '%H:%i:%s') as clock_in,
          TIME_FORMAT(clock_out, '%H:%i:%s') as clock_out,
          location_name,
          status,
          is_absent,
          created_at as record_created_at
         FROM attendance 
         WHERE employee_id = ?
         ORDER BY date DESC, created_at DESC`,
        [employeeId],
        (err, attendanceResult) => {
          if (err) {
            console.error("Error fetching employee attendance:", err);
            return res.status(500).json({ message: "Error fetching attendance" });
          }

          res.json({
            employee,
            attendance: attendanceResult,
            total_records: attendanceResult.length,
            registered_date: employee.created_at
          });
        }
      );
    }
  );
});

/* ---------------- DELETE EMPLOYEE ---------------- */

app.delete("/admin/employees/:id", verifyAdmin, (req, res) => {
  const id = req.params.id;

  db.query(
    "DELETE FROM attendance WHERE employee_id=?",
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ message: "Error deleting employee records" });
      }

      db.query(
        "DELETE FROM users WHERE id=?",
        [id],
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Error deleting employee" });
          }
          res.json({ 
            success: true,
            message: "Employee deleted successfully" 
          });
        }
      );
    }
  );
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

/* ---------------- GET DATE RANGE OF ATTENDANCE RECORDS ---------------- */

app.get("/admin/attendance/date-range", verifyAdmin, (req, res) => {
  console.log("📅 Fetching min and max dates from attendance records");

  db.query(
    "SELECT MIN(date) as minDate, MAX(date) as maxDate FROM attendance",
    (err, result) => {
      if (err) {
        console.error("Error fetching date range:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error fetching date range" 
        });
      }

      res.json({
        success: true,
        minDate: result[0].minDate,
        maxDate: result[0].maxDate
      });
    }
  );
});

/* ---------------- DELETE ALL ATTENDANCE RECORDS ---------------- */

app.delete("/admin/attendance/all", verifyAdmin, (req, res) => {
  console.log("=".repeat(50));
  console.log("🗑️ DELETING ALL ATTENDANCE RECORDS");
  console.log("=".repeat(50));

  // First, get count of records to be deleted
  db.query(
    "SELECT COUNT(*) as total FROM attendance",
    (err, countResult) => {
      if (err) {
        console.error("Error counting attendance records:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error counting attendance records" 
        });
      }

      const totalRecords = countResult[0].total;

      // Delete all attendance records
      db.query(
        "DELETE FROM attendance",
        (err, result) => {
          if (err) {
            console.error("Error deleting all attendance records:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Error deleting attendance records" 
            });
          }

          console.log(`✅ Deleted ${totalRecords} attendance records`);
          
          res.json({ 
            success: true,
            message: `Successfully deleted ${totalRecords} attendance records`,
            deletedCount: totalRecords
          });
        }
      );
    }
  );
});

/* ---------------- DELETE ATTENDANCE RECORDS BY DATE RANGE ---------------- */

app.delete("/admin/attendance/range", verifyAdmin, (req, res) => {
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

  // First, get count of records to be deleted in the date range
  db.query(
    "SELECT COUNT(*) as total FROM attendance WHERE date BETWEEN ? AND ?",
    [startDate, endDate],
    (err, countResult) => {
      if (err) {
        console.error("Error counting attendance records:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error counting attendance records" 
        });
      }

      const totalRecords = countResult[0].total;

      if (totalRecords === 0) {
        return res.json({ 
          success: true,
          message: `No attendance records found between ${startDate} and ${endDate}`,
          deletedCount: 0
        });
      }

      // Delete attendance records in the date range
      db.query(
        "DELETE FROM attendance WHERE date BETWEEN ? AND ?",
        [startDate, endDate],
        (err, result) => {
          if (err) {
            console.error("Error deleting attendance records:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Error deleting attendance records" 
            });
          }

          console.log(`✅ Deleted ${totalRecords} attendance records from ${startDate} to ${endDate}`);
          
          res.json({ 
            success: true,
            message: `Successfully deleted ${totalRecords} attendance records from ${startDate} to ${endDate}`,
            deletedCount: totalRecords,
            startDate: startDate,
            endDate: endDate
          });
        }
      );
    }
  );
});

/* ---------------- GET AVAILABLE YEARS ---------------- */

app.get("/admin/attendance/years", verifyAdmin, (req, res) => {
  console.log("📅 Fetching available years from attendance records");

  db.query(
    "SELECT DISTINCT YEAR(date) as year FROM attendance ORDER BY year DESC",
    (err, results) => {
      if (err) {
        console.error("Error fetching years:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error fetching years" 
        });
      }

      const years = results.map(r => r.year);
      console.log("✅ Available years:", years);

      res.json({
        success: true,
        years: years
      });
    }
  );
});

/* ---------------- GET STATISTICS - UPDATED ---------------- */

app.get("/admin/stats", verifyAdmin, (req, res) => {
  console.log("📊 Fetching dashboard statistics");

  const today = new Date().toISOString().split('T')[0];

  // Get total employees
  db.query(
    "SELECT COUNT(*) as total FROM users",
    (err, employeeResult) => {
      if (err) {
        console.error("Error fetching employee count:", err);
        return res.status(500).json({ message: "Error fetching statistics" });
      }

      const totalEmployees = employeeResult[0].total;

      // Get today's attendance
      db.query(
        `SELECT 
          COUNT(*) as total_today,
          SUM(CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN 1 ELSE 0 END) as present_today,
          SUM(CASE WHEN (clock_in IS NOT NULL AND clock_out IS NULL) OR (clock_in IS NULL AND clock_out IS NOT NULL) THEN 1 ELSE 0 END) as partial_today,
          COUNT(DISTINCT employee_id) as employees_with_records_today
        FROM attendance 
        WHERE date = ?`,
        [today],
        (err, todayResult) => {
          if (err) {
            console.error("Error fetching today's attendance:", err);
            return res.status(500).json({ message: "Error fetching statistics" });
          }

          const presentToday = todayResult[0].present_today || 0;
          const partialToday = todayResult[0].partial_today || 0;
          const employeesWithRecords = todayResult[0].employees_with_records_today || 0;
          const absentToday = totalEmployees - employeesWithRecords;

          // Get monthly totals
          const year = new Date().getFullYear();
          const month = new Date().getMonth() + 1;

          db.query(
            `SELECT 
              COUNT(*) as total_month,
              SUM(CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL THEN 1 ELSE 0 END) as present_month,
              SUM(CASE WHEN (clock_in IS NOT NULL AND clock_out IS NULL) OR (clock_in IS NULL AND clock_out IS NOT NULL) THEN 1 ELSE 0 END) as partial_month
            FROM attendance 
            WHERE YEAR(date) = ? AND MONTH(date) = ?`,
            [year, month],
            (err, monthResult) => {
              if (err) {
                console.error("Error fetching monthly attendance:", err);
                return res.status(500).json({ message: "Error fetching statistics" });
              }

              const daysInMonth = new Date(year, month, 0).getDate();
              const totalPossibleRecords = totalEmployees * daysInMonth;
              const presentMonth = monthResult[0].present_month || 0;
              const partialMonth = monthResult[0].partial_month || 0;
              const totalRecords = monthResult[0].total_month || 0;
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
            }
          );
        }
      );
    }
  );
});

/* ---------------- AUTOMATIC END OF DAY SCHEDULER - UPDATED ---------------- */

// Schedule end of day report at 11:59 PM every day
cron.schedule('59 23 * * *', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  console.log('🕛 Running automatic end of day attendance marking for', yesterday);
  // Pass YESTERDAY's date so today stays empty after delete
  markAbsentEmployees(yesterday);
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // Change this to your timezone
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
      req.path === '/login' || 
      req.path.startsWith('/attendance')) {
    return next(); // Continue to API routes
  }
  
  // For all other routes, serve the React app
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