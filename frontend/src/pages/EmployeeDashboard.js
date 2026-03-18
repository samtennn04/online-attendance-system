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

// Color palette
const colors = {
  primary: "#006389",
  secondary: "#004b6e",
  danger: "#ef4444",
  white: "#ffffff",
  dark: "#1f2937",
  gray: "#6b7280",
  light: "#e5e7eb",
  offWhite: "#f3f4f6",
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

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting(`Good Morning, ${employeeName}`);
    else if (hour < 17) setGreeting(`Good Afternoon, ${employeeName}`);
    else setGreeting(`Good Evening, ${employeeName}`);
  }, [currentTime, employeeName]);

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

  // Format time with spaces around colons as shown in image
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
      <div style={styles.background}></div>
      
      {/* Main Content */}
      <div style={styles.content}>
        {/* Bank Name */}
        <div style={styles.bankName}>THE PEOPLE'S BANK OF SANTE</div>
        
        {/* Divider Line */}
        <div style={styles.divider}></div>
        
        {/* User Info */}
        <div style={styles.userInfo}>
          <div style={styles.avatarContainer}>
            <FaUserCircle size={65} color={colors.primary} />
          </div>
          <div style={styles.userText}>
            <div style={styles.greeting}>{greeting}</div>
            <div style={styles.userId}>ID: {user?.id || 'N/A'}</div>
          </div>
        </div>
        
        {/* Divider Line */}
        <div style={styles.divider}></div>
        
        {/* Time Card */}
        <div style={styles.timeCard}>
          <div style={styles.timeHeader}>
            <MdAccessTime size={16} color={colors.primary} />
            <span style={styles.timeLabel}>CURRENT TIME</span>
          </div>
          
          <div style={styles.timeDisplay}>
            <span style={styles.timeNumber}>
              {hours.toString().padStart(2, '0')}
            </span>
            <span style={styles.timeColon}> : </span>
            <span style={styles.timeNumber}>{minutes}</span>
            <span style={styles.timeColon}> : </span>
            <span style={styles.timeNumber}>{seconds}</span>
          </div>
          
          <div style={styles.timeAmPmContainer}>
            <span style={styles.timeAmPm}>{ampm}</span>
          </div>
        </div>
        
        {/* Date Display */}
        <div style={styles.dateContainer}>
          <div style={styles.dayName}>{dayName}</div>
          <div style={styles.fullDate}>{monthName} {dayNumber}, {year}</div>
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

  background: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "35%",
    background: "linear-gradient(135deg, #006389 0%, #004b6e 100%)",
    borderBottomLeftRadius: "30px",
    borderBottomRightRadius: "30px",
    zIndex: 0,
  },

  content: {
    position: "relative",
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1,
    maxWidth: "400px",
    margin: "0 auto",
  },

  bankName: {
    color: colors.white,
    fontSize: "clamp(18px, 5vw, 22px)",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: "15px",
    letterSpacing: "0.5px",
    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
    width: "100%",
  },

  divider: {
    width: "80%",
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: "10px",
    alignSelf: "center",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: "12px 20px",
    borderRadius: "50px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    width: "100%",
    marginVertical: "10px",
  },

  avatarContainer: {
    width: "65px",
    height: "65px",
    borderRadius: "50%",
    backgroundColor: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  userText: {
    flex: 1,
  },

  greeting: {
    fontSize: "clamp(16px, 4vw, 18px)",
    fontWeight: "600",
    color: colors.dark,
    marginBottom: "4px",
  },

  userId: {
    fontSize: "clamp(13px, 3.5vw, 14px)",
    color: colors.gray,
  },

  timeCard: {
    backgroundColor: "white",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    width: "100%",
    marginVertical: "10px",
  },

  timeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "15px",
  },

  timeLabel: {
    fontSize: "clamp(12px, 3vw, 13px)",
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: "0.5px",
  },

  timeDisplay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    marginBottom: "10px",
  },

  timeNumber: {
    fontSize: "clamp(32px, 8vw, 42px)",
    fontWeight: "700",
    color: colors.dark,
    fontFamily: "monospace",
  },

  timeColon: {
    fontSize: "clamp(32px, 8vw, 42px)",
    fontWeight: "700",
    color: colors.dark,
    fontFamily: "monospace",
  },

  timeAmPmContainer: {
    display: "flex",
    justifyContent: "flex-end",
  },

  timeAmPm: {
    fontSize: "clamp(16px, 4vw, 18px)",
    fontWeight: "500",
    color: colors.gray,
  },

  dateContainer: {
    backgroundColor: "white",
    borderRadius: "15px",
    padding: "15px 20px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    width: "100%",
    marginVertical: "10px",
    textAlign: "center",
  },

  dayName: {
    fontSize: "clamp(16px, 4vw, 18px)",
    fontWeight: "600",
    color: colors.dark,
    marginBottom: "5px",
  },

  fullDate: {
    fontSize: "clamp(14px, 3.5vw, 15px)",
    color: colors.gray,
  },

  scanButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "15px 20px",
    background: "linear-gradient(135deg, #006389 0%, #004b6e 100%)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontSize: "clamp(15px, 4vw, 16px)",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
    marginVertical: "8px",
    transition: "all 0.2s ease",
  },

  logoutButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "15px 20px",
    backgroundColor: "white",
    border: "1.5px solid #ef4444",
    borderRadius: "12px",
    color: "#ef4444",
    fontSize: "clamp(15px, 4vw, 16px)",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
    marginVertical: "8px",
    transition: "all 0.2s ease",
  },

  buttonText: {
    flex: 1,
    textAlign: "center",
  },

  footerText: {
    textAlign: "center",
    fontSize: "clamp(12px, 3vw, 13px)",
    color: colors.gray,
    marginTop: "15px",
  },
};

// Add global styles
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
  
  @media (max-width: 380px) {
    .timeNumber {
      font-size: 28px !important;
    }
    .timeColon {
      font-size: 28px !important;
    }
    .avatarContainer {
      width: 55px;
      height: 55px;
    }
  }
`;
document.head.appendChild(style);

export default EmployeeDashboard;