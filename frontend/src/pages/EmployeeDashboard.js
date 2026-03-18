// src/pages/EmployeeDashboard.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaUserCircle, 
  FaQrcode, 
  FaSignOutAlt, 
  FaArrowRight
} from "react-icons/fa";
import { MdAccessTime } from "react-icons/md";

// Import your logo
import logo from "../assets/logo.png";

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

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const token = localStorage.getItem("token");
  const employeeName = user?.username || "Employee";

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Greeting based on time
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting(`Good Morning, ${employeeName}`);
    else if (hour < 17) setGreeting(`Good Afternoon, ${employeeName}`);
    else setGreeting(`Good Evening, ${employeeName}`);
  }, [currentTime, employeeName]);

  // Simulate loading completion
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      navigate("/login");
    }
  };

  const handleScanQR = () => navigate("/scan");

  // Format time
  let hours = currentTime.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');

  // Format date
  const dayName = currentTime.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = currentTime.toLocaleDateString("en-US", { month: "long" });
  const dayNumber = currentTime.getDate();
  const year = currentTime.getFullYear();

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.loadingSpinner}></div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Background */}
      <div style={styles.backgroundPattern}></div>
      <div style={styles.backgroundOverlay}></div>
      
      {/* Logo at Top */}
      <div style={styles.logoWrapper}>
        <img src={logo} alt="KUENSEL" style={styles.logo} />
      </div>
      
      {/* Main Content */}
      <div style={styles.contentWrapper}>
        <div style={styles.contentCard}>
          {/* Bank Name */}
          <div style={styles.bankName}>THE PEOPLE'S BANK OF SANTE</div>

          {/* Avatar and Greeting */}
          <div style={styles.greetingSection}>
            <div style={styles.avatarContainer}>
              <FaUserCircle size={60} color={colors.white} />
            </div>
            <div style={styles.greetingText}>
              <p style={styles.greeting}>{greeting}</p>
              <p style={styles.employeeId}>ID: {user?.id || 'N/A'}</p>
            </div>
          </div>

          {/* Time Display Card */}
          <div style={styles.timeCard}>
            <div style={styles.timeCardHeader}>
              <MdAccessTime size={18} color={colors.primary} />
              <span style={styles.timeCardTitle}>CURRENT TIME</span>
            </div>
            
            <div style={styles.timeDisplay}>
              <span style={styles.timeNumber}>
                {hours.toString().padStart(2, '0')}:{minutes}:{seconds}
              </span>
              <span style={styles.timeAmPm}>{ampm}</span>
            </div>

            <div style={styles.dateDisplay}>
              <div style={styles.dateDay}>{dayName}</div>
              <div style={styles.dateFull}>{monthName} {dayNumber}, {year}</div>
            </div>
          </div>

          {/* Scan QR Button */}
          <button onClick={handleScanQR} style={styles.scanButton}>
            <FaQrcode size={20} />
            <span style={styles.scanButtonText}>Scan QR Code</span>
            <FaArrowRight size={16} />
          </button>

          {/* Logout Button */}
          <button onClick={handleLogout} style={styles.logoutButton}>
            <FaSignOutAlt size={20} />
            <span style={styles.logoutText}>Logout</span>
          </button>

          {/* Footer Note */}
          <p style={styles.footerNote}>You are logged in as {employeeName}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.offWhite,
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  backgroundPattern: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "200px",
    background: colors.gradient,
    borderBottomLeftRadius: "30px",
    borderBottomRightRadius: "30px",
    zIndex: 0,
    boxShadow: `0 4px 20px ${colors.primary}60`,
  },

  backgroundOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 70%)",
    zIndex: 0,
    pointerEvents: "none",
  },

  logoWrapper: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    textAlign: "center",
  },

  logo: {
    height: "50px",
    width: "auto",
    objectFit: "contain",
  },

  loadingContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.gradient,
    zIndex: 100,
  },

  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: `3px solid ${colors.white}40`,
    borderTop: `3px solid ${colors.white}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  contentWrapper: {
    position: "absolute",
    top: "80px", // Start below logo
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
  },

  contentCard: {
    width: "90%",
    maxWidth: "380px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  bankName: {
    textAlign: "center",
    color: colors.white,
    fontSize: "14px",
    fontWeight: "500",
    letterSpacing: "1px",
    marginBottom: "8px",
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  greetingSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: "12px 16px",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    border: `1px solid rgba(255,255,255,0.1)`,
  },

  avatarContainer: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: colors.gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px solid ${colors.white}`,
    boxShadow: `0 4px 10px ${colors.primary}60`,
    flexShrink: 0,
  },

  greetingText: {
    flex: 1,
  },

  greeting: {
    fontSize: "16px",
    color: colors.white,
    marginBottom: "4px",
    fontWeight: "500",
  },

  employeeId: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.8)",
    fontWeight: "400",
  },

  timeCard: {
    backgroundColor: colors.white,
    borderRadius: "16px",
    padding: "20px",
    boxShadow: `0 10px 25px -5px ${colors.primary}30`,
    border: `1px solid ${colors.primary}10`,
  },

  timeCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "12px",
  },

  timeCardTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: "0.5px",
  },

  timeDisplay: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  timeNumber: {
    fontSize: "36px",
    fontWeight: "700",
    color: colors.dark,
    fontFamily: "monospace",
  },

  timeAmPm: {
    fontSize: "16px",
    fontWeight: "500",
    color: colors.gray,
  },

  dateDisplay: {
    borderTop: `1px solid ${colors.light}`,
    paddingTop: "12px",
  },

  dateDay: {
    fontSize: "16px",
    fontWeight: "600",
    color: colors.dark,
    marginBottom: "2px",
  },

  dateFull: {
    fontSize: "14px",
    color: colors.gray,
  },

  scanButton: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 20px",
    background: colors.gradient,
    border: "none",
    borderRadius: "12px",
    color: colors.white,
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    boxShadow: `0 8px 20px -5px ${colors.primary}60`,
    transition: "all 0.2s ease",
    width: "100%",
  },

  scanButtonText: {
    flex: 1,
    textAlign: "center",
  },

  logoutButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "14px 20px",
    background: colors.white,
    border: `1px solid ${colors.danger}`,
    borderRadius: "12px",
    color: colors.danger,
    fontSize: "16px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
  },

  logoutText: {
    flex: 1,
    textAlign: "center",
  },

  footerNote: {
    textAlign: "center",
    fontSize: "12px",
    color: colors.gray,
    marginTop: "8px",
  },
};

// Add keyframes for spinner animation and hover effects
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: fixed;
  }
  
  button {
    cursor: pointer;
  }
  
  .scanButton:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 25px -5px ${colors.primary} !important;
  }
  
  .logoutButton:hover {
    background-color: ${colors.danger};
    color: white !important;
  }
  
  .logoutButton:hover svg {
    color: white !important;
  }
`;
document.head.appendChild(style);

export default EmployeeDashboard;