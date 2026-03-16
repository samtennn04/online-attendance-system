// src/routes/AdminRoute.js
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem("adminToken");
  return adminToken ? children : <Navigate to="/adminlogin" replace />;
};

export default AdminRoute;