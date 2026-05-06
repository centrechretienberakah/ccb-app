"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";

// Routes where the AppShell (sidebar + nav) should NOT render
const NO_SHELL_PREFIXES = ["/auth", "/"];

function shouldShowShell(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname.startsWith("/auth")) return false;
  return true;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = shouldShowShell(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop + mobile-drawer sidebar */}
      <div className={`sidebar-wrapper ${sidebarOpen ? "mobile-open" : ""}`}>
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="app-main">
        <TopBar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="app-content">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
