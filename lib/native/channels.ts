/**
 * Canaux de notification Android (Phase 2). Partagé entre :
 *   - la création des canaux côté app (NativePushRegistrar)
 *   - le routage serveur (choix du channel_id selon le type de notif)
 *
 * Chaque canal a son importance/comportement (son, vibration, priorité).
 */
export type ChannelImportance = 1 | 2 | 3 | 4 | 5; // 5 = URGENT (plein écran), 4 = HIGH

export interface NotifChannel {
  id: string;
  name: string;
  description: string;
  importance: ChannelImportance;
  vibration: boolean;
}

export const CHANNELS: NotifChannel[] = [
  { id: "calls",    name: "Appels",            description: "Appels audio et vidéo entrants",       importance: 5, vibration: true },
  { id: "messages", name: "Messages privés",   description: "Nouveaux messages privés",              importance: 4, vibration: true },
  { id: "groups",   name: "Groupes",           description: "Messages dans les groupes",             importance: 4, vibration: true },
  { id: "live",     name: "CCB Live",          description: "Diffusions et directs",                 importance: 4, vibration: true },
  { id: "events",   name: "Événements",        description: "Rappels d'événements",                  importance: 3, vibration: false },
  { id: "institut", name: "Institut Biblique", description: "Cours et formations",                   importance: 3, vibration: false },
  { id: "quiz",     name: "Bible Quiz",        description: "Quiz et championnats",                  importance: 3, vibration: false },
  { id: "plans",    name: "Plans de lecture",  description: "Rappels de lecture biblique",           importance: 3, vibration: false },
  { id: "devotion", name: "Méditons Ensemble", description: "Méditation du jour",                    importance: 3, vibration: false },
  { id: "general",  name: "Général",           description: "Annonces et notifications générales",   importance: 3, vibration: false },
];

/** Type logique d'une notif → identifiant de canal Android. */
export function channelForType(type?: string | null): string {
  switch (type) {
    case "call":     return "calls";
    case "message":
    case "dm":       return "messages";
    case "group":    return "groups";
    case "live":
    case "jdtv":     return "live";
    case "event":    return "events";
    case "institut": return "institut";
    case "quiz":     return "quiz";
    case "plan":     return "plans";
    case "devotion": return "devotion";
    default:         return "general";
  }
}
