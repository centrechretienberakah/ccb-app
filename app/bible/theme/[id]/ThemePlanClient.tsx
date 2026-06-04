"use client";

import Link from "next/link";
import { useState } from "react";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";
import { shareBibleVerse, notifyBibleStaff } from "@/lib/bible/share";
import type { ThemedPlan, ThemedDay } from "@/lib/bible/themed-plans";
import { createClient } from "@/lib/supabase/client";

interface ActivePlan {
  id: string;
  plan_id: string;
  completed_days: number[];
  started_at: string;
}

interface Props {
  plan: ThemedPlan;
  active: ActivePlan | null;
  userId: string;
  dbPlanId: string;
  allThemes: { id: string; title: string; emoji: string }[];
}

export default function ThemePlanClient({ plan, active: initialActive, userId, dbPlanId, allThemes }: Props) {
  const supabase = createClient();
  const [active, setActive] = useState<ActivePlan | null>(initialActive);
  const [toast, setToast] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<number>(active ? Math.min((active.completed_days.length || 0) + 1, plan.totalDays) : 1);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function startPlan() {
    const { data, error } = await supabase
      .from("user_bible_plans")
      .insert({
        user_id: userId, plan_id: dbPlanId,
        completed_days: [], is_active: true,
        started_at: new Date().toISOString(),
      })
      .select().single();
    if (error) { flash("Erreur démarrage."); return; }
    setActive(data as ActivePlan);
    flash(`✅ Plan « ${plan.title} » démarré !`);
  }

  async function markDayDone(day: number) {
    if (!active) return;
    if (active.completed_days.includes(day)) return;
    const newDays = [...active.completed_days, day].sort((a, b) => a - b);
    const prev = active;
    setActive({ ...active, completed_days: newDays });
    const { error } = await supabase
      .from("user_bible_plans")
      .update({ completed_days: newDays })
      .eq("id", active.id);
    if (error) { setActive(prev); flash("Erreur."); return; }
    flash(`✓ Jour ${day} validé !`);
  }

  async function saveVerseToFav(d: ThemedDay) {
    await supabase.from("user_saved_verses").upsert(
      {
        user_id: userId, book_name: d.book, chapter: d.chapter,
        verse_number: d.verse, verse_text: d.verseText, reference: d.reference,
      },
      { onConflict: "user_id,book_name,chapter,verse_number" },
    );
    flash(`⭐ ${d.reference} sauvegardé !`);
    notifyBibleStaff(
      `⭐ Quelqu'un sauvegarde un verset du plan « ${plan.title} »`,
      `« ${d.reference} »`,
      `/bible/theme/${plan.id}`,
    );
  }

  async function shareDay(d: ThemedDay) {
    const status = await shareBibleVerse({ reference: d.reference, text: d.verseText });
    if (status === "shared") flash("Partagé !");
    else if (status === "copied") flash("Copié !");
  }

  const progressPct = active ? Math.round((active.completed_days.length / plan.totalDays) * 100) : 0;

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: F.body, paddingBottom: 100,
    }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 8px 30px rgba(91, 33, 182,0.35)",
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 18px 20px" }}>

        {/* Back */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link href="/bible" style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.violet, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>← Bible</Link>
          <Link href="/bible/theme" style={{
            background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 12px",
            color: T.textMuted, fontSize: 12, fontWeight: 700,
            textDecoration: "none", fontFamily: F.body,
          }}>Tous les plans</Link>
        </div>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          color: "#fff", borderRadius: 20, padding: "22px 22px 24px",
          marginBottom: 20, position: "relative", overflow: "hidden",
          boxShadow: "0 10px 40px rgba(62,28,112,0.28)",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.gold}, transparent)`,
          }} />
          <div style={{ fontSize: 36, marginBottom: 6 }}>{plan.emoji}</div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.5rem, 5vw, 2rem)",
            fontWeight: 700, margin: "0 0 6px",
            letterSpacing: "0.02em",
          }}>
            {plan.title}
          </h1>
          <p style={{
            margin: "0 0 16px", fontSize: 13, opacity: 0.9,
            fontFamily: F.body, lineHeight: 1.5,
          }}>
            {plan.description}
          </p>

          {active ? (
            <>
              <div style={{
                height: 8, background: "rgba(255,255,255,0.18)",
                borderRadius: 4, overflow: "hidden", marginBottom: 8,
              }}>
                <div style={{
                  height: "100%", width: `${progressPct}%`,
                  background: T.gold, transition: "width 0.4s",
                }} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                {active.completed_days.length} / {plan.totalDays} jours · {progressPct}%
              </div>
            </>
          ) : (
            <button onClick={startPlan} style={{
              background: T.gold, color: "#1F1A33", border: "none",
              borderRadius: 10, padding: "11px 22px", fontWeight: 700,
              fontSize: 13, cursor: "pointer", fontFamily: F.body,
            }}>
              ▶ Démarrer ce plan
            </button>
          )}
        </div>

        {/* Days accordion */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {plan.days.map((d) => {
            const done = active?.completed_days.includes(d.day) ?? false;
            const isOpen = openDay === d.day;
            return (
              <div key={d.day} style={{
                background: T.card, border: `1px solid ${done ? "#2E9B47" : T.border}`,
                borderRadius: 14, overflow: "hidden",
              }}>
                <button
                  onClick={() => setOpenDay(isOpen ? -1 : d.day)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", background: "transparent", border: "none",
                    cursor: "pointer", textAlign: "left", fontFamily: F.body,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: done ? "#2E9B47" : T.violetSoft,
                    color: done ? "#fff" : T.violet,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14,
                  }}>
                    {done ? "✓" : d.day}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: F.title, fontSize: 14, fontWeight: 700,
                      color: T.text, marginBottom: 2,
                      letterSpacing: "0.01em",
                    }}>
                      Jour {d.day} · {d.reference}
                    </div>
                    <div style={{
                      fontSize: 12, color: T.textMuted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      « {d.verseText.slice(0, 60)}{d.verseText.length > 60 ? "…" : ""} »
                    </div>
                  </div>
                  <div style={{ color: T.violet, fontSize: 14, flexShrink: 0 }}>
                    {isOpen ? "▴" : "▾"}
                  </div>
                </button>

                {isOpen && (
                  <div style={{
                    padding: "0 18px 18px",
                    borderTop: `1px solid ${T.borderSoft}`,
                  }}>
                    {/* Verset */}
                    <div style={{
                      background: T.bg, borderLeft: `3px solid ${T.gold}`,
                      borderRadius: "0 10px 10px 0", padding: "12px 14px",
                      margin: "14px 0 16px",
                    }}>
                      <p style={{
                        margin: "0 0 6px", fontFamily: F.title, fontStyle: "italic",
                        fontSize: 15, lineHeight: 1.6, color: T.text,
                      }}>
                        « {d.verseText} »
                      </p>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.violet }}>
                        — {d.reference}
                      </div>
                    </div>

                    {/* Méditation */}
                    <Section title="🪞 Méditation" body={d.meditation} />
                    {/* Prière */}
                    <Section title="🙏 Prière" body={d.prayer} accent={T.violet} />
                    {/* Déclaration */}
                    <Section title="🔥 Déclaration prophétique" body={d.declaration} accent={T.gold} bold />

                    {/* Actions */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14,
                    }}>
                      <button onClick={() => saveVerseToFav(d)} style={btnSecondary}>⭐ Sauver</button>
                      <button onClick={() => shareDay(d)} style={btnSecondary}>📤 Partager</button>
                      <Link
                        href={`/bible/read/${encodeURIComponent(d.book)}/${d.chapter}`}
                        style={{
                          ...btnSecondary, textDecoration: "none", textAlign: "center",
                        } as React.CSSProperties}
                      >
                        📖 Lire le chapitre
                      </Link>
                      {active && (
                        <button onClick={() => markDayDone(d.day)}
                          disabled={done}
                          style={done ? btnDone : btnPrimary}>
                          {done ? "✓ Validé" : "Marquer fait"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Autres thèmes */}
        <h2 style={{
          fontFamily: F.title, fontSize: 13, fontWeight: 700,
          color: T.textMuted, textTransform: "uppercase",
          letterSpacing: "0.1em", margin: "30px 0 12px",
        }}>
          Autres plans thématiques
        </h2>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}>
          {allThemes.filter((t) => t.id !== plan.id).map((t) => (
            <Link key={t.id} href={`/bible/theme/${t.id}`} style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: "12px 10px", textAlign: "center",
              textDecoration: "none", color: T.text,
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{t.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: F.body }}>
                {t.title}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body, accent, bold }: {
  title: string; body: string; accent?: string; bold?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: accent ?? T.textMuted,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
        fontFamily: F.body,
      }}>
        {title}
      </div>
      <p style={{
        margin: 0, fontSize: 14, color: T.textSoft, lineHeight: 1.65,
        fontWeight: bold ? 600 : 400, fontFamily: F.body,
      }}>
        {body}
      </p>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
  color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px",
  fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: F.body,
};
const btnSecondary: React.CSSProperties = {
  background: T.surface2, color: T.textSoft, border: `1px solid ${T.border}`,
  borderRadius: 10, padding: "10px 14px",
  fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: F.body,
};
const btnDone: React.CSSProperties = {
  background: "#2E9B47", color: "#fff", border: "none",
  borderRadius: 10, padding: "10px 14px",
  fontWeight: 700, fontSize: 13, cursor: "default", fontFamily: F.body,
};
