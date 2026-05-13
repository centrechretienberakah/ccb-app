"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SUBJECTS = [
  "Informations générales",
  "Demande de prière",
  "Rendez-vous pastoral",
  "Partenariat / Dons",
  "Problème technique (app)",
  "Autre",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--page-bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "11px 14px",
  color: "var(--text-primary)",
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "inherit",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  letterSpacing: 0.5,
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

export default function ContactPage() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    subject: SUBJECTS[0],
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (form.message.length < 10) {
      setError("Votre message doit contenir au moins 10 caractères.");
      return;
    }
    setSending(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Save to DB
    const { error: dbErr } = await supabase.from("contact_messages").insert({
      user_id: user?.id ?? null,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      subject: form.subject,
      message: form.message,
    });
    if (dbErr) { setError(dbErr.message); setSending(false); return; }

    // 2. Send email notification to CCB
    try {
      await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyTo: form.email,
          subject: `[CCB Contact] ${form.subject} — ${form.full_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#d4af37;border-bottom:2px solid #d4af37;padding-bottom:8px">
                📬 Nouveau message de contact — CCB
              </h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;font-weight:600;color:#555;width:130px">Nom complet</td><td style="padding:8px 0">${form.full_name}</td></tr>
                <tr><td style="padding:8px 0;font-weight:600;color:#555">Email</td><td style="padding:8px 0"><a href="mailto:${form.email}">${form.email}</a></td></tr>
                ${form.phone ? `<tr><td style="padding:8px 0;font-weight:600;color:#555">Téléphone</td><td style="padding:8px 0">${form.phone}</td></tr>` : ""}
                <tr><td style="padding:8px 0;font-weight:600;color:#555">Sujet</td><td style="padding:8px 0"><strong>${form.subject}</strong></td></tr>
              </table>
              <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
              <h3 style="margin:0 0 10px;color:#333">Message :</h3>
              <div style="background:#f9f9f9;padding:16px;border-radius:8px;line-height:1.7;color:#333">
                ${form.message.replace(/\n/g, "<br/>")}
              </div>
              <p style="margin-top:20px;font-size:12px;color:#999">
                Reçu via l'application CCB · <a href="https://centrechretienberakah.com">centrechretienberakah.com</a>
              </p>
            </div>
          `,
        }),
      });
    } catch {
      // Email non critique — DB save déjà réussi
    }

    setSent(true);
    setSending(false);
  }

  if (sent) {
    return (
      <div style={{ background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 16px", fontFamily: "var(--font-body)" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(5,150,105,0.15)", border: "2px solid #059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36 }}>✅</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>Message envoyé !</h2>
          <p style={{ margin: "0 0 24px", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            Merci {form.full_name.split(" ")[0]}. Notre équipe vous répondra dans les plus brefs délais. Que Dieu vous bénisse !
          </p>
          <button onClick={() => { setSent(false); setForm({ full_name: "", email: "", phone: "", subject: SUBJECTS[0], message: "" }); }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "11px 24px", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--page-bg)", fontFamily: "var(--font-body)", color: "var(--text-primary)" }}>
      <div style={{ background: "linear-gradient(135deg, #05966920, #05966940)", borderBottom: "1px solid var(--border)", padding: "28px 20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📬</div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>Nous Contacter</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{"L'équipe CCB répond généralement en 24–48h"}</p>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {[
          { icon: "🌐", label: "Église en ligne" },
          { icon: "📞", label: "+32 465 98 69 54" },
          { icon: "📧", label: "centrechretienberakah@gmail.com" },
        ].map((item) => (
          <div key={item.label} style={{ flex: 1, minWidth: 100, padding: "14px 10px", textAlign: "center", borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 32px" }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px 20px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>✉️ Formulaire de contact</h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nom complet *</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jean Dupont" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+237 6..." style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@email.com" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Sujet *</label>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ ...inputStyle, appearance: "auto" as never }}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Message * ({form.message.length}/2000)</label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Écrivez votre message ici..." rows={5} maxLength={2000} style={{ ...inputStyle, resize: "vertical", minHeight: 120 }} required />
            </div>
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--error)", fontSize: 12 }}>{error}</div>
            )}
            <button type="submit" disabled={sending} style={{ background: "linear-gradient(135deg, #047857, #059669)", border: "none", borderRadius: "var(--radius-full)", padding: "13px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Envoi en cours..." : "📤 Envoyer le message"}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 20, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-title)" }}>🕐 Horaires des cultes</h3>
          {[
            { jour: "Dimanche", heure: "9h00 — Culte principal" },
            { jour: "Mercredi", heure: "18h30 — Étude biblique" },
            { jour: "Vendredi", heure: "18h30 — Prière & Intercession" },
          ].map((h) => (
            <div key={h.jour} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{h.jour}</span>
              <span style={{ fontSize: 13, color: "var(--gold)" }}>{h.heure}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
