'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import BackButton from '@/components/quiz/BackButton';

const supabase = createClient();

interface Score { name: string; total_score: number; level: string; team_name: string; }
interface TeamScore { id: string; name: string; total_score: number; }

const LEVEL_LABEL: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', 'avancé': 'Avancé', expert: 'Expert',
};

const MEDAL = ['🥇', '🥈', '🥉'];

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
};

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      // Pas d'embed PostgREST (qui dépend de la FK) : on lit les deux tables
      // séparément et on rattache le nom d'équipe en JS → toujours robuste.
      const [{ data: profs }, { data: teamRows }] = await Promise.all([
        supabase.from('quiz_profiles').select('name, total_score, level, team_id').order('total_score', { ascending: false }).limit(20),
        supabase.from('quiz_teams').select('id, name, total_score').order('total_score', { ascending: false }),
      ]);

      const teamRowList = (teamRows as TeamScore[]) ?? [];
      const teamMap = new Map<string, string>();
      for (const t of teamRowList) teamMap.set(t.id, t.name);
      setTeams(teamRowList);

      setScores(((profs as Record<string, unknown>[]) ?? []).map((item) => ({
        name: (item.name as string) || 'Joueur',
        total_score: (item.total_score as number) || 0,
        level: (item.level as string) || 'debutant',
        team_name: teamMap.get(item.team_id as string) || 'Sans équipe',
      })));
      setLoading(false);
    }
    fetchScores();
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 96px' }}>
      <BackButton />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px', fontFamily: 'var(--font-title)' }}>🏆 Classement du championnat</h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'qspin 0.8s linear infinite' }} />
          <style>{`@keyframes qspin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {/* Classement des équipes */}
          {teams.length > 0 && (
            <div style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Équipes</h2>
              <div style={card}>
                {teams.map((t, index) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: index === teams.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <span style={{ width: 28, textAlign: 'center', fontWeight: 800, color: 'var(--gold-dark)', fontSize: index < 3 ? 18 : 14 }}>{MEDAL[index] ?? `#${index + 1}`}</span>
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold-dark)', whiteSpace: 'nowrap' }}>{t.total_score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classement individuel */}
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Joueurs</h2>
          {scores.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucun score enregistré pour le moment. Sois le premier à jouer !</p>
          ) : (
            <div style={card}>
              {scores.map((s, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderBottom: index === scores.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <span style={{ width: 28, textAlign: 'center', fontWeight: 800, color: 'var(--gold-dark)', fontSize: index < 3 ? 18 : 14 }}>{MEDAL[index] ?? `#${index + 1}`}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '1px 0 0' }}>{s.team_name} · {LEVEL_LABEL[s.level] ?? 'Débutant'}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--violet)', whiteSpace: 'nowrap' }}>{s.total_score} pts</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
