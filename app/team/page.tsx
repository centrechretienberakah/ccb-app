'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

const supabase = createClient();

interface Team { id: string; name: string; total_score: number; }

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login?redirect=/team'); return; }
    await supabase.rpc('quiz_ensure_profile');
    const [{ data: teamRows }, { data: profile }] = await Promise.all([
      supabase.from('quiz_teams').select('id, name, total_score').order('total_score', { ascending: false }),
      supabase.from('quiz_profiles').select('team_id').eq('id', user.id).single(),
    ]);
    setTeams((teamRows as Team[]) ?? []);
    setMyTeamId(profile?.team_id ?? null);
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
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-black mb-2">Mon équipe</h1>
        <p className="text-slate-400 text-sm mb-6">Rejoins une équipe existante ou crée la tienne.</p>

        {message && (
          <div className="mb-5 p-3 rounded-xl text-center text-xs font-medium bg-slate-900 border border-slate-800">{message}</div>
        )}

        {/* Créer une équipe */}
        <form onSubmit={createTeam} className="flex gap-2 mb-8">
          <input
            type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom de la nouvelle équipe (ex: Les Flambeaux)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 transition"
          />
          <button type="submit" disabled={busy || !newName.trim()}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold px-5 py-3 rounded-xl transition text-sm">
            Créer
          </button>
        </form>

        {/* Liste des équipes */}
        <div className="grid gap-3">
          {teams.length === 0 && <p className="text-slate-500 text-sm">Aucune équipe pour l&apos;instant. Crée la première !</p>}
          {teams.map((t) => {
            const isMine = t.id === myTeamId;
            return (
              <div key={t.id} className={`flex items-center justify-between gap-4 p-4 rounded-2xl border ${isMine ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900 border-slate-800'}`}>
                <div>
                  <p className="font-bold text-slate-100">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.total_score} pts</p>
                </div>
                {isMine ? (
                  <span className="text-xs font-bold text-amber-400 uppercase">Mon équipe ✓</span>
                ) : (
                  <button disabled={busy} onClick={() => joinTeam(t.id)}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition">
                    Rejoindre
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
