'use client';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import UploadZone from '@/components/UploadZone';
import ResultsPanel from '@/components/ResultsPanel';
import { parseCSV } from '@/lib/parser';
import { analyzeLog, AnalysisResult, FuelType, MotorType } from '@/lib/scorer';
import { Platform } from '@/lib/columns';

// This page is ONLY for one-time paid users
// Access granted either by: paid=1 in sessionStorage (after Stripe) or ?mock=1 for testing

function OneTimeAnalyzeInner() {
  const params = useSearchParams();
  const mock = params.get('mock');
  const sessionToken = params.get('session_token');

  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('bm3');
  const [fuel, setFuel] = useState<FuelType>('pump');
  const [motor, setMotor] = useState<MotorType>('stock');

  useEffect(() => {
    // Check if already paid this session
    if (sessionStorage.getItem('logiq_onetime_paid') === '1') { setPaid(true); return; }
    // Mock mode for testing (no Stripe)
    if (mock === '1') { sessionStorage.setItem('logiq_onetime_paid', '1'); setPaid(true); return; }
    // Real Stripe — session_token passed back after checkout
    if (sessionToken) { sessionStorage.setItem('logiq_onetime_paid', '1'); setPaid(true); return; }
  }, [mock, sessionToken]);

  const handlePay = async () => {
    setPaying(true);
    const res = await fetch('/api/checkout/onetime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnTo: '/analyze/onetime' }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setError('Payment failed to initialize. Please try again.'); setPaying(false); }
  };

  const handleFile = useCallback(async (content: string, plat: Platform, fuelType: FuelType, motorType: MotorType) => {
    setLoading(true);
    setError(null);
    setPlatform(plat);
    setFuel(fuelType);
    setMotor(motorType);
    try {
      const parsed = parseCSV(content);
      if (parsed.rows.length === 0) throw new Error('No data rows found. Check file format.');
      const hasPedalData = parsed.rows.some(r => r.accelPedal > 0 || r.throttleAngle > 0);
      const hasRpmData = parsed.rows.some(r => r.rpm > 0);
      const hasBoostData = parsed.rows.some(r => r.boostActual > 0);
      const wotRows = parsed.rows.filter(r => {
        const atPedal = r.accelPedal > 85 || r.throttleAngle > 85;
        if (hasPedalData && hasRpmData) return atPedal && r.rpm > 2500;
        if (hasPedalData && !hasRpmData && hasBoostData) return atPedal && r.boostActual > 3;
        if (hasPedalData) return atPedal;
        return r.rpm > 3000 && r.boostActual > 5;
      });
      if (wotRows.length < 5) throw new Error(`Not enough WOT data (${wotRows.length} samples). Make sure this is a full-throttle pull log.`);
      const analysis = analyzeLog(parsed, fuelType, motorType);
      setResult(analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse log file');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl">🔧</Link>
            <div>
              <h1 className="text-xl font-bold text-white">TuneAnalyzer</h1>
              <p className="text-xs text-gray-500">One-Time Full Analysis</p>
            </div>
          </div>
          {paid && (
            <span className="text-xs text-green-400 bg-green-900/30 px-3 py-1 rounded-full">
              {mock ? '⚡ Demo mode' : '✓ Payment verified'}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {!paid ? (
          /* Payment gate */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-6">🔧</div>
            <h2 className="text-3xl font-bold text-white mb-3">Full Tune Log Analysis</h2>
            <p className="text-gray-400 mb-2 max-w-md">
              One-time payment — no account, no subscription. Upload your log and get the complete breakdown.
            </p>
            <p className="text-gray-500 text-sm mb-8 max-w-md">
              Includes: overall score + grade, knock per cylinder, AFR/fueling analysis, boost control, IAT temps, plain English recommendations.
            </p>

            {/* What you get */}
            <div className="w-full max-w-sm bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-8 text-left space-y-3">
              {[
                '✅ Overall tune score + letter grade',
                '✅ Per-cylinder knock breakdown',
                '✅ AFR / fueling analysis',
                '✅ Boost control scoring',
                '✅ IAT temperature check',
                '✅ Plain English recommendations',
                '✅ BM3, MHD, and MGFlash support',
              ].map((item, i) => (
                <p key={i} className="text-sm text-gray-300">{item}</p>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              onClick={handlePay}
              disabled={paying}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-2xl font-bold text-lg transition-colors shadow-lg shadow-blue-900/40"
            >
              {paying ? 'Redirecting to payment...' : 'Pay $4.99 — Unlock Analysis'}
            </button>
            <p className="text-gray-600 text-xs mt-4">Secure payment via Stripe · No subscription · No account required</p>

            <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
              <span>Want unlimited analyses?</span>
              <Link href="/#pricing" className="text-blue-400 hover:text-blue-300">See monthly plans →</Link>
            </div>
          </div>
        ) : !result ? (
          /* Upload zone — unlocked after payment */
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Upload Your Log</h2>
              <p className="text-gray-400">Payment verified — full analysis unlocked. Upload your CSV now.</p>
            </div>
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm whitespace-pre-wrap">⚠️ {error}</div>
            )}
            <UploadZone onFile={handleFile} loading={loading} />
          </div>
        ) : (
          /* Full results */
          <div className="space-y-6">
            <div className="p-4 bg-gray-800/40 border border-gray-700 rounded-xl flex items-center justify-between gap-4">
              <p className="text-sm text-gray-400">💡 Want to save logs and analyze more? Get a monthly plan.</p>
              <Link href="/#pricing" className="shrink-0 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors">See Plans</Link>
            </div>
            <ResultsPanel
              result={result}
              fuel={fuel}
              cylinderCount={0}
              platform={platform}
              onReset={() => setResult(null)}
            />
          </div>
        )}
      </div>

      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
        TuneAnalyzer — Built for ECMTuner.com · Not a substitute for professional tuning advice
      </footer>
    </main>
  );
}

export default function OneTimeAnalyzePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>}>
      <OneTimeAnalyzeInner />
    </Suspense>
  );
}
