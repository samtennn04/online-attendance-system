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
      {/* Glassmorphism Background with Blur */}
      <div style={styles.glassBackground}></div>
      <div style={styles.glassOverlay}></div>
      
      {/* Fixed Logo at Top */}
      <div style={styles.logoWrapper}>
        <img src={logo} alt="Kuensel Logo" style={styles.logo} />
      </div>
      
      {/* ScanTrack Text - Glassmorphism Style */}
      <div style={styles.scanTrackText}>ScanTrack</div>
      
      {/* Perfectly Centered Content */}
      <div style={styles.contentWrapper}>
        <div style={styles.contentCard}>
          {/* Avatar and Greeting - Glassmorphism */}
          <div style={styles.greetingSection}>
            <div style={styles.avatarContainer}>
              <FaUserCircle size={72} color={colors.white} />
            </div>
            <div style={styles.greetingText}>
              <p style={styles.greeting}>{greeting}</p>
              <p style={styles.employeeId}>ID: {user?.id || 'N/A'}</p>
            </div>
          </div>

          {/* Large Time Display Card - Glassmorphism */}
          <div style={styles.timeCard}>
            <div style={styles.timeCardHeader}>
              <MdAccessTime size={20} color={colors.primary} />
              <span style={styles.timeCardTitle}>Current Time</span>
            </div>
            
            <div style={styles.timeCardContent}>
              <div style={styles.largeTimeDisplay}>
                <span style={styles.hours}>
                  {hours.toString().padStart(2, '0')}
                </span>
                <span style={styles.separator}>:</span>
                <span style={styles.minutes}>{minutes}</span>
                <span style={styles.secondsSeparator}>:</span>
                <span style={styles.seconds}>{seconds}</span>
              </div>
              
              <div style={styles.ampmDisplay}>
                {ampm}
              </div>
            </div>

            <div style={styles.dateDetails}>
              <div style={styles.dateBox}>
                <span style={styles.dateDay}>{dayName}</span>
                <span style={styles.dateFull}>{monthName} {dayNumber}, {year}</span>
              </div>
            </div>

            {/* Animated Time Bar - Glassmorphism */}
            <div style={styles.timeBar}>
              <div 
                style={{
                  ...styles.timeBarFill,
                  width: `${(currentTime.getSeconds() / 60) * 100}%`
                }}
              ></div>
            </div>
          </div>

          {/* Scan QR Button - Glassmorphism */}
          <button onClick={handleScanQR} style={styles.scanButton} className="scanButton">
            <FaQrcode size={24} />
            <span style={styles.scanButtonText}>Scan QR Code</span>
            <FaArrowRight size={18} />
          </button>

          {/* Logout Button - Glassmorphism */}
          <button onClick={handleLogout} style={styles.logoutButton} className="logoutButton">
            <FaSignOutAlt size={20} />
            <span style={styles.logoutText}>Logout</span>
          </button>

          {/* Footer Note - Glassmorphism */}
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

  // Glassmorphism Background
  glassBackground: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 20% 20%, ${colors.primary}20 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, ${colors.secondary}20 0%, transparent 50%),
                ${colors.offWhite}`,
    zIndex: 0,
  },

  glassOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    background: "rgba(255, 255, 255, 0.1)",
    zIndex: 0,
    pointerEvents: "none",
  },

  logoWrapper: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 10,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },

  logo: {
    height: "70px",
    width: "auto",
    maxWidth: "250px",
    objectFit: "contain",
    filter: `drop-shadow(0 8px 16px ${colors.primary}40)`,
    userSelect: "none",
    pointerEvents: "none",
  },

  // ScanTrack text - Glassmorphism
  scanTrackText: {
    position: "fixed",
    top: "95px",
    left: "50%",
    transform: "translateX(-50%)",
    color: colors.white,
    fontSize: "16px",
    fontWeight: "500",
    letterSpacing: "2px",
    textAlign: "center",
    zIndex: 10,
    textShadow: `0 4px 8px ${colors.primary}60`,
    background: "rgba(255, 255, 255, 0.1)",
    padding: "4px 16px",
    borderRadius: "30px",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    whiteSpace: "nowrap",
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
    width: "48px",
    height: "48px",
    border: `4px solid ${colors.white}40`,
    borderTop: `4px solid ${colors.white}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  contentWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    pointerEvents: "none",
  },

  contentCard: {
    width: "90%",
    maxWidth: "420px",
    backgroundColor: "transparent",
    display: "flex",
    flexDirection: "column",
    pointerEvents: "auto",
    margin: "0 auto",
    position: "relative",
    top: "20px",
  },

  // Greeting Section - Glassmorphism
  greetingSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    background: "rgba(255, 255, 255, 0.15)",
    padding: "12px 16px",
    borderRadius: "60px",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    boxShadow: `0 8px 32px ${colors.primary}20`,
  },

  avatarContainer: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: colors.gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `3px solid ${colors.white}`,
    boxShadow: `0 8px 32px ${colors.primary}60`,
    flexShrink: 0,
  },

  greetingText: {
    flex: 1,
  },

  greeting: {
    fontSize: "18px",
    color: colors.white,
    marginBottom: "4px",
    fontWeight: "600",
    lineHeight: "1.3",
    textShadow: `0 2px 8px ${colors.primary}60`,
    margin: 0,
  },

  employeeId: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    margin: 0,
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  // Time Card - Glassmorphism
  timeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "28px",
    padding: "24px",
    marginBottom: "16px",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    boxShadow: `0 8px 32px ${colors.primary}20`,
  },

  timeCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },

  timeCardTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  timeCardContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  largeTimeDisplay: {
    display: "flex",
    alignItems: "baseline",
  },

  hours: {
    fontSize: "48px",
    fontWeight: "700",
    color: colors.white,
    lineHeight: 1,
    letterSpacing: "-1px",
    textShadow: `0 4px 8px ${colors.primary}60`,
  },

  minutes: {
    fontSize: "48px",
    fontWeight: "700",
    color: colors.white,
    lineHeight: 1,
    letterSpacing: "-1px",
    textShadow: `0 4px 8px ${colors.primary}60`,
  },

  seconds: {
    fontSize: "28px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 1,
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  separator: {
    fontSize: "48px",
    fontWeight: "700",
    color: colors.white,
    lineHeight: 1,
    margin: "0 2px",
    textShadow: `0 4px 8px ${colors.primary}60`,
  },

  secondsSeparator: {
    fontSize: "28px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 1,
    margin: "0 2px",
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  ampmDisplay: {
    fontSize: "18px",
    fontWeight: "600",
    color: colors.white,
    background: "rgba(255, 255, 255, 0.15)",
    padding: "6px 12px",
    borderRadius: "30px",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    minWidth: "60px",
    textAlign: "center",
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  dateDetails: {
    marginBottom: "16px",
  },

  dateBox: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  dateDay: {
    fontSize: "16px",
    fontWeight: "600",
    color: colors.white,
    margin: 0,
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  dateFull: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
    margin: 0,
    textShadow: `0 2px 4px ${colors.primary}20`,
  },

  timeBar: {
    width: "100%",
    height: "6px",
    background: "rgba(255, 255, 255, 0.15)",
    borderRadius: "3px",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  timeBarFill: {
    height: "100%",
    background: `linear-gradient(90deg, ${colors.white}, ${colors.primary})`,
    borderRadius: "3px",
    transition: "width 1s linear",
  },

  // Scan Button - Glassmorphism
  scanButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "14px 20px",
    background: "rgba(255, 255, 255, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "12px",
    color: colors.white,
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: `0 8px 32px ${colors.primary}40`,
    marginBottom: "10px",
    width: "100%",
    transition: "all 0.3s ease",
    textShadow: `0 2px 4px ${colors.primary}40`,
  },

  scanButtonText: {
    flex: 1,
    textAlign: "center",
  },

  // Logout Button - Glassmorphism
  logoutButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "14px 20px",
    background: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "12px",
    color: colors.danger,
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: `0 8px 32px ${colors.danger}20`,
    marginBottom: "8px",
    width: "100%",
    transition: "all 0.3s ease",
  },

  logoutText: {
    flex: 1,
    textAlign: "center",
  },

  // Footer Note - Glassmorphism
  footerNote: {
    textAlign: "center",
    fontSize: "12px",
    color: "rgba(255,255,255,0.7)",
    marginTop: "8px",
    textShadow: `0 2px 4px ${colors.primary}20`,
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
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  button {
    cursor: pointer;
  }
  
  .scanButton:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.25) !important;
    box-shadow: 0 12px 40px ${colors.primary}60 !important;
  }
  
  .logoutButton:hover {
    transform: translateY(-2px);
    background: rgba(239, 68, 68, 0.2) !important;
    border-color: ${colors.danger} !important;
    color: ${colors.white} !important;
    box-shadow: 0 12px 40px ${colors.danger}40 !important;
  }
  
  .logoutButton:hover svg {
    color: ${colors.white} !important;
  }
  
  .scanButton:active, .logoutButton:active {
    transform: translateY(0);
  }

  img {
    -webkit-user-drag: none;
    user-select: none;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

export default EmployeeDashboard;