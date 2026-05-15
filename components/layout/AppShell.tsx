"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import PushNotificationsBanner from "@/components/PushNotificationsBanner";
import { useHeartbeat } from "@/lib/presence";

function shouldShowShell(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname.startsWith("/auth")) return false;
  return true;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = shouldShowShell(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useHeartbeat();

  // Ferme la sidebar sur mobile quand on change de page
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Ferme la sidebar si on redimensionne vers desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 640) setSidebarOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (!showShell) return <>{children}</>;

  return (
    <div className="app-shell">
      {/* Overlay mobile (< 640px uniquement) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper ${sidebarOpen ? "mobile-open" : ""}`}>
        <Sidebar onLinkClick={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="app-main">
        <TopBar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="app-content">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile seulement via CSS) */}
      <BottomNav />

      {/* Bannière push notifications (auto-cachée si abonné/refusé/dismissed) */}
      <PushNotificationsBanner />
    </div>
  );
}
