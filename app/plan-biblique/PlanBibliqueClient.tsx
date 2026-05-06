"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlanDefinition, getDayReading, getCurrentDay } from "@/lib/bible/plans";

interface UserBiblePlan {
  id?: string;
  plan_id: string;
  start_date: string;
  is_active: boolean;
  reminder_time?: string;
}

interface ReadingProgress {
  day_number: number;
  book_name: string;
  chapter: number;
}

interface Props {
  userId: string;
  plans: PlanDefinition[];
  activePlan: UserBiblePlan | null;
  userPlans: { plan_id: string; start_date: string; is_active: boolean }[];
  progress: ReadingProgress[];
}

export default function PlanBibliqueClient({
  userId,
  plans,
  activePlan: initialActivePlan,
  userPlans: initialUserPlans,
  progress: initialProgress,
}: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<"active" | "browse">(initialActivePlan ? "active" : "browse");
  const [activePlan, setActivePlan] = useState(initialActivePlan);
  const [userPlans, setUserPlans] = useState(initialUserPlans);
  const [progress, setProgress] = useState(initialProgress);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const activePlanDef = activePlan
    ? plans.find((p) => p.id === activePlan.plan_id) ?? null
    : null;

  const currentDay = activePlan ? getCurrentDay(activePlan.start_date) : 0;
  const daysRead = new Set(progress.map((p) => p.day_number)).size;
  const pct = activePlanDef
    ? Math.min(100, Math.round((daysRead / activePlanDef.totalDays) * 100))
    : 0;

  const todayReading = activePlanDef
    ? getDayReading(activePlanDef.id, Math.min(currentDay, activePlanDef.totalDays))
    : null;

  const todayMarked =
    todayReading && activePlan
      ? todayReading.refs.every((ref) =>
          progress.some(
            (p) =>
              p.day_number === Math.min(currentDay, activePlanDef!.totalDays) &&
              p.book_name === ref.book &&
              p.chapter === ref.chapter
          )
        )
      : false;

  // Streak: consecutive days from currentDay going backwards
  function computeStreak() {
    const daysSet = new Set(progress.map((p) => p.day_number));
    let streak = 0;
    let d = Math.min(currentDay, activePlanDef?.totalDays ?? currentDay);
    while (d >= 1 && daysSet.has(d)) {
      streak++;
      d--;
    }
    return streak;
  }
  const streak = activePlan ? computeStreak() : 0;

  async function markTodayRead() {
    if (!activePlan || !todayReading) return;
    const day = Math.min(currentDay, activePlanDef?.totalDays ?? currentDay);
    const rows = todayReading.refs.map((ref) => ({
      user_id: userId,
      plan_id: activePlan.plan_id,
      day_number: day,
      book_name: ref.book,
      chapter: ref.chapter,
    }));
    const { error } = await supabase
      .from("user_reading_progress")
      .upsert(rows, { onConflict: "user_id,plan_id,book_name,chapter" });
    if (error) {
      showToast("Erreur : " + error.message);
      return;
    }
    setProgress((prev) => {
      const existing = new Set(
        prev.map((p) => `${p.plan_id ?? activePlan.plan_id}-${p.book_name}-${p.chapter}`)
      );
      const toAdd = rows
        .filter((r) => !existing.has(`${r.plan_id}-${r.book_name}-${r.chapter}`))
        .map((r) => ({ day_number: r.day_number, book_name: r.book_name, chapter: r.chapter }));
      return [...prev, ...toAdd];
    });
    showToast("✅ Lecture du jour marquée !");
  }

  async function startPlan(planId: string) {
    setLoadingPlan(planId);
    try {
      // Deactivate all current plans
      await supabase
        .from("user_bible_plans")
        .update({ is_active: false })
        .eq("user_id", userId);

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("user_bible_plans")
        .upsert(
          { user_id: userId, plan_id: planId, start_date: today, is_active: true },
          { onConflict: "user_id,plan_id" }
        )
        .select()
        .single();

      if (error) throw error;

      setActivePlan(data);
      setUserPlans((prev) => {
        const updated = prev.map((p) => ({ ...p, is_active: p.plan_id === planId }));
        if (!updated.find((p) => p.plan_id === planId)) {
          updated.push({ plan_id: planId, start_date: today, is_active: true });
        }
        return updated;
      });
      setProgress([]);
      setTab("active");
      showToast("Plan démarré ! Bonne lecture 📖");
    } catch (e: any) {
      showToast("Erreur : " + e.message);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", paddingBottom: 80 }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "10px 20px",
            fontSize: 13,
            color: "var(--text-primary)",
            zIndex: 9999,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: "var(--header-gradient)",
          borderBottom: "1px solid var(--border)",
          padding: "24px 20px 20px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-title)",
            color: "var(--gold)",
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
          }}
        >
          📖 Plan Biblique
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "4px 0 0" }}>
          {activePlanDef ? activePlanDef.name : "Choisissez votre plan de lecture"}
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          background: "var(--card-bg)",
          padding: "0 20px",
        }}
      >
        {[
          { key: "active", label: "Mon Plan" },
          { key: "browse", label: "Parcourir" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "active" | "browse")}
            style={{
              background: "none",
              border: "none",
              padding: "14px 16px",
              color: tab === t.key ? "var(--gold)" : "var(--text-muted)",
              fontWeight: tab === t.key ? 700 : 400,
              fontSize: 14,
              cursor: "pointer",
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px" }}>
        {/* ─── MON PLAN TAB ─── */}
        {tab === "active" && (
          <>
            {activePlan && activePlanDef ? (
              <>
                {/* Progress card */}
                <div
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: 20,
                    marginBottom: 16,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: `linear-gradient(90deg, ${activePlanDef.color}, ${activePlanDef.color}88)`,
                    }}
                  />

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                    <div
                      style={{
                        background: `${activePlanDef.color}22`,
                        border: `1px solid ${activePlanDef.color}55`,
                        borderRadius: "var(--radius-md)",
                        padding: "4px 10px",
                        fontSize: 11,
                        color: activePlanDef.color,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {activePlanDef.badge}
                    </div>
                    <div>
                      <h2
                        style={{
                          color: "var(--text-primary)",
                          fontSize: 16,
                          fontWeight: 700,
                          margin: 0,
                          fontFamily: "var(--font-title)",
                        }}
                      >
                        {activePlanDef.name}
                      </h2>
                      <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "3px 0 0" }}>
                        Commencé le{" "}
                        {new Date(activePlan.start_date + "T00:00:00").toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Progression</span>
                      <span style={{ fontSize: 12, color: activePlanDef.color, fontWeight: 700 }}>
                        {pct}%
                      </span>
                    </div>
                    <div
                      style={{ height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${activePlanDef.color}cc, ${activePlanDef.color})`,
                          borderRadius: 4,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Jours lus", value: String(daysRead) },
                      {
                        label: "Jour actuel",
                        value: `J${Math.min(currentDay, activePlanDef.totalDays)}`,
                      },
                      { label: "Série", value: streak > 0 ? `${streak} 🔥` : "0" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          background: "var(--surface)",
                          borderRadius: "var(--radius-md)",
                          padding: "10px 6px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {stat.value}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Today's reading */}
                {todayReading && (
                  <div
                    style={{
                      background: "var(--card-bg)",
                      border: todayMarked
                        ? "1px solid var(--success)"
                        : "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      padding: 20,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            color: "var(--text-primary)",
                            fontSize: 15,
                            fontWeight: 700,
                            margin: 0,
                          }}
                        >
                          📅 Lecture du jour
                        </h3>
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "3px 0 0" }}>
                          Jour {Math.min(currentDay, activePlanDef.totalDays)} / {activePlanDef.totalDays}
                        </p>
                      </div>
                      {todayMarked && (
                        <span
                          style={{ color: "var(--success)", fontSize: 13, fontWeight: 700 }}
                        >
                          ✓ Lu
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: todayMarked ? 0 : 16,
                      }}
                    >
                      {todayReading.refs.map((ref, i) => (
                        <div
                          key={i}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-md)",
                            padding: "6px 12px",
                            fontSize: 13,
                            color: "var(--text-primary)",
                            fontWeight: 500,
                          }}
                        >
                          {ref.book} {ref.chapter}
                        </div>
                      ))}
                    </div>

                    {!todayMarked && (
                      <button
                        onClick={markTodayRead}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                          border: "none",
                          borderRadius: "var(--radius-md)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        ✓ Marquer comme lu
                      </button>
                    )}
                  </div>
                )}

                {/* 30-day heatmap */}
                <div
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: 20,
                    marginBottom: 16,
                  }}
                >
                  <h3
                    style={{
                      color: "var(--text-primary)",
                      fontSize: 15,
                      fontWeight: 700,
                      margin: "0 0 14px",
                    }}
                  >
                    📊 Derniers 30 jours
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(10, 1fr)",
                      gap: 4,
                    }}
                  >
                    {Array.from({ length: 30 }, (_, i) => {
                      const dayNum = Math.max(1, Math.min(currentDay, activePlanDef.totalDays) - 29 + i);
                      const read = progress.some((p) => p.day_number === dayNum);
                      const isToday =
                        dayNum === Math.min(currentDay, activePlanDef.totalDays);
                      return (
                        <div
                          key={i}
                          title={`Jour ${dayNum}${read ? " ✓" : ""}`}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 4,
                            background: read
                              ? activePlanDef.color
                              : isToday
                              ? `${activePlanDef.color}33`
                              : "var(--surface)",
                            border: isToday
                              ? `1px solid ${activePlanDef.color}`
                              : "1px solid transparent",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      marginTop: 10,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: activePlanDef.color,
                          display: "inline-block",
                        }}
                      />{" "}
                      Lu
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          display: "inline-block",
                        }}
                      />{" "}
                      Non lu
                    </span>
                  </div>
                </div>

                {/* Switch plan CTA */}
                <button
                  onClick={() => setTab("browse")}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Changer de plan →
                </button>
              </>
            ) : (
              /* No active plan */
              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 36,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 52, marginBottom: 16 }}>📖</div>
                <h3
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 18,
                    fontWeight: 700,
                    margin: "0 0 10px",
                    fontFamily: "var(--font-title)",
                  }}
                >
                  Aucun plan actif
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    margin: "0 0 22px",
                    lineHeight: 1.6,
                  }}
                >
                  Commencez votre aventure dans la Parole de Dieu en choisissant un plan de lecture.
                </p>
                <button
                  onClick={() => setTab("browse")}
                  style={{
                    padding: "12px 28px",
                    background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Choisir un plan →
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── PARCOURIR TAB ─── */}
        {tab === "browse" && (
          <>
            <h3
              style={{
                color: "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                margin: "0 0 12px",
              }}
            >
              Plans Systématiques
            </h3>
            {plans
              .filter((p) => p.category === "systematic")
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isActive={activePlan?.plan_id === plan.id}
                  wasStarted={userPlans.some((up) => up.plan_id === plan.id)}
                  loading={loadingPlan === plan.id}
                  onStart={() => startPlan(plan.id)}
                />
              ))}

            <h3
              style={{
                color: "var(--text-secondary)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                margin: "22px 0 12px",
              }}
            >
              Plans Thématiques
            </h3>
            {plans
              .filter((p) => p.category === "thematic")
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isActive={activePlan?.plan_id === plan.id}
                  wasStarted={userPlans.some((up) => up.plan_id === plan.id)}
                  loading={loadingPlan === plan.id}
                  onStart={() => startPlan(plan.id)}
                />
              ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Plan card ── */
function PlanCard({
  plan,
  isActive,
  wasStarted,
  loading,
  onStart,
}: {
  plan: PlanDefinition;
  isActive: boolean;
  wasStarted: boolean;
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: isActive ? `1px solid ${plan.color}` : "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 16px 16px 20px",
        marginBottom: 12,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: plan.color,
        }}
      />

      {/* Badges row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10,
            color: plan.color,
            background: `${plan.color}20`,
            border: `1px solid ${plan.color}44`,
            padding: "2px 9px",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          {plan.badge}
        </span>
        {isActive && (
          <span
            style={{
              fontSize: 10,
              color: "var(--success)",
              background: "rgba(74,222,128,0.12)",
              border: "1px solid rgba(74,222,128,0.35)",
              padding: "2px 9px",
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            ✓ Plan actif
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <h4
            style={{
              color: "var(--text-primary)",
              fontSize: 14,
              fontWeight: 700,
              margin: "0 0 5px",
              fontFamily: "var(--font-title)",
            }}
          >
            {plan.name}
          </h4>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            {plan.description}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: plan.color }}>{plan.totalDays}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>jours</div>
        </div>
      </div>

      {!isActive && (
        <button
          onClick={onStart}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: 12,
            background: loading ? "var(--surface)" : `${plan.color}18`,
            border: `1px solid ${plan.color}44`,
            borderRadius: "var(--radius-md)",
            color: loading ? "var(--text-muted)" : plan.color,
            fontWeight: 700,
            fontSize: 13,
            cursor: loading ? "wait" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Démarrage…" : wasStarted ? "Reprendre ce plan" : "Démarrer ce plan"}
        </button>
      )}
    </div>
  );
}
