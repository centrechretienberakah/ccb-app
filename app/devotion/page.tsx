import { createClient } from "@/lib/supabase/server";
import DevotionClient from "./DevotionClient";
import { getDailyDevotion } from "./devotions-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Méditons ensemble — CCB" };

export default async function DevotionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];

  // Tentative Supabase, fallback static
  let devotion: any = null;
  try {
    const { data } = await supabase
      .from("devotions")
      .select("*")
      .eq("date", today)
      .single();
    devotion = data;
  } catch {}

  const content = devotion || getDailyDevotion();

  // Progression
  let completed = false;
  if (user && content.id) {
    try {
      const { data } = await supabase
        .from("devotion_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("devotion_id", content.id)
        .maybeSingle();
      completed = !!data;
    } catch {}
  }

  // Streak
  let streak = 0;
  if (user) {
    try {
      const { count } = await supabase
        .from("devotion_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      streak = count ?? 0;
    } catch {}
  }

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const paragraphs = (content.content as string).split("\n\n").filter(Boolean);

  return (
    <div className="devotion-page">

      {/* Hero */}
      <div className="devotion-hero">
        <div className="devotion-hero-orb-1" />
        <div className="devotion-hero-orb-2" />
        <div className="devotion-hero-inner">
          <div className="devotion-hero-meta">
            <span className="devotion-date-badge">☀️ {dateStr}</span>
            {streak > 0 && (
              <span className="devotion-streak-badge">🔥 {streak} jour{streak > 1 ? "s" : ""}</span>
            )}
          </div>
          <h1 className="devotion-hero-title">{content.title}</h1>
          <p className="devotion-hero-author">par {content.author ?? "Pasteur Elvis"}</p>
        </div>
      </div>

      <div className="devotion-content">

        {/* Verset principal */}
        <div className="devotion-verse-card">
          <div className="devotion-verse-icon">📖</div>
          <blockquote className="devotion-verse-text">
            &ldquo;{content.verse_text}&rdquo;
          </blockquote>
          <cite className="devotion-verse-ref">— {content.verse_ref}</cite>
        </div>

        {/* Meditation */}
        <div className="devotion-section">
          <div className="devotion-section-header">
            <span className="devotion-section-icon">✦</span>
            <h2 className="devotion-section-title">Meditation</h2>
          </div>
          <div className="devotion-section-body">
            {paragraphs.map((p: string, i: number) => (
              <p key={i} className="devotion-paragraph">{p}</p>
            ))}
          </div>
        </div>

        {/* Application */}
        {content.application && (
          <div className="devotion-section devotion-application">
            <div className="devotion-section-header">
              <span className="devotion-section-icon">💡</span>
              <h2 className="devotion-section-title">Application pratique</h2>
            </div>
            <div className="devotion-section-body">
              <p className="devotion-paragraph devotion-paragraph-highlight">
                {content.application}
              </p>
            </div>
          </div>
        )}

        {/* Priere */}
        <div className="devotion-prayer-card">
          <div className="devotion-prayer-header">
            <span>🙏</span>
            <h2 className="devotion-section-title" style={{ color: "inherit" }}>Priere du jour</h2>
          </div>
          <p className="devotion-prayer-text">{content.prayer}</p>
        </div>

        {/* Declaration */}
        {content.declaration && (
          <div className="devotion-declaration-card">
            <div className="devotion-declaration-label">✦ Declaration de foi</div>
            <p className="devotion-declaration-text">{content.declaration}</p>
          </div>
        )}

        {/* Actions */}
        <DevotionClient
          devotionId={content.id}
          userId={user?.id ?? null}
          alreadyCompleted={completed}
        />

      </div>
    </div>
  );
}
