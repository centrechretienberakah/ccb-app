'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import Link from 'next/link';
import { isModerator } from '@/lib/rbac';

const supabase = createClient();

interface Quiz { id: string; title: string; description: string | null; phase: string | null; is_active: boolean; }
interface Phase { key: string; label: string; is_open: boolean; sort_order: number; }
interface MyStats { total_score: number; level: string; team_id: string | null; }
interface Attempt { score: number; completed_at: string; quiz_quizzes: { title?: string } | null; }

const LEVEL_LABEL: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', 'avancé': 'Avancé', expert: 'Expert',
};

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function BibleQuizHub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login?redirect=/bible-quiz'); return; }

      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      setIsAdmin(isModerator(roleRow?.role));

      const { data: profile } = await supabase.rpc('quiz_ensure_profile');
      const p = profile as MyStats | null;
      if (p) {
        setStats(p);
        if (p.team_id) {
          const { data: team } = await supabase.from('quiz_teams').select('name').eq('id', p.team_id).single();
          setTeamName(team?.name ?? null);
        }
      }

      const [{ data: list }, { data: phaseRows }, { data: attempts }] = await Promise.all([
        supabase.from('quiz_quizzes').select('id, title, description, phase, is_active').order('sort_order', { ascending: true }),
        supabase.from('quiz_phases').select('key, label, is_open, sort_order').order('sort_order', { ascending: true }),
        supabase.from('quiz_attempts').select('score, completed_at, quiz_quizzes(title)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(8),
      ]);
      setQuizzes((list as Quiz[]) ?? []);
      setPhases((phaseRows as Phase[]) ?? []);
      setHistory((attempts as unknown as Attempt[]) ?? []);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'qspin 0.8s linear infinite' }} />
        <style>{`@keyframes qspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const stat = (label: string, value: string, color: string) => (
    <div style={{ ...card, padding: '14px 10px', textAlign: 'center' }}>
      <span style={{ display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color, display: 'block', marginTop: 2 }}>{value}</span>
    </div>
  );

  const quizCard = (q: Quiz, locked: boolean) => {
    const inner = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: 14 }}>{q.title}</p>
          {locked ? <span style={{ fontSize: 12 }}>🔒</span>
            : q.is_active ? <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>● En cours</span> : null}
        </div>
        {q.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{q.description}</p>}
      </>
    );
    return locked ? (
      <div key={q.id} style={{ ...card, padding: '14px 16px', opacity: 0.55 }} title="Phase fermée">{inner}</div>
    ) : (
      <Link key={q.id} href={`/quiz/${q.id}`} style={{ ...card, padding: '14px 16px', textDecoration: 'none', display: 'block' }}>{inner}</Link>
    );
  };

  // "Disponibles" = quiz 'libre' + tout quiz dont la phase n'est pas (encore)
  // gérée dans quiz_phases → robuste si la migration v67 n'est pas appliquée.
  const phaseKeys = new Set(phases.map((p) => p.key));
  const available = quizzes.filter((q) => !(q.phase && q.phase !== 'libre' && phaseKeys.has(q.phase)));

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 96px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-title)' }}>🏆 Bible Quiz Championship</h1>
        {isAdmin && (
          <Link href="/admin/quiz-control"
            style={{ display: 'inline-block', marginTop: 12, background: 'var(--violet)', color: '#fff', fontWeight: 800, fontSize: 13, padding: '9px 18px', borderRadius: 'var(--radius-full)', textDecoration: 'none' }}>
            ⚙️ Administration du championnat
          </Link>
        )}
      </div>

      {/* Mes stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 26 }}>
        {stat('Score', String(stats?.total_score ?? 0), 'var(--gold-dark)')}
        {stat('Niveau', LEVEL_LABEL[stats?.level ?? 'debutant'] ?? 'Débutant', 'var(--violet)')}
        {stat('Équipe', teamName ?? '—', 'var(--text-primary)')}
      </div>

      {/* Phases du championnat */}
      {phases.map((ph) => {
        const phaseQuizzes = quizzes.filter((q) => q.phase === ph.key);
        if (phaseQuizzes.length === 0) return null;
        return (
          <div key={ph.key} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{ph.label}</h2>
              <span style={{
                fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderRadius: 'var(--radius-full)', padding: '3px 10px',
                background: ph.is_open ? 'rgba(34,197,94,0.14)' : 'var(--surface-2)',
                color: ph.is_open ? 'var(--success)' : 'var(--text-muted)',
              }}>{ph.is_open ? 'Ouverte' : '🔒 Fermée'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {phaseQuizzes.map((q) => quizCard(q, !ph.is_open))}
            </div>
          </div>
        );
      })}

      {/* Toujours disponible */}
      {available.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Toujours disponible</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {available.map((q) => quizCard(q, false))}
          </div>
        </div>
      )}

      {/* Mon historique */}
      {history.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Mon historique</h2>
          <div style={{ ...card, overflow: 'hidden' }}>
            {history.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 16px', borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.quiz_quizzes?.title ?? 'Manche'}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>{fmtDate(a.completed_at)}</p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold-dark)', whiteSpace: 'nowrap' }}>+{a.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav rapide */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link href="/leaderboard" style={{ ...card, padding: '18px', textAlign: 'center', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>🏆 Voir le classement</Link>
        <Link href="/team" style={{ ...card, padding: '18px', textAlign: 'center', textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>👥 Gérer mon équipe</Link>
      </div>
    </div>
  );
}
