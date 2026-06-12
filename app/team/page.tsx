'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import BackButton from '@/components/quiz/BackButton';

const supabase = createClient();

interface Team { id: string; name: string; total_score: number; }
interface Member { id: string; name: string | null; total_score: number; team_id: string | null; }

const card: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)',
};

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login?redirect=/team'); return; }
    await supabase.rpc('quiz_ensure_profile');
    const [{ data: teamRows }, { data: profs }] = await Promise.all([
      supabase.from('quiz_teams').select('id, name, total_score').order('total_score', { ascending: false }),
      supabase.from('quiz_profiles').select('id, name, total_score, team_id'),
    ]);
    setTeams((teamRows as Team[]) ?? []);
    const mem = (profs as Member[]) ?? [];
    setMembers(mem);
    setMyTeamId(mem.find((m) => m.id === user.id)?.team_id ?? null);
    setLoading(false);
  }, [router]);

  useEffect(() => { refresh().catch(() => setLoading(false)); }, [refresh]);

  async function joinTeam(teamId: string) {
    setBusy(true); setMessage('');
    const { error } = await supabase.rpc('quiz_join_team', { p_team_id: teamId });
    if (error) setMessage('❌ ' + error.message);
    else { setMessage('✅ Équipe rejointe !'); await refresh(); }
    setBusy(false);
  }

  async function leaveTeam() {
    setBusy(true); setMessage('');
    const { error } = await supabase.rpc('quiz_leave_team');
    if (error) setMessage('❌ ' + error.message);
    else { setMessage('👋 Tu as quitté ton équipe.'); await refresh(); }
    setBusy(false);
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.rpc('quiz_create_or_join_team', { p_name: newName.trim() });
    if (error) setMessage('❌ ' + error.message);
    else { setMessage('✅ Équipe créée et rejointe !'); setNewName(''); await refresh(); }
    setBusy(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'qspin 0.8s linear infinite' }} />
        <style>{`@keyframes qspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 16px 96px' }}>
      <BackButton />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: 'var(--font-title)' }}>👥 Mon équipe</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 22px' }}>Rejoins une équipe existante ou crée la tienne.</p>

      {message && (
        <div style={{ ...card, padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18 }}>{message}</div>
      )}

      {/* Créer une équipe */}
      <form onSubmit={createTeam} style={{ display: 'flex', gap: 8, marginBottom: 26 }}>
        <input
          type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom de la nouvelle équipe (ex : Les Flambeaux)"
          style={{ flex: 1, boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 'var(--radius-full)', padding: '11px 16px', fontSize: 14, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }}
        />
        <button type="submit" disabled={busy || !newName.trim()}
          style={{ background: 'var(--gold)', color: '#1a0a00', fontWeight: 800, fontSize: 13.5, padding: '11px 20px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', opacity: (busy || !newName.trim()) ? 0.4 : 1, whiteSpace: 'nowrap' }}>
          Créer
        </button>
      </form>

      {/* Liste des équipes + membres */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucune équipe pour l&apos;instant. Crée la première !</p>}
        {teams.map((t) => {
          const isMine = t.id === myTeamId;
          const teamMembers = members
            .filter((m) => m.team_id === t.id)
            .sort((a, b) => b.total_score - a.total_score);
          return (
            <div key={t.id} style={{ ...card, padding: '14px 16px', ...(isMine ? { borderColor: 'var(--gold)', background: 'var(--gold-pale)' } : {}) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: 15 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t.total_score} pts · {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}</p>
                </div>
                {isMine ? (
                  <button disabled={busy} onClick={leaveTeam}
                    style={{ background: 'transparent', color: 'var(--error)', fontWeight: 700, fontSize: 12.5, padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', cursor: 'pointer', opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                    Quitter
                  </button>
                ) : (
                  <button disabled={busy} onClick={() => joinTeam(t.id)}
                    style={{ background: 'var(--violet)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                    Rejoindre
                  </button>
                )}
              </div>

              {/* Membres de l'équipe */}
              {teamMembers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  {teamMembers.map((m) => (
                    <span key={m.id} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '4px 10px' }}>
                      👤 {m.name || 'Joueur'} · {m.total_score} pts
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
