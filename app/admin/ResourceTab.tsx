"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ColumnType = "text" | "textarea" | "boolean" | "number" | "date" | "datetime" | "select" | "url";

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  options?: string[];     // pour type=select
  required?: boolean;
  hiddenInList?: boolean; // pas affiché dans le tableau (seulement formulaire)
  defaultValue?: string | number | boolean | null;
}

export interface ResourceTabProps {
  table: string;
  titleField: string;             // champ utilisé comme libellé dans la liste
  columns: ColumnDef[];
  initialRows: Record<string, unknown>[];
  rubrique: string;               // titre affiché
  icon?: string;
  primaryKey?: string;            // défaut: id
}

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" };
const btn: React.CSSProperties = { padding: "0.5rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--gold)", color: "#000", borderColor: "var(--gold)", fontWeight: 700 };
const btnDanger: React.CSSProperties = { ...btn, background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.4)", color: "#fca5a5" };

export default function ResourceTab({ table, titleField, columns, initialRows, rubrique, icon = "📦", primaryKey = "id" }: ResourceTabProps) {
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const initForm = (): Record<string, unknown> => {
    const empty: Record<string, unknown> = {};
    for (const c of columns) {
      if (c.defaultValue !== undefined) empty[c.key] = c.defaultValue;
      else if (c.type === "boolean") empty[c.key] = false;
      else if (c.type === "number") empty[c.key] = null;
      else empty[c.key] = "";
    }
    return empty;
  };

  const openNew = () => { setEditing(initForm()); setShowForm(true); setMsg(null); };
  const openEdit = (row: Record<string, unknown>) => { setEditing({ ...row }); setShowForm(true); setMsg(null); };
  const closeForm = () => { setEditing(null); setShowForm(false); };

  const validate = (): string | null => {
    if (!editing) return "Pas de données";
    for (const c of columns) {
      if (c.required && !editing[c.key] && editing[c.key] !== false && editing[c.key] !== 0) {
        return `Le champ "${c.label}" est requis`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!editing) return;
    const err = validate();
    if (err) { showToast("error", err); return; }
    setSaving(true);
    const sb = createClient();

    // Construire le payload uniquement avec les colonnes connues
    const payload: Record<string, unknown> = {};
    for (const c of columns) {
      const v = editing[c.key];
      if (c.type === "number") payload[c.key] = v === "" || v === null ? null : Number(v);
      else if (c.type === "boolean") payload[c.key] = !!v;
      else if (c.type === "datetime" || c.type === "date") payload[c.key] = v || null;
      else payload[c.key] = v === "" ? null : v;
    }

    const id = editing[primaryKey];
    if (id) {
      const { data, error } = await sb.from(table).update(payload).eq(primaryKey, id).select().single();
      setSaving(false);
      if (error) { showToast("error", error.message); return; }
      setRows((prev) => prev.map((r) => r[primaryKey] === id ? (data as Record<string, unknown>) : r));
      showToast("success", "Modifié ✓");
    } else {
      const { data, error } = await sb.from(table).insert(payload).select().single();
      setSaving(false);
      if (error) { showToast("error", error.message); return; }
      setRows((prev) => [data as Record<string, unknown>, ...prev]);
      showToast("success", "Créé ✓");
    }
    closeForm();
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!confirm(`Supprimer "${row[titleField]}" définitivement ?`)) return;
    const sb = createClient();
    const { error } = await sb.from(table).delete().eq(primaryKey, row[primaryKey]);
    if (error) { showToast("error", error.message); return; }
    setRows((prev) => prev.filter((r) => r[primaryKey] !== row[primaryKey]));
    showToast("success", "Supprimé ✓");
  };

  const renderCell = (value: unknown, type: ColumnType) => {
    if (value === null || value === undefined || value === "") return <span style={{ color: "var(--text-muted)" }}>—</span>;
    if (type === "boolean") return value ? "✓" : "✗";
    if (type === "url") return <a href={String(value)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "underline" }}>Lien</a>;
    if (type === "datetime" || type === "date") {
      try { return new Date(String(value)).toLocaleString("fr-FR"); } catch { return String(value); }
    }
    const s = String(value);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  };

  const listCols = columns.filter((c) => !c.hiddenInList);

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{icon} {rubrique} <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.85rem" }}>({rows.length})</span></h3>
        <button style={btnPrimary} onClick={openNew}>+ Nouveau</button>
      </div>

      {msg && (
        <div style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", background: msg.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)", color: msg.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.85rem" }}>{msg.text}</div>
      )}

      {showForm && editing && (
        <div style={{ ...card, background: "var(--surface)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <h4 style={{ margin: 0 }}>{editing[primaryKey] ? "Modifier" : "Nouveau"}</h4>
          {columns.map((c) => (
            <div key={c.key}>
              <label style={labelStyle}>{c.label}{c.required && " *"}</label>
              {c.type === "textarea" && (
                <textarea
                  value={String(editing[c.key] ?? "")}
                  onChange={(e) => setEditing({ ...editing, [c.key]: e.target.value })}
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                />
              )}
              {c.type === "boolean" && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                  <input type="checkbox" checked={!!editing[c.key]} onChange={(e) => setEditing({ ...editing, [c.key]: e.target.checked })} />
                  Activé
                </label>
              )}
              {c.type === "select" && (
                <select value={String(editing[c.key] ?? "")} onChange={(e) => setEditing({ ...editing, [c.key]: e.target.value })} style={inputStyle}>
                  <option value="">— Choisir —</option>
                  {c.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {(c.type === "text" || c.type === "url") && (
                <input type="text" value={String(editing[c.key] ?? "")} onChange={(e) => setEditing({ ...editing, [c.key]: e.target.value })} style={inputStyle} />
              )}
              {c.type === "number" && (
                <input type="number" value={editing[c.key] === null || editing[c.key] === undefined ? "" : String(editing[c.key])} onChange={(e) => setEditing({ ...editing, [c.key]: e.target.value })} style={inputStyle} />
              )}
              {c.type === "date" && (
                <input type="date" value={String(editing[c.key] ?? "").slice(0, 10)} onChange={(e) => setEditing({ ...editing, [c.key]: e.target.value })} style={inputStyle} />
              )}
              {c.type === "datetime" && (
                <input type="datetime-local" value={String(editing[c.key] ?? "").slice(0, 16)} onChange={(e) => setEditing({ ...editing, [c.key]: e.target.value })} style={inputStyle} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? "..." : "Enregistrer"}</button>
            <button onClick={closeForm} style={btn}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {listCols.map((c) => (
                <th key={c.key} style={{ textAlign: "left", padding: "0.5rem 0.6rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.06em" }}>{c.label}</th>
              ))}
              <th style={{ textAlign: "right", padding: "0.5rem 0.6rem", color: "var(--text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={listCols.length + 1} style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>Aucun élément.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={String(r[primaryKey])} style={{ borderBottom: "1px solid var(--border)" }}>
                {listCols.map((c) => (
                  <td key={c.key} style={{ padding: "0.55rem 0.6rem", color: "var(--text-primary)" }}>{renderCell(r[c.key], c.type)}</td>
                ))}
                <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => openEdit(r)} style={{ ...btn, marginRight: "0.4rem" }}>Modifier</button>
                  <button onClick={() => handleDelete(r)} style={btnDanger}>Suppr.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
