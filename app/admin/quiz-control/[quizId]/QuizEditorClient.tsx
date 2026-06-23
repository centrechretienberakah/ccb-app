'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/client';
import { isModerator } from '@/lib/rbac';

const supabase = createClient();

interface QuizMeta {
  id: string; title: string; description: string | null;
  category: string | null; difficulty: string | null; phase: string | null; sort_order: number;
}
interface Question {
  id?: string; quiz_id: string; text: string;
  option_a: string | null; option_b: string | null; option_c: string | null; option_d: string | null;
  correct_option: string | null; free_answer: string | null;
  is_difficult: boolean; points: number | null; reference: string | null; sort_order: number;
  _saving?: boolean;
}

const CATEGORIES = ['decouverte', 'transformation', 'feu_saint_esprit', 'grande_finale', 'pieges', 'kahoot', 'bonus'];
const DIFFICULTIES = ['facile', 'moyen', 'difficile', 'expert'];
const PHASES = ['libre', 'qualifications', 'quarts', 'demi', 'finale'];
const OPTIONS = ['A', 'B', 'C', 'D', 'free'];

const card: React.CSSProperties = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' };
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 13.5, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 4 };
const btnGold: React.CSSProperties = { background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 13, padding: '9px 18px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer' };

function blankQuestion(quizId: string, sort: number): Question {
  return { quiz_id: quizId, text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', free_answer: '', is_difficult: false, points: null, reference: '', sort_order: sort };
}

export default function QuizEditorClient({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<QuizMeta | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [savingMeta, setSavingMeta] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    const { data: q } = await supabase.from('quiz_quizzes')
      .select('id, title, description, category, difficulty, phase, sort_order').eq('id', quizId).single();
    setMeta(q as QuizMeta);
    const { data: qs } = await supabase.from('quiz_questions')
      .select('*').eq('quiz_id', quizId).order('sort_order', { ascending: true });
    setQuestions((qs as Question[]) ?? []);
    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login?redirect=/admin/quiz-control'); return; }
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      if (!isModerator(roleRow?.role)) { router.replace('/dashboard'); return; }
      setAllowed(true);
      load();
    })();
  }, [router, load]);

  const saveMeta = async () => {
    if (!meta) return;
    setSavingMeta(true);
    const { error } = await supabase.from('quiz_quizzes').update({
      title: meta.title, description: meta.description, category: meta.category,
      difficulty: meta.difficulty, phase: meta.phase, sort_order: meta.sort_order,
    }).eq('id', meta.id);
    setSavingMeta(false);
    flash(error ? '❌ ' + error.message : '✅ Manche enregistrée');
  };

  const updateQ = (i: number, patch: Partial<Question>) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const saveQ = async (i: number) => {
    const q = questions[i];
    if (!q.text.trim()) { flash('❌ Le texte de la question est requis'); return; }
    updateQ(i, { _saving: true });
    const payload = {
      quiz_id: quizId, text: q.text,
      option_a: q.option_a || null, option_b: q.option_b || null, option_c: q.option_c || null, option_d: q.option_d || null,
      correct_option: q.correct_option, free_answer: q.correct_option === 'free' ? (q.free_answer || null) : null,
      is_difficult: q.is_difficult, points: q.points, reference: q.reference || null, sort_order: q.sort_order,
    };
    if (q.id) {
      const { error } = await supabase.from('quiz_questions').update(payload).eq('id', q.id);
      updateQ(i, { _saving: false });
      flash(error ? '❌ ' + error.message : '✅ Question enregistrée');
    } else {
      const { data, error } = await supabase.from('quiz_questions').insert(payload).select('id').single();
      updateQ(i, { _saving: false, id: data?.id });
      flash(error ? '❌ ' + error.message : '✅ Question ajoutée');
    }
  };

  const deleteQ = async (i: number) => {
    const q = questions[i];
    if (q.id && !confirm('Supprimer cette question ?')) return;
    if (q.id) {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', q.id);
      if (error) { flash('❌ ' + error.message); return; }
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
    flash('🗑️ Question supprimée');
  };

  const addQ = () => setQuestions((prev) => [...prev, blankQuestion(quizId, (prev[prev.length - 1]?.sort_order ?? 0) + 1)]);

  if (loading || !allowed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'qspin 0.8s linear infinite' }} />
        <style>{`@keyframes qspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if (!meta) return <p style={{ color: 'var(--text-muted)' }}>Manche introuvable. <Link href="/admin/quiz-control">Retour</Link></p>;

  return (
    <div>
      <Link href="/admin/quiz-control" style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>← Contrôle du championnat</Link>

      {toast && <div style={{ ...card, padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, margin: '12px 0' }}>{toast}</div>}

      {/* Métadonnées de la manche */}
      <div style={{ ...card, padding: '18px 20px', margin: '14px 0 24px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 14px', fontFamily: 'var(--font-title)' }}>Paramètres de la manche</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={lbl}>Titre</label><input style={inp} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
          <div><label style={lbl}>Description</label><input style={inp} value={meta.description ?? ''} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div><label style={lbl}>Catégorie</label><select style={inp} value={meta.category ?? ''} onChange={(e) => setMeta({ ...meta, category: e.target.value || null })}><option value="">—</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Difficulté</label><select style={inp} value={meta.difficulty ?? ''} onChange={(e) => setMeta({ ...meta, difficulty: e.target.value || null })}><option value="">—</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label style={lbl}>Phase</label><select style={inp} value={meta.phase ?? 'libre'} onChange={(e) => setMeta({ ...meta, phase: e.target.value })}>{PHASES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label style={lbl}>Ordre</label><input type="number" style={inp} value={meta.sort_order} onChange={(e) => setMeta({ ...meta, sort_order: Number(e.target.value) })} /></div>
          </div>
          <div><button onClick={saveMeta} disabled={savingMeta} style={{ ...btnGold, opacity: savingMeta ? 0.5 : 1 }}>{savingMeta ? '…' : '💾 Enregistrer la manche'}</button></div>
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: 0 }}>Questions ({questions.length})</h2>
        <button onClick={addQ} style={{ ...btnGold, background: 'var(--violet)', color: '#fff' }}>+ Ajouter</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {questions.map((q, i) => (
          <div key={q.id ?? `new-${i}`} style={{ ...card, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold-dark)' }}>Q{i + 1}{q.id ? '' : ' (nouvelle)'}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => saveQ(i)} disabled={q._saving} style={{ ...btnGold, padding: '6px 14px', fontSize: 12, opacity: q._saving ? 0.5 : 1 }}>{q._saving ? '…' : 'Enregistrer'}</button>
                <button onClick={() => deleteQ(i)} style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--error)', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer' }}>Suppr.</button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><label style={lbl}>Question</label><textarea style={{ ...inp, minHeight: 54, resize: 'vertical' }} value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} /></div>
              {q.correct_option !== 'free' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                  {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                    <div key={opt}><label style={lbl}>Option {opt.toUpperCase()}</label>
                      <input style={inp} value={(q[`option_${opt}` as keyof Question] as string) ?? ''} onChange={(e) => updateQ(i, { [`option_${opt}`]: e.target.value } as Partial<Question>)} /></div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignItems: 'end' }}>
                <div><label style={lbl}>Bonne réponse</label><select style={inp} value={q.correct_option ?? 'A'} onChange={(e) => updateQ(i, { correct_option: e.target.value })}>{OPTIONS.map((o) => <option key={o} value={o}>{o === 'free' ? 'Réponse libre' : o}</option>)}</select></div>
                {q.correct_option === 'free' && <div><label style={lbl}>Réponse attendue</label><input style={inp} value={q.free_answer ?? ''} onChange={(e) => updateQ(i, { free_answer: e.target.value })} /></div>}
                <div><label style={lbl}>Référence</label><input style={inp} value={q.reference ?? ''} onChange={(e) => updateQ(i, { reference: e.target.value })} /></div>
                <div><label style={lbl}>Points (vide = auto)</label><input type="number" style={inp} value={q.points ?? ''} onChange={(e) => updateQ(i, { points: e.target.value === '' ? null : Number(e.target.value) })} /></div>
                <div><label style={lbl}>Ordre</label><input type="number" style={inp} value={q.sort_order} onChange={(e) => updateQ(i, { sort_order: Number(e.target.value) })} /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={q.is_difficult} onChange={(e) => updateQ(i, { is_difficult: e.target.checked })} /> Difficile (2 pts)
                </label>
              </div>
            </div>
          </div>
        ))}
        {questions.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucune question. Clique sur « + Ajouter ».</p>}
      </div>
    </div>
  );
}
