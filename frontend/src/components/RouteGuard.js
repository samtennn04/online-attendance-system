import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useRouteGuard() {
  const location = useLocation();
  
  useEffect(() => {
    // Don't run redirects on admin pages
    if (location.pathname.startsWith('/admin')) {
      return;
    }
    
    // Your existing redirect logic here
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const remember = localStorage.getItem("rememberMe") === "true";
    
    if (remember && token && user && location.pathname === "/login") {
      navigate("/employee");
    }
  }, [location]);
}