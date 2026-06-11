import QuizControlClient from './QuizControlClient';

export default function AdminControlPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12 antialiased">
      <div className="max-w-6xl mx-auto">
        <QuizControlClient />
      </div>
    </main>
  );
}