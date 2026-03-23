import React, { useEffect, useState } from "react";
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

// Backend URL
const API_URL = "https://online-attendance-system-1-cbgc.onrender.com";

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

// Wake-up component to keep backend alive
const BackendWakeUp = () => {
  const [wakeUpStatus, setWakeUpStatus] = useState("idle");
  const [wakeUpAttempts, setWakeUpAttempts] = useState(0);

  useEffect(() => {
    const wakeUpBackend = async () => {
      // Only wake up if backend is not already awake
      if (wakeUpStatus === "idle") {
        setWakeUpStatus("waking");
        
        try {
          console.log("🌐 Waking up backend server...");
          
          // Try multiple endpoints in case one is down
          const endpoints = [
            `${API_URL}/admin/test`,
            `${API_URL}/login`,
            `${API_URL}`
          ];
          
          // Try each endpoint with timeout
          for (let i = 0; i < endpoints.length; i++) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
              
              const response = await fetch(endpoints[i], {
                method: 'GET',
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json',
                }
              });
              
              clearTimeout(timeoutId);
              
              if (response.ok || response.status === 404) {
                // 404 is okay - means server is awake but endpoint not found
                console.log(`✅ Backend awake! (${endpoints[i]} responded in ${Date.now()})`);
                setWakeUpStatus("awake");
                return;
              }
            } catch (endpointError) {
              console.log(`Endpoint ${endpoints[i]} failed, trying next...`);
            }
          }
          
          // If we get here, all endpoints failed
          console.log("⚠️ Backend wake-up in progress, may take 30-60 seconds...");
          setWakeUpStatus("waking");
          
          // Last resort: try a simple fetch with longer timeout
          try {
            const response = await fetch(API_URL, {
              method: 'HEAD',
              timeout: 30000
            });
            console.log("✅ Backend responded to HEAD request");
            setWakeUpStatus("awake");
          } catch (finalError) {
            console.log("⏳ Backend still waking up... will retry on next request");
            setWakeUpStatus("retry");
          }
          
        } catch (error) {
          console.log("⏳ Backend wake-up initiated, will be ready shortly");
          setWakeUpStatus("retry");
          
          // Schedule a retry after 10 seconds if still not awake
          setTimeout(() => {
            if (wakeUpAttempts < 3) {
              setWakeUpAttempts(prev => prev + 1);
              setWakeUpStatus("idle");
            }
          }, 10000);
        }
      }
    };
    
    // Wake up backend on app load
    wakeUpBackend();
    
    // Optional: Wake up backend every 10 minutes to keep it warm
    const interval = setInterval(() => {
      if (wakeUpStatus === "awake") {
        // Just ping to keep alive
        fetch(`${API_URL}/admin/test`, { method: 'HEAD' })
          .catch(() => console.log("Keep-alive ping sent"));
      } else {
        // Try to wake up again
        setWakeUpStatus("idle");
      }
    }, 10 * 60 * 1000); // Every 10 minutes
    
    return () => clearInterval(interval);
  }, [wakeUpAttempts]);
  
  return null; // This component doesn't render anything
};

// Loading indicator for backend wake-up
const BackendLoadingIndicator = () => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    // Show loading indicator after 2 seconds if backend still waking
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!show) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace',
      pointerEvents: 'none'
    }}>
      ⏳ Waking up server...
    </div>
  );
};

// Enhanced Login page with wake-up awareness
const LoginWithWakeUp = () => {
  const [isWaking, setIsWaking] = useState(false);
  
  useEffect(() => {
    // Check if backend is responsive
    const checkBackend = async () => {
      setIsWaking(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch(`${API_URL}/admin/test`, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setIsWaking(false);
      } catch (error) {
        // Backend is waking up
        setIsWaking(true);
        
        // Retry after 3 seconds
        setTimeout(checkBackend, 3000);
      }
    };
    
    checkBackend();
  }, []);
  
  return (
    <>
      {isWaking && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
          <div>Waking up server...</div>
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            This takes 30-60 seconds on first access
          </div>
        </div>
      )}
      <Login />
    </>
  );
};

function App() {
  return (
    <Router>
      {/* Backend wake-up component - runs in background */}
      <BackendWakeUp />
      <BackendLoadingIndicator />
      
      <Routes>
        <Route path="/" element={<LoginWithWakeUp />} />
        <Route path="/adminlogin" element={<AdminLogin />} />
        <Route path="/login" element={<LoginWithWakeUp />} />
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