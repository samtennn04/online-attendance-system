// const mysql = require("mysql2")

// const db = mysql.createPool({
//  host:"localhost",
//  user:"root",
//  password:"Samsam04!",
//  database:"attendance_system"
// })

// module.exports = db.promise()

// db.js
const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST,       // from Render environment variables
  user: process.env.DB_USER,       // from Render environment variables
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db.promise(); // allows async/await in server.js