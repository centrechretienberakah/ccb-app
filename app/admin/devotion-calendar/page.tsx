"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isModerator } from "@/lib/rbac";

const sb = createClient();

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Date du jour (YYYY-MM-DD) en fuseau Europe/Paris. */
function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

interface Month { id: string; year: number; month: number; label: string; theme: string; main_verse: string }
interface Week { id: string; month_id: string; week_no: number; theme: string }
interface Day { id: string; month_id: string; cal_date: string; day_no: number; week_no: number; day_theme: string; day_verse: string }

interface Generated {
  title: string; verse_ref: string; verse_text: string;
  content: string; application: string; prayer: string; declaration: string;
}

const card: React.CSSProperties = {
  background: "var(--card-bg)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-sm)", padding: 16,
};
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "var(--input-bg)",
  border: "1px solid var(--input-border)", borderRadius: "var(--radius-md)",
  padding: "8px 11px", fontSize: 13.5, color: "var(--text-primary)", outline: "none",
  fontFamily: "var(--font-body)",
};
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 };
const btnGold: React.CSSProperties = { background: "var(--gold)", color: "#1a0a00", fontWeight: 800, fontSize: 12.5, padding: "8px 14px", borderRadius: "var(--radius-full)", border: "none", cursor: "pointer", whiteSpace: "nowrap" };
const btnGhost: React.CSSProperties = { background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 700, fontSize: 12.5, padding: "7px 12px", borderRadius: "var(--radius-full)", border: "1px solid var(--border)", cursor: "pointer", whiteSpace: "nowrap" };

export default function DevotionCalendarPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [notifiedToday, setNotifiedToday] = useState<number | null>(null);

  const [months, setMonths] = useState<Month[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [days, setDays] = useState<Day[]>([]);

  // Formulaire « nouveau mois »
  const now = new Date();
  const [newYear, setNewYear] = useState(now.getFullYear());
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1);
  const [creating, setCreating] = useState(false);

  // Prévisualisation IA
  const [preview, setPreview] = useState<{ date: string; gen: Generated } | null>(null);
  const [busyDate, setBusyDate] = useState<string | null>(null);

  const flash = (type: "ok" | "err", text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const loadMonths = useCallback(async () => {
    const { data } = await sb.from("devotion_cal_months").select("*").order("year").order("month");
    setMonths((data as Month[] | null) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/auth/login?redirect=/admin/devotion-calendar"); return; }
      const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (!isModerator(roleRow?.role || "member")) { router.replace("/dashboard"); return; }
      setAllowed(true);
      await loadMonths();
      try {
        const { data } = await sb.rpc("devotion_push_count", { p_date: parisToday() });
        if (typeof data === "number") setNotifiedToday(data);
      } catch { /* RPC absente tant que v79 n'est pas exécutée */ }
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [router, loadMonths]);

  const selectMonth = useCallback(async (id: string) => {
    setSelId(id);
    const [{ data: w }, { data: d }] = await Promise.all([
      sb.from("devotion_cal_weeks").select("*").eq("month_id", id).order("week_no"),
      sb.from("devotion_cal_days").select("*").eq("month_id", id).order("day_no"),
    ]);
    setWeeks((w as Week[] | null) ?? []);
    setDays((d as Day[] | null) ?? []);
  }, []);

  async function createMonth() {
    setCreating(true);
    const label = `${MONTHS_FR[newMonth - 1]} ${newYear}`;
    const { data, error } = await sb
      .from("devotion_cal_months")
      .insert({ year: newYear, month: newMonth, label, theme: "", main_verse: "" })
      .select().single();
    if (error || !data) {
      flash("err", /duplicate|unique/i.test(error?.message || "") ? `« ${label} » existe déjà.` : `Erreur : ${error?.message ?? "inconnue"}`);
      setCreating(false);
      return;
    }
    const monthId = (data as Month).id;
    // Seed des semaines (1..N) et des jours du mois, sans écraser l'existant.
    const dim = new Date(newYear, newMonth, 0).getDate();
    const nbWeeks = Math.ceil(dim / 7);
    const weekRows = Array.from({ length: nbWeeks }, (_, i) => ({ month_id: monthId, week_no: i + 1, theme: "" }));
    const dayRows = Array.from({ length: dim }, (_, i) => {
      const d = i + 1;
      const mm = String(newMonth).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      return { month_id: monthId, cal_date: `${newYear}-${mm}-${dd}`, day_no: d, week_no: Math.ceil(d / 7), day_theme: "", day_verse: "" };
    });
    await sb.from("devotion_cal_weeks").upsert(weekRows, { onConflict: "month_id,week_no", ignoreDuplicates: true });
    await sb.from("devotion_cal_days").upsert(dayRows, { onConflict: "cal_date", ignoreDuplicates: true });
    await loadMonths();
    await selectMonth(monthId);
    flash("ok", `« ${label} » créé avec ${dim} jours à remplir.`);
    setCreating(false);
  }

  async function saveMonthMeta() {
    const m = months.find((x) => x.id === selId);
    if (!m) return;
    const { error } = await sb.from("devotion_cal_months")
      .update({ theme: m.theme, main_verse: m.main_verse, updated_at: new Date().toISOString() })
      .eq("id", m.id);
    flash(error ? "err" : "ok", error ? `Erreur : ${error.message}` : "Thème mensuel enregistré.");
  }

  async function saveWeek(wk: Week) {
    const { error } = await sb.from("devotion_cal_weeks").update({ theme: wk.theme }).eq("id", wk.id);
    flash(error ? "err" : "ok", error ? `Erreur : ${error.message}` : `Semaine ${wk.week_no} enregistrée.`);
  }

  async function saveDay(d: Day) {
    const { error } = await sb.from("devotion_cal_days")
      .update({ day_theme: d.day_theme, day_verse: d.day_verse, week_no: d.week_no, updated_at: new Date().toISOString() })
      .eq("id", d.id);
    flash(error ? "err" : "ok", error ? `Erreur : ${error.message}` : `Jour ${d.day_no} enregistré.`);
  }

  async function generate(date: string, persist: boolean) {
    setBusyDate(date);
    try {
      const res = await fetch("/api/devotion/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, persist }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { flash("err", data.error || "Échec de la génération."); return; }
      if (data.meditation) setPreview({ date, gen: data.meditation as Generated });
      if (persist) {
        if (data.alreadyExists) flash("ok", "Déjà publiée pour cette date (inchangée).");
        else if (data.published) flash("ok", "Méditation publiée pour cette date.");
        else flash("err", data.error || "Non publiée.");
      }
    } catch {
      flash("err", "Erreur réseau.");
    } finally {
      setBusyDate(null);
    }
  }

  const selMonth = months.find((m) => m.id === selId) || null;
  const updMonthField = (field: "theme" | "main_verse", v: string) =>
    setMonths((prev) => prev.map((m) => (m.id === selId ? { ...m, [field]: v } : m)));

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Chargement…</div>;
  if (!allowed) return null;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 96px" }}>
      <Link href="/admin" style={{ color: "var(--gold)", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>← Administration</Link>
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, margin: "12px 0 20px" }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", background: "var(--gold-pale)", color: "var(--gold-dark)", borderRadius: "var(--radius-full)", padding: "4px 12px" }}>Méditons ensemble</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "10px 0 4px", fontFamily: "var(--font-title)" }}>Calendrier éditorial</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Définis le thème + le verset de chaque jour. À minuit, l&apos;IA rédige la méditation au format habituel à partir de ces données. Sans thème défini, la rotation actuelle est conservée.
        </p>
        {notifiedToday !== null && (
          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "var(--gold-dark)", background: "var(--gold-pale)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "5px 12px" }}>
            🔔 {notifiedToday} membre{notifiedToday > 1 ? "s" : ""} notifié{notifiedToday > 1 ? "s" : ""} aujourd&apos;hui
          </div>
        )}
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13,
          background: msg.type === "ok" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
          color: msg.type === "ok" ? "var(--success, #16a34a)" : "#dc2626" }}>
          {msg.text}
        </div>
      )}

      {/* Sélecteur + création de mois */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: months.length ? 14 : 0 }}>
          {months.map((m) => (
            <button key={m.id} onClick={() => selectMonth(m.id)}
              style={{ ...(selId === m.id ? btnGold : btnGhost) }}>
              {m.label}{m.theme ? "" : " ·…"}
            </button>
          ))}
          {months.length === 0 && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Aucun mois encore. Crée le premier ci-dessous.</span>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
          <div><span style={lbl}>Mois</span>
            <select value={newMonth} onChange={(e) => setNewMonth(Number(e.target.value))} style={{ ...inp, width: 140 }}>
              {MONTHS_FR.map((nm, i) => <option key={i} value={i + 1}>{nm}</option>)}
            </select>
          </div>
          <div><span style={lbl}>Année</span>
            <input type="number" value={newYear} onChange={(e) => setNewYear(Number(e.target.value))} style={{ ...inp, width: 100 }} />
          </div>
          <button onClick={createMonth} disabled={creating} style={{ ...btnGold, opacity: creating ? 0.6 : 1 }}>
            {creating ? "Création…" : "+ Préparer ce mois"}
          </button>
        </div>
      </div>

      {selMonth && (
        <>
          {/* Thème mensuel + verset principal */}
          <div style={{ ...card, marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px" }}>📅 {selMonth.label} — thème du mois</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><span style={lbl}>Thème mensuel</span>
                <input value={selMonth.theme} onChange={(e) => updMonthField("theme", e.target.value)} placeholder="Ex : Nouveau commencement" style={inp} /></div>
              <div><span style={lbl}>Verset principal</span>
                <input value={selMonth.main_verse} onChange={(e) => updMonthField("main_verse", e.target.value)} placeholder="Ex : Ésaïe 43:18-19" style={inp} /></div>
            </div>
            <div style={{ marginTop: 12 }}><button onClick={saveMonthMeta} style={btnGold}>Enregistrer le thème du mois</button></div>
          </div>

          {/* Sous-thèmes hebdomadaires */}
          <div style={{ ...card, marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px" }}>🗓️ Sous-thèmes des semaines</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {weeks.map((wk) => (
                <div key={wk.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold-dark)", width: 90 }}>Semaine {wk.week_no}</span>
                  <input value={wk.theme} placeholder="Sous-thème de la semaine"
                    onChange={(e) => setWeeks((prev) => prev.map((x) => x.id === wk.id ? { ...x, theme: e.target.value } : x))}
                    style={{ ...inp, flex: 1, minWidth: 200 }} />
                  <button onClick={() => saveWeek(wk)} style={btnGhost}>Enregistrer</button>
                </div>
              ))}
            </div>
          </div>

          {/* Thèmes + versets journaliers */}
          <div style={{ ...card }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px" }}>📖 Thèmes &amp; versets du jour</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {days.map((d) => (
                <div key={d.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text-muted)", textAlign: "center" }}>{d.day_no}<br /><span style={{ fontSize: 9.5, fontWeight: 600 }}>S{d.week_no}</span></span>
                  <input value={d.day_theme} placeholder="Thème du jour"
                    onChange={(e) => setDays((prev) => prev.map((x) => x.id === d.id ? { ...x, day_theme: e.target.value } : x))}
                    style={inp} />
                  <input value={d.day_verse} placeholder="Verset (ex : Ésaïe 43:18)"
                    onChange={(e) => setDays((prev) => prev.map((x) => x.id === d.id ? { ...x, day_verse: e.target.value } : x))}
                    style={inp} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => saveDay(d)} style={btnGhost} title="Enregistrer ce jour">💾</button>
                    <button onClick={() => generate(d.cal_date, false)} disabled={busyDate === d.cal_date || !d.day_theme || !d.day_verse}
                      style={{ ...btnGhost, opacity: (busyDate === d.cal_date || !d.day_theme || !d.day_verse) ? 0.5 : 1 }} title="Prévisualiser la génération IA">
                      {busyDate === d.cal_date ? "…" : "👁️"}
                    </button>
                  </div>
                </div>
              ))}
              {days.length === 0 && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Aucun jour. Recrée le mois pour générer les jours.</span>}
            </div>
          </div>
        </>
      )}

      {/* Modal de prévisualisation */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)", margin: 0 }}>Prévisualisation — {preview.date}</h3>
              <button onClick={() => setPreview(null)} style={btnGhost}>✕</button>
            </div>
            <h4 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px" }}>{preview.gen.title}</h4>
            <p style={{ fontSize: 13, color: "var(--gold-dark)", fontWeight: 700, margin: "0 0 2px" }}>📖 {preview.gen.verse_ref}</p>
            <p style={{ fontSize: 14, fontStyle: "italic", color: "var(--text-secondary)", margin: "0 0 12px" }}>« {preview.gen.verse_text} »</p>
            {preview.gen.content.split("\n\n").map((p, i) => (
              <p key={i} style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 10px" }}>{p}</p>
            ))}
            {preview.gen.application && <p style={{ fontSize: 13.5, color: "var(--text-primary)", margin: "0 0 8px" }}><b>💡 Question :</b> {preview.gen.application}</p>}
            {preview.gen.prayer && <p style={{ fontSize: 13.5, color: "var(--text-secondary)", fontStyle: "italic", margin: "0 0 8px" }}><b>🙏 Prière :</b> {preview.gen.prayer}</p>}
            {preview.gen.declaration && <p style={{ fontSize: 13.5, color: "var(--text-primary)", fontWeight: 600, margin: "0 0 14px" }}><b>✦ Déclaration :</b> {preview.gen.declaration}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => generate(preview.date, false)} disabled={busyDate === preview.date} style={btnGhost}>↻ Régénérer</button>
              <button onClick={() => generate(preview.date, true)} disabled={busyDate === preview.date} style={btnGold}>Publier cette date</button>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "10px 0 0" }}>La méditation est générée automatiquement à minuit. « Publier » sert à pré-publier une date à l&apos;avance.</p>
          </div>
        </div>
      )}
    </div>
  );
}
