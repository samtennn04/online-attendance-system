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
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

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

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // Format time (MM:HH:SS format as in image)
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
      {/* Background Gradient */}
      <div style={styles.backgroundGradient}></div>
      
      {/* Content Container */}
      <div style={styles.contentContainer}>
        {/* Logo */}
        <div style={styles.logoWrapper}>
          <img src={logo} alt="KUENSEL" style={styles.logo} />
        </div>
        
        {/* ScanTrack Text */}
        <div style={styles.scanTrackText}>ScanTrack</div>
        
        {/* Main Card */}
        <div style={styles.mainCard}>
          {/* User Info Section */}
          <div style={styles.userInfoSection}>
            <div style={styles.avatarContainer}>
              <FaUserCircle size={windowHeight < 700 ? 50 : 60} color={colors.primary} />
            </div>
            <div style={styles.userTextContainer}>
              <div style={styles.greeting}>{greeting}</div>
              <div style={styles.userId}>ID: {user?.id || 'N/A'}</div>
            </div>
          </div>

          {/* Time Card */}
          <div style={styles.timeCard}>
            <div style={styles.timeHeader}>
              <MdAccessTime size={14} color={colors.primary} />
              <span style={styles.timeLabel}>CURRENT TIME</span>
            </div>
            
            <div style={styles.timeDisplay}>
              <span style={styles.timeNumber}>
                {hours.toString().padStart(2, '0')}:{minutes}:{seconds}
              </span>
              <span style={styles.timeAmPm}>{ampm}</span>
            </div>

            <div style={styles.dateDisplay}>
              <div style={styles.dayName}>{dayName}</div>
              <div style={styles.fullDate}>{monthName} {dayNumber}, {year}</div>
            </div>
          </div>

          {/* Scan QR Button */}
          <button onClick={handleScanQR} style={styles.scanButton}>
            <FaQrcode size={18} />
            <span style={styles.buttonText}>Scan QR Code</span>
            <FaArrowRight size={14} />
          </button>

          {/* Logout Button */}
          <button onClick={handleLogout} style={styles.logoutButton}>
            <FaSignOutAlt size={18} />
            <span style={styles.buttonText}>Logout</span>
          </button>

          {/* Footer Text */}
          <div style={styles.footerText}>You are logged in as {employeeName}</div>
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
    backgroundColor: "#f5f7fa",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  backgroundGradient: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "280px",
    background: "linear-gradient(135deg, #006389 0%, #004b6e 100%)",
    borderBottomLeftRadius: "30px",
    borderBottomRightRadius: "30px",
    zIndex: 0,
  },

  contentContainer: {
    position: "relative",
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
    zIndex: 1,
  },

  logoWrapper: {
    marginTop: "max(20px, env(safe-area-inset-top))",
    marginBottom: "5px",
    textAlign: "center",
    width: "100%",
  },

  logo: {
    height: "clamp(40px, 8vh, 60px)",
    width: "auto",
    objectFit: "contain",
  },

  scanTrackText: {
    color: "white",
    fontSize: "clamp(12px, 2.5vh, 14px)",
    fontWeight: "500",
    letterSpacing: "1px",
    textAlign: "center",
    marginBottom: "clamp(10px, 2vh, 15px)",
    textShadow: "0 2px 4px rgba(0,0,0,0.1)",
    width: "100%",
  },

  mainCard: {
    width: "calc(100% - 40px)",
    maxWidth: "340px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(8px, 1.5vh, 12px)",
    flex: "1",
    justifyContent: "center",
    paddingBottom: "max(15px, env(safe-area-inset-bottom))",
  },

  userInfoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: "clamp(10px, 2vh, 12px) clamp(12px, 3vw, 16px)",
    borderRadius: "50px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    width: "100%",
  },

  avatarContainer: {
    width: "clamp(45px, 8vh, 60px)",
    height: "clamp(45px, 8vh, 60px)",
    borderRadius: "50%",
    backgroundColor: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  userTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  greeting: {
    fontSize: "clamp(14px, 2.5vh, 16px)",
    fontWeight: "600",
    color: "#333",
    marginBottom: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  userId: {
    fontSize: "clamp(11px, 2vh, 12px)",
    color: "#666",
  },

  timeCard: {
    backgroundColor: "white",
    borderRadius: "20px",
    padding: "clamp(16px, 3vh, 20px)",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    width: "100%",
  },

  timeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "clamp(8px, 1.5vh, 10px)",
  },

  timeLabel: {
    fontSize: "clamp(11px, 2vh, 12px)",
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: "0.5px",
  },

  timeDisplay: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "clamp(8px, 1.5vh, 10px)",
  },

  timeNumber: {
    fontSize: "clamp(28px, 6vh, 36px)",
    fontWeight: "700",
    color: "#333",
    fontFamily: "monospace",
  },

  timeAmPm: {
    fontSize: "clamp(14px, 2.5vh, 16px)",
    fontWeight: "500",
    color: "#666",
  },

  dateDisplay: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "clamp(8px, 1.5vh, 10px)",
  },

  dayName: {
    fontSize: "clamp(14px, 2.5vh, 16px)",
    fontWeight: "600",
    color: "#333",
    marginBottom: "2px",
  },

  fullDate: {
    fontSize: "clamp(12px, 2vh, 13px)",
    color: "#666",
  },

  scanButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "clamp(12px, 2.5vh, 14px) 16px",
    background: "linear-gradient(135deg, #006389 0%, #004b6e 100%)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontSize: "clamp(14px, 2.5vh, 15px)",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
    WebkitTapHighlightColor: "transparent",
  },

  logoutButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "clamp(12px, 2.5vh, 14px) 16px",
    backgroundColor: "white",
    border: "1.5px solid #ef4444",
    borderRadius: "12px",
    color: "#ef4444",
    fontSize: "clamp(14px, 2.5vh, 15px)",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
    WebkitTapHighlightColor: "transparent",
  },

  buttonText: {
    flex: 1,
    textAlign: "center",
  },

  footerText: {
    textAlign: "center",
    fontSize: "clamp(11px, 1.8vh, 12px)",
    color: "#666",
    marginTop: "clamp(5px, 1vh, 8px)",
  },
};

// Add keyframes and global styles
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
    -webkit-tap-highlight-color: transparent;
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
    border: none;
    background: none;
    font-family: inherit;
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  .scanButton:hover {
    opacity: 0.95;
  }
  
  .logoutButton:hover {
    background-color: #fee2e2;
  }
  
  /* Mobile optimizations */
  @media (max-width: 380px) {
    .timeNumber {
      font-size: 28px !important;
    }
  }
  
  /* Handle notches and safe areas */
  @supports (padding: max(0px)) {
    body {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }
`;
document.head.appendChild(style);

export default EmployeeDashboard;