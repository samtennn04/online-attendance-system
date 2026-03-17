// src/pages/AdminDashboard.js
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  FiUsers, FiCalendar, FiLogOut, FiSearch, 
  FiFilter, FiTrash2, FiChevronLeft, FiChevronRight,
  FiRefreshCw, FiMapPin, FiXCircle, FiAlertCircle,
  FiCheckCircle, FiHome, FiMenu, FiTrash, FiDownload
} from "react-icons/fi";
import logo from "../assets/logo.png";

const API_URL = "https://online-attendance-system-1-cbgc.onrender.com";
const api = axios.create({ 
  baseURL: API_URL, 
  timeout: 15000, 
  headers: { 
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  } 
});

// Color palette
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

const AdminDashboard = () => { 
  const navigate = useNavigate();
  
  // State
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeView, setActiveView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, employee: null });
  const [deleteEverythingModal, setDeleteEverythingModal] = useState({ show: false });
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  
  const itemsPerPage = 15;

  // ========== ADD THIS useEffect TO MONITOR STATE CHANGES ==========
  useEffect(() => {
    console.log("🔄 attendance state UPDATED:", attendance);
  }, [attendance]);

  useEffect(() => {
    console.log("🔄 employees state UPDATED:", employees);
  }, [employees]);

  // ========== FORMATTING FUNCTIONS ==========
  const formatDate = useCallback((date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  }, []);

  // Convert 24-hour time to 12-hour format with AM/PM
  const formatTime = useCallback((time) => {
    if (!time) return "-";
    
    // Handle different time formats
    let hours, minutes;
    
    if (time.includes(':')) {
      [hours, minutes] = time.split(':');
    } else {
      return time;
    }
    
    const hour = parseInt(hours, 10);
    
    // Convert to 12-hour format
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    // Return without seconds
    return `${hour12}:${minutes} ${ampm}`;
  }, []);

  const formatLocation = useCallback((location) => {
    if (!location || location === "Unknown" || location === "-" || location === "null") {
      return "—";
    }
    return location;
  }, []);

  // ========== DEBUG LOGS ==========
  console.log("🔍 DEBUG INFO:");
  console.log("📊 attendance state:", attendance);
  console.log("👥 employees state:", employees);
  console.log("📅 selectedMonth:", selectedMonth);
  console.log("=".repeat(50));

  // ========== TEST API CONNECTION ==========
  const testApiConnection = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setApiStatus("no-token");
      return;
    }
    
    try {
      console.log("Testing API connection...");
      const response = await api.get("/admin/test", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("API test successful:", response.data);
      setApiStatus("connected");
      return true;
    } catch (err) {
      console.error("API test failed:", err);
      setApiStatus("failed");
      return false;
    }
  }, []);

  // Test API connection on mount
  useEffect(() => {
    testApiConnection();
  }, [testApiConnection]);

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/adminlogin");
    }
  }, [navigate]);

  // ========== FETCH EMPLOYEES ==========
  const fetchEmployees = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return [];

    try {
      const response = await api.get("/admin/employees", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const employeesData = Array.isArray(response.data) ? response.data : [];
      console.log(`✅ Fetched ${employeesData.length} employees`);
      
      return employeesData;
    } catch (err) {
      console.error("Error fetching employees:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/adminlogin");
      }
      return [];
    }
  }, [navigate]);

  // ========== FETCH ATTENDANCE ==========
  const fetchAttendance = useCallback(async (year, month) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return [];

    try {
      console.log(`📡 Fetching attendance for ${year}-${month}...`);
      
      const response = await api.get(`/admin/attendance/monthly/${year}/${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ API Response received");
      console.log("📊 Full response data:", response.data);
      console.log("📊 Attendance data:", response.data.attendance);
      
      if (response.data.success) {
        console.log(`✅ Fetched ${response.data.attendance?.length || 0} records`);
        
        if (response.data.attendance && response.data.attendance.length > 0) {
          console.log("📋 First record:", response.data.attendance[0]);
        }
        
        return response.data.attendance || [];
      }
      return [];
    } catch (err) {
      console.error("❌ Error fetching attendance:", err);
      return [];
    }
  }, []);

  // ========== FETCH ALL DATA ==========
  const loadData = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) { 
      navigate("/adminlogin"); 
      return; 
    }
    
    setLoading(true);
    try {
      console.log("🚀 Starting to load data...");
      
      // Fetch employees
      console.log("👥 Fetching employees...");
      const employeesData = await fetchEmployees();
      console.log("👥 Employees fetched:", employeesData);
      
      // Fetch attendance for selected month
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      console.log(`📅 Fetching attendance for ${year}-${month}...`);
      
      const attendanceData = await fetchAttendance(year, month);
      console.log("📊 Attendance fetched:", attendanceData);
      
      // Update state
      console.log("💾 Setting employees state with:", employeesData.length, "records");
      setEmployees(employeesData);
      
      console.log("💾 Setting attendance state with:", attendanceData.length, "records");
      setAttendance(attendanceData);
      
      console.log("✅ Data loading complete");
      console.log("📊 Final state - employees:", employeesData.length, "attendance:", attendanceData.length);

    } catch (err) {
      console.error("❌ Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate, selectedMonth, fetchEmployees, fetchAttendance]);

  // Load data on mount and when refreshCounter changes
  useEffect(() => {
    loadData();
  }, [loadData, refreshCounter]);

  // ========== LISTEN FOR ATTENDANCE UPDATES ==========
  useEffect(() => {
    const handleAttendanceUpdate = (event) => {
      console.log('📢 Attendance update received:', event.detail);
      setRefreshCounter(prev => prev + 1);
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    
    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, []);

  // ========== GENERATE COMPLETE ATTENDANCE ==========
  const generateCompleteAttendance = useCallback(() => {
    console.log("🔄 Generating complete attendance...");
    console.log("👥 Employees count:", employees.length);
    console.log("📊 Raw attendance count:", attendance.length);
    console.log("📊 Raw attendance data:", attendance);
    
    if (!employees.length) {
      console.log("⚠️ No employees to generate attendance for");
      return [];
    }

    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    
    console.log(`📅 Selected month: ${year}-${month}`);
    
    const daysInMonth = new Date(year, month, 0).getDate();
    console.log(`📅 Days in month: ${daysInMonth}`);
    
    const completeRecords = [];

    // Create a map of existing attendance records
    const attendanceMap = new Map();
    attendance.forEach(record => {
      const key = `${record.employee_id}-${record.date}`;
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, []);
      }
      attendanceMap.get(key).push(record);
    });
    
    console.log("🗺️ Created attendance map with keys:", Array.from(attendanceMap.keys()));

    employees.forEach(employee => {
      const registrationDate = employee.created_at ? new Date(employee.created_at) : new Date();
      registrationDate.setHours(0, 0, 0, 0);
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const currentDate = new Date(dateStr);
        currentDate.setHours(0, 0, 0, 0);
        
        // Skip dates before registration
        if (currentDate < registrationDate) continue;
        
        const dayRecords = attendanceMap.get(`${employee.id}-${dateStr}`) || [];

        if (dayRecords.length > 0) {
          // We have records for this day
          let earliestClockIn = null;
          let latestClockOut = null;
          let location = null;
          
          dayRecords.forEach(record => {
            if (record.clock_in) {
              if (!earliestClockIn || record.clock_in < earliestClockIn) {
                earliestClockIn = record.clock_in;
              }
            }
            if (record.clock_out) {
              if (!latestClockOut || record.clock_out > latestClockOut) {
                latestClockOut = record.clock_out;
              }
            }
            if (record.location_name && !location) {
              location = record.location_name;
            }
          });
          
          let status = "absent";
          if (earliestClockIn && latestClockOut) {
            status = "present";
          } else if (earliestClockIn || latestClockOut) {
            status = "partial";
          }
          
          completeRecords.push({
            employee_id: employee.id,
            username: employee.username,
            employee_email: employee.email,
            date: dateStr,
            clock_in: earliestClockIn,
            clock_out: latestClockOut,
            location_name: location || "Unknown",
            status: status,
            scan_count: dayRecords.length
          });
        }
        // Don't add absent records for dates without attendance
      }
    });

    console.log(`✅ Generated ${completeRecords.length} complete records`);
    console.log("📋 First 3 records:", completeRecords.slice(0, 3));
    
    // Sort by date (newest first) and employee name
    return completeRecords.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return a.username.localeCompare(b.username);
    });
    
  }, [employees, attendance, selectedMonth]);

  // ========== MEMOIZED VALUES ==========
  const completeAttendanceData = useMemo(() => {
    return generateCompleteAttendance();
  }, [generateCompleteAttendance]);

  const filteredData = useMemo(() => {
    if (activeView === "employees") {
      return employees.filter(e => 
        e.username?.toLowerCase().includes(search.toLowerCase()) ||
        e.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (activeView === "attendance") {
      let filtered = [...completeAttendanceData];
      
      if (search) {
        filtered = filtered.filter(item => 
          item.username?.toLowerCase().includes(search.toLowerCase()) ||
          item.employee_email?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (selectedDate) {
        filtered = filtered.filter(item => item.date === selectedDate);
      }
      
      // Apply date range filter
      if (dateRange.start && dateRange.end) {
        filtered = filtered.filter(item => 
          item.date >= dateRange.start && item.date <= dateRange.end
        );
      }
      
      return filtered;
    }
    
    return [];
  }, [activeView, employees, completeAttendanceData, search, selectedDate, dateRange]);

  // ========== ABSENT TODAY FUNCTION ==========
  const getAbsentToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const employeesWithAttendance = new Set(
      attendance
        .filter(record => record.date === today)
        .map(record => record.employee_id)
    );
    
    return employees.filter(emp => !employeesWithAttendance.has(emp.id));
  }, [employees, attendance]);

  // ========== EXPORT FUNCTION ==========
  const exportToCSV = useCallback(() => {
    setExportLoading(true);
    try {
      let dataToExport = [];
      let filename = '';
      
      if (activeView === "attendance") {
        dataToExport = filteredData;
        filename = `attendance_records_${selectedMonth.toISOString().split('T')[0]}.csv`;
      } else if (activeView === "employees") {
        dataToExport = filteredData;
        filename = `employees_list_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // Dashboard view - export today's attendance
        const today = new Date().toISOString().split('T')[0];
        dataToExport = completeAttendanceData.filter(item => item.date === today);
        filename = `todays_attendance_${today}.csv`;
      }
      
      if (dataToExport.length === 0) {
        alert("No data to export");
        setExportLoading(false);
        return;
      }
      
      // Define headers based on view
      let headers = [];
      let rows = [];
      
      if (activeView === "employees") {
        headers = ['Employee ID', 'Username', 'Email', 'Registered Date'];
        rows = dataToExport.map(item => [
          item.id,
          item.username,
          item.email || '-',
          formatDate(item.created_at)
        ]);
      } else {
        // Attendance data
        headers = ['Employee ID', 'Employee Name', 'Email', 'Date', 'Clock In', 'Clock Out', 'Location', 'Status'];
        rows = dataToExport.map(item => [
          item.employee_id,
          item.username,
          item.employee_email || '-',
          formatDate(item.date),
          item.clock_in || '-',
          item.clock_out || '-',
          formatLocation(item.location_name),
          item.status
        ]);
      }
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => 
          typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
        ).join(','))
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`✅ Exported ${dataToExport.length} records to ${filename}`);
      
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data");
    } finally {
      setExportLoading(false);
    }
  }, [activeView, filteredData, selectedMonth, completeAttendanceData, formatDate, formatLocation]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = completeAttendanceData.filter(a => a.date === today);
    
    return {
      totalEmployees,
      todayPresent: todayRecords.filter(a => a.status === "present").length,
      todayPartial: todayRecords.filter(a => a.status === "partial").length,
      todayAbsent: todayRecords.filter(a => a.status === "absent").length,
      totalMonthlyRecords: completeAttendanceData.length
    };
  }, [employees, completeAttendanceData]);

  const uniqueDates = useMemo(() => {
    return [...new Set(completeAttendanceData.map(a => a.date))].sort().reverse();
  }, [completeAttendanceData]);

  const minDate = useMemo(() => {
    const allDates = completeAttendanceData.map(r => r.date).filter(Boolean);
    return allDates.length ? allDates.sort()[0] : "";
  }, [completeAttendanceData]);

  const maxDate = useMemo(() => {
    const allDates = completeAttendanceData.map(r => r.date).filter(Boolean);
    return allDates.length ? allDates.sort()[allDates.length - 1] : "";
  }, [completeAttendanceData]);

  // ========== HANDLERS ==========
  const handleDeleteEverything = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setDeleteLoading(true);
    try {
      console.log("🗑️ Deleting ALL attendance records...");
      
      await api.delete(`/admin/attendance/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ Delete successful");
      
      // Clear local state immediately
      setAttendance([]);
      
      // Force a complete refresh
      setRefreshCounter(prev => prev + 1);
      
      // Close modal
      setDeleteEverythingModal({ show: false });
      alert("Successfully deleted ALL attendance records");
      
    } catch (err) {
      console.error("Error deleting all records:", err);
      alert(err.response?.data?.message || "Failed to delete all records");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteModal.employee) return;
    
    const token = localStorage.getItem("adminToken");
    try {
      await api.delete(`/admin/employees/${deleteModal.employee.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Force refresh
      setRefreshCounter(prev => prev + 1);
      
      setDeleteModal({ show: false, employee: null });
      alert("Employee deleted successfully");
    } catch (err) {
      alert("Failed to delete employee");
    }
  };

  const handleRefresh = () => {
    setRefreshCounter(prev => prev + 1);
  };

  const handleMonthChange = (offset) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1));
    setCurrentPage(1);
    setTimeout(() => setRefreshCounter(prev => prev + 1), 100);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    navigate("/adminlogin");
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setCurrentPage(1);
    setSearch("");
    setSelectedDate("");
    setDateRange({ start: "", end: "" });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedDate("");
    setDateRange({ start: "", end: "" });
    setCurrentPage(1);
  };

  const openDeleteEverythingModal = () => {
    setDeleteEverythingModal({ show: true });
  };

  const handleDateRangeChange = (type, value) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "present":
        return { bg: "#d1fae5", color: colors.success, text: "Present", icon: FiCheckCircle };
      case "partial":
        return { bg: "#fed7aa", color: colors.warning, text: "Partial", icon: FiAlertCircle };
      case "absent":
        return { bg: "#fee2e2", color: colors.danger, text: "Absent", icon: FiXCircle };
      default:
        return { bg: colors.light, color: colors.gray, text: "Unknown", icon: FiAlertCircle };
    }
  };

  if (loading && refreshCounter === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={{ color: colors.primary }}>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      {/* API Status Warning */}
      {apiStatus === 'failed' && (
        <div style={apiWarningStyle}>
          ⚠️ Backend not reachable at {API_URL}
        </div>
      )}

      {/* Delete Employee Modal */}
      {deleteModal.show && (
        <div style={styles.modalOverlay} onClick={() => setDeleteModal({ show: false, employee: null })}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <FiAlertCircle size={48} color={colors.danger} />
            <h3 style={styles.modalTitle}>Delete Employee</h3>
            <p style={styles.modalText}>
              Are you sure you want to delete <strong>{deleteModal.employee?.username}</strong>?
              <br />
              <span style={{ color: colors.danger, fontSize: "13px" }}>
                This will permanently remove the employee and all their attendance records.
              </span>
            </p>
            <div style={styles.modalActions}>
              <button style={styles.modalCancelBtn} onClick={() => setDeleteModal({ show: false, employee: null })}>
                Cancel
              </button>
              <button style={styles.modalConfirmBtn} onClick={handleDeleteEmployee}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Everything Modal */}
      {deleteEverythingModal.show && (
        <div style={styles.modalOverlay} onClick={() => !deleteLoading && setDeleteEverythingModal({ show: false })}>
          <div style={{...styles.modal, maxWidth: "500px"}} onClick={e => e.stopPropagation()}>
            {deleteLoading ? (
              <>
                <div style={styles.loadingSpinner}></div>
                <h3 style={styles.modalTitle}>Processing...</h3>
                <p style={styles.modalText}>Please wait while we delete ALL records...</p>
              </>
            ) : (
              <>
                <FiTrash size={48} color={colors.danger} />
                <h3 style={styles.modalTitle}>Delete ALL Records</h3>
                
                <div style={styles.deleteSummary}>
                  <p style={styles.summaryTitle}>This action will permanently delete:</p>
                  <div style={styles.deleteSummaryStats}>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Total Records:</span>
                      <span style={styles.summaryValue}>{attendance.length}</span>
                    </div>
                    <div style={styles.summaryItem}>
                      <span style={styles.summaryLabel}>Date Range:</span>
                      <span style={styles.summaryValue}>
                        {minDate ? formatDate(minDate) : 'N/A'} to {maxDate ? formatDate(maxDate) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{...styles.modalText, color: colors.danger, fontWeight: "500"}}>
                  ⚠️ This action CANNOT be undone!
                </p>

                <div style={styles.modalActions}>
                  <button style={styles.modalCancelBtn} onClick={() => setDeleteEverythingModal({ show: false })}>
                    Cancel
                  </button>
                  <button 
                    style={{...styles.modalConfirmBtn, background: colors.danger}}
                    onClick={handleDeleteEverything}
                  >
                    DELETE EVERYTHING
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{...styles.sidebar, width: sidebarCollapsed ? "80px" : "260px"}}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <img 
              src={logo} 
              alt="Logo" 
              style={{
                ...styles.logoImage,
                width: sidebarCollapsed ? "50px" : "180px",
                height: sidebarCollapsed ? "50px" : "auto"
              }} 
            />
          </div>
          <button style={styles.menuToggle} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <FiMenu size={20} color={colors.white} />
          </button>
        </div>

        <div style={styles.sidebarNav}>
          <button 
            style={{...styles.navItem, ...(activeView === "dashboard" && styles.activeNavItem)}}
            onClick={() => handleViewChange("dashboard")}
          >
            <FiHome size={20} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button 
            style={{...styles.navItem, ...(activeView === "attendance" && styles.activeNavItem)}}
            onClick={() => handleViewChange("attendance")}
          >
            <FiCalendar size={20} />
            {!sidebarCollapsed && <span>Attendance</span>}
          </button>
          <button 
            style={{...styles.navItem, ...(activeView === "employees" && styles.activeNavItem)}}
            onClick={() => handleViewChange("employees")}
          >
            <FiUsers size={20} />
            {!sidebarCollapsed && <span>Employees</span>}
          </button>
        </div>

        <div style={styles.sidebarFooter}>
          <button style={styles.navItem} onClick={handleLogout}>
            <FiLogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{...styles.mainContent, marginLeft: sidebarCollapsed ? "80px" : "260px"}}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              {activeView === "dashboard" && "Dashboard"}
              {activeView === "attendance" && "Attendance Records"}
              {activeView === "employees" && "Employee Management"}
            </h1>
            <p style={styles.subtitle}>
              {activeView === "dashboard" && "Welcome back! Here's what's happening today."}
              {activeView === "attendance" && `Showing ${filteredData.length} records`}
              {activeView === "employees" && `Manage ${employees.length} employees`}
            </p>
          </div>
          <div style={styles.headerActions}>
            <button 
              onClick={exportToCSV} 
              style={styles.iconBtn} 
              title="Export to CSV"
              disabled={exportLoading}
            >
              <FiDownload size={16} color={exportLoading ? colors.gray : colors.primary} />
            </button>
            <button onClick={handleRefresh} style={styles.iconBtn} title="Refresh">
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <>
            <div style={styles.statsGrid}>
              <div 
                style={{...styles.statCard, cursor: 'pointer'}} 
                onClick={() => handleViewChange("employees")}
              >
                <div style={{...styles.statIcon, background: "#e0f2fe"}}>
                  <FiUsers size={24} color={colors.primary} />
                </div>
                <div>
                  <div style={styles.statLabel}>Total Employees</div>
                  <div style={styles.statValue}>{stats.totalEmployees}</div>
                </div>
              </div>
              
              <div 
                style={{...styles.statCard, cursor: 'pointer'}} 
                onClick={() => {
                  handleViewChange("attendance");
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                }}
              >
                <div style={{...styles.statIcon, background: "#d1fae5"}}>
                  <FiCheckCircle size={24} color={colors.success} />
                </div>
                <div>
                  <div style={styles.statLabel}>Present Today</div>
                  <div style={styles.statValue}>{stats.todayPresent}</div>
                </div>
              </div>
              
              <div 
                style={{...styles.statCard, cursor: 'pointer'}} 
                onClick={() => {
                  handleViewChange("attendance");
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                }}
              >
                <div style={{...styles.statIcon, background: "#fed7aa"}}>
                  <FiAlertCircle size={24} color={colors.warning} />
                </div>
                <div>
                  <div style={styles.statLabel}>Partial Today</div>
                  <div style={styles.statValue}>{stats.todayPartial}</div>
                </div>
              </div>
              
              <div 
                style={{...styles.statCard, cursor: 'pointer'}} 
                onClick={() => {
                  handleViewChange("attendance");
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                }}
              >
                <div style={{...styles.statIcon, background: "#fee2e2"}}>
                  <FiXCircle size={24} color={colors.danger} />
                </div>
                <div>
                  <div style={styles.statLabel}>Absent Today</div>
                  <div style={styles.statValue}>{stats.todayAbsent}</div>
                </div>
              </div>
            </div>

            {/* Absent Today Section */}
            <div style={styles.absentSection}>
              <h3 style={styles.sectionTitle}>
                Absent Today ({getAbsentToday().length})
              </h3>
              <div style={styles.absentList}>
                {getAbsentToday().length > 0 ? (
                  getAbsentToday().map(emp => (
                    <div 
                      key={emp.id} 
                      style={{...styles.absentItem, cursor: 'pointer'}} 
                      onClick={() => {
                        handleViewChange("attendance");
                        setSearch(emp.username);
                        const today = new Date().toISOString().split('T')[0];
                        setSelectedDate(today);
                      }}
                    >
                      <div style={styles.avatar}>
                        {emp.username?.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.absentInfo}>
                        <span style={styles.absentName}>{emp.username}</span>
                        <span style={styles.absentEmail}>{emp.email}</span>
                      </div>
                      <span style={styles.absentBadge}>Absent</span>
                    </div>
                  ))
                ) : (
                  <p style={styles.noDataText}>All employees are present today! 🎉</p>
                )}
              </div>
            </div>

            {/* Delete Everything Button */}
            {attendance.length > 0 && (
              <div style={styles.dataManagementCard}>
                <div style={styles.dataManagementHeader}>
                  <FiTrash size={24} color={colors.danger} />
                  <h4 style={{...styles.dataManagementTitle, color: colors.danger}}>Delete All Records</h4>
                </div>
                <p style={styles.dataManagementDescription}>
                  Permanently delete ALL attendance records from the database.
                </p>
                
                <button onClick={openDeleteEverythingModal} style={styles.deleteAllBtn}>
                  <FiTrash size={20} />
                  DELETE EVERYTHING ({attendance.length} records)
                </button>
              </div>
            )}
          </>
        )}

        {/* Attendance View */}
        {activeView === "attendance" && (
          <>
            <div style={styles.controls}>
              <div style={styles.leftControls}>
                <div style={styles.monthNav}>
                  <button onClick={() => handleMonthChange(-1)} style={styles.navBtn}>
                    <FiChevronLeft />
                  </button>
                  <span style={styles.monthDisplay}>
                    {selectedMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                  </span>
                  <button onClick={() => handleMonthChange(1)} style={styles.navBtn}>
                    <FiChevronRight />
                  </button>
                </div>
              </div>

              <div style={styles.rightControls}>
                <div style={styles.searchBox}>
                  <FiSearch style={styles.searchIcon} />
                  <input
                    style={styles.searchInput}
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                
                <button 
                  style={{...styles.iconBtn, ...(showFilters && styles.activeFilter)}}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FiFilter size={16} />
                </button>
                
                {(search || selectedDate || dateRange.start || dateRange.end) && (
                  <button style={styles.clearBtn} onClick={clearFilters}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div style={styles.filtersPanel}>
                <div style={styles.filterRow}>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Single Date</label>
                    <select 
                      value={selectedDate} 
                      onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                      style={styles.filterSelect}
                    >
                      <option value="">All Dates</option>
                      {uniqueDates.map(date => (
                        <option key={date} value={date}>{formatDate(date)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={styles.filterRow}>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Date Range From</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      style={styles.filterInput}
                      min={minDate}
                      max={maxDate}
                    />
                  </div>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Date Range To</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      style={styles.filterInput}
                      min={dateRange.start || minDate}
                      max={maxDate}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Clock In</th>
                    <th style={styles.th}>Clock Out</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const status = getStatusBadge(item.status);
                      const Icon = status.icon;
                      
                      return (
                        <tr key={`${item.employee_id}-${item.date}-${index}`} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.employeeCell}>
                              <div style={styles.avatar}>
                                {item.username?.charAt(0).toUpperCase()}
                              </div>
                              <span>{item.username}</span>
                            </div>
                          </td>
                          <td style={styles.td}>{item.employee_email || '-'}</td>
                          <td style={styles.td}>{formatDate(item.date)}</td>
                          <td style={styles.td}>
                            <span style={item.clock_in ? styles.timeBadge : styles.missingBadge}>
                              {formatTime(item.clock_in) || "—"}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={item.clock_out ? styles.timeBadge : styles.missingBadge}>
                              {formatTime(item.clock_out) || "—"}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.locationCell}>
                              <FiMapPin size={14} color={colors.gray} />
                              <span>{formatLocation(item.location_name)}</span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={{...styles.badge, background: status.bg, color: status.color}}>
                              <Icon size={12} style={{ marginRight: "4px" }} />
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={styles.noDataCell}>
                        <FiAlertCircle size={32} color={colors.gray} />
                        <p style={styles.noDataText}>No attendance records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredData.length > 0 && (
              <div style={styles.pagination}>
                <span style={styles.paginationInfo}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
                </span>
                <div style={styles.paginationControls}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    style={{...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1}}
                  >
                    <FiChevronLeft />
                  </button>
                  <span style={styles.pageNumbers}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    style={{...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1}}
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Employees View */}
        {activeView === "employees" && (
          <>
            <div style={styles.controls}>
              <div style={styles.leftControls}>
                <h3 style={styles.sectionTitle}>Employee List ({filteredData.length})</h3>
              </div>

              <div style={styles.rightControls}>
                <div style={styles.searchBox}>
                  <FiSearch style={styles.searchIcon} />
                  <input
                    style={styles.searchInput}
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                
                {search && (
                  <button style={styles.clearBtn} onClick={clearFilters}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Registered Date</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item) => {
                      return (
                        <tr key={item.id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.employeeCell}>
                              <div style={styles.avatar}>
                                {item.username?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span style={{ fontWeight: 500, color: colors.dark, display: 'block' }}>
                                  {item.username}
                                </span>
                                <span style={{ fontSize: "11px", color: colors.gray }}>
                                  ID: {item.id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>{item.email || '-'}</td>
                          <td style={styles.td}>{formatDate(item.created_at)}</td>
                          <td style={styles.td}>
                            <div style={styles.actionButtons}>
                              <button 
                                style={styles.deleteBtn}
                                onClick={() => setDeleteModal({ show: true, employee: item })}
                                title="Delete Employee"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={styles.noDataCell}>
                        <FiAlertCircle size={32} color={colors.gray} />
                        <p style={styles.noDataText}>No employees found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredData.length > 0 && (
              <div style={styles.pagination}>
                <span style={styles.paginationInfo}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length}
                </span>
                <div style={styles.paginationControls}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    style={{...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1}}
                  >
                    <FiChevronLeft />
                  </button>
                  <span style={styles.pageNumbers}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    style={{...styles.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1}}
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Styles
const styles = {
  appContainer: {
    display: "flex",
    minHeight: "100vh",
    height: "100vh",
    background: colors.offWhite,
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden"
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    gap: "16px",
    background: colors.offWhite
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: `3px solid ${colors.light}`,
    borderTopColor: colors.primary,
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    background: colors.gradient,
    color: colors.white,
    transition: "width 0.3s ease",
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
    boxShadow: `2px 0 10px ${colors.primary}20`,
    overflowY: "auto",
    overflowX: "hidden"
  },
  sidebarHeader: {
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderBottom: `1px solid rgba(255,255,255,0.1)`,
    position: "relative"
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginRight:"50px"
  },
  logoImage: {
    objectFit: "contain",
    transition: "all 0.3s ease"
  },
  menuToggle: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: colors.white,
    cursor: "pointer",
    padding: "8px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: "20px",
    top: "50%",
    transform: "translateY(-50%)"
  },
  sidebarNav: {
    flex: 1,
    padding: "20px 0"
  },
  navItem: {
    width: "100%",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "transparent",
    border: "none",
    color: colors.white,
    fontSize: "14px",
    cursor: "pointer",
    opacity: 0.8,
    transition: "all 0.2s"
  },
  activeNavItem: {
    background: "rgba(255,255,255,0.1)",
    opacity: 1,
    borderLeft: `3px solid ${colors.white}`
  },
  sidebarFooter: {
    padding: "20px 0",
    borderTop: `1px solid rgba(255,255,255,0.1)`
  },
  mainContent: {
    flex: 1,
    padding: "30px",
    transition: "margin-left 0.3s ease",
    background: colors.offWhite,
    height: "100vh",
    overflowY: "auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px"
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: colors.dark,
    margin: "0 0 5px 0"
  },
  subtitle: {
    fontSize: "14px",
    color: colors.gray,
    margin: 0
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center"
  },
  iconBtn: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.white,
    border: `1px solid ${colors.light}`,
    borderRadius: "6px",
    cursor: "pointer",
    color: colors.gray,
    transition: "all 0.2s",
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "30px"
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px",
    background: colors.white,
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    transition: "transform 0.2s, box-shadow 0.2s",
    ':hover': {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
    }
  },
  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  statLabel: {
    fontSize: "13px",
    color: colors.gray,
    marginBottom: "4px"
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "600",
    color: colors.dark
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: colors.dark,
    margin: 0
  },
  dataManagementCard: {
    background: colors.white,
    borderRadius: "8px",
    padding: "20px",
    marginTop: "20px"
  },
  dataManagementHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px"
  },
  dataManagementTitle: {
    fontSize: "16px",
    fontWeight: "600",
    margin: 0
  },
  dataManagementDescription: {
    fontSize: "13px",
    color: colors.gray,
    marginBottom: "15px"
  },
  deleteAllBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    background: colors.danger,
    color: colors.white,
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%"
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "15px"
  },
  leftControls: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  rightControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  monthNav: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: colors.white,
    padding: "4px",
    borderRadius: "6px",
    border: `1px solid ${colors.light}`
  },
  navBtn: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: colors.primary
  },
  monthDisplay: {
    fontSize: "14px",
    fontWeight: "500",
    color: colors.dark,
    padding: "0 10px"
  },
  searchBox: {
    position: "relative",
    width: "250px"
  },
  searchIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: colors.gray
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px 8px 32px",
    border: `1px solid ${colors.light}`,
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    background: colors.white,
    color: colors.dark,
    '::placeholder': {
      color: colors.lightGray
    }
  },
  activeFilter: {
    background: colors.primary,
    color: colors.white,
    borderColor: colors.primary
  },
  clearBtn: {
    padding: "6px 10px",
    background: colors.white,
    border: `1px solid ${colors.light}`,
    borderRadius: "4px",
    fontSize: "12px",
    color: colors.danger,
    cursor: "pointer"
  },
  filtersPanel: {
    background: colors.white,
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },
  filterRow: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    alignItems: "flex-end"
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    minWidth: "180px"
  },
  filterLabel: {
    fontSize: "12px",
    fontWeight: "500",
    color: colors.gray
  },
  filterSelect: {
    padding: "6px 10px",
    borderRadius: "4px",
    border: `1px solid ${colors.light}`,
    fontSize: "13px",
    outline: "none",
    background: colors.white
  },
  filterInput: {
    padding: "6px 10px",
    borderRadius: "4px",
    border: `1px solid ${colors.light}`,
    fontSize: "13px",
    outline: "none",
    background: colors.white
  },
  tableContainer: {
    background: colors.white,
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    padding: "12px 15px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "600",
    color: colors.primary,
    background: colors.offWhite,
    borderBottom: `1px solid ${colors.light}`
  },
  td: {
    padding: "12px 15px",
    fontSize: "13px",
    color: colors.dark,
    borderBottom: `1px solid ${colors.light}`
  },
  tr: {
    transition: "background 0.2s"
  },
  employeeCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    background: colors.gradient,
    color: colors.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600"
  },
  badge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center"
  },
  timeBadge: {
    padding: "4px 6px",
    background: colors.offWhite,
    borderRadius: "4px",
    fontSize: "11px",
    color: colors.dark
  },
  missingBadge: {
    padding: "4px 6px",
    background: "#fee2e2",
    color: colors.danger,
    borderRadius: "4px",
    fontSize: "11px"
  },
  locationCell: {
    display: "flex",
    alignItems: "center",
    gap: "5px"
  },
  deleteBtn: {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: `1px solid #fee2e2`,
    borderRadius: "4px",
    cursor: "pointer",
    color: colors.danger
  },
  actionButtons: {
    display: "flex",
    gap: "5px"
  },
  noDataCell: {
    padding: "40px",
    textAlign: "center",
    color: colors.gray
  },
  noDataText: {
    marginTop: "10px",
    fontSize: "14px",
    color: colors.dark
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    paddingBottom: "20px"
  },
  paginationInfo: {
    fontSize: "13px",
    color: colors.gray
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  pageBtn: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.white,
    border: `1px solid ${colors.light}`,
    borderRadius: "4px",
    cursor: "pointer",
    color: colors.primary
  },
  pageNumbers: {
    fontSize: "13px",
    color: colors.dark
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modal: {
    background: colors.white,
    borderRadius: "8px",
    padding: "24px",
    width: "90%",
    maxWidth: "400px",
    textAlign: "center"
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: colors.dark,
    margin: "10px 0 5px"
  },
  modalText: {
    fontSize: "14px",
    color: colors.gray,
    marginBottom: "20px",
    lineHeight: "1.5"
  },
  modalActions: {
    display: "flex",
    gap: "10px"
  },
  modalCancelBtn: {
    flex: 1,
    padding: "10px",
    background: colors.white,
    border: `1px solid ${colors.light}`,
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    color: colors.dark
  },
  modalConfirmBtn: {
    flex: 1,
    padding: "10px",
    background: colors.danger,
    color: colors.white,
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px"
  },
  deleteSummary: {
    background: colors.offWhite,
    borderRadius: "6px",
    padding: "15px",
    marginBottom: "15px",
    textAlign: "left"
  },
  summaryTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: colors.dark,
    marginBottom: "10px"
  },
  deleteSummaryStats: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  summaryItem: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px"
  },
  summaryLabel: {
    color: colors.gray
  },
  summaryValue: {
    fontWeight: "500",
    color: colors.dark
  },
  absentSection: {
    background: colors.white,
    borderRadius: "8px",
    padding: "20px",
    marginTop: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  },
  absentList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "15px",
    maxHeight: "300px",
    overflowY: "auto"
  },
  absentItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px",
    background: colors.offWhite,
    borderRadius: "6px",
    transition: "background 0.2s",
    ':hover': {
      background: "#e5e7eb"
    }
  },
  absentInfo: {
    flex: 1
  },
  absentName: {
    fontSize: "14px",
    fontWeight: "500",
    color: colors.dark,
    display: "block"
  },
  absentEmail: {
    fontSize: "12px",
    color: colors.gray
  },
  absentBadge: {
    padding: "4px 8px",
    background: "#fee2e2",
    color: colors.danger,
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "500"
  }
};

const apiWarningStyle = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  background: colors.danger,
  color: 'white',
  padding: '10px 20px',
  borderRadius: '8px',
  zIndex: 1000,
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
};

// Global styles
const styleElement = document.createElement("style");
styleElement.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; background: ${colors.offWhite}; }
  @keyframes spin { to { transform: rotate(360deg); } }
  tr:hover { background: ${colors.offWhite}; }
  button:hover:not(:disabled) { opacity: 0.9; }
  input::placeholder {
    color: ${colors.lightGray} !important;
    opacity: 1;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  .absent-item:hover {
    background: #e5e7eb !important;
  }
`;
document.head.appendChild(styleElement);

export default AdminDashboard;