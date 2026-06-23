"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DONS_THEME as T,
  DONS_FONTS as F,
  DONATION_KINDS, type DonationKind, getKind,
  type DonationCampaign,
  type DonationRecord,
  PAYMENT_MODES,
  formatAmount,
  campaignProgress,
} from "@/lib/dons/theme";
import { notifyDonorConfirmation, notifyMilestone } from "@/lib/dons/notify";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uploadFile(file: File): Promise<{ url: string | null; error: string | null }> {
  // Quick size guard (≤ 5 Mo)
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Max 5 Mo.` };
  }
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `dons/campaigns/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error: upErr } = await supabase.storage.from("posts").upload(path, file, {
    cacheControl: "3600", upsert: false,
  });
  if (upErr) {
    // Détecte les cas typiques pour donner un meilleur message
    const msg = upErr.message ?? String(upErr);
    if (/bucket.*not.*found/i.test(msg)) {
      return { url: null, error: `Bucket "posts" introuvable. Crée-le dans Supabase Storage avec accès public en lecture.` };
    }
    if (/row.*level.*security|policy|unauthor/i.test(msg)) {
      return { url: null, error: `Permission refusée par RLS. Vérifie que tu es bien connecté avec un rôle moderator+ et que le bucket "posts" autorise les uploads.` };
    }
    return { url: null, error: msg };
  }
  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

type AdminTab = "campaigns" | "records";

export default function AdminDonsClient({
  initialCampaigns, initialRecords, pendingCount,
}: {
  initialCampaigns: DonationCampaign[];
  initialRecords: DonationRecord[];
  pendingCount: number;
}) {
  const [tab, setTab] = useState<AdminTab>(pendingCount > 0 ? "records" : "campaigns");
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>(initialCampaigns);
  const [records, setRecords] = useState<DonationRecord[]>(initialRecords);
  const [editing, setEditing] = useState<DonationCampaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [adjusting, setAdjusting] = useState<DonationCampaign | null>(null);

  const campaignsById = useMemo(() => {
    const m = new Map<string, DonationCampaign>();
    campaigns.forEach((c) => m.set(c.id, c));
    return m;
  }, [campaigns]);

  const currentPending = records.filter((r) => r.status === "pending").length;

  async function confirmRecord(r: DonationRecord) {
    const supabase = createClient();
    // Snapshot du montant campagne AVANT confirm (pour détecter milestone)
    let previousCampaignXaf = 0;
    if (r.campaign_id) {
      const cBefore = campaigns.find((c) => c.id === r.campaign_id);
      previousCampaignXaf = cBefore?.current_amount_xaf ?? 0;
    }

    const { data, error } = await supabase
      .from("donations_records")
      .update({ status: "confirmed" })
      .eq("id", r.id).select().single();
    if (error) { alert("Erreur : " + error.message); return; }
    const updatedRecord = data as DonationRecord;
    setRecords((arr) => arr.map((x) => x.id === r.id ? updatedRecord : x));

    // refresh campaigns counters (le trigger SQL les a mis à jour côté DB)
    if (r.campaign_id) {
      const { data: cd } = await supabase
        .from("donations_campaigns")
        .select("id, slug, title, subtitle, description, cover_url, kind, target_amount_xaf, current_amount_xaf, donors_count, starts_at, ends_at, is_active, is_featured, order_index")
        .eq("id", r.campaign_id).maybeSingle();
      if (cd) {
        const updated = cd as DonationCampaign;
        setCampaigns((arr) => arr.map((c) => c.id === updated.id ? updated : c));

        // ─── Check milestone (paliers 25/50/75/100) ───
        try {
          const { data: milestoneData } = await supabase
            .rpc("dons_check_milestone", {
              p_campaign_id: r.campaign_id,
              p_previous_xaf: previousCampaignXaf,
            });
          const milestone = milestoneData as number | null;
          if (milestone && [25, 50, 75, 100].includes(milestone)) {
            void notifyMilestone({
              campaignTitle: updated.title,
              campaignSlug: updated.slug,
              milestone: milestone as 25 | 50 | 75 | 100,
            });
          }
        } catch { /* RPC pas dispo */ }
      }
    }

    // ─── Notif au donateur (si compte CCB) ───
    if (updatedRecord.user_id) {
      void notifyDonorConfirmation({
        userId: updatedRecord.user_id,
        amount: formatAmount(updatedRecord.amount_native, updatedRecord.currency),
        receiptNumber: updatedRecord.receipt_number ?? null,
        recordId: updatedRecord.id,
      });
    }
  }

  async function cancelRecord(r: DonationRecord) {
    if (!confirm("Annuler ce don ?")) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("donations_records")
      .update({ status: "cancelled" })
      .eq("id", r.id).select().single();
    if (error) { alert("Erreur : " + error.message); return; }
    setRecords((arr) => arr.map((x) => x.id === r.id ? (data as DonationRecord) : x));
  }

  async function deleteRecord(r: DonationRecord) {
    if (!confirm("Supprimer définitivement ce record ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("donations_records").delete().eq("id", r.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setRecords((arr) => arr.filter((x) => x.id !== r.id));
  }

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
            {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""} · {records.length} record{records.length > 1 ? "s" : ""}
            {currentPending > 0 ? <span style={{ color: T.gold, fontWeight: 700 }}> · {currentPending} en attente</span> : null}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dons/admin/analytics" style={{
            padding: "10px 14px", background: T.card, color: T.text,
            border: `1px solid ${T.border}`, borderRadius: 10,
            fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}>📊 Analytics</Link>
          {tab === "campaigns" ? (
            <button onClick={() => setCreating(true)} style={primaryBtn}>＋ Nouvelle campagne</button>
          ) : null}
        </div>
      </header>

      {/* Tabs */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 6, borderBottom: `1px solid ${T.border}` }}>
        <TabBtn active={tab === "campaigns"} onClick={() => setTab("campaigns")}>🎯 Campagnes ({campaigns.length})</TabBtn>
        <TabBtn active={tab === "records"}   onClick={() => setTab("records")}>
          💝 Dons reçus ({records.length})
          {currentPending > 0 ? <span style={{
            marginLeft: 6, padding: "1px 7px", borderRadius: 999,
            background: T.gold, color: "#000", fontSize: 10, fontWeight: 800,
          }}>{currentPending}</span> : null}
        </TabBtn>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 80px" }}>
        {tab === "campaigns" ? (
          campaigns.length === 0 ? (
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
                  if (!confirm(`Supprimer définitivement "${c.title}" ?\n\nLes dons existants ne seront pas supprimés (juste détachés de cette campagne).`)) return;
                  const supabase = createClient();
                  // .select() pour détecter le cas "RLS silent" (0 ligne affectée sans erreur)
                  const { data, error } = await supabase
                    .from("donations_campaigns").delete().eq("id", c.id).select("id");
                  if (error) {
                    alert("Erreur : " + error.message);
                    return;
                  }
                  if (!data || data.length === 0) {
                    alert(
                      "⚠️ Suppression refusée par la base de données.\n\n" +
                      "Causes possibles :\n" +
                      "• Ton rôle dans user_roles n'est pas moderator/leader/admin/owner.\n" +
                      "• La fonction RLS public.is_moderator_or_above() n'existe pas dans la DB.\n\n" +
                      "Workaround : désactive la campagne (édite ✏️ → décoche 'Active') au lieu de la supprimer."
                    );
                    return;
                  }
                  remove(c.id);
                }}
              />
            ))}
          </div>
          )
        ) : (
          <RecordsTab
            records={records}
            campaignsById={campaignsById}
            onConfirm={confirmRecord}
            onCancel={cancelRecord}
            onDelete={deleteRecord}
          />
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
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "12px 18px", background: "transparent", border: "none",
      color: active ? T.text : T.textMuted, fontWeight: active ? 700 : 500,
      cursor: "pointer", fontSize: 14, fontFamily: "inherit",
      borderBottom: `2px solid ${active ? T.violet : "transparent"}`,
      marginBottom: -1, display: "inline-flex", alignItems: "center", gap: 4,
    }}>{children}</button>
  );
}

function RecordsTab({
  records, campaignsById, onConfirm, onCancel, onDelete,
}: {
  records: DonationRecord[];
  campaignsById: Map<string, DonationCampaign>;
  onConfirm: (r: DonationRecord) => Promise<void>;
  onCancel: (r: DonationRecord) => Promise<void>;
  onDelete: (r: DonationRecord) => Promise<void>;
}) {
  type Filter = "all" | "pending" | "confirmed" | "cancelled";
  const [filter, setFilter] = useState<Filter>("pending");

  const filtered = useMemo(
    () => records.filter((r) => filter === "all" || r.status === filter),
    [records, filter]
  );

  if (records.length === 0) {
    return (
      <div style={{
        padding: "50px 24px", textAlign: "center",
        background: T.card, border: `1px dashed ${T.border}`, borderRadius: 14,
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💝</div>
        <h3 style={{ fontFamily: F.title, margin: "0 0 6px", fontSize: 20 }}>Aucun don enregistré</h3>
        <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
          Les intentions de dons des fidèles apparaîtront ici dès qu&apos;ils auront cliqué sur &ldquo;Confirmer mon intention&rdquo; sur la page /dons.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {(["pending","confirmed","cancelled","all"] as Filter[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "6px 12px", borderRadius: 999,
            background: filter === s ? T.violet : T.card,
            color: filter === s ? "#fff" : T.textSoft,
            border: `1px solid ${filter === s ? T.violet : T.border}`,
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{recordStatusLabel(s)} {records.filter((r) => s === "all" || r.status === s).length}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: T.textMuted, fontSize: 13 }}>
            Aucun résultat.
          </div>
        ) : filtered.map((r) => (
          <RecordRow key={r.id} record={r}
            campaign={r.campaign_id ? campaignsById.get(r.campaign_id) : undefined}
            onConfirm={onConfirm} onCancel={onCancel} onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function recordStatusLabel(s: "pending" | "confirmed" | "cancelled" | "all"): string {
  switch (s) {
    case "all":       return "Tous";
    case "pending":   return "⏳ En attente";
    case "confirmed": return "✅ Confirmés";
    case "cancelled": return "❌ Annulés";
  }
}

function RecordRow({ record: r, campaign, onConfirm, onCancel, onDelete }: {
  record: DonationRecord;
  campaign: DonationCampaign | undefined;
  onConfirm: (r: DonationRecord) => Promise<void>;
  onCancel: (r: DonationRecord) => Promise<void>;
  onDelete: (r: DonationRecord) => Promise<void>;
}) {
  const k = getKind(r.kind);
  const mode = r.payment_mode ? PAYMENT_MODES.find((m) => m.id === r.payment_mode) : null;
  const statusColor = r.status === "confirmed" ? T.green : r.status === "cancelled" ? T.textMuted : T.gold;
  const dateRef = r.paid_at ?? r.confirmed_at ?? r.created_at;
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true); await fn(); setBusy(false);
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
      padding: "12px 14px",
      background: T.card,
      border: `1px solid ${r.status === "pending" ? T.gold : T.border}`,
      borderRadius: 12,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: `${k.color}22`, color: k.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>{k.emoji}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 3, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{k.label}</span>
          <span style={{
            padding: "1.5px 7px", borderRadius: 4,
            background: `${statusColor}22`, color: statusColor,
            border: `1px solid ${statusColor}55`,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
          }}>{recordStatusLabel(r.status)}</span>
          {campaign ? (
            <span style={{ fontSize: 11, color: T.gold, fontWeight: 600 }}>· 🎯 {campaign.title}</span>
          ) : null}
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span>📅 {new Date(dateRef).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          {mode ? <span>{mode.emoji} {mode.title}</span> : null}
          {r.reference ? <span style={{ fontFamily: "monospace" }}>{r.reference}</span> : null}
          {r.donor_email ? <span>📧 {r.donor_email}</span> : null}
          {r.user_id ? <span style={{ color: T.gold }}>👤 user</span> : <span style={{ color: T.textMuted }}>👻 guest</span>}
          {r.is_anonymous ? <span style={{ color: T.gold, fontWeight: 700 }}>🕶️ anonyme</span> : null}
          {r.dedication ? <span style={{ color: T.heart }}>🕊️ {r.dedication}</span> : null}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <div style={{ fontFamily: F.title, fontWeight: 800, fontSize: 16, color: T.text, fontVariantNumeric: "tabular-nums" }}>
          {formatAmount(r.amount_native, r.currency)}
        </div>
        {r.currency !== "XAF" ? (
          <div style={{ fontSize: 10.5, color: T.textMuted }}>≈ {formatAmount(r.amount_xaf, "XAF")}</div>
        ) : null}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.status === "pending" ? (
            <button onClick={() => run(() => onConfirm(r))} disabled={busy} title="Confirmer la réception" style={{
              padding: "5px 10px", background: T.green, color: "#fff", border: "none",
              borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
            }}>✓ Confirmer</button>
          ) : null}
          {r.status === "confirmed" ? (
            <Link href={`/dons/recu/${r.id}`} title="Voir le reçu" style={{
              padding: "5px 10px", background: T.gold, color: "#000",
              borderRadius: 6, fontWeight: 700, fontSize: 11, textDecoration: "none",
            }}>📄</Link>
          ) : null}
          {r.status !== "cancelled" ? (
            <button onClick={() => run(() => onCancel(r))} disabled={busy} title="Annuler" style={{
              padding: "5px 10px", background: "transparent", color: T.heart,
              border: `1px solid ${T.heartSoft}`,
              borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
            }}>Annuler</button>
          ) : null}
          <button onClick={() => run(() => onDelete(r))} disabled={busy} title="Supprimer" style={{
            padding: "5px 10px", background: "transparent", color: T.textMuted,
            border: `1px solid ${T.border}`,
            borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
          }}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

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
          <img loading="lazy" decoding="async" src={campaign.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
          <span style={{ fontSize: 12, color: T.gold, fontWeight: 800, whiteSpace: "nowrap" }}>{pct}%</span>
        </div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {formatAmount(campaign.current_amount_xaf, "XAF")} / {formatAmount(campaign.target_amount_xaf, "XAF")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <Link href={`/dons/campagne/${campaign.slug}/qr`} title="QR code imprimable"
          style={{ ...iconBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>🔳</Link>
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
  padding: "10px 18px", background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: "#1a1206", border: "none",
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

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUploadCover(file: File) {
    setUploading(true);
    setUploadError(null);
    const { url, error: upError } = await uploadFile(file);
    setUploading(false);
    if (upError) { setUploadError(upError); return; }
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

      <Field label="Cover URL (image 16:9)" hint="Image 16:9 recommandée · max 5 Mo">
        <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Preview thumbnail */}
          {coverUrl ? (
            <div style={{
              flex: "0 0 96px", aspectRatio: "16/9",
              borderRadius: 8, overflow: "hidden",
              border: `1px solid ${T.border}`, background: "#000",
              position: "relative",
            }}>
              { }
              <img loading="lazy" decoding="async" src={coverUrl} alt="aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button type="button" onClick={() => setCoverUrl("")} aria-label="Retirer la couverture"
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 22, height: 22, borderRadius: 999,
                  background: "rgba(0,0,0,0.7)", color: "#fff",
                  border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>×</button>
            </div>
          ) : (
            <div style={{
              flex: "0 0 96px", aspectRatio: "16/9", borderRadius: 8,
              border: `1px dashed ${T.border}`, background: T.surface2,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.textMuted, fontSize: 22,
            }}>🖼️</div>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 12px", background: uploading ? T.surface2 : T.violet,
              color: uploading ? T.textMuted : "#fff",
              border: "none", borderRadius: 8,
              fontSize: 12.5, fontWeight: 700, cursor: uploading ? "wait" : "pointer",
            }}>
              {uploading ? "⏳ Upload en cours…" : "📤 Choisir une image"}
              <input type="file" accept="image/*" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCover(f); e.target.value = ""; }}
                style={{ display: "none" }} />
            </label>
            {uploadError ? (
              <div style={{
                marginTop: 8, padding: "8px 10px",
                background: T.heartSoft, border: `1px solid ${T.heart}`,
                borderRadius: 8, fontSize: 11.5, color: T.heart, lineHeight: 1.5,
              }}>⚠️ {uploadError}</div>
            ) : null}
            {!uploadError && coverUrl ? (
              <div style={{ marginTop: 6, fontSize: 11, color: T.green, fontWeight: 600 }}>
                ✓ Couverture prête. Clique &ldquo;Enregistrer&rdquo; pour valider.
              </div>
            ) : null}
          </div>
        </div>
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
          borderRadius: 10, fontSize: 13, color: T.gold,
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
