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
      <div style={styles.backgroundPattern}></div>
      <div style={styles.backgroundOverlay}></div>
      
      {/* Logo at Top Center */}
      <div style={styles.logoWrapper}>
        <img src={logo} alt="Kuensel Logo" style={styles.logo} />
      </div>
      
      <div style={styles.contentWrapper}>
        <div style={styles.content}>
          {/* Avatar and Greeting */}
          <div style={styles.greetingSection}>
            <div style={styles.avatarContainer}>
              <FaUserCircle size={72} color={colors.white} />
            </div>
            <div style={styles.greetingText}>
              <p style={styles.greeting}>{greeting}</p>
              <p style={styles.employeeId}>ID: {user?.id || 'N/A'}</p>
            </div>
          </div>

          {/* Large Time Display Card */}
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

            {/* Animated Time Bar */}
            <div style={styles.timeBar}>
              <div 
                style={{
                  ...styles.timeBarFill,
                  width: `${(currentTime.getSeconds() / 60) * 100}%`
                }}
              ></div>
            </div>
          </div>

          {/* Scan QR Button */}
          <button onClick={handleScanQR} style={styles.scanButton} className="scanButton">
            <FaQrcode size={24} />
            <span style={styles.scanButtonText}>Scan QR Code</span>
            <FaArrowRight size={18} />
          </button>

          {/* Logout Button */}
          <button onClick={handleLogout} style={styles.logoutButton} className="logoutButton">
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
    WebkitOverflowScrolling: "touch",
    msOverflowStyle: "none",
    scrollbarWidth: "none",
  },

  backgroundPattern: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "220px",
    background: colors.gradient,
    borderBottomLeftRadius: "30px",
    borderBottomRightRadius: "30px",
    zIndex: 0,
    boxShadow: `0 10px 30px ${colors.primary}80`,
    pointerEvents: "none",
  },

  backgroundOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)",
    zIndex: 0,
    pointerEvents: "none",
  },

  logoWrapper: {
    position: "fixed",
    top: "15px",
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
    filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.2))`,
    userSelect: "none",
    WebkitUserSelect: "none",
    MsUserSelect: "none",
    pointerEvents: "none",
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
    overflow: "hidden",
  },

  loadingSpinner: {
    width: "48px",
    height: "48px",
    border: `4px solid ${colors.primary}40`,
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
    overflow: "hidden",
    zIndex: 1,
    pointerEvents: "none",
  },

  content: {
    width: "90%",
    maxWidth: "400px",
    maxHeight: "calc(100vh - 20px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    pointerEvents: "auto",
    margin: "0 auto",
  },

  greetingSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: "12px 16px",
    borderRadius: "60px",
    backdropFilter: "blur(10px)",
    border: `1px solid ${colors.primary}40`,
    WebkitBackdropFilter: "blur(10px)",
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
    boxShadow: `0 8px 20px ${colors.primary}80`,
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
    textShadow: `0 2px 4px ${colors.primary}40`,
    margin: 0,
  },

  employeeId: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    margin: 0,
  },

  timeCard: {
    backgroundColor: colors.white,
    borderRadius: "28px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: `0 20px 35px -8px ${colors.primary}40`,
    border: `1px solid ${colors.primary}20`,
    flexShrink: 0,
  },

  timeCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },

  timeCardTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  timeCardContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },

  largeTimeDisplay: {
    display: "flex",
    alignItems: "baseline",
  },

  hours: {
    fontSize: "52px",
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 1,
    letterSpacing: "-1px",
  },

  minutes: {
    fontSize: "52px",
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 1,
    letterSpacing: "-1px",
  },

  seconds: {
    fontSize: "32px",
    fontWeight: "600",
    color: colors.secondary,
    lineHeight: 1,
  },

  separator: {
    fontSize: "52px",
    fontWeight: "700",
    color: colors.primary,
    lineHeight: 1,
    margin: "0 2px",
  },

  secondsSeparator: {
    fontSize: "32px",
    fontWeight: "600",
    color: colors.secondary,
    lineHeight: 1,
    margin: "0 2px",
  },

  ampmDisplay: {
    fontSize: "20px",
    fontWeight: "600",
    color: colors.dark,
    backgroundColor: colors.offWhite,
    padding: "8px 16px",
    borderRadius: "40px",
    border: `1px solid ${colors.light}`,
    minWidth: "70px",
    textAlign: "center",
  },

  dateDetails: {
    marginBottom: "20px",
  },

  dateBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  dateDay: {
    fontSize: "18px",
    fontWeight: "600",
    color: colors.dark,
    margin: 0,
  },

  dateFull: {
    fontSize: "15px",
    color: colors.gray,
    margin: 0,
  },

  timeBar: {
    width: "100%",
    height: "8px",
    backgroundColor: colors.light,
    borderRadius: "4px",
    overflow: "hidden",
  },

  timeBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: "4px",
    transition: "width 1s linear",
  },

  scanButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "16px 20px",
    background: colors.gradient,
    border: "none",
    borderRadius: "60px",
    color: colors.white,
    fontSize: "18px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: `0 15px 30px -8px ${colors.primary}80`,
    marginBottom: "12px",
    width: "100%",
    flexShrink: 0,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    WebkitTapHighlightColor: "transparent",
    outline: "none",
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
    padding: "16px 20px",
    background: colors.white,
    border: `2px solid ${colors.danger}`,
    borderRadius: "60px",
    color: colors.danger,
    fontSize: "18px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "12px",
    marginBottom: "10px",
    width: "100%",
    flexShrink: 0,
    transition: "all 0.2s ease",
    boxShadow: `0 4px 10px ${colors.danger}20`,
    WebkitTapHighlightColor: "transparent",
    outline: "none",
  },

logoutText: {
  flex: 1,
  textAlign: "center",
  marginLeft: "auto", // Add this to push text right
  marginRight: "70px", // Add this for better centering
},

  footerNote: {
    textAlign: "center",
    fontSize: "12px",
    color: colors.gray,
    marginTop: "10px",
    padding: "10px 0",
    borderTop: `1px solid ${colors.light}`,
    margin: "10px 0 0 0",
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
    -webkit-overflow-scrolling: touch;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  *::-webkit-scrollbar {
    display: none;
  }
  
  html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100%;
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    -webkit-overflow-scrolling: touch;
    -ms-overflow-style: none;
    scrollbar-width: none;
    touch-action: none;
  }

  body {
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  button {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  button:focus {
    outline: none;
  }
  
  button:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
  
  .scanButton:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 35px -8px ${colors.primary} !important;
  }
  
  .logoutButton:hover {
    background-color: ${colors.danger};
    color: ${colors.white} !important;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -5px ${colors.danger} !important;
  }
  
  .logoutButton:hover svg {
    color: ${colors.white} !important;
  }
  
  .scanButton:active, .logoutButton:active {
    transform: translateY(0);
  }

  img {
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    user-drag: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

export default EmployeeDashboard;