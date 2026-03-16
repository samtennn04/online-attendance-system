// src/pages/Register.js
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock } from "react-icons/fa";

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

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        username: name,
        email,
        password
      });
      
      alert(res.data.message);
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRegister();
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Pattern matching AdminDashboard */}
      <div style={styles.backgroundPattern}></div>
      <div style={styles.backgroundOverlay}></div>
      
      {/* Register Card */}
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>

        {/* Full Name */}
        <div style={styles.inputWrapper}>
          <FaUser size={18} color={colors.primary} style={styles.inputIcon} />
          <input
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

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

        {/* Register Button */}
        <button 
          style={{
            ...styles.button,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }} 
          onClick={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Register'}
        </button>

        {/* Login Link */}
        <div style={styles.loginSection}>
          <span style={styles.loginText}>Already have an account?</span>
          <Link to="/login" style={styles.loginLink}>
            Sign In
          </Link>
        </div>

        {/* Security Note */}
        <div style={styles.securityNote}>
          <FaLock size={12} color={`${colors.primary}80`} />
          <span style={styles.securityText}>Secure Employee Registration</span>
        </div>
      </div>
    </div>
  );
}

export default Register;

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
    marginTop: "20px",
    transition: "all 0.2s ease",
    boxShadow: `0 10px 25px -5px ${colors.primary}80`,
    letterSpacing: "0.5px",
    height: "58px",
  },

  loginSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "20px",
  },

  loginText: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
  },

  loginLink: {
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

  /* Login link hover */
  .loginLink:hover {
    border-bottom-color: ${colors.white};
  }

  /* Eye icon hover */
  .eye:hover {
    color: white;
  }
  .eye:hover svg {
    color: white !important;
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
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
  }

  /* PC-specific optimizations */
  @media (min-width: 1400px) {
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