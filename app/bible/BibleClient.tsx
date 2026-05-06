"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ALL_PLANS,
  PLAN_DEFINITIONS,
  THEMATIC_PLANS,
  generatePlan,
  getCurrentDay,
  getDayReading,
  PlanDefinition,
  DayReading,
  ChapterRef,
} from "@/lib/bible/plans";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ActivePlan {
  id: string;
  plan_id: string;
  start_date: string;
  is_active: boolean;
  reminder_time: string | null;
}

interface Note {
  id: string;
  book_name: string;
  chapter: number;
  note_text: string;
  updated_at: string;
}

interface SavedVerse {
  id: string;
  book_name: string;
  chapter: number;
  verse_number: number | null;
  verse_text: string;
  reference: string;
  saved_at: string;
}

interface Props {
  user: any;
  activePlan: ActivePlan | null;
  progressDays: number[];
  allPlans: PlanDefinition[];
  notes: Note[];
  savedVerses: SavedVerse[];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BibleClient({
  user,
  activePlan: initialActivePlan,
  progressDays: initialProgressDays,
  allPlans,
  notes: initialNotes,
  savedVerses: initialSavedVerses,
}: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<"plan" | "choose" | "notes" | "verses">(
    initialActivePlan ? "plan" : "choose"
  );
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(initialActivePlan);
  const [progressDays, setProgressDays] = useState<number[]>(initialProgressDays);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>(initialSavedVerses);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const currentDay = activePlan ? getCurrentDay(activePlan.start_date) : 1;
  const planDef = activePlan ? ALL_PLANS.find((p) => p.id === activePlan.plan_id) : null;
  const todayReading = activePlan ? getDayReading(activePlan.plan_id, currentDay) : null;
  const totalDays = planDef?.totalDays || 365;
  const completedDays = new Set(progressDays).size;
  const progressPct = Math.round((completedDays / totalDays) * 100);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function startPlan(planId: string) {
    setLoading(true);
    try {
      if (activePlan) {
        await supabase.from("user_bible_plans").update({ is_active: false })
          .eq("user_id", user.id).eq("is_active", true);
      }
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("user_bible_plans")
        .upsert({ user_id: user.id, plan_id: planId, start_date: today, is_active: true },
          { onConflict: "user_id,plan_id" })
        .select().single();
      if (error) throw error;
      setActivePlan(data);
      setProgressDays([]);
      setTab("plan");
      showToast("Plan démarré ! Bonne lecture 📖");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(ref: ChapterRef, day: number) {
    if (!activePlan) return;
    try {
      await supabase.from("user_reading_progress").upsert(
        { user_id: user.id, plan_id: activePlan.plan_id, day_number: day, book_name: ref.book, chapter: ref.chapter },
        { onConflict: "user_id,plan_id,book_name,chapter" }
      );
      const { data } = await supabase.from("user_reading_progress")
        .select("day_number").eq("user_id", user.id).eq("plan_id", activePlan.plan_id);
      if (data) setProgressDays(Array.from(new Set(data.map((p: any) => p.day_number))) as number[]);
      showToast("✅ Chapitre marqué comme lu !");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    }
  }

  async function saveReminder(time: string) {
    if (!activePlan) return;
    try {
      await supabase.from("user_bible_plans").update({ reminder_time: time || null }).eq("id", activePlan.id);
      setActivePlan({ ...activePlan, reminder_time: time || null });
      showToast("Rappel enregistré !");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    }
  }

  async function saveNote(book: string, chapter: number, text: string, noteId?: string) {
    try {
      if (noteId) {
        const { data } = await supabase.from("user_bible_notes")
          .update({ note_text: text, updated_at: new Date().toISOString() })
          .eq("id", noteId).select().single();
        setNotes((prev) => prev.map((n) => (n.id === noteId ? data : n)));
      } else {
        const { data } = await supabase.from("user_bible_notes")
          .insert({ user_id: user.id, book_name: book, chapter, note_text: text })
          .select().single();
        setNotes((prev) => [data, ...prev]);
      }
      showToast("Note sauvegardée !");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    }
  }

  async function deleteNote(id: string) {
    await supabase.from("user_bible_notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast("Note supprimée.");
  }

  async function deleteVerse(id: string) {
    await supabase.from("user_saved_verses").delete().eq("id", id);
    setSavedVerses((prev) => prev.filter((v) => v.id !== id));
    showToast("Verset retiré.");
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "13px 16px",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
    color: active ? "var(--gold)" : "var(--text-muted)",
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--font-body)",
    transition: "all 0.2s",
  });

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--gold)", color: "#000", padding: "10px 22px",
          borderRadius: "var(--radius-full)", fontSize: 14, fontWeight: 600,
          zIndex: 9999, boxShadow: "var(--shadow-gold)",
        }}>
          {toast}
        </div>
      )}

      {/* Progress hero — only when a plan is active */}
      {activePlan && planDef && (
        <div style={{
          background: "var(--header-gradient)",
          padding: "28px 24px 32px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -50, right: -50,
            width: 220, height: 220, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 65%)",
            pointerEvents: "none",
          }} />
          <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>{planDef.badge.split(" ")[0]}</span>
              <div>
                <div style={{ fontWeight: 700, color: "white", fontSize: 16 }}>{planDef.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                  Démarré le {new Date(activePlan.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
              <span>Progression</span>
              <span>{completedDays}/{totalDays} jours · {progressPct}%</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, var(--gold), var(--gold-light))",
                height: "100%", borderRadius: 8, transition: "width 0.5s",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Sub-nav tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          <button style={tabStyle(tab === "plan")} onClick={() => setTab("plan")}>
            📅 Mon plan
          </button>
          <button style={tabStyle(tab === "choose")} onClick={() => setTab("choose")}>
            ✦ Choisir un plan
          </button>
          <button style={tabStyle(tab === "notes")} onClick={() => setTab("notes")}>
            📝 Notes ({notes.length})
          </button>
          <button style={tabStyle(tab === "verses")} onClick={() => setTab("verses")}>
            ⭐ Versets ({savedVerses.length})
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px" }}>
        {tab === "plan" && (
          <PlanTab
            activePlan={activePlan}
            planDef={planDef}
            currentDay={currentDay}
            todayReading={todayReading}
            progressDays={progressDays}
            totalDays={totalDays}
            onMarkRead={markRead}
            onSaveReminder={saveReminder}
            onChoosePlan={() => setTab("choose")}
          />
        )}
        {tab === "choose" && (
          <ChooseTab activePlanId={activePlan?.plan_id} onStart={startPlan} loading={loading} />
        )}
        {tab === "notes" && (
          <NotesTab notes={notes} onSave={saveNote} onDelete={deleteNote} />
        )}
        {tab === "verses" && (
          <VersesTab verses={savedVerses} onDelete={deleteVerse} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Mon plan
// ─────────────────────────────────────────────────────────────────────────────
function PlanTab({
  activePlan, planDef, currentDay, todayReading, progressDays, totalDays,
  onMarkRead, onSaveReminder, onChoosePlan,
}: {
  activePlan: ActivePlan | null;
  planDef: PlanDefinition | undefined;
  currentDay: number;
  todayReading: DayReading | null;
  progressDays: number[];
  totalDays: number;
  onMarkRead: (ref: ChapterRef, day: number) => void;
  onSaveReminder: (time: string) => void;
  onChoosePlan: () => void;
}) {
  const [reminderTime, setReminderTime] = useState(activePlan?.reminder_time?.slice(0, 5) || "");
  const progressSet = new Set(progressDays);
  const todayDone = todayReading ? progressSet.has(todayReading.day) : false;

  if (!activePlan || !planDef) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📖</div>
        <h2 style={{
          fontFamily: "var(--font-title)",
          color: "var(--gold)", marginBottom: 8, fontSize: 20,
        }}>Aucun plan actif</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.7, fontSize: 15 }}>
          Choisissez un plan de lecture pour commencer votre parcours biblique.
        </p>
        <button onClick={onChoosePlan} style={{
          background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
          color: "#000", border: "none", borderRadius: "var(--radius-full)",
          padding: "14px 32px", fontSize: 15, fontWeight: 700,
          cursor: "pointer", fontFamily: "var(--font-body)",
        }}>
          Choisir un plan →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Today's reading */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, color: "var(--text-muted)", marginBottom: 10,
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          📅 Lecture du jour — Jour {currentDay}
        </div>
        {todayReading && todayReading.refs.length > 0 ? (
          <div style={{
            background: todayDone ? "rgba(212,175,55,0.06)" : "var(--card-bg)",
            border: `1px solid ${todayDone ? "var(--gold)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)", padding: 20,
            boxShadow: todayDone ? "var(--shadow-gold)" : "var(--shadow-sm)",
          }}>
            {todayDone && (
              <div style={{ color: "var(--gold)", fontWeight: 700, marginBottom: 14, fontSize: 14 }}>
                ✅ Lecture du jour complétée !
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todayReading.refs.map((ref, i) => (
                <ChapterCard key={i} ref_={ref} day={todayReading.day}
                  isRead={progressSet.has(todayReading.day)} onMarkRead={onMarkRead} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: 24,
            textAlign: "center", color: "var(--text-muted)", fontSize: 14,
          }}>
            Aucune lecture prévue aujourd'hui. Vous êtes en avance ! 🎉
          </div>
        )}
      </div>

      {/* Reminder */}
      <div style={{
        background: "var(--card-bg)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--gold)", fontSize: 14 }}>
          🔔 Rappel journalier
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
            style={{
              background: "var(--input-bg)", border: "1px solid var(--input-border)",
              borderRadius: "var(--radius-md)", padding: "10px 14px",
              color: "var(--text-primary)", fontSize: 15, flex: 1, outline: "none",
              fontFamily: "var(--font-body)",
            }}
          />
          <button onClick={() => onSaveReminder(reminderTime)} style={{
            background: "var(--gold)", color: "#000", border: "none",
            borderRadius: "var(--radius-md)", padding: "10px 18px",
            fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
          }}>
            Sauvegarder
          </button>
        </div>
        {activePlan.reminder_time && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            Rappel actuel : {activePlan.reminder_time.slice(0, 5)}
          </div>
        )}
      </div>

      {/* Progress heatmap */}
      <div style={{
        background: "var(--card-bg)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: 20,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 14, color: "var(--gold)", fontSize: 14 }}>
          📊 30 derniers jours
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Array.from({ length: Math.min(currentDay, 30) }, (_, i) => {
            const d = currentDay - 29 + i;
            if (d < 1) return null;
            const done = progressSet.has(d);
            const isToday = d === currentDay;
            return (
              <div key={d} title={`Jour ${d}`} style={{
                width: 28, height: 28, borderRadius: "var(--radius-sm)",
                background: done ? "var(--gold)" : isToday ? "rgba(212,175,55,0.15)" : "var(--surface-2)",
                border: isToday ? "2px solid var(--gold)" : "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: done ? "#000" : "var(--text-muted)", fontWeight: 600,
              }}>
                {d}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          {new Set(progressDays).size} jours complétés sur {totalDays} ({Math.round((new Set(progressDays).size / totalDays) * 100)}%)
        </div>
      </div>
    </div>
  );
}

// ─── Chapter Card ─────────────────────────────────────────────────────────────
function ChapterCard({ ref_, day, isRead, onMarkRead }: {
  ref_: ChapterRef; day: number; isRead: boolean;
  onMarkRead: (ref: ChapterRef, day: number) => void;
}) {
  const url = `/bible/read/${encodeURIComponent(ref_.book)}/${ref_.chapter}`;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)", padding: "12px 14px",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "var(--radius-sm)",
        background: isRead ? "var(--gold)" : "var(--surface-2)",
        border: `1px solid ${isRead ? "var(--gold)" : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: isRead ? "#000" : "var(--text-muted)", flexShrink: 0,
        fontWeight: 700,
      }}>
        {isRead ? "✓" : ref_.chapter}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{ref_.book}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Chapitre {ref_.chapter}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={url} style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)", padding: "7px 12px",
          color: "var(--gold)", fontSize: 12, fontWeight: 600,
          textDecoration: "none", whiteSpace: "nowrap",
        }}>
          Lire →
        </a>
        {!isRead && (
          <button onClick={() => onMarkRead(ref_, day)} style={{
            background: "var(--gold)", color: "#000", border: "none",
            borderRadius: "var(--radius-sm)", padding: "7px 12px",
            fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
          }}>
            ✓ Lu
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Choisir un plan
// ─────────────────────────────────────────────────────────────────────────────
function ChooseTab({ activePlanId, onStart, loading }: {
  activePlanId?: string; onStart: (id: string) => void; loading: boolean;
}) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontFamily: "var(--font-title)", color: "var(--gold)",
          fontSize: 15, fontWeight: 700, marginBottom: 4,
        }}>Plans systématiques</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px" }}>
          Lisez la Bible en ordre, du début à la fin.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PLAN_DEFINITIONS.map((plan) => (
            <PlanCard key={plan.id} plan={plan}
              isActive={activePlanId === plan.id} onStart={onStart} loading={loading} />
          ))}
        </div>
      </div>
      <div>
        <h2 style={{
          fontFamily: "var(--font-title)", color: "var(--gold)",
          fontSize: 15, fontWeight: 700, marginBottom: 4,
        }}>Plans thématiques</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px" }}>
          Explorez un sujet biblique en profondeur.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {THEMATIC_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan}
              isActive={activePlanId === plan.id} onStart={onStart} loading={loading} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, isActive, onStart, loading }: {
  plan: PlanDefinition; isActive: boolean;
  onStart: (id: string) => void; loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = expanded ? generatePlan(plan.id).slice(0, 7) : null;

  return (
    <div style={{
      background: "var(--card-bg)",
      border: `1px solid ${isActive ? "var(--gold)" : "var(--border)"}`,
      borderRadius: "var(--radius-lg)", overflow: "hidden",
      boxShadow: isActive ? "var(--shadow-gold)" : "var(--shadow-sm)",
    }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 10px",
                background: `${plan.color}20`, color: plan.color,
                borderRadius: "var(--radius-full)", border: `1px solid ${plan.color}40`,
              }}>
                {plan.badge}
              </span>
              {isActive && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 10px",
                  background: "rgba(212,175,55,0.12)", color: "var(--gold)",
                  borderRadius: "var(--radius-full)", border: "1px solid rgba(212,175,55,0.3)",
                }}>
                  ✓ Actif
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
              {plan.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {plan.description}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              {plan.totalDays} jours
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => setExpanded(!expanded)} style={{
            flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", padding: "9px 14px",
            color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}>
            {expanded ? "Masquer" : "Aperçu du plan"}
          </button>
          <button onClick={() => onStart(plan.id)} disabled={loading || isActive} style={{
            flex: 1,
            background: isActive ? "var(--surface-2)" : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
            color: isActive ? "var(--text-muted)" : "#000",
            border: "none", borderRadius: "var(--radius-md)", padding: "9px 14px",
            fontWeight: 700, fontSize: 13,
            cursor: isActive ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
          }}>
            {isActive ? "Plan actif" : loading ? "..." : "Démarrer"}
          </button>
        </div>
      </div>
      {expanded && preview && (
        <div style={{
          borderTop: "1px solid var(--border)", padding: "14px 18px",
          background: "var(--surface)",
        }}>
          <div style={{
            fontSize: 11, color: "var(--text-muted)", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10,
          }}>
            Aperçu — 7 premiers jours
          </div>
          {preview.map((day) => (
            <div key={day.day} style={{
              display: "flex", gap: 10, marginBottom: 8,
              fontSize: 13, alignItems: "flex-start",
            }}>
              <span style={{
                width: 44, height: 22, borderRadius: "var(--radius-sm)",
                background: "var(--card-bg)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "var(--text-muted)", flexShrink: 0,
              }}>
                J{day.day}
              </span>
              <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {day.refs.map((r) => `${r.book} ${r.chapter}`).join(" · ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Notes
// ─────────────────────────────────────────────────────────────────────────────
function NotesTab({ notes, onSave, onDelete }: {
  notes: Note[];
  onSave: (book: string, chapter: number, text: string, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim() || !book.trim()) return;
    onSave(book, parseInt(chapter) || 1, text, editNote?.id);
    setShowForm(false); setEditNote(null);
    setBook(""); setChapter(""); setText("");
  }

  function startEdit(note: Note) {
    setEditNote(note); setBook(note.book_name);
    setChapter(String(note.chapter)); setText(note.note_text);
    setShowForm(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--input-bg)", border: "1px solid var(--input-border)",
    borderRadius: "var(--radius-md)", padding: "10px 14px",
    color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box",
    outline: "none", fontFamily: "var(--font-body)",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{
          margin: 0, fontSize: 15,
          fontFamily: "var(--font-title)", color: "var(--gold)",
        }}>Mes notes de lecture</h2>
        <button onClick={() => { setShowForm(true); setEditNote(null); setBook(""); setChapter(""); setText(""); }} style={{
          background: "var(--gold)", color: "#000", border: "none",
          borderRadius: "var(--radius-md)", padding: "9px 16px",
          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
        }}>
          + Nouvelle note
        </button>
      </div>

      {showForm && (
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20,
          boxShadow: "var(--shadow-md)",
        }}>
          <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 14, fontSize: 14 }}>
            {editNote ? "Modifier la note" : "Nouvelle note"}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input placeholder="Livre (ex: Jean)" value={book}
              onChange={(e) => setBook(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
            <input placeholder="Chap." type="number" value={chapter}
              onChange={(e) => setChapter(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <textarea placeholder="Votre réflexion, insight ou observation..." value={text}
            onChange={(e) => setText(e.target.value)} rows={4}
            style={{ ...inputStyle, resize: "vertical", marginBottom: 12 } as any} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} style={{
              background: "var(--gold)", color: "#000", border: "none",
              borderRadius: "var(--radius-md)", padding: "10px 20px",
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
            }}>Sauvegarder</button>
            <button onClick={() => { setShowForm(false); setEditNote(null); }} style={{
              background: "var(--surface-2)", color: "var(--text-muted)", border: "none",
              borderRadius: "var(--radius-md)", padding: "10px 20px",
              fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
            }}>Annuler</button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 15 }}>Aucune note pour l'instant.</div>
          <p style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>
            Commencez à annoter vos lectures bibliques !
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((note) => (
            <div key={note.id} style={{
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: 16,
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: 14 }}>
                    {note.book_name} {note.chapter}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 10 }}>
                    {new Date(note.updated_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(note)} style={{
                    background: "var(--surface-2)", border: "none", borderRadius: "var(--radius-sm)",
                    padding: "5px 10px", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                  }}>✏️</button>
                  <button onClick={() => onDelete(note.id)} style={{
                    background: "rgba(220,38,38,0.08)", border: "none", borderRadius: "var(--radius-sm)",
                    padding: "5px 10px", color: "var(--error)", fontSize: 12, cursor: "pointer",
                  }}>🗑</button>
                </div>
              </div>
              <p style={{
                margin: 0, color: "var(--text-secondary)", fontSize: 14,
                lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>{note.note_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Versets sauvegardés
// ─────────────────────────────────────────────────────────────────────────────
function VersesTab({ verses, onDelete }: {
  verses: SavedVerse[]; onDelete: (id: string) => void;
}) {
  if (verses.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⭐</div>
        <div style={{ fontSize: 15 }}>Aucun verset sauvegardé.</div>
        <p style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>
          Lors de vos lectures, utilisez le bouton ★ pour sauvegarder vos versets préférés.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{
        fontFamily: "var(--font-title)", fontSize: 15,
        color: "var(--gold)", marginBottom: 16,
      }}>
        Mes versets sauvegardés
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {verses.map((verse) => (
          <div key={verse.id} style={{
            background: "var(--card-bg)",
            borderLeft: "3px solid var(--gold)",
            borderRadius: "0 var(--radius-lg) var(--radius-lg) 0",
            padding: 16, boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: 13, marginBottom: 6 }}>
                  {verse.reference}
                </div>
                <p style={{
                  margin: 0, color: "var(--text-secondary)", fontSize: 14,
                  lineHeight: 1.7, fontStyle: "italic",
                }}>
                  « {verse.verse_text} »
                </p>
              </div>
              <button onClick={() => onDelete(verse.id)} style={{
                background: "rgba(220,38,38,0.08)", border: "none",
                borderRadius: "var(--radius-sm)", padding: "5px 10px",
                color: "var(--error)", fontSize: 12, cursor: "pointer", marginLeft: 12, flexShrink: 0,
              }}>🗑</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              Sauvegardé le {new Date(verse.saved_at).toLocaleDateString("fr-FR")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
