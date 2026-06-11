import PlayQuizClient from './PlayQuizClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayQuizPage({ params }: PageProps) {
  // Extraction sécurisée de l'ID du quiz (Next.js 15+)
  const resolvedParams = await params;
  
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center antialiased inside-champ">
      <PlayQuizClient quizId={resolvedParams.id} />
    </main>
  );
}