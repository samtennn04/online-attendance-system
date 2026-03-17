// src/pages/AdminLogin.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash, FaLock, FaUserShield } from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";

// Import logo
import logo from "../assets/logo.png";

const API_URL = "https://online-attendance-system-1-cbgc.onrender.com";

// Color palette matching AdminDashboard
const colors = {
  primary: "#006389",
  secondary: "#004b6e",
  accent: "#006389",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#006389",
  light: "#e5e7eb",
  offWhite: "#f3f4f6",
  white: "#ffffff",
  dark: "#1f2937",
  gray: "#6b7280",
  lightGray: "#9ca3af",
  gradient: "linear-gradient(135deg, #006389 0%, #004b6e 100%)"
};

function AdminLogin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  const navigate = useNavigate();

  console.log("✅ AdminLogin component mounted", window.location.pathname);

  // Preload logo
  useEffect(() => {
    const img = new Image();
    img.src = logo;
    img.onload = () => setLogoLoaded(true);
  }, []);

  const handleLogin = async () => {
    if (!password) {
      alert("Please enter admin password");
      return;
    }

    setIsLoading(true);
    setDebugInfo("Starting login...");
    
    // DEBUG LOGS
    console.log("=".repeat(50));
    console.log("🔐 ADMIN LOGIN DEBUG INFO");
    console.log("=".repeat(50));
    console.log("1. Password entered:", password);
    console.log("2. API_URL:", API_URL);
    console.log("3. Full endpoint:", `${API_URL}/auth/admin-login`);
    console.log("4. Request payload:", { password });
    
    try {
      console.log("5. Sending axios POST request...");
      const startTime = Date.now();
      
      const res = await axios.post(`${API_URL}/auth/admin-login`, { 
        password 
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      });
      
      const endTime = Date.now();
      console.log("6. Request completed in", endTime - startTime, "ms");
      console.log("7. Response status:", res.status);
      console.log("8. Response data:", res.data);
      
      if (res.data.token) {
        console.log("9. Token received:", res.data.token.substring(0, 20) + "...");
        localStorage.setItem("adminToken", res.data.token);
        console.log("10. Token saved to localStorage");
        
        // Verify token was saved
        const savedToken = localStorage.getItem("adminToken");
        console.log("11. Verified token in localStorage:", savedToken ? "Yes" : "No");
        
        setDebugInfo("Login successful! Redirecting...");
        console.log("12. Navigating to /admindashboard");
        navigate("/admindashboard");
      } else {
        console.error("No token in response:", res.data);
        setDebugInfo("Error: No token in response");
        alert("Login failed: Invalid server response");
      }
      
    } catch (err) {
      console.error("=".repeat(50));
      console.error("❌ ERROR DETAILS");
      console.error("=".repeat(50));
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      
      if (err.code) {
        console.error("Error code:", err.code);
      }
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Response status:", err.response.status);
        console.error("Response headers:", err.response.headers);
        console.error("Response data:", err.response.data);
        setDebugInfo(`Server error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
        alert(`Login failed: Server error ${err.response.status}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error("No response received. Request:", err.request);
        setDebugInfo("Network error: No response from server");
        alert("Login failed: Cannot reach server. Check if backend is running.");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Request setup error:", err.message);
        setDebugInfo(`Request error: ${err.message}`);
        alert(`Login failed: ${err.message}`);
      }
      
      console.error("=".repeat(50));
    } finally {
      setIsLoading(false);
      console.log("13. Login process completed");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Pattern matching AdminDashboard sidebar */}
      <div style={styles.backgroundPattern}></div>
      <div style={styles.backgroundOverlay}></div>
      
      {/* Logo at Top Center - Made bigger */}
      <div style={styles.logoWrapper}>
        {!logoLoaded ? (
          <div style={styles.logoPlaceholder}></div>
        ) : (
          <img 
            src={logo} 
            alt="Kuensel Logo" 
            style={styles.logo}
            loading="eager"
            fetchpriority="high"
          />
        )}
      </div>
      
      {/* Admin Login Card */}
      <div style={styles.card}>
        {/* Admin Icon */}
        <div style={styles.adminIconContainer}>
          <MdAdminPanelSettings size={60} color={colors.primary} />
        </div>

        <h2 style={styles.title}>Administrator Access</h2>
        <p style={styles.subtitle}>SECURE ADMIN PORTAL</p>

        {/* Password Input */}
        <div style={styles.inputWrapper}>
          <FaLock size={18} color={colors.primary} style={styles.inputIcon} />
          <input
            style={styles.input}
            type={showPassword ? "text" : "password"}
            placeholder="Enter Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          <span
            style={styles.eye}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash size={18} color={colors.primary} /> : <FaEye size={18} color={colors.primary} />}
          </span>
        </div>

        {/* Login Button */}
        <button 
          style={{
            ...styles.button,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }} 
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Authenticating...' : 'Access Dashboard'}
        </button>

        {/* Debug Info (only shown in development) */}
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <div style={styles.debugInfo}>
            <small>Debug: {debugInfo}</small>
          </div>
        )}

        {/* Security Note */}
        <div style={styles.securityNote}>
          <FaUserShield size={14} color={colors.gray} />
          <span style={styles.securityText}>Secure Admin Authentication</span>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;

/* ---------------- STYLES ---------------- */
const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, sans-serif",
    backgroundColor: colors.offWhite,
  },

  backgroundPattern: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
    background: colors.gradient,
    zIndex: 0,
  },

  backgroundOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
    zIndex: 1,
    pointerEvents: "none",
  },

  logoWrapper: {
    position: "fixed",
    top: "-20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    height: "200px",
    width: "auto",
    maxWidth: "450px",
    objectFit: "contain",
    filter: `drop-shadow(0 4px 12px ${colors.primary}40)`,
    contentVisibility: "auto",
    containIntrinsicSize: "100px",
  },

  logoPlaceholder: {
    height: "100px",
    width: "250px",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: "8px",
  },

  card: {
    position: "relative",
    width: "460px",
    padding: "55px 50px",
    borderRadius: "36px",
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: `0 30px 60px -15px ${colors.primary}80`,
    textAlign: "center",
    color: "white",
    zIndex: 2,
  },

  adminIconContainer: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 30px",
    border: `2px solid ${colors.primary}40`,
    backdropFilter: "blur(5px)",
  },

  title: {
    marginBottom: "8px",
    fontWeight: "700",
    fontSize: "32px",
    letterSpacing: "-0.5px",
    color: "white",
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  subtitle: {
    marginBottom: "40px",
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    letterSpacing: "2px",
  },

  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginBottom: "30px",
    width: "100%",
  },

  inputIcon: {
    position: "absolute",
    left: "18px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
    color: colors.primary,
  },

  input: {
    width: "100%",
    padding: "20px 45px 20px 48px",
    border: `1px solid ${colors.primary}40`,
    borderRadius: "60px",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontSize: "16px",
    fontWeight: "400",
    outline: "none",
    transition: "all 0.2s ease",
    height: "68px",
  },

  eye: {
    position: "absolute",
    right: "18px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    fontSize: "18px",
    color: colors.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s ease",
    zIndex: 2,
  },

  button: {
    width: "100%",
    padding: "20px",
    borderRadius: "60px",
    border: "none",
    background: colors.gradient,
    color: "white",
    fontSize: "18px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "25px",
    transition: "all 0.2s ease",
    boxShadow: `0 10px 25px -5px ${colors.primary}80`,
    letterSpacing: "0.5px",
    height: "68px",
  },

  securityNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "10px",
  },

  securityText: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.5)",
    fontWeight: "400",
    letterSpacing: "0.3px",
  },

  debugInfo: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#ffd700",
    wordBreak: "break-all",
  },
};

// Add global styles
const style = document.createElement("style");
style.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Ensure logo is visible immediately */
  img[src*="logo"] {
    content-visibility: auto;
    contain-intrinsic-size: 100px;
  }

  /* Input placeholder color */
  input::placeholder {
    color: rgba(255,255,255,0.6);
    font-weight: 400;
  }

  /* Remove native browser password reveal icon */
  input::-ms-reveal,
  input::-ms-clear,
  input::-webkit-password-toggle-button,
  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    display: none !important;
    -webkit-appearance: none;
  }

  /* Input focus effect */
  input:focus {
    border-color: ${colors.white} !important;
    background: rgba(255,255,255,0.12) !important;
    box-shadow: 0 0 0 4px ${colors.primary}20 !important;
  }

  /* Remove any inner box/shadow */
  input {
    box-shadow: none !important;
    -webkit-appearance: none !important;
    appearance: none !important;
  }

  /* Button hover effect */
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 20px 30px -8px ${colors.primary} !important;
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Eye icon hover */
  .eye:hover {
    color: white;
  }
  .eye:hover svg {
    color: white !important;
  }

  /* PC-specific optimizations */
  @media (min-width: 1400px) {
    .logo {
      height: 120px !important;
      max-width: 350px !important;
    }
    
    .card {
      width: 500px;
      padding: 60px 55px;
    }
  }

  /* Responsive for smaller screens */
  @media (max-width: 768px) {
    .logo {
      height: 70px !important;
      max-width: 220px !important;
    }
    
    .logoWrapper {
      top: 20px !important;
    }
    
    .card {
      width: 90%;
      max-width: 400px;
      padding: 40px 30px;
    }
    
    .adminIconContainer {
      width: 90px;
      height: 90px;
    }
    
    .title {
      font-size: 26px;
    }
    
    .input {
      height: 60px;
      padding: 16px 40px 16px 45px;
    }
    
    .button {
      height: 60px;
      padding: 16px;
      font-size: 16px;
    }
  }
`;

document.head.appendChild(style);