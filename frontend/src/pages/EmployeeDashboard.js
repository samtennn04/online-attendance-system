// src/pages/EmployeeDashboard.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaUserCircle, 
  FaQrcode, 
  FaSignOutAlt, 
  FaArrowRight,
  FaClock,
  FaCalendarAlt,
  FaIdCard
} from "react-icons/fa";
import { MdAccessTime, MdWork } from "react-icons/md";

// Import your logo
import logo from "../assets/logo.png";

// Premium color palette with #006389 as primary
const colors = {
  primary: "#006389",
  secondary: "#005476",
  accent: "#0077a3",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  light: "#f8fafc",
  offWhite: "#f1f5f9",
  white: "#ffffff",
  dark: "#0f172a",
  gray: "#64748b",
  lightGray: "#94a3b8",
  border: "#e2e8f0",
  gradient: "linear-gradient(135deg, #006389 0%, #005476 100%)",
  glass: "rgba(255, 255, 255, 0.95)",
  glassLight: "rgba(255, 255, 255, 0.7)"
};

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const token = localStorage.getItem("token");
  const employeeName = user?.username || "Employee";
  const employeeId = user?.id || 'N/A';
  const employeeRole = user?.role || 'Employee';

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
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, [currentTime]);

  // Simulate loading with fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setShowContent(true), 100);
    }, 800);
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

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <img src={logo} alt="KUENSEL" style={styles.loadingLogo} />
          <div style={styles.loadingSpinner}></div>
          <div style={styles.loadingText}>Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.background}>
        <div style={styles.backgroundGradient}></div>
        <div style={styles.backgroundPattern}></div>
        <div style={styles.backgroundOverlay}></div>
      </div>
      
      {/* Content Container with Fade In */}
      <div style={{...styles.contentContainer, opacity: showContent ? 1 : 0}}>
        {/* Centered Logo */}
        <div style={styles.logoWrapper}>
          <img src={logo} alt="KUENSEL" style={styles.logo} />
        </div>

        {/* Welcome Section */}
        <div style={styles.welcomeSection}>
          <div style={styles.welcomeContent}>
            <h1 style={styles.welcomeGreeting}>{greeting},</h1>
            <h2 style={styles.welcomeName}>{employeeName}</h2>
            <div style={styles.roleBadge}>
              <MdWork size={14} color={colors.primary} />
              <span style={styles.roleText}>{employeeRole}</span>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div style={styles.mainCard}>
          {/* User Info Card */}
          <div style={styles.userInfoCard}>
            <div style={styles.avatarContainer}>
              <FaUserCircle size={64} color={colors.primary} />
              <div style={styles.onlineIndicator}></div>
            </div>
            <div style={styles.userDetails}>
              <div style={styles.userIdContainer}>
                <FaIdCard size={14} color={colors.gray} />
                <span style={styles.userId}>ID: {employeeId}</span>
              </div>
              <div style={styles.attendanceBadge}>
                <FaClock size={12} color={colors.success} />
                <span style={styles.attendanceText}>Active Session</span>
              </div>
            </div>
          </div>

          {/* Time Card with Glassmorphism */}
          <div style={styles.timeCard}>
            <div style={styles.timeCardHeader}>
              <MdAccessTime size={16} color={colors.primary} />
              <span style={styles.timeCardTitle}>Current Time</span>
            </div>
            
            <div style={styles.timeDisplay}>
              <span style={styles.timeNumber}>
                {hours.toString().padStart(2, '0')}
                <span style={styles.timeSeparator}>:</span>
                {minutes}
                <span style={styles.timeSeparator}>:</span>
                {seconds}
              </span>
              <span style={styles.timeAmPm}>{ampm}</span>
            </div>

            <div style={styles.dateDisplay}>
              <FaCalendarAlt size={14} color={colors.gray} />
              <span style={styles.dateText}>
                {dayName}, {monthName} {dayNumber}, {year}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionGrid}>
            <button onClick={handleScanQR} style={styles.primaryButton}>
              <div style={styles.buttonIcon}>
                <FaQrcode size={20} />
              </div>
              <div style={styles.buttonContent}>
                <span style={styles.buttonTitle}>Scan QR Code</span>
                <span style={styles.buttonSubtitle}>Mark your attendance</span>
              </div>
              <FaArrowRight size={16} style={styles.buttonArrow} />
            </button>

            <button onClick={handleLogout} style={styles.secondaryButton}>
              <div style={styles.buttonIcon}>
                <FaSignOutAlt size={20} />
              </div>
              <div style={styles.buttonContent}>
                <span style={styles.buttonTitleSecondary}>Logout</span>
                <span style={styles.buttonSubtitleSecondary}>End your session</span>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.footerDivider}></div>
            <div style={styles.footerText}>
              <span>Logged in securely</span>
              <span style={styles.footerDot}>•</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
    background: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)",
  },

  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `radial-gradient(circle at 25px 25px, ${colors.primary}10 2px, transparent 2px)`,
    backgroundSize: "50px 50px",
    opacity: 0.3,
  },

  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "400px",
    background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 100%)`,
    backdropFilter: "blur(100px)",
    borderBottomLeftRadius: "50px",
    borderBottomRightRadius: "50px",
  },

  contentContainer: {
    position: "relative",
    height: "100%",
    width: "100%",
    maxWidth: "480px",
    margin: "0 auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    zIndex: 1,
    transition: "opacity 0.3s ease",
    overflowY: "auto",
  },

  loadingContainer: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.gradient,
  },

  loadingContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
  },

  loadingLogo: {
    height: "80px",
    width: "auto",
    marginBottom: "20px",
  },

  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    color: "white",
    fontSize: "14px",
    fontWeight: "500",
    opacity: 0.9,
  },

  logoWrapper: {
    textAlign: "center",
    marginTop: "20px",
    marginBottom: "30px",
  },

  logo: {
    height: "70px",
    width: "auto",
    objectFit: "contain",
  },

  welcomeSection: {
    marginBottom: "24px",
  },

  welcomeContent: {
    padding: "0 5px",
  },

  welcomeGreeting: {
    fontSize: "24px",
    fontWeight: "400",
    color: colors.gray,
    marginBottom: "4px",
  },

  welcomeName: {
    fontSize: "32px",
    fontWeight: "700",
    color: colors.dark,
    marginBottom: "8px",
    lineHeight: 1.2,
  },

  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 16px",
    backgroundColor: colors.white,
    borderRadius: "30px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },

  roleText: {
    fontSize: "13px",
    fontWeight: "500",
    color: colors.dark,
  },

  mainCard: {
    backgroundColor: colors.white,
    borderRadius: "30px",
    padding: "24px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.5)",
  },

  userInfoCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    padding: "16px",
    backgroundColor: colors.light,
    borderRadius: "20px",
  },

  avatarContainer: {
    position: "relative",
  },

  onlineIndicator: {
    position: "absolute",
    bottom: "2px",
    right: "2px",
    width: "12px",
    height: "12px",
    backgroundColor: colors.success,
    border: "2px solid white",
    borderRadius: "50%",
  },

  userDetails: {
    flex: 1,
  },

  userIdContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
  },

  userId: {
    fontSize: "14px",
    color: colors.gray,
  },

  attendanceBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    backgroundColor: `${colors.success}15`,
    borderRadius: "20px",
  },

  attendanceText: {
    fontSize: "11px",
    fontWeight: "600",
    color: colors.success,
  },

  timeCard: {
    backgroundColor: colors.glassLight,
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "20px",
    border: "1px solid rgba(255,255,255,0.8)",
  },

  timeCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },

  timeCardTitle: {
    fontSize: "13px",
    fontWeight: "600",
    color: colors.gray,
    letterSpacing: "0.5px",
  },

  timeDisplay: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  timeNumber: {
    fontSize: "42px",
    fontWeight: "700",
    color: colors.dark,
    fontFamily: "'Inter', monospace",
    letterSpacing: "2px",
  },

  timeSeparator: {
    margin: "0 2px",
    opacity: 0.5,
  },

  timeAmPm: {
    fontSize: "16px",
    fontWeight: "500",
    color: colors.gray,
    backgroundColor: colors.light,
    padding: "4px 8px",
    borderRadius: "20px",
  },

  dateDisplay: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(0,0,0,0.05)",
  },

  dateText: {
    fontSize: "14px",
    color: colors.gray,
  },

  actionGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  primaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    background: colors.gradient,
    border: "none",
    borderRadius: "20px",
    color: "white",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "left",
    boxShadow: `0 8px 20px ${colors.primary}50`,
  },

  secondaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px",
    backgroundColor: "transparent",
    border: `2px solid ${colors.danger}30`,
    borderRadius: "20px",
    color: colors.danger,
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "left",
  },

  buttonIcon: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: "12px",
  },

  buttonContent: {
    flex: 1,
  },

  buttonTitle: {
    display: "block",
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "2px",
  },

  buttonSubtitle: {
    display: "block",
    fontSize: "12px",
    opacity: 0.8,
  },

  buttonTitleSecondary: {
    display: "block",
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "2px",
    color: colors.danger,
  },

  buttonSubtitleSecondary: {
    display: "block",
    fontSize: "12px",
    color: colors.gray,
  },

  buttonArrow: {
    opacity: 0.7,
  },

  footer: {
    marginTop: "24px",
  },

  footerDivider: {
    height: "1px",
    backgroundColor: colors.border,
    marginBottom: "16px",
  },

  footerText: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "12px",
    color: colors.gray,
  },

  footerDot: {
    color: colors.lightGray,
  },
};

// Global styles
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
  }

  button:hover {
    transform: translateY(-2px);
  }

  button:active {
    transform: translateY(0);
  }

  @media (max-width: 380px) {
    .timeNumber {
      font-size: 36px !important;
    }
  }
`;
document.head.appendChild(style);

export default EmployeeDashboard;