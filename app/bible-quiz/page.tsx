'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import Link from 'next/link';
import { isModerator } from '@/lib/rbac';
import BackButton from '@/components/quiz/BackButton';

const supabase = createClient();

interface Quiz { id: string; title: string; description: string | null; phase: string | null; is_active: boolean; track?: string | null; level?: number | null; }
interface Phase { key: string; label: string; is_open: boolean; sort_order: number; unlocked: boolean; score_pct: number; }
interface ParcoursEtape { id: string; title: string; sort_order: number; nb_questions: number; unlocked: boolean; score_pct: number; }
interface ParcoursLevel { level: number; label: string; badge_emoji: string; badge_label: string; xp: number; title: string; etapes: ParcoursEtape[]; }
const PASS_PCT = 80;
const etapePassed = (e: ParcoursEtape) => e.nb_questions > 0 && e.score_pct >= PASS_PCT;
const levelCompleted = (l: ParcoursLevel) => {
  const withQ = l.etapes.filter((e) => e.nb_questions > 0);
  return withQ.length > 0 && withQ.every(etapePassed);
};
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
  const [parcours, setParcours] = useState<ParcoursLevel[]>([]);
  const [view, setView] = useState<'home' | 'bootcamp' | 'parcours'>('home');

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

      const [{ data: list }, { data: phaseRows }, { data: attempts }, { data: parcoursData }] = await Promise.all([
        supabase.from('quiz_quizzes').select('id, title, description, phase, is_active, track, level').order('sort_order', { ascending: true }),
        supabase.rpc('quiz_my_phases'),
        supabase.from('quiz_attempts').select('score, completed_at, quiz_quizzes(title)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(8),
        supabase.rpc('quiz_my_parcours'),
      ]);
      // Le championnat exclut les étapes du parcours (track='parcours').
      setQuizzes(((list as Quiz[]) ?? []).filter((q) => q.track !== 'parcours'));
      setPhases((phaseRows as Phase[]) ?? []);
      setParcours((parcoursData as ParcoursLevel[]) ?? []);
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
      <span style={{ fontSize: 'clamp(13px, 3.6vw, 20px)', fontWeight: 800, color, display: 'block', marginTop: 2, lineHeight: 1.15, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );

  const quizCard = (q: Quiz, locked: boolean) => {
    const inner = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontWeight: 700, color: 'var(--gold-light)', fontFamily: 'var(--font-title)', margin: 0, fontSize: 14 }}>{q.title}</p>
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

  // "Toujours ouverts" = quiz 'libre' (ni championnat, ni parcours).
  const phaseKeys = new Set(phases.map((p) => p.key));
  const available = quizzes.filter((q) => !(q.phase && q.phase !== 'libre' && phaseKeys.has(q.phase)));
  const parcoursDone = parcours.filter(levelCompleted);
  const modeCard: React.CSSProperties = {
    ...card, padding: '24px 18px', textAlign: 'center', cursor: 'pointer', display: 'block',
    border: '1px solid var(--gold)', background: 'var(--gold-pale)', width: '100%',
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 96px' }}>
      <BackButton />

      {/* En-tête (retour sur les sous-vues) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {view !== 'home' && (
          <button onClick={() => setView('home')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--gold)', borderRadius: 'var(--radius-full)', padding: '6px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>← Bible Quiz</button>
        )}
        <h1 style={{ fontSize: 'clamp(20px, 5.5vw, 26px)', fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-title)' }}>
          {view === 'home' ? '🏆 Bible Quiz' : view === 'bootcamp' ? '🏆 Bootcamp Quiz' : '📿 Parcours de discipolat'}
        </h1>
        {isAdmin && view !== 'parcours' && (
          <Link href="/admin/quiz-control" style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#1a1206', fontWeight: 800, fontSize: 12.5, padding: '8px 14px', borderRadius: 'var(--radius-full)', textDecoration: 'none', whiteSpace: 'nowrap' }}>⚙️ Admin</Link>
        )}
      </div>

      {/* ============ ACCUEIL ============ */}
      {view === 'home' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
            {stat('Score', String(stats?.total_score ?? 0), 'var(--gold-dark)')}
            {stat('Niveau', LEVEL_LABEL[stats?.level ?? 'debutant'] ?? 'Débutant', 'var(--gold-light)')}
            {stat('Équipe', teamName ?? '—', 'var(--text-primary)')}
          </div>

          {/* Deux modes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
            <button onClick={() => setView('bootcamp')} style={modeCard}>
              <div style={{ fontSize: 40 }}>🏆</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-title)', marginTop: 6 }}>Bootcamp Quiz</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>Le championnat : qualifications, quarts, demi, grande finale.</p>
            </button>
            <button onClick={() => setView('parcours')} style={modeCard}>
              <div style={{ fontSize: 40 }}>📿</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-title)', marginTop: 6 }}>Parcours de discipolat</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                9 niveaux · progression 80% · badges &amp; XP{parcours.length ? ` · ${parcoursDone.length}/${parcours.length} ✓` : ''}
              </p>
            </button>
          </div>

          {/* Jeux toujours ouverts (sans compétition) */}
          {available.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Jeux toujours ouverts (sans compétition)</h2>
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
        </>
      )}

      {/* ============ BOOTCAMP QUIZ (championnat) ============ */}
      {view === 'bootcamp' && (
        <>
          {!phases.some((ph) => quizzes.some((q) => q.phase === ph.key)) && (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucune manche de championnat pour l&apos;instant.</p>
          )}
          {phases.map((ph, idx) => {
            const phaseQuizzes = quizzes.filter((q) => q.phase === ph.key);
            if (phaseQuizzes.length === 0) return null;
            const isFirst = idx === 0;
            const prev = phases[idx - 1];
            return (
              <div key={ph.key} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{ph.label}</h2>
                  <span style={{
                    fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', borderRadius: 'var(--radius-full)', padding: '3px 10px',
                    background: ph.unlocked ? 'rgba(34,197,94,0.14)' : 'var(--surface-2)',
                    color: ph.unlocked ? 'var(--success)' : 'var(--text-muted)',
                  }}>{ph.unlocked ? (isFirst ? 'Ouverte' : '✓ Débloquée') : '🔒 90% requis'}</span>
                </div>
                {!ph.unlocked && (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                    {isFirst || !prev
                      ? 'Phase fermée par l’organisation.'
                      : <>Atteins <b style={{ color: 'var(--gold-dark)' }}>90%</b> à « {prev.label} » pour débloquer — ton score actuel : <b>{prev.score_pct}%</b>.</>}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {phaseQuizzes.map((q) => quizCard(q, !ph.unlocked))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ============ PARCOURS DE DISCIPOLAT ============ */}
      {view === 'parcours' && (
        parcours.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Parcours en préparation.</p>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
              Avance étape par étape — <b style={{ color: 'var(--gold-dark)' }}>{PASS_PCT}%</b> pour débloquer la suivante.
              {' '}Titre : <b>{parcoursDone.length ? parcoursDone[parcoursDone.length - 1].title : '—'}</b> · <b>{parcoursDone.reduce((s, l) => s + l.xp, 0)}</b> XP · {parcoursDone.length}/{parcours.length} niveaux {parcoursDone.map((l) => l.badge_emoji).join('')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {parcours.map((lvl) => {
                const completed = levelCompleted(lvl);
                const hasQ = lvl.etapes.some((e) => e.nb_questions > 0);
                return (
                  <div key={lvl.level} style={{ ...card, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 22 }}>{lvl.badge_emoji}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-title)' }}>Niveau {lvl.level} · {lvl.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{lvl.badge_label} · {lvl.xp} XP · titre « {lvl.title} »</div>
                      </div>
                      <span style={{
                        marginLeft: 'auto', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                        borderRadius: 'var(--radius-full)', padding: '3px 10px',
                        background: completed ? 'rgba(34,197,94,0.14)' : 'var(--surface-2)',
                        color: completed ? 'var(--success)' : 'var(--text-muted)',
                      }}>{completed ? '✓ Badge obtenu' : hasQ ? 'En cours' : 'À venir'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                      {lvl.etapes.map((e) => {
                        const empty = e.nb_questions === 0;
                        const passed = etapePassed(e);
                        const locked = !e.unlocked || empty;
                        const st: React.CSSProperties = {
                          padding: '10px 12px', borderRadius: 'var(--radius-md)', display: 'block', textDecoration: 'none',
                          border: `1px solid ${passed ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                          background: passed ? 'rgba(34,197,94,0.08)' : 'var(--surface-2)',
                          opacity: locked ? 0.6 : 1,
                        };
                        const inner = (
                          <>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: locked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                              {!e.unlocked && !empty ? '🔒 ' : ''}{e.title.replace(/^N\d+ · É\d+ — /, '')}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {empty ? 'À venir' : passed ? `✓ ${e.score_pct}%` : (e.score_pct > 0 ? `${e.score_pct}%` : `${e.nb_questions} questions`)}
                            </div>
                          </>
                        );
                        return locked
                          ? <div key={e.id} style={st}>{inner}</div>
                          : <Link key={e.id} href={`/quiz/${e.id}`} style={st}>{inner}</Link>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      )}
    </div>
  );
}
