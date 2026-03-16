// src/pages/Login.js
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from "react-icons/fa";

// Import logo directly - this ensures it's bundled and loaded immediately
import logo from "../assets/logo.png";

const API_URL = "https://nonshredding-claudine-opulently.ngrok-free.dev";

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

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();

  // Check for existing session on component mount - runs immediately
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const remember = localStorage.getItem("rememberMe") === "true";
    
    if (remember && token && user) {
      navigate("/employee");
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });

      const { user, token } = res.data;

      // Store authentication data
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
      localStorage.setItem("rememberMe", rememberMe.toString());

      navigate("/employee");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Pattern - loads instantly with CSS */}
      <div style={styles.backgroundPattern}></div>
      <div style={styles.backgroundOverlay}></div>
      
      {/* Logo - bigger and centered */}
      <div style={styles.logoWrapper}>
        <img 
          src={logo} 
          alt="Kuensel Logo" 
          style={styles.logo}
          loading="eager"
          fetchpriority="high"
        />
      </div>
      
      {/* Login Card */}
      <div style={styles.card}>
        {/* Removed account icon - just welcome text */}
        <h2 style={styles.title}>Welcome</h2>

        {/* Email */}
        <div style={styles.inputWrapper}>
          <FaEnvelope size={18} color={colors.primary} style={styles.inputIcon} />
          <input
            style={styles.input}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />
        </div>

        {/* Password */}
        <div style={styles.inputWrapper}>
          <FaLock size={18} color={colors.primary} style={styles.inputIcon} />
          <input
            style={styles.input}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <span
            style={styles.eye}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash size={18} color={colors.primary} /> : <FaEye size={18} color={colors.primary} />}
          </span>
        </div>

        {/* Remember Me Checkbox */}
        <div style={styles.rememberMeContainer}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>Keep me signed in</span>
          </label>
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
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>

        {/* Register Link */}
        <div style={styles.registerSection}>
          <span style={styles.registerText}>New employee?</span>
          <Link to="/register" style={styles.registerLink}>
            Create Account
          </Link>
        </div>

        {/* Security Note */}
        <div style={styles.securityNote}>
          <FaLock size={12} color={`${colors.primary}80`} />
          <span style={styles.securityText}>Secure Employee Authentication</span>
        </div>
      </div>
    </div>
  );
}

export default Login;

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
    top: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    pointerEvents: "none",
  },

  logo: {
    height: "100px",
    width: "auto",
    maxWidth: "300px",
    objectFit: "contain",
    filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.25))`,
    contentVisibility: "auto",
    containIntrinsicSize: "100px",
  },

  card: {
    position: "relative",
    width: "420px",
    padding: "45px 40px",
    borderRadius: "36px",
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${colors.primary}40`,
    boxShadow: `0 30px 60px -15px ${colors.primary}80`,
    textAlign: "center",
    color: "white",
    zIndex: 2,
  },

  title: {
    marginBottom: "35px",
    fontWeight: "600",
    fontSize: "32px",
    letterSpacing: "-0.5px",
    color: "white",
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
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
    padding: "16px 45px 16px 48px",
    border: `1px solid ${colors.primary}40`,
    borderRadius: "60px",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontSize: "15px",
    fontWeight: "400",
    outline: "none",
    transition: "all 0.2s ease",
    height: "58px",
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

  rememberMeContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: "20px",
    paddingLeft: "5px",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    color: "rgba(255,255,255,0.9)",
    fontSize: "14px",
  },

  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: colors.primary,
  },

  checkboxText: {
    userSelect: "none",
  },

  button: {
    width: "100%",
    padding: "16px",
    borderRadius: "60px",
    border: "none",
    background: colors.gradient,
    color: "white",
    fontSize: "17px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
    transition: "all 0.2s ease",
    boxShadow: `0 10px 25px -5px ${colors.primary}80`,
    letterSpacing: "0.5px",
    height: "58px",
  },

  registerSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "20px",
  },

  registerText: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
  },

  registerLink: {
    color: "white",
    fontWeight: "600",
    textDecoration: "none",
    borderBottom: `2px solid ${colors.primary}80`,
    paddingBottom: "2px",
    transition: "border-color 0.2s ease",
  },

  securityNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginTop: "25px",
  },

  securityText: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
    fontWeight: "400",
    letterSpacing: "0.3px",
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

  /* Remove default blue outline */
  input:focus-visible {
    outline: none !important;
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

  /* Register link hover */
  .registerLink:hover {
    border-bottom-color: ${colors.white};
  }

  /* Eye icon hover */
  .eye:hover {
    color: white;
  }
  .eye:hover svg {
    color: white !important;
  }

  /* Checkbox styling */
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: ${colors.primary};
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .logo {
      height: 70px !important;
      max-width: 220px !important;
    }
    
    .logoWrapper {
      top: 20px !important;
    }
    
    .card {
      width: 90%;
      padding: 35px 25px;
    }
    
    .title {
      font-size: 28px;
      margin-bottom: 30px;
    }
    
    .input {
      height: 52px;
      padding: 14px 40px 14px 45px;
      font-size: 14px;
    }
    
    .button {
      height: 52px;
      padding: 14px;
      font-size: 16px;
    }
    
    .rememberMeContainer {
      margin-bottom: 15px;
    }
  }

  /* PC-specific optimizations */
  @media (min-width: 1400px) {
    .logo {
      height: 120px !important;
      max-width: 350px !important;
    }
    
    .card {
      width: 460px;
      padding: 50px 45px;
    }
    
    .title {
      font-size: 36px;
    }
  }
`;

document.head.appendChild(style);