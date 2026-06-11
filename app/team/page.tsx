'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

const supabase = createClient();

export default function TeamPage() {
  const [loading, setLoading] = useState(false);

  async function joinTeam(teamId: string) {
    setLoading(true);
    
    // Exemple pour récupérer l'utilisateur (à adapter selon ton auth)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from('quiz_profiles')
        .update({ team_id: teamId })
        .eq('id', user.id); // Utilise .eq('id', ...) si c'est ta clé primaire

      if (error) {
        alert('Erreur lors de la mise à jour : ' + error.message);
      } else {
        alert('Bienvenue dans l\'équipe !');
      }
    }
    
    setLoading(false);
  }

  return (
    <div className="p-12 text-white max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Choisis ton équipe</h1>
      <div className="grid gap-4">
        <button 
          disabled={loading}
          onClick={() => joinTeam('team-a-id')} 
          className="p-4 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          {loading ? 'Connexion en cours...' : 'Équipe A - Les conquérants'}
        </button>
        <button 
          disabled={loading}
          onClick={() => joinTeam('team-b-id')} 
          className="p-4 bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition"
        >
          {loading ? 'Connexion en cours...' : 'Équipe B - Les bâtisseurs'}
        </button>
      </div>
    </div>
  );
}