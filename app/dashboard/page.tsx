import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const quickActions = [
  { icon: "☀️", label: "Dévotion du jour", href: "/devotion", color: "var(--gold)" },
  { icon: "📖", label: "Plan de lecture", href: "/bible", color: "#3b82f6" },
  { icon: "🎓", label: "Mes cours", href: "/courses", color: "var(--violet)" },
  { icon: "🙏", label: "Prière", href: "/prayer", color: "#ec4899" },
  { icon: "🤝", label: "Communauté", href: "/community", color: "#22c55e" },
  { icon: "🔴", label: "Live", href: "/live", color: "#ef4444" },
  { icon: "📅", label: "Événements", href: "/events", color: "#f59e0b" },
  { icon: "💝", label: "Donner", href: "/donate", color: "#8b5cf6" },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, spiritual_level, is_premium, badges")
    .eq("id", user.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] || "Ami(e)";
  const level = profile?.spiritual_level || "Nouveau croyant";

  // Get greeting based on hour
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  // Fetch today's devotion verse dynamically
  const today = new Date().toISOString().split("T")[0];
  const { data: todayDevotion } = await supabase
    .from("daily_devotions")
    .select("verse_text, verse_reference, id")
    .eq("devotion_date", today)
    .eq("is_published", true)
    .single();

  // Fallback verse if no devotion in DB yet
  const dailyVerse = todayDevotion || {
    verse_text: "Je puis tout par Christ qui me fortifie.",
    verse_reference: "Philippiens 4:13",
    id: null,
  };

  // Check if user already completed today's devotion
  let devotionCompleted = false;
  if (todayDevotion?.id) {
    const { data: progress } = await supabase
      .from("user_devotion_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("devotion_id", todayDevotion.id)
      .single();
    devotionCompleted = !!progress;
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)" }}
    >
      {/* Header */}
      <div
        className="px-4 pt-10 pb-8"
        style={{
          background:
            "linear-gradient(160deg, var(--violet-dark) 0%, var(--violet) 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="font-cinzel font-bold text-white text-lg tracking-widest"
            >
              CCB
            </Link>
            <Link href="/profile">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: "rgba(212,175,55,0.25)",
                  border: "2px solid rgba(212,175,55,0.4)",
                }}
              >
                {firstName[0]?.toUpperCase()}
              </div>
            </Link>
          </div>

          {/* Greeting */}
          <div>
            <p className="text-white/60 text-sm mb-1">{greeting},</p>
            <h1
              className="font-cinzel font-bold text-white text-2xl mb-1"
              style={{ letterSpacing: "0.02em" }}
            >
              {firstName} 🙌
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: "rgba(212,175,55,0.2)",
                  color: "var(--gold)",
                  border: "1px solid rgba(212,175,55,0.3)",
                }}
              >
                {level}
              </span>
              {profile?.is_premium && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-bold"
                  style={{
                    background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                    color: "var(--violet-dark)",
                  }}
                >
                  ✦ Premium
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily verse card */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <Link href="/devotion">
          <div
            className="rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
              boxShadow: "var(--shadow-gold)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 mb-2">
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "rgba(61,26,114,0.7)" }}
                  >
                    ✦ Verset du jour
                  </p>
                  {devotionCompleted && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(61,26,114,0.15)", color: "rgba(61,26,114,0.75)" }}>
                      ✅ Lu
                    </span>
                  )}
                </div>
                <p
                  className="font-cinzel font-semibold leading-relaxed"
                  style={{ color: "var(--violet-dark)", fontSize: "0.92rem" }}
                >
                  &ldquo;{dailyVerse.verse_text}&rdquo;
                </p>
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: "rgba(61,26,114,0.6)" }}
                >
                  {dailyVerse.verse_reference}
                </p>
              </div>
              <span className="text-2xl shrink-0">☀️</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <h2
          className="font-semibold text-sm uppercase tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Accès rapide
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="text-2xl">{action.icon}</span>
              <span
                className="text-center leading-tight"
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming Event */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        <h2
          className="font-semibold text-sm uppercase tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Prochain événement
        </h2>
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "var(--violet-pale)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #b45309, #d4af37)" }}
          >
            <span
              className="font-cinzel font-bold text-white text-lg leading-none"
            >
              26
            </span>
            <span className="text-white/80 text-xs font-bold">JUIN</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className="font-bold text-sm truncate"
              style={{ color: "var(--violet-dark)" }}
            >
              Bootcamp Annuel CCB 2026
            </h4>
            <p className="text-xs mt-0.5 font-semibold" style={{ color: "#b45309" }}>
              SEMBLABLE À CHRIST · Romains 8:29
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              📍 Douala, Cameroun · En ligne & Présentiel
            </p>
          </div>
          <a
            href="https://bootcamp.centrechretienberakah.com"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-bold px-3 py-2 rounded-full"
            style={{ background: "linear-gradient(135deg, #b45309, #d4af37)", color: "white", textDecoration: "none" }}
          >
            S&apos;inscrire
          </a>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-20" />
    </div>
  );
}
