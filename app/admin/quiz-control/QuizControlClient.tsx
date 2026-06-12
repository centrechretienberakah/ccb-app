'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { isModerator } from '@/lib/rbac';

const supabase = createClient();

interface QuizAdmin {
  id: string;
  title: string;
  is_active: boolean;
  questions_count?: number;
  answers_count?: number;
}
interface Phase { key: string; label: string; is_open: boolean; sort_order: number; }
interface AdminStats {
  players: number; teams: number; attempts: number; answers: number; avg_score: number;
  levels: { debutant: number; intermediaire: number; avance: number; expert: number };
}

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)',
};
const chip: React.CSSProperties = {
  fontSize: 11.5, background: 'var(--surface-2)', color: 'var(--text-muted)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 8px',
};

export default function QuizControlClient() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizAdmin[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    try {
      const [{ data: quizzesData }, { data: phaseRows }, { data: statsData }] = await Promise.all([
        supabase.from('quiz_quizzes').select('id, title, is_active').order('sort_order', { ascending: true }),
        supabase.from('quiz_phases').select('key, label, is_open, sort_order').order('sort_order', { ascending: true }),
        supabase.rpc('quiz_admin_stats'),
      ]);
      setPhases((phaseRows as Phase[]) ?? []);
      setStats((statsData as AdminStats) ?? null);

      if (quizzesData) {
        const fullData = await Promise.all(
          quizzesData.map(async (quiz) => {
            const { count: qCount } = await supabase
              .from('quiz_questions').select('*', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
            const { count: aCount } = await supabase
              .from('quiz_answers').select('*', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
            return { ...quiz, questions_count: qCount || 0, answers_count: aCount || 0 };
          })
        );
        setQuizzes(fullData);
      }
    } catch {
      console.error('Erreur de récupération admin');
    } finally {
      setLoading(false);
    }
  }, []);

  // Garde de rôle : modérateur+ uniquement (cohérent avec le reste de l'admin CCB).
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login?redirect=/admin/quiz-control'); return; }
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      if (!isModerator(roleRow?.role)) { router.replace('/dashboard'); return; }
      setAllowed(true);
      fetchAdminData();
    })();
  }, [router, fetchAdminData]);

  const togglePhase = async (key: string, isOpen: boolean) => {
    setActionLoading('phase-' + key);
    try {
      const { error } = await supabase.from('quiz_phases').update({ is_open: !isOpen }).eq('key', key);
      if (error) throw error;
      setPhases((prev) => prev.map((p) => (p.key === key ? { ...p, is_open: !isOpen } : p)));
    } catch {
      alert("Erreur lors du changement d'état de la phase.");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleQuizStatus = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('quiz_quizzes').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      setQuizzes((prev) => prev.map((q) => (q.id === id ? { ...q, is_active: !currentStatus } : q)));
    } catch {
      alert("Erreur lors du changement d'état du quiz.");
    } finally {
      setActionLoading(null);
    }
  };

  const resetQuizAnswers = async (id: string) => {
    if (!confirm('⚠️ ATTENTION : Cela va supprimer TOUTES les réponses des joueurs pour ce quiz. Continuer ?')) return;
    setActionLoading(id + '-reset');
    try {
      const { error: answersError } = await supabase.from('quiz_answers').delete().eq('quiz_id', id);
      const { error: attemptsError } = await supabase.from('quiz_attempts').delete().eq('quiz_id', id);
      if (answersError || attemptsError) throw new Error('Erreur');
      alert('Toutes les réponses de ce questionnaire ont été réinitialisées !');
      fetchAdminData();
    } catch {
      alert('Erreur lors du nettoyage des réponses.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !allowed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12 }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'qspin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chargement du panneau d&apos;administration…</p>
        <style>{`@keyframes qspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const metric = (label: string, value: string | number) => (
    <div style={{ ...card, padding: '14px 12px', textAlign: 'center' }}>
      <span style={{ display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginTop: 2 }}>{value}</span>
    </div>
  );

  return (
    <div>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--gold-pale)', color: 'var(--gold-dark)', borderRadius: 'var(--radius-full)', padding: '4px 12px' }}>Espace Admin</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 0', fontFamily: 'var(--font-title)' }}>Contrôle du championnat</h1>
      </div>

      {/* Statistiques */}
      {stats && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 10 }}>
            {metric('Joueurs', stats.players)}
            {metric('Équipes', stats.teams)}
            {metric('Tentatives', stats.attempts)}
            {metric('Score moyen', stats.avg_score)}
          </div>
          <div style={{ ...card, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Niveaux</span>
            <span style={chip}>Débutant : {stats.levels.debutant}</span>
            <span style={chip}>Intermédiaire : {stats.levels.intermediaire}</span>
            <span style={chip}>Avancé : {stats.levels.avance}</span>
            <span style={chip}>Expert : {stats.levels.expert}</span>
          </div>
        </div>
      )}

      {/* Phases du championnat */}
      {phases.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Phases du championnat</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {phases.map((ph) => (
              <div key={ph.key} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{ph.label}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', borderRadius: 'var(--radius-full)', padding: '3px 10px',
                    background: ph.is_open ? 'rgba(34,197,94,0.14)' : 'var(--surface-2)', color: ph.is_open ? 'var(--success)' : 'var(--text-muted)' }}>
                    {ph.is_open ? 'Ouverte' : 'Fermée'}
                  </span>
                </div>
                <button disabled={actionLoading === 'phase-' + ph.key} onClick={() => togglePhase(ph.key, ph.is_open)}
                  style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 18px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer',
                    background: ph.is_open ? 'rgba(239,68,68,0.10)' : 'var(--gold)',
                    color: ph.is_open ? 'var(--error)' : '#1a0a00' }}>
                  {ph.is_open ? 'Fermer' : 'Ouvrir'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz */}
      <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Manches</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {quizzes.map((quiz) => (
          <div key={quiz.id} style={{ ...card, padding: '18px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{quiz.title}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span style={chip}>Questions : {quiz.questions_count}</span>
                <span style={chip}>Réponses : {quiz.answers_count}</span>
                {quiz.is_active && <span style={{ ...chip, background: 'rgba(34,197,94,0.12)', color: 'var(--success)', borderColor: 'rgba(34,197,94,0.3)' }}>● Active</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={actionLoading === quiz.id} onClick={() => toggleQuizStatus(quiz.id, quiz.is_active)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer',
                  background: quiz.is_active ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.12)',
                  color: quiz.is_active ? 'var(--error)' : 'var(--success)' }}>
                {quiz.is_active ? 'Désactiver' : 'Activer'}
              </button>
              <button onClick={() => resetQuizAnswers(quiz.id)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Réinitialiser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
