import { redirect } from 'next/navigation';

// L'inscription au Bible Quiz est désormais unifiée avec le compte CCB.
// Cette ancienne page autonome redirige vers le hub (qui envoie les
// visiteurs non connectés vers /auth/login).
export default function RegisterRedirect() {
  redirect('/bible-quiz');
}
