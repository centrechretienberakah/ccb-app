"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lire le thème sauvegardé
    const saved = localStorage.getItem("ccb-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ccb-theme", theme);
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
      style={{
        position: "fixed",
        bottom: 90,
        right: 16,
        zIndex: 300,
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: `1px solid ${dark ? "rgba(212,175,55,0.35)" : "rgba(90,44,160,0.2)"}`,
        background: dark
          ? "rgba(26, 22, 16, 0.92)"
          : "rgba(250, 246, 238, 0.92)",
        backdropFilter: "blur(12px)",
        boxShadow: dark
          ? "0 4px 16px rgba(0,0,0,0.4)"
          : "0 4px 16px rgba(90,44,160,0.12)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        transition: "all 0.2s ease",
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
