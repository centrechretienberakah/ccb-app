"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DONS_THEME as T,
  DONS_FONTS as F,
  DONATION_KINDS, type DonationKind, getKind,
  type DonationCampaign,
  formatAmount,
  campaignProgress,
} from "@/lib/dons/theme";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uploadFile(file: File): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `dons/campaigns/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
  if (upErr) { alert("Erreur upload : " + upErr.message); return null; }
  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminDonsClient({ initialCampaigns }: { initialCampaigns: DonationCampaign[] }) {
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>(initialCampaigns);
  const [editing, setEditing] = useState<DonationCampaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [adjusting, setAdjusting] = useState<DonationCampaign | null>(null);

  function refresh(c: DonationCampaign) {
    setCampaigns((arr) => {
      const idx = arr.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = arr.slice(); next[idx] = c; return next; }
      return [...arr, c].sort((a, b) =>
        (a.is_featured === b.is_featured ? 0 : a.is_featured ? -1 : 1) || a.order_index - b.order_index
      );
    });
  }
  function remove(id: string) { setCampaigns((arr) => arr.filter((c) => c.id !== id)); }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: F.body }}>
      {/* Header */}
      <header style={{
        padding: "24px 24px 12px", maxWidth: 1200, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
            <Link href="/dons" style={{ color: T.textMuted, textDecoration: "none" }}>💝 Dons</Link>
            <span style={{ margin: "0 8px" }}>›</span>
            <span>Admin</span>
          </div>
          <h1 style={{ fontFamily: F.title, fontSize: 26, margin: 0, fontWeight: 800, color: T.text }}>
            ⚙️ Console Dons & Campagnes
          </h1>
          <p style={{ color: T.textMuted, margin: "4px 0 0", fontSize: 13 }}>
            {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setCreating(true)} style={primaryBtn}>＋ Nouvelle campagne</button>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 80px" }}>
        {campaigns.length === 0 ? (
          <div style={{
            padding: "50px 24px", textAlign: "center",
            background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
            <h3 style={{ fontFamily: F.title, margin: "0 0 6px", fontSize: 20 }}>Aucune campagne</h3>
            <p style={{ color: T.textMuted, fontSize: 14, margin: "0 0 16px" }}>
              Lance ta première campagne pour mobiliser la communauté.
            </p>
            <button onClick={() => setCreating(true)} style={primaryBtn}>＋ Créer une campagne</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c}
                onEdit={() => setEditing(c)}
                onAdjust={() => setAdjusting(c)}
                onDelete={async () => {
                  if (!confirm(`Supprimer définitivement "${c.title}" ?`)) return;
                  const supabase = createClient();
                  const { error } = await supabase.from("donations_campaigns").delete().eq("id", c.id);
                  if (error) { alert("Erreur : " + error.message); return; }
                  remove(c.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {(creating || editing) ? (
        <CampaignForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(c) => { refresh(c); setCreating(false); setEditing(null); }}
        />
      ) : null}

      {adjusting ? (
        <AdjustAmountForm
          campaign={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={(c) => { refresh(c); setAdjusting(null); }}
        />
      ) : null}
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────
function CampaignRow({ campaign, onEdit, onAdjust, onDelete }: {
  campaign: DonationCampaign; onEdit: () => void; onAdjust: () => void; onDelete: () => void;
}) {
  const pct = campaignProgress(campaign);
  const k = getKind(campaign.kind);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 16, alignItems: "center",
      padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <div style={{
        position: "relative", aspectRatio: "16/9",
        background: campaign.cover_url ? "#000" : `linear-gradient(135deg, ${k.color}, ${T.violetDark})`,
        borderRadius: 8, overflow: "hidden",
      }}>
        {campaign.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 28,
          }}>{k.emoji}</div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          {!campaign.is_active ? <Tag color={T.textMuted}>📝 Désactivée</Tag> : null}
          {campaign.is_featured ? <Tag color={T.gold} dark>⭐ Featured</Tag> : null}
          <Tag color={k.color}>{k.emoji} {k.label}</Tag>
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 4 }}>{campaign.title}</div>
        <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>/{campaign.slug} · {campaign.donors_count} donateur{campaign.donors_count > 1 ? "s" : ""}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 6, background: T.surface2, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${k.color}, ${T.gold})` }} />
          </div>
          <span style={{ fontSize: 12, color: T.violet, fontWeight: 800, whiteSpace: "nowrap" }}>{pct}%</span>
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {formatAmount(campaign.current_amount_xaf, "XAF")} / {formatAmount(campaign.target_amount_xaf, "XAF")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onAdjust} title="Ajuster le montant" style={{ ...iconBtn, color: T.gold, borderColor: T.gold }}>💰</button>
        <button onClick={onEdit} title="Modifier" style={iconBtn}>✏️</button>
        <button onClick={onDelete} title="Supprimer" style={{ ...iconBtn, color: T.heart, borderColor: T.heartSoft }}>🗑️</button>
      </div>
    </div>
  );
}

function Tag({ children, color, dark = false }: { children: React.ReactNode; color: string; dark?: boolean }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4,
      background: dark ? color : `${color}1f`,
      color: dark ? "#000" : color,
      border: `1px solid ${color}55`,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
    }}>{children}</span>
  );
}

// ─── Modal wrapper ──────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, zIndex: 100, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto",
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
        boxShadow: T.shadowMd, display: "flex", flexDirection: "column",
      }}>
        <header style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: F.title, margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{title}</h2>
          <button onClick={onClose} aria-label="Fermer" style={{
            width: 32, height: 32, borderRadius: 8, background: T.surface2,
            border: "none", color: T.text, fontSize: 18, cursor: "pointer",
          }}>×</button>
        </header>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <footer style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {footer}
        </footer>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 11, color: T.textMuted }}>{hint}</span> : null}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px", background: T.surface2, color: T.text,
  border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 18px", background: T.violet, color: "#fff", border: "none",
  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  padding: "10px 18px", background: T.surface2, color: T.text,
  border: `1px solid ${T.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  background: T.card, border: `1px solid ${T.border}`,
  color: T.text, cursor: "pointer", fontSize: 14,
};

// ─── Campaign form ──────────────────────────────────────────────────
function CampaignForm({ initial, onClose, onSaved }: {
  initial: DonationCampaign | null; onClose: () => void; onSaved: (c: DonationCampaign) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [kind, setKind] = useState<DonationKind>(initial?.kind ?? "project");
  const [target, setTarget] = useState<number | "">(initial?.target_amount_xaf ?? "");
  const [current, setCurrent] = useState<number | "">(initial?.current_amount_xaf ?? 0);
  const [donors, setDonors] = useState<number | "">(initial?.donors_count ?? 0);
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [endsAt, setEndsAt] = useState<string>(
    initial?.ends_at ? new Date(initial.ends_at).toISOString().slice(0, 10) : ""
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [busy, setBusy] = useState(false);

  const finalSlug = slug.trim() || slugify(title);

  async function handleSave() {
    if (busy) return;
    if (!title.trim()) { alert("Titre requis"); return; }
    if (target === "" || Number(target) <= 0) { alert("Objectif requis (> 0)"); return; }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      title: title.trim(), slug: finalSlug,
      subtitle: subtitle.trim() || null, description: description.trim() || null,
      kind,
      target_amount_xaf: Number(target),
      current_amount_xaf: current === "" ? 0 : Number(current),
      donors_count: donors === "" ? 0 : Number(donors),
      cover_url: coverUrl.trim() || null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      is_active: isActive, is_featured: isFeatured, order_index: orderIndex,
    };
    let result;
    if (initial) {
      result = await supabase.from("donations_campaigns").update(payload).eq("id", initial.id).select().single();
    } else {
      result = await supabase.from("donations_campaigns").insert(payload).select().single();
    }
    setBusy(false);
    if (result.error) { alert("Erreur : " + result.error.message); return; }
    onSaved(result.data as DonationCampaign);
  }

  async function handleUploadCover(file: File) {
    setBusy(true);
    const url = await uploadFile(file);
    setBusy(false);
    if (url) setCoverUrl(url);
  }

  return (
    <Modal
      title={initial ? `Modifier — ${initial.title}` : "Nouvelle campagne"}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} style={secondaryBtn}>Annuler</button>
        <button onClick={handleSave} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Enregistrement..." : initial ? "Enregistrer" : "Publier"}
        </button>
      </>}>
      <Field label="Titre *">
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Slug" hint={`URL : /dons (référence interne ${finalSlug || "..."})`}>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(title)} style={inputStyle} />
      </Field>
      <Field label="Sous-titre / accroche">
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      <Field label="Type">
        <select value={kind} onChange={(e) => setKind(e.target.value as DonationKind)} style={inputStyle}>
          {DONATION_KINDS.map((k) => <option key={k.id} value={k.id}>{k.emoji} {k.label}</option>)}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Objectif (XAF) *">
          <input type="number" min="0" value={target}
            onChange={(e) => setTarget(e.target.value === "" ? "" : parseInt(e.target.value))}
            placeholder="50000000" style={inputStyle} />
        </Field>
        <Field label="Déjà collecté (XAF)">
          <input type="number" min="0" value={current}
            onChange={(e) => setCurrent(e.target.value === "" ? "" : parseInt(e.target.value))}
            style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Nombre donateurs">
          <input type="number" min="0" value={donors}
            onChange={(e) => setDonors(e.target.value === "" ? "" : parseInt(e.target.value))}
            style={inputStyle} />
        </Field>
        <Field label="Date de fin (optionnelle)">
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Ordre">
          <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)} style={inputStyle} />
        </Field>
      </div>

      <Field label="Cover URL (image 16:9)">
        <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        <input type="file" accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); }}
          style={{ marginTop: 6, fontSize: 12 }} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Toggle label="📢 Active (visible)"      value={isActive}   onChange={setIsActive} />
        <Toggle label="⭐ Mise en avant (Hero)" value={isFeatured} onChange={setIsFeatured} />
      </div>
    </Modal>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void; }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", background: T.surface2, border: `1px solid ${T.border}`,
      borderRadius: 8, cursor: "pointer", fontSize: 13,
    }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

// ─── Adjust amount form ─────────────────────────────────────────────
function AdjustAmountForm({ campaign, onClose, onSaved }: {
  campaign: DonationCampaign; onClose: () => void; onSaved: (c: DonationCampaign) => void;
}) {
  const [addAmount, setAddAmount] = useState<number | "">("");
  const [addDonors, setAddDonors] = useState<number | "">(1);
  const [busy, setBusy] = useState(false);

  const preview = (addAmount === "" ? 0 : Number(addAmount)) + campaign.current_amount_xaf;

  async function handleAdd(sign: 1 | -1) {
    if (busy) return;
    const delta = addAmount === "" ? 0 : Number(addAmount);
    if (delta === 0) { alert("Saisis un montant"); return; }
    setBusy(true);
    const supabase = createClient();
    const newAmount = Math.max(0, campaign.current_amount_xaf + sign * delta);
    const donorsDelta = addDonors === "" ? 0 : Number(addDonors);
    const newDonors = Math.max(0, campaign.donors_count + sign * donorsDelta);
    const { data, error } = await supabase
      .from("donations_campaigns")
      .update({ current_amount_xaf: newAmount, donors_count: newDonors })
      .eq("id", campaign.id).select().single();
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    onSaved(data as DonationCampaign);
  }

  return (
    <Modal
      title={`💰 Ajuster — ${campaign.title}`}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} style={secondaryBtn}>Annuler</button>
        <button onClick={() => handleAdd(-1)} disabled={busy}
          style={{ ...secondaryBtn, color: T.heart, borderColor: T.heartSoft }}>− Soustraire</button>
        <button onClick={() => handleAdd(1)} disabled={busy} style={primaryBtn}>＋ Ajouter</button>
      </>}>
      <div style={{
        padding: "12px 14px", background: T.surface2, borderRadius: 10, fontSize: 13,
      }}>
        Actuel : <strong>{formatAmount(campaign.current_amount_xaf, "XAF")}</strong>
        {" · "}
        Objectif : <strong>{formatAmount(campaign.target_amount_xaf, "XAF")}</strong>
        {" · "}
        Donateurs : <strong>{campaign.donors_count}</strong>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <Field label="Montant (XAF)">
          <input type="number" min="0" value={addAmount}
            onChange={(e) => setAddAmount(e.target.value === "" ? "" : parseInt(e.target.value))}
            placeholder="500000" style={inputStyle} autoFocus />
        </Field>
        <Field label="Nb donateurs">
          <input type="number" min="0" value={addDonors}
            onChange={(e) => setAddDonors(e.target.value === "" ? "" : parseInt(e.target.value))}
            style={inputStyle} />
        </Field>
      </div>

      {addAmount !== "" && Number(addAmount) > 0 ? (
        <div style={{
          padding: "10px 14px", background: T.violetSoft, border: `1px solid ${T.violet}`,
          borderRadius: 10, fontSize: 13, color: T.violetDark,
        }}>
          ＋ Si ajout : nouveau total = <strong>{formatAmount(preview, "XAF")}</strong>
        </div>
      ) : null}

      <p style={{ fontSize: 11.5, color: T.textMuted, margin: 0 }}>
        💡 Astuce : utilise "Ajouter" pour comptabiliser un don reçu (Mobile Money / virement), "Soustraire" pour corriger.
      </p>
    </Modal>
  );
}
