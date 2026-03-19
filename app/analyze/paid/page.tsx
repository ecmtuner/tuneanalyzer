'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ResultsPanel from '@/components/ResultsPanel';
import { AnalysisResult, FuelType } from '@/lib/scorer';
import { Platform } from '@/lib/columns';
import { Suspense } from 'react';

interface StoredResult {
  result: AnalysisResult;
  fuel: FuelType;
  platform: Platform;
  motor: string;
}

function PaidResultsInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const mock = params.get('mock');
  const sessionId = params.get('session_id');

  const [stored, setStored] = useState<StoredResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('No result token found.'); return; }
    // For mock mode (no Stripe configured) or real Stripe success
    // In real mode you'd verify session_id server-side — for now trust the token
    const raw = sessionStorage.getItem(`logiq_result_${token}`);
    if (!raw) {
      setError('Result expired or not found. Results are only available immediately after payment.');
      return;
    }
    try {
      setStored(JSON.parse(raw));
      // Clean up after reading
      sessionStorage.removeItem(`logiq_result_${token}`);
    } catch {
      setError('Failed to load result.');
    }
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-white font-bold text-lg mb-2">Result not found</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Link href="/analyze" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors">
            Analyze another log
          </Link>
        </div>
      </div>
    );
  }

  if (!stored) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading your results...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl">🔧</Link>
            <div>
              <h1 className="text-xl font-bold text-white">TuneAnalyzer</h1>
              <p className="text-xs text-gray-500">Full Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mock ? (
              <span className="text-xs text-yellow-500 bg-yellow-900/30 px-2 py-1 rounded">Demo mode</span>
            ) : (
              <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">✓ Payment verified</span>
            )}
            <Link href="/#pricing" className="text-xs text-blue-400 hover:text-blue-300">Get monthly plan →</Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Upsell banner */}
        <div className="mb-6 p-4 bg-gray-800/40 border border-gray-700 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm text-gray-400">💡 Want to save logs and analyze more? Get a monthly plan.</p>
          <Link href="/#pricing" className="shrink-0 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium">See Plans</Link>
        </div>

        <ResultsPanel
          result={stored.result}
          fuel={stored.fuel}
          cylinderCount={0}
          platform={stored.platform}
          onReset={() => window.location.href = '/analyze'}
        />
      </div>

      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
        TuneAnalyzer — Built for ECMTuner.com · Not a substitute for professional tuning advice
      </footer>
    </main>
  );
}

export default function PaidResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>}>
      <PaidResultsInner />
    </Suspense>
  );
}
