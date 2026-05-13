"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SUBJECTS = [
  "Conseil spirituel",
  "Accompagnement biblique",
  "Priere personnelle",
  "Mariage / Couple",
  "Famille",
  "Bapteme / Engagement",
  "Autre",
];

const TIMES = ["08h00","09h00","10h00","11h00","14h00","15h00","16h00","17h00"];

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--page-bg)", border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)", padding: "11px 14px", color: "var(--text-primary)",
  fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.5,
  textTransform: "uppercase", display: "block", marginBottom: 6,
};

export default function RendezVousPage() {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "",
    subject: SUBJECTS[0], message: "",
    preferred_date: "", preferred_time: TIMES[2],
    modality: "presentiel" as "presentiel" | "visio" | "telephone",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim() || !form.preferred_date) {
      setError("Veuillez remplir les champs obligatoires : nom, telephone, date.");
      return;
    }
    setSending(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Vous devez etre connecte pour prendre rendez-vous."); setSending(false); return; }

    // 1. Save to DB
    const { error: dbErr } = await supabase.from("pastoral_appointments").insert({
      user_id: user.id,
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || null,
      subject: form.subject,
      message: form.message || null,
      preferred_date: form.preferred_date,
      preferred_time: form.preferred_time,
      modality: form.modality,
      status: "pending",
    });
    if (dbErr) { setError(dbErr.message); setSending(false); return; }

    // 2. Send email notification to pastor
    const dateLabel = new Date(form.preferred_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const modalityLabel = { presentiel: "Présentiel 🏛️", visio: "Visioconférence 📹", telephone: "Téléphone 📞" }[form.modality];
    try {
      await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyTo: form.email || undefined,
          subject: `[CCB RDV] ${form.subject} — ${form.full_name} · ${dateLabel}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:8px">
                🗓️ Nouvelle demande de rendez-vous pastoral
              </h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;font-weight:600;color:#555;width:150px">Demandeur</td><td style="padding:8px 0;font-weight:700">${form.full_name}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;color:#555">Téléphone</td><td style="padding:8px 0">${form.phone}</td></tr>
                ${form.email ? `<tr><td style="padding:8px 0;font-weight:600;color:#555">Email</td><td style="padding:8px 0"><a href="mailto:${form.email}">${form.email}</a></td></tr>` : ""}
                <tr><td style="padding:8px 0;font-weight:600;color:#555">Sujet</td><td style="padding:8px 0"><strong>${form.subject}</strong></td></tr>
                <tr><td style="padding:8px 0;font-weight:600;color:#555">Date souhaitée</td><td style="padding:8px 0;font-weight:700;color:#7c3aed">${dateLabel} à ${form.preferred_time}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;color:#555">Modalité</td><td style="padding:8px 0">${modalityLabel}</td></tr>
              </table>
              ${form.message ? `
              <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
              <h3 style="margin:0 0 10px;color:#333">Message :</h3>
              <div style="background:#f9f9f9;padding:16px;border-radius:8px;line-height:1.7;color:#333">
                ${form.message.replace(/\n/g, "<br/>")}
              </div>` : ""}
              <div style="margin-top:20px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px">
                <strong>Action requise :</strong> Contactez ${form.full_name} au ${form.phone} pour confirmer le créneau.
              </div>
              <p style="margin-top:16px;font-size:12px;color:#999">
                Reçu via l'application CCB Admin · <a href="https://centrechretienberakah.com/admin">Voir dans l'admin →</a>
              </p>
            </div>
          `,
        }),
      });
    } catch {
      // Email non critique
    }

    setSent(true);
    setSending(false);
  }

  if (sent) {
    return (
      <div style={{ background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 16px", fontFamily: "var(--font-body)" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(124,58,237,0.15)", border: "2px solid var(--violet-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36 }}>🗓️</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>Demande envoyée !</h2>
          <p style={{ margin: "0 0 8px", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            Merci {form.full_name.split(" ")[0]}. Votre demande de rendez-vous le{" "}
            <strong>{new Date(form.preferred_date).toLocaleDateString("fr-FR")}</strong>{" "}à <strong>{form.preferred_time}</strong> a bien été reçue.
          </p>
          <p style={{ margin: "0 0 24px", color: "var(--text-muted)", fontSize: 13 }}>
            Le pasteur vous contactera pour confirmer le créneau. Que Dieu vous bénisse !
          </p>
          <button onClick={() => { setSent(false); setForm({ full_name: "", phone: "", email: "", subject: SUBJECTS[0], message: "", preferred_date: "", preferred_time: TIMES[2], modality: "presentiel" }); }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "11px 24px", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Nouvelle demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--page-bg)", fontFamily: "var(--font-body)", color: "var(--text-primary)" }}>
      <div style={{ background: "linear-gradient(135deg, #7c3aed20, #7c3aed40)", borderBottom: "1px solid var(--border)", padding: "28px 20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🗓️</div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>Rendez-vous Pastoral</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Accompagnement confidentiel avec le Rév. Elvis NGUIFFO</p>
      </div>

      <div style={{ maxWidth: 560, margin: "20px auto 0", padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {([
            { key: "presentiel", icon: "🏛️", label: "Présentiel" },
            { key: "visio",      icon: "📹", label: "Visio" },
            { key: "telephone",  icon: "📞", label: "Téléphone" },
          ] as const).map((m) => (
            <button key={m.key} onClick={() => setForm({ ...form, modality: m.key })}
              style={{ padding: "14px 10px", background: form.modality === m.key ? "rgba(124,58,237,0.15)" : "var(--card-bg)", border: `1px solid ${form.modality === m.key ? "var(--violet-light)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{m.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: form.modality === m.key ? "var(--violet-light)" : "var(--text-muted)", marginTop: 4, fontFamily: "inherit" }}>{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 32px" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px 20px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Nom complet *</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jean Dupont" style={inputStyle} required /></div>
              <div><label style={labelStyle}>Téléphone *</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+237 6..." style={inputStyle} required /></div>
            </div>
            <div><label style={labelStyle}>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@email.com" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Sujet de la rencontre *</label>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ ...inputStyle, appearance: "auto" as never }}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Date souhaitée *</label><input type="date" value={form.preferred_date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} style={inputStyle} required /></div>
              <div>
                <label style={labelStyle}>Heure *</label>
                <select value={form.preferred_time} onChange={(e) => setForm({ ...form, preferred_time: e.target.value })} style={{ ...inputStyle, appearance: "auto" as never }}>
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>Message (optionnel)</label><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Précisez votre demande si vous le souhaitez..." rows={4} style={{ ...inputStyle, resize: "vertical" }} /></div>
            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--error)", fontSize: 12 }}>{error}</div>}
            <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "var(--radius-lg)", padding: "10px 14px", fontSize: 12, color: "var(--text-muted)" }}>
              🔒 Votre demande est confidentielle et ne sera visible que par le pasteur.
            </div>
            <button type="submit" disabled={sending} style={{ background: "linear-gradient(135deg, var(--violet-dark), var(--violet-light))", border: "none", borderRadius: "var(--radius-full)", padding: "13px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Envoi en cours..." : "✅ Envoyer ma demande"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
