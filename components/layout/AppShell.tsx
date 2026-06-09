"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import PushNotificationsBanner from "@/components/PushNotificationsBanner";
import SessionBeacon from "@/components/system/SessionBeacon";
import TzBeacon from "@/components/system/TzBeacon";
import OfflineBanner from "@/components/system/OfflineBanner";
import PreloadOnWifi from "@/components/system/PreloadOnWifi";
import DataUsageBeacon from "@/components/system/DataUsageBeacon";
import { useHeartbeat } from "@/lib/presence";

function shouldShowShell(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname.startsWith("/auth")) return false;
  // Meeting room actif (LiveKit) : doit prendre tout l'écran sans TopBar/BottomNav.
  // Match exactement /community/groups/<id>/meeting (pas /meeting/scheduled ni /meeting/history)
  if (/^\/community\/groups\/[^/]+\/meeting$/.test(pathname)) return false;
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

      {/* Bottom nav (mobile seulement via CSS) — « Plus » ouvre le menu latéral */}
      <BottomNav onMore={() => setSidebarOpen(true)} />

      {/* Bannière push notifications (auto-cachée si abonné/refusé/dismissed) */}
      <PushNotificationsBanner />

      {/* Enregistre la session (IP/appareil) du membre — vue Admin profil */}
      <SessionBeacon />

      {/* Synchronise le fuseau horaire (auto-détection + override manuel) */}
      <TzBeacon />

      {/* Indicateur hors-ligne (offline-first) */}
      <OfflineBanner />

      {/* Préchargement du contenu spirituel sur Wi-Fi (jamais sur données mobiles) */}
      <PreloadOnWifi />

      {/* Remonte l'usage data (agrégat) pour le tableau de bord admin */}
      <DataUsageBeacon />
    </div>
  );
}
