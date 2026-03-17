import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Employee pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployeeQR from "./pages/EmployeeQR";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ScanAttendance from "./pages/ScanAttendance";

// Admin pages
import AdminQR from "./pages/AdminQR";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// Employee route protection
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

// Admin route protection
const AdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem("adminToken");
  return adminToken ? children : <Navigate to="/adminlogin" replace />;
};

function App() {
  return (
    <Router>
<Routes>
  <Route path="/" element={<Login />} />
  <Route path="/adminlogin" element={<AdminLogin />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/employeeqr" element={<EmployeeQR />} />
  <Route path="/adminqr" element={<AdminQR />} />
  <Route path="/employee" element={<PrivateRoute><EmployeeDashboard /></PrivateRoute>} />
  <Route path="/scan" element={<PrivateRoute><ScanAttendance /></PrivateRoute>} />
  <Route path="/admindashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
    </Router>
  );
}

export default App;