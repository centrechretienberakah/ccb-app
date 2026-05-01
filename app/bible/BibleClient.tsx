"use client";

import { useState, useEffect } from "react";
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
import { getBibleComUrl } from "@/lib/bible/books";

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPlanDef(planId: string): PlanDefinition | undefined {
  return ALL_PLANS.find((p) => p.id === planId);
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

  // Today's reading
  const currentDay = activePlan ? getCurrentDay(activePlan.start_date) : 1;
  const planDef = activePlan ? getPlanDef(activePlan.plan_id) : null;
  const todayReading = activePlan
    ? getDayReading(activePlan.plan_id, currentDay)
    : null;
  const totalDays = planDef?.totalDays || 365;
  const completedDays = new Set(progressDays).size;
  const progressPct = Math.round((completedDays / totalDays) * 100);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Start a plan ─────────────────────────────────────────────────────────
  async function startPlan(planId: string) {
    setLoading(true);
    try {
      // Deactivate existing plans
      if (activePlan) {
        await supabase
          .from("user_bible_plans")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("is_active", true);
      }

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("user_bible_plans")
        .upsert(
          {
            user_id: user.id,
            plan_id: planId,
            start_date: today,
            is_active: true,
          },
          { onConflict: "user_id,plan_id" }
        )
        .select()
        .single();

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

  // ── Mark chapter as read ──────────────────────────────────────────────────
  async function markRead(ref: ChapterRef, day: number) {
    if (!activePlan) return;
    try {
      await supabase.from("user_reading_progress").upsert(
        {
          user_id: user.id,
          plan_id: activePlan.plan_id,
          day_number: day,
          book_name: ref.book,
          chapter: ref.chapter,
        },
        { onConflict: "user_id,plan_id,book_name,chapter" }
      );

      // Reload progress
      const { data } = await supabase
        .from("user_reading_progress")
        .select("day_number")
        .eq("user_id", user.id)
        .eq("plan_id", activePlan.plan_id);

      if (data) {
        const daySet = new Set(data.map((p: any) => p.day_number));
        setProgressDays(Array.from(daySet) as number[]);
      }
      showToast("✅ Chapitre marqué comme lu !");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    }
  }

  // ── Save reminder time ────────────────────────────────────────────────────
  async function saveReminder(time: string) {
    if (!activePlan) return;
    try {
      await supabase
        .from("user_bible_plans")
        .update({ reminder_time: time || null })
        .eq("id", activePlan.id);
      setActivePlan({ ...activePlan, reminder_time: time || null });
      showToast("Rappel enregistré !");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    }
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  async function saveNote(book: string, chapter: number, text: string, noteId?: string) {
    try {
      if (noteId) {
        const { data } = await supabase
          .from("user_bible_notes")
          .update({ note_text: text, updated_at: new Date().toISOString() })
          .eq("id", noteId)
          .select()
          .single();
        setNotes((prev) => prev.map((n) => (n.id === noteId ? data : n)));
      } else {
        const { data } = await supabase
          .from("user_bible_notes")
          .insert({ user_id: user.id, book_name: book, chapter, note_text: text })
          .select()
          .single();
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

  // ── Saved verses ──────────────────────────────────────────────────────────
  async function deleteVerse(id: string) {
    await supabase.from("user_saved_verses").delete().eq("id", id);
    setSavedVerses((prev) => prev.filter((v) => v.id !== id));
    showToast("Verset retiré.");
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "#d4af37", color: "#000", padding: "10px 22px",
          borderRadius: 30, fontSize: 14, fontWeight: 600, zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2d1a00 100%)", padding: "32px 24px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>📖</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#d4af37" }}>
                Plan de lecture biblique
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Version LSV · Louis Segond</p>
            </div>
          </div>

          {/* Progress bar */}
          {activePlan && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 6 }}>
                <span>{planDef?.name}</span>
                <span>{completedDays}/{totalDays} jours · {progressPct}%</span>
              </div>
              <div style={{ background: "#333", borderRadius: 8, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #d4af37, #f0c040)", height: "100%", borderRadius: 8, transition: "width 0.5s" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          {[
            { key: "plan", label: "📅 Mon plan" },
            { key: "choose", label: "✦ Choisir un plan" },
            { key: "notes", label: `📝 Notes (${notes.length})` },
            { key: "verses", label: `⭐ Versets (${savedVerses.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              style={{
                padding: "14px 18px",
                border: "none",
                borderBottom: tab === t.key ? "2px solid #d4af37" : "2px solid transparent",
                background: "none",
                color: tab === t.key ? "#d4af37" : "#777",
                fontWeight: tab === t.key ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        {/* TAB: Mon plan */}
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

        {/* TAB: Choisir un plan */}
        {tab === "choose" && (
          <ChooseTab
            activePlanId={activePlan?.plan_id}
            onStart={startPlan}
            loading={loading}
          />
        )}

        {/* TAB: Notes */}
        {tab === "notes" && (
          <NotesTab
            notes={notes}
            onSave={saveNote}
            onDelete={deleteNote}
          />
        )}

        {/* TAB: Versets sauvegardés */}
        {tab === "verses" && (
          <VersesTab
            verses={savedVerses}
            onDelete={deleteVerse}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Mon plan
// ─────────────────────────────────────────────────────────────────────────────
function PlanTab({
  activePlan,
  planDef,
  currentDay,
  todayReading,
  progressDays,
  totalDays,
  onMarkRead,
  onSaveReminder,
  onChoosePlan,
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
        <h2 style={{ color: "#d4af37", marginBottom: 8 }}>Aucun plan actif</h2>
        <p style={{ color: "#888", marginBottom: 24, lineHeight: 1.6 }}>
          Choisissez un plan de lecture pour commencer votre parcours biblique.
        </p>
        <button
          onClick={onChoosePlan}
          style={{
            background: "linear-gradient(135deg, #d4af37, #f0c040)",
            color: "#000", border: "none", borderRadius: 30,
            padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer"
          }}
        >
          Choisir un plan →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Plan info card */}
      <div style={{
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        borderRadius: 16, padding: 20, marginBottom: 20
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>{planDef.badge.split(" ")[0]}</span>
          <div>
            <div style={{ fontWeight: 700, color: "#d4af37" }}>{planDef.name}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              Démarré le {new Date(activePlan.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5 }}>{planDef.description}</div>
      </div>

      {/* Today's reading */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          📅 Lecture du jour — Jour {currentDay}
        </div>

        {todayReading && todayReading.refs.length > 0 ? (
          <div style={{
            background: todayDone ? "rgba(212,175,55,0.08)" : "#1a1a1a",
            border: `1px solid ${todayDone ? "#d4af37" : "#2a2a2a"}`,
            borderRadius: 16, padding: 20
          }}>
            {todayDone && (
              <div style={{ color: "#d4af37", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
                ✅ Lecture du jour complétée !
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {todayReading.refs.map((ref, i) => (
                <ChapterCard
                  key={i}
                  ref_={ref}
                  day={todayReading.day}
                  isRead={progressSet.has(todayReading.day)}
                  onMarkRead={onMarkRead}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 24, textAlign: "center", color: "#888" }}>
            Aucune lecture prévue pour aujourd'hui. Félicitations, vous êtes en avance ! 🎉
          </div>
        )}
      </div>

      {/* Reminder */}
      <div style={{
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        borderRadius: 16, padding: 20, marginBottom: 24
      }}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: "#d4af37" }}>
          🔔 Rappel journalier
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            style={{
              background: "#0f0f0f", border: "1px solid #333",
              borderRadius: 10, padding: "10px 14px", color: "#fff",
              fontSize: 16, flex: 1
            }}
          />
          <button
            onClick={() => onSaveReminder(reminderTime)}
            style={{
              background: "#d4af37", color: "#000", border: "none",
              borderRadius: 10, padding: "10px 18px", fontWeight: 700,
              fontSize: 13, cursor: "pointer"
            }}
          >
            Sauvegarder
          </button>
        </div>
        {activePlan.reminder_time && (
          <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
            Rappel actuel : {activePlan.reminder_time.slice(0, 5)}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
          * Le rappel s'affiche via les notifications navigateur (à activer dans les paramètres).
        </div>
      </div>

      {/* Progress overview — last 7 days */}
      <div style={{
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        borderRadius: 16, padding: 20
      }}>
        <div style={{ fontWeight: 600, marginBottom: 14, color: "#d4af37" }}>
          📊 Progression récente
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Array.from({ length: Math.min(currentDay, 30) }, (_, i) => {
            const d = currentDay - 29 + i;
            if (d < 1) return null;
            const done = progressSet.has(d);
            const isToday = d === currentDay;
            return (
              <div
                key={d}
                title={`Jour ${d}`}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: done ? "#d4af37" : isToday ? "#333" : "#1a1a1a",
                  border: isToday ? "2px solid #d4af37" : "1px solid #2a2a2a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: done ? "#000" : "#555", fontWeight: 600
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#888" }}>
          {new Set(progressDays).size} jours complétés sur {totalDays} ({Math.round((new Set(progressDays).size / totalDays) * 100)}%)
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter card
// ─────────────────────────────────────────────────────────────────────────────
function ChapterCard({
  ref_,
  day,
  isRead,
  onMarkRead,
}: {
  ref_: ChapterRef;
  day: number;
  isRead: boolean;
  onMarkRead: (ref: ChapterRef, day: number) => void;
}) {
  const url = getBibleComUrl(ref_.book, ref_.chapter);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "#0f0f0f", borderRadius: 12, padding: "12px 14px",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: isRead ? "#d4af37" : "#2a2a2a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, color: isRead ? "#000" : "#888", flexShrink: 0
      }}>
        {isRead ? "✓" : ref_.chapter}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{ref_.book}</div>
        <div style={{ fontSize: 12, color: "#888" }}>Chapitre {ref_.chapter}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "#1a1a1a", border: "1px solid #333",
            borderRadius: 8, padding: "7px 12px",
            color: "#d4af37", fontSize: 12, fontWeight: 600,
            textDecoration: "none", whiteSpace: "nowrap"
          }}
        >
          Lire →
        </a>
        {!isRead && (
          <button
            onClick={() => onMarkRead(ref_, day)}
            style={{
              background: "#d4af37", color: "#000", border: "none",
              borderRadius: 8, padding: "7px 12px",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
            }}
          >
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
function ChooseTab({
  activePlanId,
  onStart,
  loading,
}: {
  activePlanId?: string;
  onStart: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#d4af37", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Plans systématiques
        </h2>
        <p style={{ color: "#888", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          Lisez la Bible en ordre, du début à la fin.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {PLAN_DEFINITIONS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isActive={activePlanId === plan.id}
              onStart={onStart}
              loading={loading}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ color: "#d4af37", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Plans thématiques
        </h2>
        <p style={{ color: "#888", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          Explorez un sujet biblique en profondeur.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {THEMATIC_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isActive={activePlanId === plan.id}
              onStart={onStart}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isActive,
  onStart,
  loading,
}: {
  plan: PlanDefinition;
  isActive: boolean;
  onStart: (id: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Preview: first 3 days
  const preview = expanded
    ? generatePlan(plan.id).slice(0, 7)
    : null;

  return (
    <div style={{
      background: "#1a1a1a",
      border: `1px solid ${isActive ? plan.color : "#2a2a2a"}`,
      borderRadius: 16, overflow: "hidden",
      boxShadow: isActive ? `0 0 0 1px ${plan.color}30` : "none"
    }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 10px",
                background: `${plan.color}20`, color: plan.color,
                borderRadius: 20, border: `1px solid ${plan.color}40`
              }}>
                {plan.badge}
              </span>
              {isActive && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 10px",
                  background: "rgba(212,175,55,0.15)", color: "#d4af37",
                  borderRadius: 20, border: "1px solid rgba(212,175,55,0.3)"
                }}>
                  ✓ Actif
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 4 }}>
              {plan.name}
            </div>
            <div style={{ fontSize: 13, color: "#999", lineHeight: 1.5 }}>
              {plan.description}
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              {plan.totalDays} jours
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              flex: 1, background: "#0f0f0f", border: "1px solid #333",
              borderRadius: 10, padding: "9px 14px",
              color: "#aaa", fontSize: 13, cursor: "pointer"
            }}
          >
            {expanded ? "Masquer" : "Aperçu du plan"}
          </button>
          <button
            onClick={() => onStart(plan.id)}
            disabled={loading || isActive}
            style={{
              flex: 1,
              background: isActive
                ? "#2a2a2a"
                : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
              color: isActive ? "#666" : "#000",
              border: "none", borderRadius: 10, padding: "9px 14px",
              fontWeight: 700, fontSize: 13, cursor: isActive ? "not-allowed" : "pointer"
            }}
          >
            {isActive ? "Plan actif" : loading ? "..." : "Démarrer"}
          </button>
        </div>
      </div>

      {/* Preview */}
      {expanded && preview && (
        <div style={{ borderTop: "1px solid #2a2a2a", padding: "14px 18px", background: "#0f0f0f" }}>
          <div style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Aperçu — 7 premiers jours
          </div>
          {preview.map((day) => (
            <div key={day.day} style={{
              display: "flex", gap: 10, marginBottom: 8, fontSize: 13, alignItems: "flex-start"
            }}>
              <span style={{
                width: 44, height: 22, borderRadius: 6,
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "#888", flexShrink: 0
              }}>
                J{day.day}
              </span>
              <span style={{ color: "#ccc", lineHeight: 1.5 }}>
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
function NotesTab({
  notes,
  onSave,
  onDelete,
}: {
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
    setShowForm(false);
    setEditNote(null);
    setBook(""); setChapter(""); setText("");
  }

  function startEdit(note: Note) {
    setEditNote(note);
    setBook(note.book_name);
    setChapter(String(note.chapter));
    setText(note.note_text);
    setShowForm(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0f0f0f", border: "1px solid #2a2a2a",
    borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14,
    boxSizing: "border-box" as const, outline: "none"
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: "#d4af37" }}>Mes notes de lecture</h2>
        <button
          onClick={() => { setShowForm(true); setEditNote(null); setBook(""); setChapter(""); setText(""); }}
          style={{
            background: "#d4af37", color: "#000", border: "none",
            borderRadius: 10, padding: "9px 16px", fontWeight: 700,
            fontSize: 13, cursor: "pointer"
          }}
        >
          + Nouvelle note
        </button>
      </div>

      {showForm && (
        <div style={{
          background: "#1a1a1a", border: "1px solid #2a2a2a",
          borderRadius: 16, padding: 20, marginBottom: 20
        }}>
          <div style={{ fontWeight: 700, color: "#d4af37", marginBottom: 14 }}>
            {editNote ? "Modifier la note" : "Nouvelle note"}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input
              placeholder="Livre (ex: Jean)"
              value={book}
              onChange={(e) => setBook(e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
            />
            <input
              placeholder="Chap."
              type="number"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <textarea
            placeholder="Votre réflexion, insight ou observation..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSubmit} style={{
              background: "#d4af37", color: "#000", border: "none",
              borderRadius: 10, padding: "10px 20px", fontWeight: 700,
              fontSize: 13, cursor: "pointer"
            }}>
              Sauvegarder
            </button>
            <button onClick={() => { setShowForm(false); setEditNote(null); }} style={{
              background: "#2a2a2a", color: "#aaa", border: "none",
              borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer"
            }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#888" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div>Aucune note pour l'instant. Commencez à annoter vos lectures !</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((note) => (
            <div key={note.id} style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a",
              borderRadius: 14, padding: 16
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#d4af37", fontSize: 14 }}>
                    {note.book_name} {note.chapter}
                  </span>
                  <span style={{ fontSize: 11, color: "#666", marginLeft: 10 }}>
                    {new Date(note.updated_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(note)} style={{
                    background: "#2a2a2a", border: "none", borderRadius: 8,
                    padding: "5px 10px", color: "#aaa", fontSize: 12, cursor: "pointer"
                  }}>
                    ✏️
                  </button>
                  <button onClick={() => onDelete(note.id)} style={{
                    background: "#2a1a1a", border: "none", borderRadius: 8,
                    padding: "5px 10px", color: "#f87171", fontSize: 12, cursor: "pointer"
                  }}>
                    🗑
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, color: "#ccc", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {note.note_text}
              </p>
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
function VersesTab({
  verses,
  onDelete,
}: {
  verses: SavedVerse[];
  onDelete: (id: string) => void;
}) {
  if (verses.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px 20px", color: "#888" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
        <div>Aucun verset sauvegardé.</div>
        <p style={{ fontSize: 13, marginTop: 8, color: "#666" }}>
          Lors de vos lectures, utilisez le bouton ★ pour sauvegarder vos versets préférés.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, color: "#d4af37", marginBottom: 16 }}>
        Mes versets sauvegardés
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {verses.map((verse) => (
          <div key={verse.id} style={{
            background: "#1a1a1a",
            borderLeft: "3px solid #d4af37",
            borderRadius: "0 14px 14px 0",
            padding: 16
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#d4af37", fontSize: 13, marginBottom: 6 }}>
                  {verse.reference}
                </div>
                <p style={{ margin: 0, color: "#ddd", fontSize: 14, lineHeight: 1.7, fontStyle: "italic" }}>
                  « {verse.verse_text} »
                </p>
              </div>
              <button onClick={() => onDelete(verse.id)} style={{
                background: "#2a1a1a", border: "none", borderRadius: 8,
                padding: "5px 10px", color: "#f87171", fontSize: 12,
                cursor: "pointer", marginLeft: 12, flexShrink: 0
              }}>
                🗑
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 8 }}>
              Sauvegardé le {new Date(verse.saved_at).toLocaleDateString("fr-FR")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
