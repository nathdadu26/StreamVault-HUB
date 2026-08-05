import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icons } from "@/src/components/Icons";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: SidebarItem[] = [
  { label: "Overview", path: "/admin_dashboard", icon: Icons.LayoutDashboard },
  { label: "All Files", path: "/admin_dashboard/files", icon: Icons.FolderOpen },
  { label: "Visitors", path: "/admin_dashboard/visitors", icon: Icons.Users },
  { label: "Settings", path: "/admin_dashboard/settings", icon: Icons.Settings },
];

export function AdminSidebar({ isOpen, setIsOpen, isMobile, toggleSidebar }: { 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}) {
  const location = useLocation();

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 72 },
  };

  const menuItems = (
    <div className="flex flex-col gap-2 p-3">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => isMobile && setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
              isActive 
                ? "bg-primary/10 text-primary shadow-sm shadow-primary/5" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground/70")} />
            {(isOpen || isMobile) && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn("whitespace-nowrap", isActive ? "font-semibold" : "font-medium")}
              >
                {item.label}
              </motion.span>
            )}
            {isActive && (
              <motion.div 
                layoutId="active-indicator"
                className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
              />
            )}
            {!isOpen && !isMobile && (
               <div className="absolute left-16 bg-popover text-popover-foreground px-2.5 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl border">
                 {item.label}
               </div>
            )}
          </Link>
        );
      })}
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-card border-r z-[101] flex flex-col"
            >
              <div className="p-6 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                   <span className="text-xl font-black tracking-tight">StreamVault</span>
                   <span className="bg-success px-2 py-0.5 rounded-full text-success-foreground text-[8px] font-bold uppercase">HUB</span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <Icons.X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {menuItems}
              </div>
              <div className="p-6 border-t">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">AD</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">Admin User</p>
                    <p className="text-[10px] text-muted-foreground">Super Admin</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={isOpen ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      className={cn(
        "sticky top-0 h-screen bg-card border-r flex flex-col transition-all duration-300 z-40 group/sidebar",
        !isOpen && "items-center"
      )}
    >
      <div className={cn("p-6 flex items-center w-full", isOpen ? "justify-between" : "justify-center")}>
        {isOpen ? (
          <Link to="/" className="flex items-center gap-2 animate-in fade-in duration-500">
             <span className="text-xl font-black tracking-tight">StreamVault</span>
             <span className="bg-success px-2 py-0.5 rounded-full text-success-foreground text-[8px] font-bold uppercase">HUB</span>
          </Link>
        ) : (
          <Link to="/" className="p-1.5 rounded-lg bg-success text-success-foreground shadow-lg shadow-success/20">
            <span className="text-xs font-black">S</span>
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar w-full">
        {menuItems}
      </div>

      <div className={cn("p-4 border-t w-full flex flex-col gap-4 transition-all", !isOpen && "items-center")}>
        <button 
          onClick={toggleSidebar}
          className="flex items-center gap-3 w-full p-2.5 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all group"
        >
          {isOpen ? (
            <>
              <Icons.PanelLeftClose className="h-5 w-5" />
              <span className="text-xs font-bold">Collapse Sidebar</span>
            </>
          ) : (
            <Icons.PanelLeftOpen className="h-5 w-5" />
          )}
        </button>
        
        {isOpen && (
          <div className="flex items-center gap-3 animate-in fade-in duration-500">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">AD</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-bold truncate">Admin User</p>
              <p className="text-[8px] text-muted-foreground truncate">Super Admin</p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
