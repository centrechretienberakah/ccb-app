import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const quickActions = [
  {
    icon: "☀️",
    label: "Dévotion du jour",
    sub: "Commence ta journée",
    href: "/devotion",
    gradient: "linear-gradient(145deg, #b45309 0%, #d97706 45%, #fbbf24 100%)",
    glow: "rgba(251,191,36,0.3)",
  },
  {
    icon: "📖",
    label: "Plan de lecture",
    sub: "Bible LSG complète",
    href: "/bible",
    gradient: "linear-gradient(145deg, #1e3a8a 0%, #2563eb 45%, #38bdf8 100%)",
    glow: "rgba(56,189,248,0.3)",
  },
  {
    icon: "🙏",
    label: "Mur de prière",
    sub: "Intercession",
    href: "/prayer",
    gradient: "linear-gradient(145deg, #9d174d 0%, #db2777 45%, #f9a8d4 100%)",
    glow: "rgba(249,168,212,0.3)",
  },
  {
    icon: "🤝",
    label: "Communauté",
    sub: "Feed & partages",
    href: "/community",
    gradient: "linear-gradient(145deg, #064e3b 0%, #059669 45%, #34d399 100%)",
    glow: "rgba(52,211,153,0.3)",
  },
  {
    icon: "🎓",
    label: "Mes cours",
    sub: "Enseignements CCB",
    href: "/courses",
    gradient: "linear-gradient(145deg, #312e81 0%, #4f46e5 45%, #818cf8 100%)",
    glow: "rgba(129,140,248,0.3)",
  },
  {
    icon: "🔴",
    label: "Live",
    sub: "Culte en direct",
    href: "/live",
    gradient: "linear-gradient(145deg, #7f1d1d 0%, #dc2626 45%, #fca5a5 100%)",
    glow: "rgba(252,165,165,0.3)",
  },
  {
    icon: "📅",
    label: "Événements",
    sub: "Prochaines dates",
    href: "/events",
    gradient: "linear-gradient(145deg, #78350f 0%, #d97706 45%, #fcd34d 100%)",
    glow: "rgba(252,211,77,0.3)",
  },
  {
    icon: "💝",
    label: "Donner",
    sub: "Soutenir le ministère",
    href: "/donate",
    gradient: "linear-gradient(145deg, #4c1d95 0%, #7c3aed 45%, #c4b5fd 100%)",
    glow: "rgba(196,181,253,0.3)",
  },
];

const bottomNav = [
  { icon: "🏠", label: "Accueil", href: "/dashboard", active: true },
  { icon: "📖", label: "Bible", href: "/bible", active: false },
  { icon: "🙏", label: "Prière", href: "/prayer", active: false },
  { icon: "🤝", label: "Communauté", href: "/community", active: false },
  { icon: "👤", label: "Profil", href: "/profile", active: false },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, spiritual_level, is_premium")
    .eq("id", user.id)
    .single();

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_url")
    .eq("user_id", user.id)
    .single();

  const firstName =
    userProfile?.display_name?.split(" ")[0] ||
    profile?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Ami(e)";
  const level = profile?.spiritual_level || "Nouveau croyant";
  const avatarUrl = userProfile?.avatar_url || null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const today = new Date().toISOString().split("T")[0];
  const { data: todayDevotion } = await supabase
    .from("daily_devotions")
    .select("verse_text, verse_reference, id")
    .eq("devotion_date", today)
    .single();

  const dailyVerse = todayDevotion || {
    verse_text: "Je puis tout par Christ qui me fortifie.",
    verse_reference: "Philippiens 4:13",
    id: null,
  };

  let devotionCompleted = false;
  if (todayDevotion?.id) {
    try {
      const { data: progress } = await supabase
        .from("user_devotion_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("devotion_id", todayDevotion.id)
        .single();
      devotionCompleted = !!progress;
    } catch { /* table may not exist */ }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0e8d0", fontFamily: "var(--font-inter, sans-serif)", paddingBottom: 80 }}>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(160deg, #1a0533 0%, #2d0a5e 50%, #3d1a72 100%)",
        padding: "48px 20px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Orbes décoratifs */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontFamily: "var(--font-cinzel, serif)", fontWeight: 700, fontSize: 20, color: "#d4af37", letterSpacing: "0.15em" }}>CCB</span>
            </Link>
            <Link href="/profile" style={{ textDecoration: "none" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={firstName} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid #d4af37", display: "block" }} />
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #d4af37, #c9a227)", border: "2px solid rgba(212,175,55,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#1a0533" }}>
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </Link>
          </div>

          {/* Greeting */}
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 4px" }}>{greeting},</p>
          <h1 style={{ fontFamily: "var(--font-cinzel, serif)", fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 10px", letterSpacing: "0.02em" }}>
            {firstName} 🙌
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "rgba(212,175,55,0.18)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.35)", fontWeight: 600 }}>
              {level}
            </span>
            {profile?.is_premium && (
              <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "linear-gradient(135deg, #b45309, #d4af37)", color: "#1a0533", fontWeight: 700 }}>
                ✦ Premium
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Verset du jour ── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px" }}>
        <Link href="/devotion" style={{ textDecoration: "none", display: "block", marginTop: -20 }}>
          <div style={{
            borderRadius: 20,
            padding: "18px 20px",
            background: "linear-gradient(135deg, #b45309 0%, #d4af37 60%, #fbbf24 100%)",
            boxShadow: "0 8px 32px rgba(212,175,55,0.35)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(61,26,114,0.75)", textTransform: "uppercase", letterSpacing: "0.1em" }}>✦ Verset du jour</span>
                  {devotionCompleted && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(61,26,114,0.15)", color: "rgba(61,26,114,0.75)" }}>✅ Lu</span>
                  )}
                </div>
                <p style={{ fontFamily: "var(--font-cinzel, serif)", fontSize: 14, fontWeight: 600, color: "#1a0533", lineHeight: 1.6, margin: "0 0 6px" }}>
                  &ldquo;{dailyVerse.verse_text}&rdquo;
                </p>
                <p style={{ fontSize: 11, color: "rgba(61,26,114,0.65)", margin: 0, fontWeight: 600 }}>{dailyVerse.verse_reference}</p>
              </div>
              <span style={{ fontSize: 28, flexShrink: 0 }}>☀️</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Accès rapide — cartes 2 colonnes ── */}
      <div style={{ maxWidth: 680, margin: "28px auto 0", padding: "0 16px" }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 14px" }}>
          Accès rapide
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                borderRadius: 20,
                height: 148,
                background: action.gradient,
                position: "relative",
                overflow: "hidden",
                boxShadow: `0 4px 20px ${action.glow}`,
                transition: "transform 0.15s, box-shadow 0.15s",
                cursor: "pointer",
              }}>
                {/* Orbe décoratif */}
                <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

                {/* Icône */}
                <div style={{ position: "absolute", top: 16, left: 16, fontSize: 32, lineHeight: 1 }}>
                  {action.icon}
                </div>

                {/* Label overlay */}
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
                  padding: "28px 14px 14px",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 2 }}>{action.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{action.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Prochain événement ── */}
      <div style={{ maxWidth: 680, margin: "24px auto 0", padding: "0 16px" }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 14px" }}>
          Prochain événement
        </h2>
        <div style={{
          borderRadius: 20,
          overflow: "hidden",
          background: "linear-gradient(135deg, #1a0533 0%, #2d0a5e 100%)",
          border: "1px solid rgba(212,175,55,0.2)",
          padding: "18px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          {/* Date badge */}
          <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #b45309, #d4af37)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-cinzel, serif)", fontWeight: 700, color: "#fff", fontSize: 18, lineHeight: 1 }}>26</span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 700, marginTop: 1 }}>JUIN</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f0e8d0", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Bootcamp Annuel CCB 2026
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#d4af37", marginBottom: 4 }}>SEMBLABLE À CHRIST · Rom 8:29</div>
            <div style={{ fontSize: 11, color: "#666" }}>📍 Douala · En ligne & Présentiel</div>
          </div>

          <a
            href="https://bootcamp.centrechretienberakah.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexShrink: 0, background: "linear-gradient(135deg, #b45309, #d4af37)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "8px 14px", borderRadius: 20, textDecoration: "none", whiteSpace: "nowrap" }}
          >
            S&apos;inscrire
          </a>
        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid #1a1a1a",
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
      }}>
        {bottomNav.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 12px", flex: 1 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 10,
              fontWeight: item.active ? 700 : 500,
              color: item.active ? "#d4af37" : "#555",
              letterSpacing: "0.02em",
            }}>{item.label}</span>
            {item.active && (
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#d4af37", marginTop: 1 }} />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
