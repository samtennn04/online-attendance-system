const express=require("express");
const router=express.Router();
const db=require("../db");

app.get("/admin/attendance", verifyAdmin, (req, res) => {
  const sql = `
    SELECT 
      users.id AS employee_id,
      users.username,
      users.email,
      attendance.date,
      attendance.clock_in,
      attendance.clock_out,
      attendance.location_name
    FROM attendance
    JOIN users ON users.id = attendance.employee_id
    ORDER BY attendance.date DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error fetching attendance" });
    }

    res.json(result);
  });
});