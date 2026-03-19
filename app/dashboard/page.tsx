'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

interface LogEntry {
  id: string;
  platform: string;
  fuel: string;
  motor: string;
  score: number;
  grade: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const isPro = (session?.user as { isPro?: boolean })?.isPro ?? false;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated') {
      fetch('/api/logs').then(r => r.json()).then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
    }
  }, [status, router]);

  const gradeColor = (g: string) =>
    g === 'A' ? 'text-green-400' : g === 'B' ? 'text-blue-400' : g === 'C' ? 'text-yellow-400' : 'text-red-400';

  if (status === 'loading') return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl">🔧</Link>
            <div>
              <h1 className="text-xl font-bold text-white">TuneAnalyzer</h1>
              <p className="text-xs text-gray-500">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analyze" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors">+ New Analysis</Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-xs text-gray-500 hover:text-white transition-colors">Sign out</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Log History</h2>
          {!isPro && (
            <Link href="/signup" className="text-sm text-blue-400 hover:text-blue-300">Upgrade to Pro →</Link>
          )}
        </div>

        {!isPro ? (
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-12 text-center">
            <span className="text-5xl mb-4 block">🔒</span>
            <h3 className="text-lg font-bold text-white mb-2">Log history is a Pro feature</h3>
            <p className="text-gray-400 text-sm mb-6">Upgrade to Pro to save and review your last 10 logs</p>
            <Link href="/signup" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors">
              Upgrade to Pro — $9.99/month
            </Link>
          </div>
        ) : loading ? (
          <div className="text-center text-gray-500 py-12">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="mb-4">No logs yet.</p>
            <Link href="/analyze" className="text-blue-400 hover:text-blue-300">Analyze your first log →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-gray-800/40 border border-gray-700 rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{log.score}</div>
                    <div className={`text-lg font-bold ${gradeColor(log.grade)}`}>{log.grade}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white capitalize">{log.platform.toUpperCase()} · {log.fuel.toUpperCase()} · {log.motor}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
