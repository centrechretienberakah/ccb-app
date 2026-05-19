"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  INSTITUT_THEME as T, INSTITUT_FONTS as F,
  LEVELS, getLevelDef,
  type Category, type Subcategory, type Course, type Module, type Lesson, type Level,
} from "@/lib/institut/theme";

interface Props {
  currentUserId: string;
  categories: Category[];
  subcategories: Subcategory[];
  courses: Course[];
  modules: Module[];
  lessons: Lesson[];
}

type View =
  | { type: "root" }
  | { type: "category"; id: string }
  | { type: "course"; id: string }
  | { type: "module"; id: string };

type EditorTarget =
  | { kind: "category"; row: Partial<Category> | null }
  | { kind: "subcategory"; row: Partial<Subcategory> | null; categoryId: string }
  | { kind: "course"; row: Partial<Course> | null; categoryId: string }
  | { kind: "module"; row: Partial<Module> | null; courseId: string }
  | { kind: "lesson"; row: Partial<Lesson> | null; moduleId: string; courseId: string };

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uploadFile(file: File, kind: string): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `institut/${kind}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
  if (upErr) { alert("Erreur upload : " + upErr.message); return null; }
  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminInstitutClient({
  categories: initialCats,
  subcategories: initialSubs,
  courses: initialCourses,
  modules: initialModules,
  lessons: initialLessons,
}: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCats);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialSubs);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);

  const [view, setView] = useState<View>({ type: "root" });
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  // ── Helpers reorder ──
  async function reorder<T extends { id: string; order_index: number }>(
    table: string,
    list: T[],
    setList: (l: T[]) => void,
    id: string,
    dir: "up" | "down",
  ) {
    const supabase = createClient();
    const idx = list.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    const a = list[idx]; const b = list[swap];
    // Swap order_index in DB
    await supabase.from(table).update({ order_index: b.order_index }).eq("id", a.id);
    await supabase.from(table).update({ order_index: a.order_index }).eq("id", b.id);
    const next = [...list];
    next[idx] = { ...a, order_index: b.order_index };
    next[swap] = { ...b, order_index: a.order_index };
    next.sort((x, y) => x.order_index - y.order_index);
    setList(next);
  }

  async function togglePublish<T extends { id: string; is_published?: boolean }>(
    table: string,
    list: T[],
    setList: (l: T[]) => void,
    id: string,
  ) {
    const supabase = createClient();
    const item = list.find((x) => x.id === id);
    if (!item) return;
    const newVal = !item.is_published;
    await supabase.from(table).update({ is_published: newVal }).eq("id", id);
    setList(list.map((x) => x.id === id ? { ...x, is_published: newVal } : x));
    flash(newVal ? "✓ Publié" : "Dépublié");
  }

  async function deleteItem(table: string, id: string, label: string) {
    if (!confirm(`Supprimer définitivement « ${label} » ? Tous les éléments enfants seront aussi supprimés.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    flash("Supprimé");
    // Refresh tout
    if (table === "institut_categories") setCategories(categories.filter((x) => x.id !== id));
    if (table === "institut_subcategories") setSubcategories(subcategories.filter((x) => x.id !== id));
    if (table === "institut_courses") setCourses(courses.filter((x) => x.id !== id));
    if (table === "institut_modules") setModules(modules.filter((x) => x.id !== id));
    if (table === "institut_lessons") setLessons(lessons.filter((x) => x.id !== id));
  }

  // ── Editor save handler ──
  async function saveEditor(payload: Record<string, unknown>) {
    if (!editor) return;
    const supabase = createClient();
    let table = "";
    let baseRow = editor.row ?? {};
    const isUpdate = !!baseRow.id;

    if (editor.kind === "category") table = "institut_categories";
    else if (editor.kind === "subcategory") {
      table = "institut_subcategories";
      payload.category_id = editor.categoryId;
    }
    else if (editor.kind === "course") {
      table = "institut_courses";
      payload.category_id = editor.categoryId;
    }
    else if (editor.kind === "module") {
      table = "institut_modules";
      payload.course_id = editor.courseId;
    }
    else if (editor.kind === "lesson") {
      table = "institut_lessons";
      payload.module_id = editor.moduleId;
      payload.course_id = editor.courseId;
    }

    if (isUpdate) {
      const { error } = await supabase.from(table).update(payload).eq("id", baseRow.id as string);
      if (error) { alert("Erreur : " + error.message); return; }
      // Update local state
      const updated = { ...baseRow, ...payload } as { id: string };
      if (editor.kind === "category") setCategories(categories.map((x) => x.id === updated.id ? { ...x, ...payload } as Category : x));
      else if (editor.kind === "subcategory") setSubcategories(subcategories.map((x) => x.id === updated.id ? { ...x, ...payload } as Subcategory : x));
      else if (editor.kind === "course") setCourses(courses.map((x) => x.id === updated.id ? { ...x, ...payload } as Course : x));
      else if (editor.kind === "module") setModules(modules.map((x) => x.id === updated.id ? { ...x, ...payload } as Module : x));
      else if (editor.kind === "lesson") setLessons(lessons.map((x) => x.id === updated.id ? { ...x, ...payload } as Lesson : x));
      flash("✓ Enregistré");
    } else {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) { alert("Erreur : " + error.message); return; }
      if (!data) return;
      if (editor.kind === "category") setCategories([...categories, data as Category].sort((a, b) => a.order_index - b.order_index));
      else if (editor.kind === "subcategory") setSubcategories([...subcategories, data as Subcategory].sort((a, b) => a.order_index - b.order_index));
      else if (editor.kind === "course") setCourses([...courses, data as Course].sort((a, b) => a.order_index - b.order_index));
      else if (editor.kind === "module") setModules([...modules, data as Module].sort((a, b) => a.order_index - b.order_index));
      else if (editor.kind === "lesson") setLessons([...lessons, data as Lesson].sort((a, b) => a.order_index - b.order_index));
      flash("✓ Créé");
    }
    setEditor(null);
  }

  // ── Breadcrumb dynamique ──
  const breadcrumb = useMemo(() => {
    const items: Array<{ label: string; onClick: () => void }> = [
      { label: "🎓 Catégories", onClick: () => setView({ type: "root" }) },
    ];
    if (view.type === "category" || view.type === "course" || view.type === "module") {
      let catId: string | null = null;
      let courseId: string | null = null;
      let moduleId: string | null = null;
      if (view.type === "category") catId = view.id;
      if (view.type === "course") {
        courseId = view.id;
        const c = courses.find((x) => x.id === view.id);
        catId = c?.category_id ?? null;
      }
      if (view.type === "module") {
        moduleId = view.id;
        const m = modules.find((x) => x.id === view.id);
        courseId = m?.course_id ?? null;
        const c = courses.find((x) => x.id === courseId);
        catId = c?.category_id ?? null;
      }
      if (catId) {
        const cat = categories.find((x) => x.id === catId);
        if (cat) items.push({ label: cat.icon ? `${cat.icon} ${cat.name}` : cat.name, onClick: () => setView({ type: "category", id: cat.id }) });
      }
      if (courseId) {
        const course = courses.find((x) => x.id === courseId);
        if (course) items.push({ label: `📘 ${course.title}`, onClick: () => setView({ type: "course", id: course.id }) });
      }
      if (moduleId) {
        const mod = modules.find((x) => x.id === moduleId);
        if (mod) items.push({ label: `📂 ${mod.title}`, onClick: () => setView({ type: "module", id: mod.id }) });
      }
    }
    return items;
  }, [view, categories, courses, modules]);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body, paddingBottom: 60 }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: T.shadowMd,
        }}>{toast}</div>
      )}

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "22px 18px 18px",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowSoft,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/institut" style={{
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8, padding: "6px 12px",
              color: "#fff", fontSize: 12, fontWeight: 700,
              textDecoration: "none",
            }}>← Institut</Link>
            <h1 style={{
              fontFamily: F.title, fontSize: "clamp(1.1rem, 3.5vw, 1.4rem)",
              fontWeight: 700, margin: 0, letterSpacing: "0.04em",
            }}>
              🛡️ Admin Institut Berakah
            </h1>
          </div>
          {/* Breadcrumb */}
          <div style={{
            display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
            fontSize: 12,
          }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <span style={{ opacity: 0.5 }}>›</span>}
                <button onClick={b.onClick} style={{
                  background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 999, padding: "3px 10px",
                  color: "#fff", fontSize: 11, fontWeight: 600,
                  cursor: i === breadcrumb.length - 1 ? "default" : "pointer",
                  opacity: i === breadcrumb.length - 1 ? 1 : 0.85,
                }}>
                  {b.label}
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 14px 40px" }}>

        {/* ── ROOT : liste catégories ── */}
        {view.type === "root" && (
          <Section
            title={`📚 Catégories (${categories.length})`}
            actionLabel="➕ Nouvelle catégorie"
            onAction={() => setEditor({ kind: "category", row: { order_index: categories.length, is_published: true } })}
          >
            {categories.length === 0 ? <Empty msg="Aucune catégorie. Crée la première !" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {categories.map((c, i) => (
                  <Row key={c.id}
                    icon={c.icon ?? "📚"}
                    title={c.name} subtitle={c.description}
                    badge={c.is_published ? null : "Brouillon"}
                    onClick={() => setView({ type: "category", id: c.id })}
                    onUp={i > 0 ? () => reorder("institut_categories", categories, setCategories, c.id, "up") : undefined}
                    onDown={i < categories.length - 1 ? () => reorder("institut_categories", categories, setCategories, c.id, "down") : undefined}
                    onTogglePublish={() => togglePublish("institut_categories", categories, setCategories, c.id)}
                    isPublished={c.is_published}
                    onEdit={() => setEditor({ kind: "category", row: c })}
                    onDelete={() => deleteItem("institut_categories", c.id, c.name)}
                    sub={`${subcategories.filter((s) => s.category_id === c.id).length} sous-catégorie(s) · ${courses.filter((co) => co.category_id === c.id).length} cours`}
                  />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── CATEGORY VIEW : subcategories + cours ── */}
        {view.type === "category" && (() => {
          const cat = categories.find((x) => x.id === view.id);
          if (!cat) return <div style={{ color: T.textMuted }}>Catégorie introuvable.</div>;
          const subs = subcategories.filter((s) => s.category_id === cat.id);
          const cours = courses.filter((c) => c.category_id === cat.id);
          return (
            <>
              <Section
                title={`🔖 Sous-catégories (${subs.length})`}
                actionLabel="➕ Nouvelle sous-catégorie"
                onAction={() => setEditor({ kind: "subcategory", row: { order_index: subs.length, is_published: true }, categoryId: cat.id })}
              >
                {subs.length === 0 ? <Empty msg="Aucune sous-catégorie." /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {subs.map((s, i) => (
                      <Row key={s.id}
                        icon={s.icon ?? "🔖"}
                        title={s.name} subtitle={s.description}
                        badge={s.is_published ? null : "Brouillon"}
                        onUp={i > 0 ? () => reorder("institut_subcategories", subcategories, setSubcategories, s.id, "up") : undefined}
                        onDown={i < subs.length - 1 ? () => reorder("institut_subcategories", subcategories, setSubcategories, s.id, "down") : undefined}
                        onTogglePublish={() => togglePublish("institut_subcategories", subcategories, setSubcategories, s.id)}
                        isPublished={s.is_published}
                        onEdit={() => setEditor({ kind: "subcategory", row: s, categoryId: cat.id })}
                        onDelete={() => deleteItem("institut_subcategories", s.id, s.name)}
                      />
                    ))}
                  </div>
                )}
              </Section>

              <Section
                title={`📘 Cours (${cours.length})`}
                actionLabel="➕ Nouveau cours"
                onAction={() => setEditor({ kind: "course", row: { order_index: cours.length, is_published: false, is_premium: false, level: "beginner" }, categoryId: cat.id })}
              >
                {cours.length === 0 ? <Empty msg="Aucun cours dans cette catégorie." /> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cours.map((c, i) => {
                      const sub = subcategories.find((s) => s.id === c.subcategory_id);
                      const level = getLevelDef(c.level);
                      return (
                        <Row key={c.id}
                          icon="📘"
                          title={c.title} subtitle={c.subtitle}
                          badge={c.is_published ? null : "Brouillon"}
                          extraBadge={c.is_premium ? "👑 Premium" : null}
                          sub={`${level.emoji} ${level.label}${sub ? ` · ${sub.icon ?? ""} ${sub.name}` : ""} · ${modules.filter((m) => m.course_id === c.id).length} module(s) · ${lessons.filter((l) => l.course_id === c.id).length} leçon(s)`}
                          onClick={() => setView({ type: "course", id: c.id })}
                          onUp={i > 0 ? () => reorder("institut_courses", courses, setCourses, c.id, "up") : undefined}
                          onDown={i < cours.length - 1 ? () => reorder("institut_courses", courses, setCourses, c.id, "down") : undefined}
                          onTogglePublish={() => togglePublish("institut_courses", courses, setCourses, c.id)}
                          isPublished={c.is_published}
                          onEdit={() => setEditor({ kind: "course", row: c, categoryId: cat.id })}
                          onDelete={() => deleteItem("institut_courses", c.id, c.title)}
                        />
                      );
                    })}
                  </div>
                )}
              </Section>
            </>
          );
        })()}

        {/* ── COURSE VIEW : modules ── */}
        {view.type === "course" && (() => {
          const course = courses.find((x) => x.id === view.id);
          if (!course) return <div style={{ color: T.textMuted }}>Cours introuvable.</div>;
          const mods = modules.filter((m) => m.course_id === course.id);
          return (
            <Section
              title={`📂 Modules de « ${course.title} » (${mods.length})`}
              actionLabel="➕ Nouveau module"
              onAction={() => setEditor({ kind: "module", row: { order_index: mods.length }, courseId: course.id })}
            >
              {mods.length === 0 ? <Empty msg="Aucun module. Crée le premier !" /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mods.map((m, i) => (
                    <Row key={m.id}
                      icon="📂"
                      title={m.title} subtitle={m.description}
                      sub={`${lessons.filter((l) => l.module_id === m.id).length} leçon(s)`}
                      onClick={() => setView({ type: "module", id: m.id })}
                      onUp={i > 0 ? () => reorder("institut_modules", modules, setModules, m.id, "up") : undefined}
                      onDown={i < mods.length - 1 ? () => reorder("institut_modules", modules, setModules, m.id, "down") : undefined}
                      onEdit={() => setEditor({ kind: "module", row: m, courseId: course.id })}
                      onDelete={() => deleteItem("institut_modules", m.id, m.title)}
                    />
                  ))}
                </div>
              )}
            </Section>
          );
        })()}

        {/* ── MODULE VIEW : leçons ── */}
        {view.type === "module" && (() => {
          const mod = modules.find((x) => x.id === view.id);
          if (!mod) return <div style={{ color: T.textMuted }}>Module introuvable.</div>;
          const lcs = lessons.filter((l) => l.module_id === mod.id);
          return (
            <Section
              title={`📖 Leçons de « ${mod.title} » (${lcs.length})`}
              actionLabel="➕ Nouvelle leçon"
              onAction={() => setEditor({ kind: "lesson", row: { order_index: lcs.length, is_premium: false }, moduleId: mod.id, courseId: mod.course_id })}
            >
              {lcs.length === 0 ? <Empty msg="Aucune leçon dans ce module." /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lcs.map((l, i) => (
                    <Row key={l.id}
                      icon="📖"
                      title={l.title} subtitle={l.description}
                      extraBadge={l.is_premium ? "👑 Premium" : null}
                      sub={`${l.video_url ? "🎬 " : ""}${l.audio_url ? "🎵 " : ""}${l.pdf_url ? "📄 " : ""}${l.content_md ? "📝 " : ""}${l.duration_secs ? `${Math.floor(l.duration_secs / 60)}:${String(l.duration_secs % 60).padStart(2, "0")}` : "—"}`}
                      onUp={i > 0 ? () => reorder("institut_lessons", lessons, setLessons, l.id, "up") : undefined}
                      onDown={i < lcs.length - 1 ? () => reorder("institut_lessons", lessons, setLessons, l.id, "down") : undefined}
                      onEdit={() => setEditor({ kind: "lesson", row: l, moduleId: mod.id, courseId: mod.course_id })}
                      onDelete={() => deleteItem("institut_lessons", l.id, l.title)}
                    />
                  ))}
                </div>
              )}
            </Section>
          );
        })()}
      </div>

      {/* Modal Editor */}
      {editor && (
        <EditorModal
          target={editor}
          subcategories={subcategories}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
        />
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────

function Section({ title, actionLabel, onAction, children }: {
  title: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 16, marginBottom: 14,
      boxShadow: T.shadowSoft,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, gap: 8, flexWrap: "wrap",
      }}>
        <h2 style={{
          fontFamily: F.title, fontSize: 13, fontWeight: 700,
          color: T.violet, textTransform: "uppercase",
          letterSpacing: "0.08em", margin: 0,
        }}>
          {title}
        </h2>
        {actionLabel && onAction && (
          <button onClick={onAction} style={{
            background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
            color: "#fff", border: "none", borderRadius: 999, padding: "7px 14px",
            fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: F.body,
          }}>
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: "30px 20px", textAlign: "center",
      color: T.textMuted, fontSize: 13, fontStyle: "italic",
    }}>
      {msg}
    </div>
  );
}

function Row({
  icon, title, subtitle, badge, extraBadge, sub,
  onClick, onUp, onDown, onTogglePublish, isPublished, onEdit, onDelete,
}: {
  icon: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  extraBadge?: string | null;
  sub?: string;
  onClick?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onTogglePublish?: () => void;
  isPublished?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.borderSoft}`,
      borderRadius: 12, padding: "10px 12px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          fontSize: 13, fontWeight: 700, color: T.text,
        }}>
          {title}
          {badge && (
            <span style={{
              background: T.surface2, color: T.textMuted,
              padding: "1px 7px", borderRadius: 999,
              fontSize: 9, fontWeight: 700,
            }}>{badge}</span>
          )}
          {extraBadge && (
            <span style={{
              background: T.gold, color: "#111",
              padding: "1px 7px", borderRadius: 999,
              fontSize: 9, fontWeight: 700,
            }}>{extraBadge}</span>
          )}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 11, color: T.textMuted, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {subtitle}
          </div>
        )}
        {sub && (
          <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
        {onUp && <IconBtn title="Monter" onClick={onUp}>↑</IconBtn>}
        {onDown && <IconBtn title="Descendre" onClick={onDown}>↓</IconBtn>}
        {onTogglePublish !== undefined && (
          <IconBtn title={isPublished ? "Dépublier" : "Publier"} onClick={onTogglePublish}>
            {isPublished ? "👁️" : "🚫"}
          </IconBtn>
        )}
        {onEdit && <IconBtn title="Éditer" onClick={onEdit}>✏️</IconBtn>}
        {onDelete && <IconBtn title="Supprimer" onClick={onDelete} danger>🗑</IconBtn>}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: {
  children: React.ReactNode; onClick: () => void; title: string; danger?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      background: danger ? "rgba(194,75,122,0.1)" : T.surface2,
      border: `1px solid ${danger ? "rgba(194,75,122,0.3)" : T.border}`,
      borderRadius: 8, padding: "5px 9px",
      color: danger ? "#C24B7A" : T.textSoft,
      cursor: "pointer", fontSize: 12, fontFamily: F.body,
    }}>
      {children}
    </button>
  );
}

// ─── Editor Modal ─────────────────────────────────────────────────────
function EditorModal({ target, subcategories, onClose, onSave }: {
  target: EditorTarget;
  subcategories: Subcategory[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const isUpdate = !!target.row?.id;
  const titleMap: Record<string, string> = {
    category: isUpdate ? "Éditer la catégorie" : "Nouvelle catégorie",
    subcategory: isUpdate ? "Éditer la sous-catégorie" : "Nouvelle sous-catégorie",
    course: isUpdate ? "Éditer le cours" : "Nouveau cours",
    module: isUpdate ? "Éditer le module" : "Nouveau module",
    lesson: isUpdate ? "Éditer la leçon" : "Nouvelle leçon",
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(31,26,51,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
      }}>
      <div style={{
        background: T.card, borderRadius: 18, padding: 20,
        width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
        border: `1px solid ${T.border}`, boxShadow: T.shadowMd,
      }}>
        <div style={{
          fontFamily: F.title, fontSize: 17, fontWeight: 700,
          color: T.violet, marginBottom: 16,
        }}>
          {titleMap[target.kind]}
        </div>

        {target.kind === "category" && (
          <CategoryForm row={target.row} onSave={onSave} onCancel={onClose} />
        )}
        {target.kind === "subcategory" && (
          <SubcategoryForm row={target.row} onSave={onSave} onCancel={onClose} />
        )}
        {target.kind === "course" && (
          <CourseForm row={target.row} subcategories={subcategories.filter((s) => s.category_id === target.categoryId)} onSave={onSave} onCancel={onClose} />
        )}
        {target.kind === "module" && (
          <ModuleForm row={target.row} onSave={onSave} onCancel={onClose} />
        )}
        {target.kind === "lesson" && (
          <LessonForm row={target.row} onSave={onSave} onCancel={onClose} />
        )}
      </div>
    </div>
  );
}

// ─── Forms ────────────────────────────────────────────────────────────

function CategoryForm({ row, onSave, onCancel }: {
  row: Partial<Category> | null; onSave: (p: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [icon, setIcon] = useState(row?.icon ?? "📚");
  const [coverUrl, setCoverUrl] = useState(row?.cover_url ?? "");
  const [orderIdx, setOrderIdx] = useState(row?.order_index ?? 0);
  const [isPublished, setIsPublished] = useState(row?.is_published ?? true);
  const [uploading, setUploading] = useState(false);

  async function handleCoverUpload(file: File) {
    setUploading(true);
    const url = await uploadFile(file, "category-cover");
    if (url) setCoverUrl(url);
    setUploading(false);
  }

  function submit() {
    if (!name.trim()) { alert("Nom requis"); return; }
    const finalSlug = slug.trim() || slugify(name);
    onSave({
      name: name.trim(), slug: finalSlug,
      description: description.trim() || null,
      icon: icon.trim() || null,
      cover_url: coverUrl || null,
      order_index: orderIdx,
      is_published: isPublished,
    });
  }

  return (
    <FormShell onSave={submit} onCancel={onCancel}>
      <Field label="Nom">
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} maxLength={120} />
      </Field>
      <Field label="Slug (auto si vide)">
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex. fondations-chretiennes" style={inputStyle} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} />
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Icône (emoji)">
          <input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ ...inputStyle, textAlign: "center", fontSize: 20 } as React.CSSProperties} maxLength={4} />
        </Field>
        <Field label="Ordre">
          <input type="number" value={orderIdx} onChange={(e) => setOrderIdx(parseInt(e.target.value) || 0)} style={inputStyle} />
        </Field>
      </div>
      <Field label="Image de couverture (optionnel)">
        {coverUrl && (
          <div style={{
            background: `url(${coverUrl}) center/cover`,
            height: 80, borderRadius: 8, marginBottom: 8,
          }} />
        )}
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
          style={{ fontSize: 12 }} disabled={uploading} />
        {uploading && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Upload...</div>}
        {coverUrl && (
          <button onClick={() => setCoverUrl("")} type="button" style={{
            background: "none", border: "none", color: T.textMuted, fontSize: 11, marginTop: 4, cursor: "pointer", textDecoration: "underline",
          }}>Retirer</button>
        )}
      </Field>
      <CheckField checked={isPublished} onChange={setIsPublished} label="Publié" />
    </FormShell>
  );
}

function SubcategoryForm({ row, onSave, onCancel }: {
  row: Partial<Subcategory> | null; onSave: (p: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [icon, setIcon] = useState(row?.icon ?? "🔖");
  const [orderIdx, setOrderIdx] = useState(row?.order_index ?? 0);
  const [isPublished, setIsPublished] = useState(row?.is_published ?? true);

  function submit() {
    if (!name.trim()) { alert("Nom requis"); return; }
    onSave({
      name: name.trim(), slug: (slug.trim() || slugify(name)),
      description: description.trim() || null,
      icon: icon.trim() || null,
      order_index: orderIdx,
      is_published: isPublished,
    });
  }

  return (
    <FormShell onSave={submit} onCancel={onCancel}>
      <Field label="Nom"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} maxLength={120} /></Field>
      <Field label="Slug (auto si vide)"><input value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} /></Field>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Icône"><input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ ...inputStyle, textAlign: "center" } as React.CSSProperties} maxLength={4} /></Field>
        <Field label="Ordre"><input type="number" value={orderIdx} onChange={(e) => setOrderIdx(parseInt(e.target.value) || 0)} style={inputStyle} /></Field>
      </div>
      <CheckField checked={isPublished} onChange={setIsPublished} label="Publié" />
    </FormShell>
  );
}

function CourseForm({ row, subcategories, onSave, onCancel }: {
  row: Partial<Course> | null; subcategories: Subcategory[];
  onSave: (p: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [subtitle, setSubtitle] = useState(row?.subtitle ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [subcategoryId, setSubcategoryId] = useState<string>(row?.subcategory_id ?? "");
  const [level, setLevel] = useState<Level>(row?.level ?? "beginner");
  const [duration, setDuration] = useState(row?.duration_mins?.toString() ?? "");
  const [instructor, setInstructor] = useState(row?.instructor ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(row?.thumbnail_url ?? "");
  const [trailerUrl, setTrailerUrl] = useState(row?.trailer_url ?? "");
  const [orderIdx, setOrderIdx] = useState(row?.order_index ?? 0);
  const [isPublished, setIsPublished] = useState(row?.is_published ?? false);
  const [isPremium, setIsPremium] = useState(row?.is_premium ?? false);
  const [uploading, setUploading] = useState(false);

  async function handleThumbUpload(file: File) {
    setUploading(true);
    const url = await uploadFile(file, "course-thumb");
    if (url) setThumbnailUrl(url);
    setUploading(false);
  }

  function submit() {
    if (!title.trim()) { alert("Titre requis"); return; }
    onSave({
      title: title.trim(),
      slug: (slug.trim() || slugify(title)),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      subcategory_id: subcategoryId || null,
      level,
      duration_mins: duration ? parseInt(duration) : null,
      instructor: instructor.trim() || null,
      thumbnail_url: thumbnailUrl || null,
      trailer_url: trailerUrl.trim() || null,
      order_index: orderIdx,
      is_published: isPublished,
      is_premium: isPremium,
    });
  }

  return (
    <FormShell onSave={submit} onCancel={onCancel}>
      <Field label="Titre"><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></Field>
      <Field label="Slug (auto si vide)"><input value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} /></Field>
      <Field label="Sous-titre"><input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={inputStyle} /></Field>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} /></Field>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Field label="Sous-catégorie">
          <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} style={inputStyle}>
            <option value="">— Aucune —</option>
            {subcategories.map((s) => <option key={s.id} value={s.id}>{s.icon ?? ""} {s.name}</option>)}
          </select>
        </Field>
        <Field label="Niveau">
          <select value={level} onChange={(e) => setLevel(e.target.value as Level)} style={inputStyle}>
            {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.emoji} {l.label}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Durée totale (min)"><input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} /></Field>
        <Field label="Ordre"><input type="number" value={orderIdx} onChange={(e) => setOrderIdx(parseInt(e.target.value) || 0)} style={inputStyle} /></Field>
      </div>
      <Field label="Formateur"><input value={instructor} onChange={(e) => setInstructor(e.target.value)} style={inputStyle} /></Field>
      <Field label="Trailer URL (YouTube/Vimeo)"><input value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} style={inputStyle} /></Field>
      <Field label="Thumbnail">
        {thumbnailUrl && <div style={{ background: `url(${thumbnailUrl}) center/cover`, height: 100, borderRadius: 8, marginBottom: 8 }} />}
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleThumbUpload(e.target.files[0])} style={{ fontSize: 12 }} disabled={uploading} />
        {uploading && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Upload...</div>}
      </Field>
      <CheckField checked={isPublished} onChange={setIsPublished} label="Publié" />
      <CheckField checked={isPremium} onChange={setIsPremium} label="👑 Premium" />
    </FormShell>
  );
}

function ModuleForm({ row, onSave, onCancel }: {
  row: Partial<Module> | null; onSave: (p: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [orderIdx, setOrderIdx] = useState(row?.order_index ?? 0);

  function submit() {
    if (!title.trim()) { alert("Titre requis"); return; }
    onSave({
      title: title.trim(),
      slug: (slug.trim() || slugify(title)),
      description: description.trim() || null,
      order_index: orderIdx,
    });
  }

  return (
    <FormShell onSave={submit} onCancel={onCancel}>
      <Field label="Titre du module"><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></Field>
      <Field label="Slug (auto si vide)"><input value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} /></Field>
      <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} /></Field>
      <Field label="Ordre"><input type="number" value={orderIdx} onChange={(e) => setOrderIdx(parseInt(e.target.value) || 0)} style={inputStyle} /></Field>
    </FormShell>
  );
}

function LessonForm({ row, onSave, onCancel }: {
  row: Partial<Lesson> | null; onSave: (p: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(row?.title ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [contentMd, setContentMd] = useState(row?.content_md ?? "");
  const [videoUrl, setVideoUrl] = useState(row?.video_url ?? "");
  const [audioUrl, setAudioUrl] = useState(row?.audio_url ?? "");
  const [pdfUrl, setPdfUrl] = useState(row?.pdf_url ?? "");
  const [durationSecs, setDurationSecs] = useState(row?.duration_secs?.toString() ?? "");
  const [orderIdx, setOrderIdx] = useState(row?.order_index ?? 0);
  const [isPremium, setIsPremium] = useState(row?.is_premium ?? false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  async function handleAudioUpload(file: File) {
    setUploadingAudio(true);
    const url = await uploadFile(file, "lesson-audio");
    if (url) setAudioUrl(url);
    setUploadingAudio(false);
  }
  async function handlePdfUpload(file: File) {
    setUploadingPdf(true);
    const url = await uploadFile(file, "lesson-pdf");
    if (url) setPdfUrl(url);
    setUploadingPdf(false);
  }

  function submit() {
    if (!title.trim()) { alert("Titre requis"); return; }
    onSave({
      title: title.trim(),
      slug: (slug.trim() || slugify(title) + "-" + Date.now().toString(36).slice(-4)),
      description: description.trim() || null,
      content_md: contentMd.trim() || null,
      video_url: videoUrl.trim() || null,
      audio_url: audioUrl || null,
      pdf_url: pdfUrl || null,
      duration_secs: durationSecs ? parseInt(durationSecs) : null,
      order_index: orderIdx,
      is_premium: isPremium,
    });
  }

  return (
    <FormShell onSave={submit} onCancel={onCancel}>
      <Field label="Titre de la leçon"><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} /></Field>
      <Field label="Slug (auto si vide)"><input value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} /></Field>
      <Field label="Description courte"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} /></Field>
      <Field label="URL vidéo (YouTube / Vimeo / .mp4)"><input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={inputStyle} placeholder="https://youtu.be/..." /></Field>
      <Field label="Audio (upload)">
        {audioUrl && <audio src={audioUrl} controls style={{ width: "100%", marginBottom: 6 }} />}
        <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} style={{ fontSize: 12 }} disabled={uploadingAudio} />
        {uploadingAudio && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Upload audio...</div>}
        {audioUrl && (
          <button onClick={() => setAudioUrl("")} type="button" style={{ background: "none", border: "none", color: T.textMuted, fontSize: 11, marginTop: 4, cursor: "pointer", textDecoration: "underline" }}>Retirer</button>
        )}
      </Field>
      <Field label="PDF (upload)">
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener" style={{ display: "inline-block", color: T.violet, fontSize: 12, marginBottom: 6 }}>📄 Voir le PDF actuel</a>
        )}
        <input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])} style={{ fontSize: 12 }} disabled={uploadingPdf} />
        {uploadingPdf && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Upload PDF...</div>}
        {pdfUrl && (
          <button onClick={() => setPdfUrl("")} type="button" style={{ background: "none", border: "none", color: T.textMuted, fontSize: 11, marginTop: 4, cursor: "pointer", textDecoration: "underline" }}>Retirer</button>
        )}
      </Field>
      <Field label="Contenu (markdown / texte)">
        <textarea value={contentMd} onChange={(e) => setContentMd(e.target.value)} rows={8} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 } as React.CSSProperties} placeholder="Texte de la leçon, notes, déclaration..." />
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Durée (secondes)"><input type="number" value={durationSecs} onChange={(e) => setDurationSecs(e.target.value)} style={inputStyle} placeholder="ex. 600 = 10 min" /></Field>
        <Field label="Ordre"><input type="number" value={orderIdx} onChange={(e) => setOrderIdx(parseInt(e.target.value) || 0)} style={inputStyle} /></Field>
      </div>
      <CheckField checked={isPremium} onChange={setIsPremium} label="👑 Leçon premium" />
    </FormShell>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────
function FormShell({ children, onSave, onCancel }: {
  children: React.ReactNode; onSave: () => void; onCancel: () => void;
}) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
        <button onClick={onCancel} style={{
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: "9px 16px",
          color: T.textMuted, cursor: "pointer", fontSize: 12, fontFamily: F.body,
        }}>Annuler</button>
        <button onClick={onSave} style={{
          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          border: "none", borderRadius: 10, padding: "9px 20px",
          color: "#fff", fontWeight: 700, fontSize: 13,
          cursor: "pointer", fontFamily: F.body,
        }}>💾 Enregistrer</button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted,
        marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase",
      }}>{label}</label>
      {children}
    </div>
  );
}

function CheckField({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 8,
      cursor: "pointer", fontSize: 13, color: T.textSoft, fontFamily: F.body,
    }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: T.violet, width: 16, height: 16, cursor: "pointer" }} />
      {label}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "9px 12px",
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 13, fontFamily: F.body, outline: "none",
};
