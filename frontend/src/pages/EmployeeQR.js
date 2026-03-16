// src/pages/EmployeeQR.js

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function EmployeeQR() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to employee login page
    navigate("/login");
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Redirecting to Employee Login...</h2>
    </div>
  );
}

export default EmployeeQR;