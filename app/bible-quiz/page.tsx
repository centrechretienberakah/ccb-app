'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function BibleQuizDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [activePhase, setActivePhase] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  useEffect(() => {
    // Initialisation déplacée ici pour corriger l'avertissement 'react-hooks/exhaustive-deps'
    const supabase = createClient();

    async function loadDashboardData() {
      try {
        // 1. Récupérer l'utilisateur connecté dans l'Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/register';
          return;
        }

        // 2. Récupérer le profil du quiz spécifique à cet utilisateur
        const { data: profile } = await supabase
          .from('quiz_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profile) {
          window.location.href = '/register';
          return;
        }
        setUserProfile(profile);

        // 3. Récupérer les informations de son équipe de quiz
        if (profile.quiz_team_id) {
          const { data: teamData } = await supabase
            .from('quiz_teams')
            .select('*')
            .eq('id', profile.quiz_team_id)
            .single();
          setTeam(teamData);
        }

        // 4. Récupérer la phase en cours gérée par l'admin
        const { data: phaseData } = await supabase
          .from('quiz_phases')
          .select('*')
          .eq('is_open', true)
          .order('step_order', { ascending: false })
          .limit(1)
          .single();
        
        setActivePhase(phaseData);

        // 5. Récupérer les questionnaires ouverts pour cette phase
        if (phaseData) {
          const { data: quizData } = await supabase
            .from('quiz_quizzes')
            .select('*')
            .eq('phase_id', phaseData.id)
            .eq('is_active', true);
          setQuizzes(quizData || []);
        }

      } catch (error) {
        console.error("Erreur lors du chargement des données du quiz :", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Chargement de l'arène Berakah...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* EN-TÊTE ET RENSEIGNEMENTS DU JOUEUR */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 gap-4 shadow-xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
              Niveau : {userProfile?.level || 'Débutant'}
            </span>
            <h1 className="text-3xl font-extrabold mt-2 tracking-tight">Bienvenue, {userProfile?.name} !</h1>
            <p className="text-slate-400 text-sm mt-0.5">Équipe : <span className="text-slate-200 font-semibold">{team?.name || 'Aucune'}</span></p>
          </div>
          <div className="flex gap-4">
            {/* min-w-[110px] mis à jour en min-w-27.5 pour Tailwind v4 */}
            <div className="bg-slate-950 border border-slate-800 px-6 py-3 rounded-xl text-center min-w-27.5">
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mon Score</span>
              <span className="text-xl font-black text-amber-400">{userProfile?.total_score || 0} pts</span>
            </div>
            {/* min-w-[110px] mis à jour en min-w-27.5 pour Tailwind v4 */}
            <div className="bg-slate-950 border border-slate-800 px-6 py-3 rounded-xl text-center min-w-27.5">
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Score Équipe</span>
              <span className="text-xl font-black text-blue-400">{team?.total_score || 0} pts</span>
            </div>
          </div>
        </div>

        {/* AFFICHAGE DE LA MANCHE ACTUELLE */}
        {/* bg-gradient-to-r mis à jour en bg-linear-to-r pour Tailwind v4 */}
        <div className="bg-linear-to-r from-blue-900/40 to-slate-900 p-6 rounded-2xl border border-blue-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
              🏆 Championnat en cours
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              L'administration a ouvert la phase : <span className="font-extrabold text-white text-base">{activePhase?.name || 'Aucune phase ouverte'}</span>
            </p>
          </div>
          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 animate-pulse">
            Match en Direct
          </span>
        </div>

        {/* GRILLE DES QUIZ DISPONIBLES */}
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">Quiz disponibles pour cette manche</h3>
          {quizzes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-sm">
              ⏳ Aucun quiz n'est encore publié pour cette phase. Reste attentif aux consignes de l'animateur !
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition shadow-lg">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
                        {quiz.difficulty}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{quiz.category}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-100">{quiz.title}</h4>
                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{quiz.description}</p>
                  </div>
                  <button
                    onClick={() => window.location.href = `/quiz/${quiz.id}`}
                    className="w-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold text-sm p-3 rounded-xl mt-6 transition text-center"
                  >
                    Lancer le Quiz
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}