'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. Création du compte dans l'authentification Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création de l'utilisateur.");

      // 2. Gestion de l'équipe (Recherche si elle existe, sinon on la crée)
      let teamId = null;
      if (teamName.trim() !== '') {
        const { data: existingTeam } = await supabase
          .from('quiz_teams')
          .select('id')
          .eq('name', teamName.trim())
          .single();

        if (existingTeam) {
          teamId = existingTeam.id;
        } else {
          const { data: newTeam, error: teamError } = await supabase
            .from('quiz_teams')
            .insert({ name: teamName.trim() })
            .select()
            .single();
          
          if (teamError) throw teamError;
          teamId = newTeam.id;
        }
      }

      // 3. Création du profil joueur lié dans 'quiz_profiles'
      const { error: profileError } = await supabase.from('quiz_profiles').insert({
        id: authData.user.id,
        name: name,
        email: email,
        quiz_team_id: teamId,
        role: 'user'
      });

      if (profileError) throw profileError;

      setMessage('🎉 Inscription réussie ! Redirection vers le jeu...');
      
      setTimeout(() => {
        window.location.href = '/bible-quiz';
      }, 2000);

    } catch (error: any) {
      setMessage(`❌ Erreur : ${error.message || "Une erreur est survenue"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans text-slate-100">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
            Bootcamp Berakah
          </span>
          <h1 className="text-2xl font-extrabold mt-3 tracking-tight">Bible Quiz Championship</h1>
          <p className="text-slate-400 text-sm mt-1">Crée ton profil pour entrer dans l'arène</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nom ou Pseudo</label>
            <input
              type="text"
              required
              placeholder="Ex: Caleb_99"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-400 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Adresse Email</label>
            <input
              type="email"
              required
              placeholder="tu@exemple.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-400 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mot de passe</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-400 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="border-t border-slate-700/50 pt-4">
            <label className="block text-xs font-semibold text-amber-400 uppercase mb-2">Nom de ton Équipe</label>
            <input
              type="text"
              required
              placeholder="Ex: Les Flambeaux"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-400 transition"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1.5 italic">
              Si l'équipe existe déjà, tu la rejoindras. Sinon, elle sera créée instantanément !
            </p>
          </div>

          {/* bg-gradient-to-r mis à jour en bg-linear-to-r pour Tailwind v4 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold p-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition duration-200 text-sm mt-2 disabled:opacity-50"
          >
            {loading ? 'Création du profil...' : 'S\'inscrire et Rejoindre'}
          </button>
        </form>

        {message && (
          <div className="mt-5 p-3 rounded-xl text-center text-xs font-medium bg-slate-950 border border-slate-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}