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

  // Set loading to false after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
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
      
      {/* Logo - Only at top */}
      <div style={styles.logoWrapper}>
        <img src={logo} alt="KUENSEL" style={styles.logo} />
      </div>
      
      {/* Bank Name - Only once! */}
      <div style={styles.bankName}>THE PEOPLE'S BANK OF SANTE</div>
      
      {/* Main Content */}
      <div style={styles.contentWrapper}>
        <div style={styles.contentCard}>
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

          {/* Time Card */}
          <div style={styles.timeCard}>
            <div style={styles.timeCardHeader}>
              <MdAccessTime size={16} color={colors.primary} />
              <span style={styles.timeCardTitle}>CURRENT TIME</span>
            </div>
            
            <div style={styles.timeDisplay}>
              <span style={styles.timeNumber}>{hours.toString().padStart(2, '0')}:{minutes}:{seconds}</span>
              <span style={styles.timeAmPm}>{ampm}</span>
            </div>

            <div style={styles.dateDisplay}>
              <div style={styles.dateDay}>{dayName}</div>
              <div style={styles.dateFull}>{monthName} {dayNumber}, {year}</div>
            </div>
          </div>

          {/* Scan QR Button */}
          <button onClick={handleScanQR} style={styles.scanButton}>
            <FaQrcode size={18} />
            <span style={styles.scanButtonText}>Scan QR Code</span>
            <FaArrowRight size={14} />
          </button>

          {/* Logout Button */}
          <button onClick={handleLogout} style={styles.logoutButton}>
            <FaSignOutAlt size={18} />
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
    height: "180px",
    background: colors.gradient,
    borderBottomLeftRadius: "20px",
    borderBottomRightRadius: "20px",
    zIndex: 0,
  },

  logoWrapper: {
    position: "fixed",
    top: "15px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    textAlign: "center",
  },

  logo: {
    height: "45px",
    width: "auto",
    objectFit: "contain",
  },

  bankName: {
    position: "fixed",
    top: "65px",
    left: "50%",
    transform: "translateX(-50%)",
    color: colors.white,
    fontSize: "13px",
    fontWeight: "500",
    letterSpacing: "0.5px",
    textAlign: "center",
    width: "100%",
    zIndex: 10,
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
    top: "100px",
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    zIndex: 1,
  },

  contentCard: {
    width: "90%",
    maxWidth: "350px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  greetingSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: "10px 14px",
    borderRadius: "10px",
    backdropFilter: "blur(10px)",
  },

  avatarContainer: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background: colors.gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px solid ${colors.white}`,
    flexShrink: 0,
  },

  greetingText: {
    flex: 1,
  },

  greeting: {
    fontSize: "15px",
    color: colors.white,
    marginBottom: "2px",
    fontWeight: "500",
  },

  employeeId: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.8)",
  },

  timeCard: {
    backgroundColor: colors.white,
    borderRadius: "12px",
    padding: "16px",
  },

  timeCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginBottom: "8px",
  },

  timeCardTitle: {
    fontSize: "11px",
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: "0.3px",
  },

  timeDisplay: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "8px",
  },

  timeNumber: {
    fontSize: "32px",
    fontWeight: "700",
    color: colors.dark,
    fontFamily: "monospace",
  },

  timeAmPm: {
    fontSize: "14px",
    fontWeight: "500",
    color: colors.gray,
  },

  dateDisplay: {
    borderTop: `1px solid ${colors.light}`,
    paddingTop: "8px",
  },

  dateDay: {
    fontSize: "14px",
    fontWeight: "600",
    color: colors.dark,
    marginBottom: "2px",
  },

  dateFull: {
    fontSize: "12px",
    color: colors.gray,
  },

  scanButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: colors.gradient,
    border: "none",
    borderRadius: "10px",
    color: colors.white,
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
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
    gap: "10px",
    padding: "12px 16px",
    background: colors.white,
    border: `1px solid ${colors.danger}`,
    borderRadius: "10px",
    color: colors.danger,
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
  },

  logoutText: {
    flex: 1,
    textAlign: "center",
  },

  footerNote: {
    textAlign: "center",
    fontSize: "11px",
    color: colors.gray,
    marginTop: "5px",
  },
};

// Add keyframes for spinner animation
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
`;
document.head.appendChild(style);

export default EmployeeDashboard;