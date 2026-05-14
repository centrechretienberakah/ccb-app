import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Cours — CCB" };

export default async function CoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: course } = await supabase.from("courses").select("*").eq("id", id).single();
  if (!course) notFound();

  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("id, title, description, video_url, duration_secs, order_index, is_free")
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  let isPremium = false;
  if (user) {
    const { data: p } = await supabase.from("user_profiles").select("is_premium").eq("user_id", user.id).single();
    isPremium = p?.is_premium ?? false;
  }

  const canAccess = !course.is_premium || isPremium;

  function fmtDur(s?: number) { if (!s) return null; const m = Math.floor(s / 60); const h = Math.floor(m / 60); return h > 0 ? `${h}h${(m % 60).toString().padStart(2, "0")}` : `${m} min`; }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 80px" }}>
      <Link href="/classes" style={{ color: "var(--text-muted)", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
        ← Retour aux classes
      </Link>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, rgba(90,44,160,0.2), rgba(90,44,160,0.4))", borderRadius: "var(--radius-xl)", padding: "28px 24px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
        {course.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.2 }} />
        )}
        <div style={{ position: "relative" }}>
          {course.category && <span style={{ background: "rgba(255,255,255,0.1)", color: "#c4b5fd", borderRadius: "var(--radius-full)", padding: "3px 12px", fontSize: 12, fontWeight: 700, display: "inline-block", marginBottom: 10 }}>📂 {course.category}</span>}
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 10px" }}>🎓 {course.title}</h1>
          {course.description && <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>{course.description}</p>}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
            {course.lesson_count && <span>📚 {course.lesson_count} leçons</span>}
            {course.duration_hours && <span>⏱️ {course.duration_hours}h de contenu</span>}
            {course.instructor_name && <span>👨‍🏫 {course.instructor_name}</span>}
            {course.level && <span>📊 {course.level}</span>}
          </div>
        </div>
      </div>

      {/* Locked */}
      {!canAccess && (
        <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-xl)", padding: "28px", textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👑</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Cours Premium</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>Ce cours est réservé aux membres Premium. Débloquez-le avec le Passe Berakah.</p>
          <Link href="/premium" style={{ display: "inline-block", background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "12px 28px", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
            Passer Premium →
          </Link>
        </div>
      )}

      {/* Lessons */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>
        📚 Leçons ({lessons?.length ?? 0})
      </h2>
      {!lessons?.length ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Les leçons de ce cours arrivent bientôt.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lessons.map((l, i) => {
            const accessible = l.is_free || canAccess;
            return (
              <div key={l.id} style={{ display: "flex", gap: 14, alignItems: "center", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "14px 18px", opacity: accessible ? 1 : 0.7 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: accessible ? "rgba(90,44,160,0.15)" : "rgba(150,150,150,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: accessible ? "#c4b5fd" : "var(--text-muted)", flexShrink: 0 }}>
                  {accessible ? (i + 1) : "🔒"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{l.title}</div>
                  {l.description && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {fmtDur(l.duration_secs) && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDur(l.duration_secs)}</span>}
                  {l.is_free && <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700 }}>GRATUIT</span>}
                  {accessible && l.video_url && (
                    <a href={l.video_url} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(90,44,160,0.6)", color: "#fff", borderRadius: "var(--radius-full)", padding: "5px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                      ▶ Voir
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
