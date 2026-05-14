"use client";
import { useState } from "react";

interface Course { id: string; title: string; description?: string; level?: string; category?: string; thumbnail_url?: string; lesson_count?: number; duration_hours?: number; is_premium: boolean; instructor_name?: string; created_at: string; }

const LEVEL_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: "Débutant", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  intermediate: { label: "Intermédiaire", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  advanced: { label: "Avancé", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
};

const CATEGORIES = ["Tout", "Théologie", "Bible", "Prière", "Leadership", "Famille", "Évangélisation"];

export default function ClassesClient({ courses, isPremium }: { courses: Course[]; isPremium: boolean; userId?: string | null }) {
  const [catFilter, setCatFilter] = useState("Tout");
  const [levelFilter, setLevelFilter] = useState("Tout");
  const [search, setSearch] = useState("");

  const filtered = courses.filter(c => {
    const matchCat = catFilter === "Tout" || c.category === catFilter;
    const matchLevel = levelFilter === "Tout" || c.level === levelFilter;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchLevel && matchSearch;
  });

  const free = filtered.filter(c => !c.is_premium);
  const premium = filtered.filter(c => c.is_premium);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>🎓 Classes Bibliques</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Formation & enseignement pour grandir dans la foi</p>
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un cours..."
        style={{ width: "100%", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "12px 16px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{ flexShrink: 0, background: catFilter === c ? "var(--violet, #5a2ca0)" : "var(--card-bg)", color: catFilter === c ? "#fff" : "var(--text-muted)", border: `1px solid ${catFilter === c ? "var(--violet, #5a2ca0)" : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Tout", "beginner", "intermediate", "advanced"].map(l => {
            const info = LEVEL_COLORS[l];
            return (
              <button key={l} onClick={() => setLevelFilter(l)}
                style={{ flexShrink: 0, background: levelFilter === l ? (info?.color ?? "var(--gold)") : "var(--card-bg)", color: levelFilter === l ? "#000" : "var(--text-muted)", border: `1px solid ${levelFilter === l ? (info?.color ?? "var(--gold)") : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {info ? info.label : "Tous niveaux"}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>
            {search ? `Aucun cours pour "${search}"` : "Les cours seront disponibles très prochainement. Revenez bientôt !"}
          </p>
        </div>
      ) : (
        <>
          {/* Free courses */}
          {free.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>🎁 Cours gratuits ({free.length})</div>
              <CourseGrid courses={free} isPremium={isPremium} />
            </div>
          )}
          {/* Premium courses */}
          {premium.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>👑 Cours Premium ({premium.length})</div>
              <CourseGrid courses={premium} isPremium={isPremium} />
            </div>
          )}
        </>
      )}

      {!isPremium && (
        <div style={{ marginTop: 32, padding: "20px 24px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 14px" }}>👑 Accédez à tous les cours Premium avec le Passe Berakah</p>
          <a href="/premium" style={{ display: "inline-block", background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Découvrir Premium →
          </a>
        </div>
      )}
    </div>
  );
}

function CourseGrid({ courses, isPremium }: { courses: Course[]; isPremium: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
      {courses.map(c => {
        const levelInfo = LEVEL_COLORS[c.level ?? ""] ?? null;
        const locked = c.is_premium && !isPremium;
        return (
          <div key={c.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ height: 140, background: "linear-gradient(135deg, rgba(90,44,160,0.2), rgba(90,44,160,0.35))", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
              {c.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
              ) : <span style={{ fontSize: 44 }}>{locked ? "🔒" : "🎓"}</span>}
              {c.is_premium && <span style={{ position: "absolute", top: 8, left: 8, background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>👑 Premium</span>}
              {levelInfo && <span style={{ position: "absolute", top: 8, right: 8, background: levelInfo.bg, border: `1px solid ${levelInfo.color}50`, color: levelInfo.color, borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{levelInfo.label}</span>}
            </div>
            <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {c.category && <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>📂 {c.category}</span>}
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{c.title}</h3>
              {c.description && <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{c.description.substring(0, 100)}{c.description.length > 100 ? "..." : ""}</p>}
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 10, marginTop: "auto" }}>
                {c.lesson_count && <span>📚 {c.lesson_count} leçons</span>}
                {c.duration_hours && <span>⏱️ {c.duration_hours}h</span>}
                {c.instructor_name && <span>👨‍🏫 {c.instructor_name}</span>}
              </div>
              {locked ? (
                <a href="/premium" style={{ display: "block", background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)", color: "var(--gold)", borderRadius: "var(--radius-full)", padding: "8px", fontSize: 12, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>
                  👑 Débloquer avec Premium
                </a>
              ) : (
                <a href={`/classes/${c.id}`} style={{ display: "block", background: "rgba(90,44,160,0.7)", color: "#fff", borderRadius: "var(--radius-full)", padding: "8px", fontSize: 12, fontWeight: 700, textAlign: "center", textDecoration: "none" }}>
                  Commencer le cours →
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
