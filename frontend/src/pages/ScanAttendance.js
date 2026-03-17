// src/pages/ScanAttendance.js
import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaQrcode, FaCamera } from "react-icons/fa";
import { MdLocationOn, MdRefresh } from "react-icons/md";

const API_URL = "https://online-attendance-system-1-cbgc.onrender.com";

// Create axios instance with default headers to bypass ngrok warning
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
  },
  timeout: 15000 // Increased timeout for sleepy backend
});

// Color palette
const colors = {
  primary: "#006389",
  secondary: "#004b6e",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  light: "#e5e7eb",
  offWhite: "#f3f4f6",
  white: "#ffffff",
  dark: "#1f2937",
  gray: "#6b7280",
  gradient: "linear-gradient(135deg, #006389 0%, #004b6e 100%)"
};

function ScanAttendance() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Initializing...");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [cameraError, setCameraError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState({
    hasClockedIn: false,
    hasClockedOut: false,
    status: "not_started",
    canClockIn: true,
    canClockOut: false,
    message: ""
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [backendAwake, setBackendAwake] = useState(false);

  const qrCodeRegionId = "qr-reader";
  const html5QrCodeRef = useRef(null);
  const scanningRef = useRef(false);
  const alertShownRef = useRef(false);
  const locationRef = useRef(null);
  const scannerInitializedRef = useRef(false);

  const token = localStorage.getItem("token");

  // Wake up backend function
  const wakeUpBackend = useCallback(async () => {
    try {
      console.log("🔄 Attempting to wake up backend...");
      setStatus("Connecting to server...");
      
      const response = await axios.get(`${API_URL}`, { 
        timeout: 30000,
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      
      console.log("✅ Backend is awake:", response.status, response.data);
      setBackendAwake(true);
      setStatus("Connected to server");
      return true;
    } catch (err) {
      console.log("⚠️ Backend wake-up attempt:", err.message);
      setBackendAwake(false);
      setStatus("Server connection issue");
      return false;
    }
  }, []);

  // Navigate to employee dashboard
  const goToEmployeeDashboard = useCallback(() => {
    navigate("/employee", { replace: true });
  }, [navigate]);

  // Stop scanner and navigate to employee dashboard
  const stopScannerAndGoToDashboard = useCallback(async () => {
    if (html5QrCodeRef.current && scannerInitializedRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        scannerInitializedRef.current = false;
      } catch (error) {
        console.debug("Cleanup error:", error);
      }
    }
    goToEmployeeDashboard();
  }, [goToEmployeeDashboard]);

  // Check attendance status from server
  const checkAttendanceStatus = useCallback(async () => {
    if (!token) return null;
    
    try {
      const response = await api.get('/attendance/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("Server status response:", response.data);
      return response.data;
    } catch (err) {
      console.error("Error checking server status:", err);
      return null;
    }
  }, [token]);

  // Initialize - check server status first
  useEffect(() => {
    const initialize = async () => {
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      setLoading(true);
      
      // Wake up backend first
      await wakeUpBackend();
      
      try {
        // Check server status
        const serverData = await checkAttendanceStatus();
        
        if (serverData) {
          console.log("Server data received:", serverData);
          
          setAttendanceStatus({
            hasClockedIn: serverData.hasClockedIn || false,
            hasClockedOut: serverData.hasClockedOut || false,
            status: serverData.status || "not_started",
            canClockIn: serverData.canClockIn || false,
            canClockOut: serverData.canClockOut || false,
            message: serverData.message || ""
          });
          
          // If already completed, show alert and redirect
          if (serverData.hasClockedOut) {
            const formattedDate = new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            
            alert(`⚠️ Your attendance has already been recorded for ${formattedDate}`);
            goToEmployeeDashboard();
            return;
          } else if (serverData.hasClockedIn) {
            setStatus("Ready for clock out");
          } else {
            setStatus("Ready for clock in");
          }
        } else {
          // Fallback to localStorage if server is unavailable
          const today = new Date().toISOString().split('T')[0];
          const savedClockIn = localStorage.getItem(`clockIn_${today}`);
          const savedClockOut = localStorage.getItem(`clockOut_${today}`);
          
          const clockedIn = savedClockIn === 'true';
          const clockedOut = savedClockOut === 'true';
          
          console.log("Using localStorage fallback:", { clockedIn, clockedOut });
          
          setAttendanceStatus({
            hasClockedIn: clockedIn,
            hasClockedOut: clockedOut,
            status: clockedOut ? "completed" : (clockedIn ? "clocked_in" : "not_started"),
            canClockIn: !clockedIn && !clockedOut,
            canClockOut: clockedIn && !clockedOut,
            message: clockedOut ? "Attendance completed" : (clockedIn ? "Clocked in" : "Not started")
          });
          
          if (clockedOut) {
            const formattedDate = new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            
            alert(`⚠️ Your attendance has already been recorded for ${formattedDate} (offline mode)`);
            goToEmployeeDashboard();
            return;
          } else if (clockedIn) {
            setStatus("Ready for clock out (offline mode)");
          } else {
            setStatus("Ready for clock in (offline mode)");
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [token, navigate, checkAttendanceStatus, goToEmployeeDashboard, wakeUpBackend]);

  // Handle successful scan
  const handleSuccessfulScan = useCallback(async (action, location) => {
    if (alertShownRef.current) return;
    alertShownRef.current = true;
    
    const isClockIn = action === "clock_in";
    
    console.log("Successful scan:", { action, isClockIn, location });
    
    // Update status based on action
    if (isClockIn) {
      setAttendanceStatus({
        hasClockedIn: true,
        hasClockedOut: false,
        status: "clocked_in",
        canClockIn: false,
        canClockOut: true,
        message: "Clocked in successfully"
      });
      
      // Store in localStorage as backup
      const dateKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`clockIn_${dateKey}`, 'true');
      
      setScanMessage("Clock In Successful!");
      setStatus("Clock In Successful!");
      
      alert(`✅ Clock In Successful!\nTime: ${new Date().toLocaleTimeString()}\nLocation: ${location}`);
    } else {
      setAttendanceStatus({
        hasClockedIn: true,
        hasClockedOut: true,
        status: "completed",
        canClockIn: false,
        canClockOut: false,
        message: "Attendance completed"
      });
      
      // Store in localStorage as backup
      const dateKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`clockOut_${dateKey}`, 'true');
      
      setScanMessage("Clock Out Successful!");
      setStatus("Clock Out Successful!");
      
      alert(`✅ Clock Out Successful!\nTime: ${new Date().toLocaleTimeString()}\nLocation: ${location}`);
    }
    
    setScanSuccess(true);
    
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    
    // Redirect to employee dashboard after successful scan
    setTimeout(() => {
      stopScannerAndGoToDashboard();
    }, 1500);
    
  }, [stopScannerAndGoToDashboard]);

  // Handle scan error
  const handleScanError = useCallback((errorMessage) => {
    if (alertShownRef.current) return;
    alertShownRef.current = true;
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    alert(`❌ ${errorMessage}`);
    
    // Reset scanning state but stay on page
    setTimeout(() => {
      alertShownRef.current = false;
      scanningRef.current = false;
      setProcessing(false);
    }, 1000);
  }, []);

  // Check camera permission
  const checkCameraPermission = useCallback(async () => {
    try {
      setStatus("Checking camera...");
      setCameraError(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setCameraError("Camera API not supported");
        setCameraPermission(false);
        setStatus("❌ Camera not supported");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      setCameraPermission(true);
      return true;
      
    } catch (error) {
      console.error("Camera permission error:", error);
      setCameraPermission(false);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError("Camera access denied");
        setStatus("❌ Camera permission denied");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setCameraError("No camera found");
        setStatus("❌ No camera found");
      } else {
        setCameraError("Camera unavailable");
        setStatus("❌ Camera unavailable");
      }
      
      return false;
    }
  }, []);

  // Get location
  const getLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationPermission(false);
        resolve({ latitude: 0, longitude: 0 });
        return;
      }

      setStatus("Getting location...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission(true);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Location error:", error);
          setLocationPermission(false);
          resolve({ latitude: 0, longitude: 0 });
        },
        {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  // Start scanner
  const startScanner = useCallback(async (latitude, longitude) => {
    if (attendanceStatus.hasClockedOut) {
      return; // Don't start scanner if already completed
    }

    if (html5QrCodeRef.current && scannerInitializedRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        scannerInitializedRef.current = false;
      } catch (error) {
        console.debug("Cleanup error:", error);
      }
    }

    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);
    }

    try {
      setStatus("Starting camera...");
      setIsScanning(true);

      const qrConfig = {
        fps: 5,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const cameras = await Html5Qrcode.getCameras().catch(() => []);
      
      let cameraId = null;
      
      if (cameras && cameras.length > 0) {
        const backCamera = cameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('environment') ||
          c.label.toLowerCase().includes('rear')
        );
        
        cameraId = backCamera ? backCamera.id : cameras[0].id;
      }

      const scanSuccessCallback = async (decodedText) => {
        if (scanningRef.current || alertShownRef.current || processing) return;
        
        console.log("🔍 QR Code detected:", decodedText);
        console.log("🔑 Token exists:", !!token);
        console.log("🌐 API_URL:", API_URL);
        
        // Double-check status before processing
        if (attendanceStatus.hasClockedOut) {
          const formattedDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          alert(`⚠️ Your attendance has already been recorded for ${formattedDate}`);
          stopScannerAndGoToDashboard();
          return;
        }
        
        scanningRef.current = true;
        setProcessing(true);

        try {
          setStatus("Processing...");

          if (decodedText !== "GATE_ATTENDANCE") {
            handleScanError("Invalid QR Code");
            setProcessing(false);
            scanningRef.current = false;
            return;
          }

          console.log("📤 Sending attendance request to:", `${API_URL}/attendance`);
          console.log("📦 Request data:", { qrData: decodedText, latitude, longitude });

          // Send attendance request to server using api instance
          const response = await api.post('/attendance', 
            { 
              qrData: decodedText, 
              latitude, 
              longitude 
            },
            { 
              headers: { 
                Authorization: `Bearer ${token}`
              },
              timeout: 15000 // 15 second timeout
            }
          );

          console.log("📥 Response received:", response.data);

          if (response.data.success) {
            await handleSuccessfulScan(
              response.data.action,
              response.data.location || "Unknown"
            );
          } else {
            handleScanError(response.data.message || "Unable to process attendance");
          }
          
        } catch (err) {
          console.error('❌ Scan error details:', err);
          
          setProcessing(false);
          scanningRef.current = false;
          alertShownRef.current = false;
          
          let errorMsg = "Unable to process attendance. Please try again.";
          
          if (err.code === 'ECONNABORTED') {
            errorMsg = "Connection timeout. Server is waking up. Please try again in 30 seconds.";
            console.log("⏱️ Request timeout - backend might be sleeping");
            // Try to wake up backend again
            wakeUpBackend();
          } else if (err.response) {
            // The request was made and the server responded with a status code
            errorMsg = err.response.data?.message || err.message;
            console.log("Server responded with error:", err.response.status, err.response.data);
            
            // Handle specific error cases
            if (err.response.status === 400) {
              if (errorMsg.includes("already completed")) {
                const formattedDate = new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
                alert(`⚠️ Your attendance has already been recorded for ${formattedDate}`);
                stopScannerAndGoToDashboard();
                return;
              } else if (errorMsg.includes("Invalid QR")) {
                alert(`❌ Invalid QR Code. Please scan the correct attendance QR.`);
              } else {
                alert(`❌ ${errorMsg}`);
              }
            } else if (err.response.status === 401 || err.response.status === 403) {
              alert("Your session has expired. Please login again.");
              localStorage.removeItem("token");
              navigate("/login");
              return;
            } else {
              alert(`❌ Server error: ${errorMsg}`);
            }
          } else if (err.request) {
            // The request was made but no response was received
            errorMsg = "Cannot connect to server. Please check your connection.";
            console.log("📡 No response from server - network issue");
            alert(`❌ ${errorMsg}`);
            
            // Try to wake up backend
            wakeUpBackend();
          } else {
            // Something happened in setting up the request
            errorMsg = err.message;
            alert(`❌ Error: ${errorMsg}`);
          }
          
          setStatus("Ready to scan");
        }
      };

      const scanErrorCallback = (errorMessage) => {
        // Ignore common scan errors
        if (!errorMessage.includes("NotFoundException") && 
            !errorMessage.includes("No MultiFormat")) {
          console.debug('Scan error:', errorMessage);
        }
      };

      // Start scanner with appropriate config
      if (!cameraId) {
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          qrConfig,
          scanSuccessCallback,
          scanErrorCallback
        );
      } else {
        await html5QrCodeRef.current.start(
          cameraId,
          qrConfig,
          scanSuccessCallback,
          scanErrorCallback
        );
      }
      
      scannerInitializedRef.current = true;
      setIsScanning(false);
      
    } catch (error) {
      console.error("Scanner error:", error);
      setCameraError("Failed to start camera");
      setStatus("❌ Camera failed");
      setIsScanning(false);
      setProcessing(false);
      
      if (retryCount < 1) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          startScanner(latitude, longitude);
        }, 1000);
      }
    }
  }, [token, handleSuccessfulScan, handleScanError, retryCount, stopScannerAndGoToDashboard, attendanceStatus.hasClockedOut, processing, navigate, wakeUpBackend]);

  // Initialize scanner after status check
  useEffect(() => {
    if (loading) return;
    if (attendanceStatus.hasClockedOut) return;

    let mounted = true;

    const initializeScanner = async () => {
      const cameraOk = await checkCameraPermission();
      const location = await getLocation();
      
      if (mounted) locationRef.current = location;
      
      if (!cameraOk || !mounted) return;
      
      if (mounted) {
        startScanner(locationRef.current?.latitude || 0, locationRef.current?.longitude || 0);
      }
    };

    initializeScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current && scannerInitializedRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        scannerInitializedRef.current = false;
      }
    };
  }, [loading, attendanceStatus.hasClockedOut, checkCameraPermission, getLocation, startScanner]);

  const handleRetry = () => {
    setRetryCount(0);
    window.location.reload();
  };

  const handleBack = () => {
    stopScannerAndGoToDashboard();
  };

  // Determine what message to show
  const getInstructionMessage = () => {
    if (!backendAwake) return "Connecting to server...";
    if (cameraError) return "Camera unavailable";
    if (attendanceStatus.hasClockedOut) return "✓ Today's attendance completed";
    if (attendanceStatus.hasClockedIn) return "Scan to Clock Out";
    return "Scan to Clock In";
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={{ color: colors.primary }}>Checking attendance status...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Fixed Background */}
      <div style={styles.fixedBackground}>
        <div style={styles.backgroundPattern}></div>
        <div style={styles.backgroundOverlay}></div>
      </div>

      {/* Back Button */}
      <button onClick={handleBack} style={styles.backButton}>
        <FaArrowLeft size={20} color={colors.primary} />
      </button>

      {/* Main Card */}
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <FaQrcode size={24} color={colors.white} />
          </div>
          <h2 style={styles.title}>Scan Attendance</h2>
        </div>

        {/* Status Indicator */}
        {attendanceStatus.hasClockedIn && !attendanceStatus.hasClockedOut && (
          <div style={styles.statusIndicator}>
            <span style={styles.statusIndicatorText}>⏰ Ready for Clock Out</span>
          </div>
        )}
        
        {attendanceStatus.hasClockedOut && (
          <div style={{...styles.statusIndicator, backgroundColor: "#d1fae5"}}>
            <span style={{...styles.statusIndicatorText, color: colors.success}}>✓ Completed</span>
          </div>
        )}

        {/* Camera Error Display */}
        {cameraError && (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{cameraError}</p>
          </div>
        )}

        {/* Status Bar */}
        <div style={styles.statusBar}>
          <div style={styles.statusItem}>
            <MdLocationOn size={12} color={locationPermission ? colors.primary : colors.gray} />
            <span style={{...styles.statusLabel, fontSize: '11px'}}>
              {locationPermission ? 'On' : 'Off'}
            </span>
          </div>
          
          <span style={styles.statusText}>{status}</span>
          
          <div style={styles.statusItem}>
            <FaCamera size={12} color={cameraPermission ? colors.primary : colors.gray} />
            <span style={{...styles.statusLabel, fontSize: '11px'}}>
              {cameraPermission ? 'On' : 'Off'}
            </span>
          </div>
        </div>

        {/* Backend Status Indicator */}
        {!backendAwake && (
          <div style={styles.warningContainer}>
            <p style={styles.warningText}>⚠️ Connecting to server. Please wait...</p>
          </div>
        )}

        {/* Success Message */}
        {scanSuccess && (
          <div style={styles.successIndicator}>
            <span style={styles.successText}>{scanMessage}</span>
          </div>
        )}

        {/* Scanner Container - Only show if not completed */}
        {!attendanceStatus.hasClockedOut && (
          <div style={styles.scannerContainer}>
            <div 
              id={qrCodeRegionId}
              style={styles.scanner}
            ></div>
            
            {(isScanning || processing) && (
              <div style={styles.overlay}>
                <div style={styles.spinner}></div>
                <p style={styles.overlayText}>
                  {processing ? "Processing..." : "Starting..."}
                </p>
              </div>
            )}

            {/* Scanner Frame */}
            <div style={styles.scannerFrame}>
              <div style={styles.cornerTL}></div>
              <div style={styles.cornerTR}></div>
              <div style={styles.cornerBL}></div>
              <div style={styles.cornerBR}></div>
              <div style={styles.scanLine}></div>
              <div style={styles.centerDot}></div>
              <div style={styles.crosshairH}></div>
              <div style={styles.crosshairV}></div>
            </div>
          </div>
        )}

        {/* Completed State - Show message instead of scanner */}
        {attendanceStatus.hasClockedOut && (
          <div style={styles.completedContainer}>
            <div style={styles.completedIcon}>✓</div>
            <p style={styles.completedText}>Attendance Completed for Today</p>
            <button onClick={handleBack} style={styles.completedButton}>
              Return to Dashboard
            </button>
          </div>
        )}

        {/* Instruction */}
        <p style={styles.instruction}>
          {getInstructionMessage()}
        </p>

        {/* Retry Button */}
        {(cameraError || cameraPermission === false) && !attendanceStatus.hasClockedOut && (
          <button onClick={handleRetry} style={styles.retryButton}>
            <MdRefresh size={16} style={{ marginRight: '6px' }} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.offWhite,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflow: "hidden",
    touchAction: "none",
    userSelect: "none",
  },

  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: colors.offWhite,
  },

  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: `3px solid ${colors.light}`,
    borderTopColor: colors.primary,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },

  fixedBackground: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "200px",
    background: colors.gradient,
    borderBottomLeftRadius: "30px",
    borderBottomRightRadius: "30px",
  },

  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 60%)",
    pointerEvents: "none",
  },

  backButton: {
    position: "fixed",
    top: "36px",
    left: "16px",
    width: "40px",
    height: "40px",
    borderRadius: "20px",
    backgroundColor: colors.white,
    border: `1px solid ${colors.light}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: `0 2px 8px ${colors.primary}20`,
    zIndex: 10,
    transition: "all 0.2s ease",
  },

  card: {
    position: "fixed",
    top: "55%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "380px",
    backgroundColor: colors.white,
    borderRadius: "28px",
    padding: "20px",
    boxShadow: `0 20px 40px ${colors.primary}30`,
    zIndex: 1,
    border: `1px solid ${colors.primary}20`,
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },

  iconContainer: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    background: colors.gradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: "18px",
    fontWeight: "600",
    color: colors.dark,
    margin: 0,
  },

  statusIndicator: {
    marginBottom: "12px",
    padding: "6px",
    backgroundColor: "#fff3cd",
    borderRadius: "20px",
    border: `1px solid ${colors.warning}40`,
    textAlign: "center",
  },

  statusIndicatorText: {
    fontSize: "11px",
    color: colors.warning,
    fontWeight: "500",
  },

  errorContainer: {
    marginBottom: "12px",
    padding: "8px",
    backgroundColor: "#fee2e2",
    borderRadius: "20px",
    border: `1px solid ${colors.danger}`,
  },

  errorText: {
    fontSize: "11px",
    color: colors.danger,
    textAlign: "center",
  },

  warningContainer: {
    marginBottom: "12px",
    padding: "8px",
    backgroundColor: "#fff3cd",
    borderRadius: "20px",
    border: `1px solid ${colors.warning}`,
  },

  warningText: {
    fontSize: "11px",
    color: colors.warning,
    textAlign: "center",
    fontWeight: "500",
  },

  statusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.offWhite,
    padding: "8px 14px",
    borderRadius: "30px",
    marginBottom: "16px",
    height: "38px",
    border: `1px solid ${colors.light}`,
  },

  successIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
    padding: "6px",
    backgroundColor: "#d1fae5",
    borderRadius: "20px",
    border: `1px solid ${colors.success}40`,
  },

  successText: {
    fontSize: "12px",
    color: colors.success,
    fontWeight: "500",
  },

  statusItem: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    minWidth: "50px",
  },

  statusLabel: {
    fontSize: "11px",
    fontWeight: "500",
    color: colors.gray,
  },

  statusText: {
    fontSize: "12px",
    color: colors.dark,
    fontWeight: "500",
    textAlign: "center",
    flex: 1,
  },

  scannerContainer: {
    position: "relative",
    width: "340px",
    height: "340px",
    margin: "0 auto 16px auto",
    borderRadius: "20px",
    overflow: "hidden",
    backgroundColor: "#000",
    border: `2px solid ${colors.primary}`,
    boxShadow: `0 0 0 3px ${colors.primary}20`,
  },

  scanner: {
    width: "100%",
    height: "100%",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  spinner: {
    width: "32px",
    height: "32px",
    border: `2px solid ${colors.white}`,
    borderTop: `2px solid ${colors.primary}`,
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    marginBottom: "8px",
  },

  overlayText: {
    fontSize: "12px",
    color: colors.white,
    fontWeight: "500",
    margin: 0,
  },

  scannerFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "220px",
    height: "220px",
    zIndex: 2,
    pointerEvents: "none",
  },

  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "35px",
    height: "35px",
    borderTop: `3px solid ${colors.primary}`,
    borderLeft: `3px solid ${colors.primary}`,
    borderTopLeftRadius: "12px",
    boxShadow: `-2px -2px 8px ${colors.primary}40`,
  },

  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "35px",
    height: "35px",
    borderTop: `3px solid ${colors.primary}`,
    borderRight: `3px solid ${colors.primary}`,
    borderTopRightRadius: "12px",
    boxShadow: `2px -2px 8px ${colors.primary}40`,
  },

  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "35px",
    height: "35px",
    borderBottom: `3px solid ${colors.primary}`,
    borderLeft: `3px solid ${colors.primary}`,
    borderBottomLeftRadius: "12px",
    boxShadow: `-2px 2px 8px ${colors.primary}40`,
  },

  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: "35px",
    height: "35px",
    borderBottom: `3px solid ${colors.primary}`,
    borderRight: `3px solid ${colors.primary}`,
    borderBottomRightRadius: "12px",
    boxShadow: `2px 2px 8px ${colors.primary}40`,
  },

  scanLine: {
    position: "absolute",
    top: 0,
    left: "5%",
    right: "5%",
    height: "2px",
    background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
    animation: "scan 2s ease-in-out infinite",
    boxShadow: `0 0 10px ${colors.primary}`,
  },

  centerDot: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: colors.primary,
    boxShadow: `0 0 15px ${colors.primary}`,
    animation: "pulse 1.5s ease-in-out infinite",
    zIndex: 10,
    border: "1px solid white",
  },

  crosshairH: {
    position: "absolute",
    top: "50%",
    left: "0",
    right: "0",
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.3)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    zIndex: 8,
  },

  crosshairV: {
    position: "absolute",
    top: "0",
    bottom: "0",
    left: "50%",
    width: "1px",
    backgroundColor: "rgba(255,255,255,0.3)",
    transform: "translateX(-50%)",
    pointerEvents: "none",
    zIndex: 8,
  },

  instruction: {
    textAlign: "center",
    fontSize: "12px",
    color: colors.gray,
    margin: "0 0 12px 0",
    minHeight: "18px",
  },

  retryButton: {
    width: "100%",
    padding: "12px",
    background: colors.gradient,
    color: colors.white,
    border: "none",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    height: "44px",
    boxShadow: `0 8px 16px -5px ${colors.primary}60`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },

  completedContainer: {
    width: "340px",
    height: "340px",
    margin: "0 auto 16px auto",
    borderRadius: "20px",
    backgroundColor: "#f0f9ff",
    border: `2px solid ${colors.primary}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
  },

  completedIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: colors.success,
    color: colors.white,
    fontSize: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 10px 20px ${colors.success}40`,
  },

  completedText: {
    fontSize: "16px",
    color: colors.dark,
    fontWeight: "500",
    textAlign: "center",
    margin: "0 20px",
  },

  completedButton: {
    padding: "12px 24px",
    background: colors.gradient,
    color: colors.white,
    border: "none",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    boxShadow: `0 8px 16px -5px ${colors.primary}60`,
    transition: "all 0.2s ease",
  },
};

// Global styles
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes scan {
    0% { top: 0; opacity: 0; }
    10% { opacity: 1; }
    45% { top: 45%; opacity: 1; }
    55% { top: 55%; opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }

  @keyframes pulse {
    0% { 
      opacity: 0.5; 
      transform: translate(-50%, -50%) scale(0.8);
      box-shadow: 0 0 10px ${colors.primary};
    }
    50% { 
      opacity: 1; 
      transform: translate(-50%, -50%) scale(1.2);
      box-shadow: 0 0 20px ${colors.primary};
    }
    100% { 
      opacity: 0.5; 
      transform: translate(-50%, -50%) scale(0.8);
      box-shadow: 0 0 10px ${colors.primary};
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
    background-color: ${colors.offWhite};
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: none;
  }

  #qr-reader {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    border: none !important;
    background: #000 !important;
  }

  #qr-reader video {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    border-radius: 18px !important;
  }

  #qr-reader__dashboard,
  #qr-reader__camera_selection,
  #qr-reader__dashboard_section_fs,
  #qr-reader__dashboard_section_zoom,
  #qr-reader__status_span,
  #qr-reader__header_message {
    display: none !important;
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
`;
document.head.appendChild(style);

export default ScanAttendance;