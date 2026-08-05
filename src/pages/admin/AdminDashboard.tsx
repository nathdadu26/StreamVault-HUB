/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Icons } from "@/src/components/Icons";
import { Overview } from "./Overview";
import { FilesManager } from "./FilesManager";
import { VisitorsStats } from "./VisitorsStats";
import { Settings } from "./Settings";
import { AdminSidebar } from "@/src/components/admin/AdminSidebar";
import { AdminHeader } from "@/src/components/admin/AdminHeader";

export function AdminDashboard() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : true;
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    if (!isMobile) {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
    }
  };

  const getPageTitle = () => {
    if (location.pathname === "/admin_dashboard") return "Dashboard Overview";
    if (location.pathname === "/admin_dashboard/files") return "Media Library";
    if (location.pathname === "/admin_dashboard/visitors") return "Traffic Analytics";
    if (location.pathname === "/admin_dashboard/settings") return "System Settings";
    return "Admin Panel";
  };

  return (
    <div className="flex min-h-screen bg-background font-sans selection:bg-success/30">
      <AdminSidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isMobile={isMobile}
        toggleSidebar={toggleSidebar}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader 
          title={getPageTitle()} 
          onMenuClick={() => setSidebarOpen(true)}
          isMobile={isMobile}
        />
        
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/files" element={<FilesManager />} />
              <Route path="/visitors" element={<VisitorsStats />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
