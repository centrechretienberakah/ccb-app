"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  READING_PLANS, getDayReading, calculateProgress,
  LEVEL_LABELS, GOAL_LABELS,
  type ReadingPlan, type SpiritualLevel, type SpiritualGoal,
} from "@/lib/bible/reading-plans";

interface ActivePlan {
  id: string;
  plan_id: string;
  completed_days: number[];
  started_at: string;
  is_active: boolean;
}

interface Props {
  user: any;
  activePlans: ActivePlan[];
}

export default function PlanBibliqueClient({ user, activePlans: initialPlans }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"active" | "browse">(initialPlans.length > 0 ? "active" : "browse");
  const [activePlans, setActivePlans] = useState<ActivePlan[]>(initialPlans);
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function startPlan(plan: ReadingPlan) {
    if (!user) { router.push("/auth/login"); return; }
    const already = activePlans.find((p) => p.plan_id === plan.id);
    if (already) { showToast("Vous suivez déjà ce plan !"); setTab("active"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_bible_plans")
        .insert({ user_id: user.id, plan_id: plan.id, completed_days: [], is_active: true, started_at: new Date().toISOString() })
        .select().single();
      if (error) throw error;
      setActivePlans((prev) => [data, ...prev]);
      setTab("active");
      showToast(`✅ Plan "${plan.title}" démarré !`);
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function markDayDone(activePlan: ActivePlan, day: number) {
    if (activePlan.completed_days.includes(day)) return;
    const newDays = [...activePlan.completed_days, day].sort((a, b) => a - b);
    const { error } = await supabase
      .from("user_bible_plans")
      .update({ completed_days: newDays })
      .eq("id", activePlan.id);
    if (!error) {
      setActivePlans((prev) => prev.map((p) => p.id === activePlan.id ? { ...p, completed_days: newDays } : p));
      showToast("✝️ Lecture marquée comme lue !");
    }
  }

  async function abandonPlan(activePlan: ActivePlan) {
    await supabase.from("user_bible_plans").update({ is_active: false }).eq("id", activePlan.id);
    setActivePlans((prev) => prev.filter((p) => p.id !== activePlan.id));
    showToast("Plan abandonné.");
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "12px 20px", background: "none", border: "none",
    borderBottom: `2px solid ${active ? "var(--gold)" : "transparent"}`,
    color: active ? "var(--gold)" : "var(--text-muted)",
    fontWeight: active ? 700 : 400, fontSize: 13, cursor: "pointer",
    fontFamily: "var(--font-body)", transition: "all 0.2s", whiteSpace: "nowrap",
  });

  return (
    <div style={{ background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "var(--font-body)", minHeight: "100vh" }}>

      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--gold)", color: "#000", padding: "10px 22px",
          borderRadius: "var(--radius-full)", fontSize: 14, fontWeight: 600,
          zIndex: 9999, boxShadow: "var(--shadow-gold)",
        }}>{toast}</div>
      )}

      {/* Tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", overflowX: "auto" }}>
          <button style={tabStyle(tab === "active")} onClick={() => setTab("active")}>
            📖 Mes plans ({activePlans.length})
          </button>
          <button style={tabStyle(tab === "browse")} onClick={() => setTab("browse")}>
            🔍 Choisir un plan
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* ── Tab: Mes plans actifs ── */}
        {tab === "active" && (
          <div>
            {activePlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>📖</div>
                <div style={{ fontSize: 16, fontFamily: "var(--font-title)", color: "var(--text-primary)", marginBottom: 8 }}>
                  Aucun plan en cours
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
                  Choisissez un plan de lecture pour commencer votre parcours biblique.
                </p>
                <button onClick={() => setTab("browse")} style={{
                  background: "var(--gold)", color: "#000", border: "none",
                  borderRadius: "var(--radius-md)", padding: "11px 24px",
                  fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-body)",
                }}>
                  Parcourir les plans →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {activePlans.map((ap) => {
                  const plan = READING_PLANS.find((p) => p.id === ap.plan_id);
                  if (!plan) return null;
                  const progress = calculateProgress(ap.completed_days, plan.totalDays);
                  const nextDay = (ap.completed_days.length > 0 ? Math.max(...ap.completed_days) + 1 : 1);
                  const currentDay = Math.min(nextDay, plan.totalDays);
                  const todayReading = getDayReading(plan.id, currentDay);
                  const isDone = ap.completed_days.includes(currentDay);

                  return (
                    <div key={ap.id} style={{
                      background: "var(--card-bg)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-sm)",
                    }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 22 }}>{plan.emoji}</span>
                            <span style={{ fontFamily: "var(--font-title)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                              {plan.title}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Démarré le {new Date(ap.started_at).toLocaleDateString("fr-FR")} · Jour {currentDay}/{plan.totalDays}
                          </div>
                        </div>
                        <button onClick={() => abandonPlan(ap)} style={{
                          background: "none", border: "none", color: "var(--text-muted)",
                          fontSize: 18, cursor: "pointer", padding: 4,
                        }} title="Abandonner ce plan">✕</button>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Progression</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{progress}%</span>
                        </div>
                        <div style={{ background: "var(--surface-2)", borderRadius: "var(--radius-full)", height: 6, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${progress}%`,
                            background: "linear-gradient(90deg, var(--gold-dark), var(--gold))",
                            borderRadius: "var(--radius-full)", transition: "width 0.3s",
                          }} />
                        </div>
                      </div>

                      {/* Aujourd'hui */}
                      <div style={{
                        background: isDone ? "rgba(34,197,94,0.08)" : "rgba(212,175,55,0.08)",
                        border: `1px solid ${isDone ? "rgba(34,197,94,0.25)" : "rgba(212,175,55,0.3)"}`,
                        borderRadius: "var(--radius-md)", padding: "14px 16px",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isDone ? "#22c55e" : "var(--gold)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {isDone ? "✓ Lecture du jour terminée" : `📅 Jour ${currentDay} — ${todayReading.title}`}
                        </div>
                        {!isDone && (
                          <>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                              {todayReading.passages.map((p, i) => (
                                <button key={i} onClick={() => router.push(`/bible/read/${encodeURIComponent(p.book)}/${p.chapter}`)} style={{
                                  background: "var(--surface)", border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-sm)", padding: "5px 12px",
                                  color: "var(--gold)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                                  fontFamily: "var(--font-body)",
                                }}>
                                  {p.book} {p.chapter}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => markDayDone(ap, currentDay)} style={{
                              background: "var(--gold)", color: "#000", border: "none",
                              borderRadius: "var(--radius-md)", padding: "9px 18px",
                              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
                            }}>
                              ✓ Marquer comme lu
                            </button>
                          </>
                        )}
                        {isDone && currentDay < plan.totalDays && (
                          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            Le prochain passage sera disponible demain. Continuez comme ça ! 🙏
                          </div>
                        )}
                        {currentDay >= plan.totalDays && progress === 100 && (
                          <div style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>
                            🎉 Félicitations ! Vous avez complété ce plan de lecture !
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Parcourir les plans ── */}
        {tab === "browse" && (
          <div>
            {selectedPlan ? (
              <PlanDetail plan={selectedPlan} onStart={() => startPlan(selectedPlan)} onBack={() => setSelectedPlan(null)} loading={loading} />
            ) : (
              <PlanGrid plans={READING_PLANS} activePlanIds={activePlans.map((p) => p.plan_id)} onSelect={setSelectedPlan} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Grille des plans ─────────────────────────────────────────────────────────
function PlanGrid({ plans, activePlanIds, onSelect }: {
  plans: ReadingPlan[];
  activePlanIds: string[];
  onSelect: (p: ReadingPlan) => void;
}) {
  const [filterLevel, setFilterLevel] = useState<string>("all");

  const levels = [
    { id: "all", label: "Tous" },
    { id: "BEGINNER", label: "Débutant" },
    { id: "INTERMEDIATE", label: "Intermédiaire" },
    { id: "ADVANCED", label: "Avancé" },
  ];

  const filtered = filterLevel === "all" ? plans : plans.filter((p) => p.level === filterLevel);

  return (
    <div>
      {/* Filtres niveau */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {levels.map((l) => (
          <button key={l.id} onClick={() => setFilterLevel(l.id)} style={{
            padding: "7px 16px",
            background: filterLevel === l.id ? "var(--gold)" : "var(--card-bg)",
            color: filterLevel === l.id ? "#000" : "var(--text-secondary)",
            border: `1px solid ${filterLevel === l.id ? "var(--gold)" : "var(--border)"}`,
            borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: filterLevel === l.id ? 700 : 400,
            cursor: "pointer", fontFamily: "var(--font-body)",
          }}>
            {l.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {filtered.map((plan) => {
          const isActive = activePlanIds.includes(plan.id);
          return (
            <div key={plan.id} onClick={() => onSelect(plan)} style={{
              background: "var(--card-bg)", border: `1px solid ${isActive ? "var(--gold)" : "var(--border)"}`,
              borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer",
              boxShadow: "var(--shadow-sm)", transition: "all 0.15s",
              position: "relative",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}
            >
              {isActive && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: "var(--gold)", color: "#000",
                  borderRadius: "var(--radius-full)", padding: "2px 8px",
                  fontSize: 10, fontWeight: 700,
                }}>En cours</div>
              )}
              <div style={{ fontSize: 32, marginBottom: 10 }}>{plan.emoji}</div>
              <div style={{ fontFamily: "var(--font-title)", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                {plan.title}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                {plan.description}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>{plan.duration}</span>
                <span style={{
                  fontSize: 11, padding: "2px 8px",
                  background: "var(--surface-2)", borderRadius: "var(--radius-full)",
                  color: "var(--text-muted)",
                }}>
                  {LEVEL_LABELS[plan.level]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Détail d'un plan ─────────────────────────────────────────────────────────
function PlanDetail({ plan, onStart, onBack, loading }: {
  plan: ReadingPlan; onStart: () => void; onBack: () => void; loading: boolean;
}) {
  const router = useRouter();
  const previewDays = [1, 2, 3];

  return (
    <div>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "var(--gold)", fontSize: 13,
        fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        ← Retour
      </button>

      <div style={{
        background: "var(--card-bg)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: 24, marginBottom: 20,
        boxShadow: "var(--shadow-md)",
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{plan.emoji}</div>
        <h1 style={{ fontFamily: "var(--font-title)", fontSize: 22, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
          {plan.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
          {plan.description}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <span style={{ background: "rgba(212,175,55,0.15)", color: "var(--gold)", borderRadius: "var(--radius-full)", padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            ⏱ {plan.duration}
          </span>
          <span style={{ background: "var(--surface-2)", color: "var(--text-secondary)", borderRadius: "var(--radius-full)", padding: "4px 12px", fontSize: 12 }}>
            {LEVEL_LABELS[plan.level]}
          </span>
          {plan.goals.map((g) => (
            <span key={g} style={{ background: "var(--surface-2)", color: "var(--text-secondary)", borderRadius: "var(--radius-full)", padding: "4px 12px", fontSize: 12 }}>
              {GOAL_LABELS[g]}
            </span>
          ))}
        </div>
        <button onClick={onStart} disabled={loading} style={{
          background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
          color: "#000", border: "none", borderRadius: "var(--radius-md)",
          padding: "13px 28px", fontWeight: 700, fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-body)",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Démarrage..." : "▶ Commencer ce plan"}
        </button>
      </div>

      {/* Aperçu des 3 premiers jours */}
      <div style={{ fontFamily: "var(--font-title)", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Aperçu des lectures
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {previewDays.map((day) => {
          const reading = getDayReading(plan.id, day);
          return (
            <div key={day} style={{
              background: "var(--card-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                minWidth: 36, height: 36, borderRadius: "50%",
                background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "var(--gold)",
              }}>{day}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {reading.title}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {reading.passages.map((p, i) => (
                    <span key={i} onClick={() => router.push(`/bible/read/${encodeURIComponent(p.book)}/${p.chapter}`)} style={{
                      fontSize: 12, color: "var(--gold)", cursor: "pointer",
                      background: "rgba(212,175,55,0.08)", padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                    }}>
                      {p.book} {p.chapter}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: "8px 0" }}>
          … et {plan.totalDays - 3} autres jours
        </div>
      </div>
    </div>
  );
}
