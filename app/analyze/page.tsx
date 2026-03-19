'use client';
import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import UploadZone from '@/components/UploadZone';
import ResultsPanel from '@/components/ResultsPanel';
import FreeResultsPanel from '@/components/FreeResultsPanel';
import { parseCSV } from '@/lib/parser';
import { analyzeLog, AnalysisResult, FuelType, MotorType } from '@/lib/scorer';
import { Platform } from '@/lib/columns';

export default function AnalyzePage() {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user as { email?: string; plan?: string; analysisCredits?: number } | undefined;
  const isAdmin = user?.email === 'sergeybirioukov@gmail.com';
  const plan = user?.plan ?? 'free';
  const credits = user?.analysisCredits ?? 0;
  const canAnalyze = isAdmin || (plan !== 'free' && credits > 0);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('bm3');
  const [fuel, setFuel] = useState<FuelType>('pump');
  const [motor, setMotor] = useState<MotorType>('stock');


  const handleFile = useCallback(async (content: string, plat: Platform, fuelType: FuelType, motorType: MotorType) => {
    setLoading(true);
    setError(null);
    setPlatform(plat);
    setFuel(fuelType);
    setMotor(motorType);

    // Free tier abuse check
    if (plan === 'free' && !isAdmin) {
      const fingerprint = typeof window !== 'undefined'
        ? localStorage.getItem('logiq_fp') || (() => {
            const fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('logiq_fp', fp);
            return fp;
          })()
        : null;

      const check = await fetch('/api/free-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      });
      if (!check.ok) {
        let reason = 'Free analysis limit reached. Please upgrade to continue.';
        try { const data = await check.json(); if (data?.reason) reason = data.reason; } catch {}
        setError(reason);
        setLoading(false);
        return;
      }
    }

    try {
      const parsed = parseCSV(content);
      if (parsed.rows.length === 0) throw new Error('No data rows found in CSV. Check the file format.');

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

      const pedalMax = Math.max(...parsed.rows.map(r => r.accelPedal));
      const rpmMax = Math.max(...parsed.rows.map(r => r.rpm));
      const boostMax = Math.max(...parsed.rows.map(r => r.boostActual));
      const debugInfo = `Rows: ${parsed.rows.length}, WOT: ${wotRows.length}, PedalMax: ${pedalMax.toFixed(0)}%, RPMMax: ${rpmMax.toFixed(0)}, BoostMax: ${boostMax.toFixed(1)} psi, PedalFound: ${hasPedalData}, RPMFound: ${hasRpmData}`;

      if (wotRows.length < 5) {
        throw new Error(`Not enough WOT data found (${wotRows.length} samples).\n\nDebug: ${debugInfo}\n\nMake sure this is a full-throttle pull log and the correct platform is selected.`);
      }

      const effectiveFuel = fuelType;
      const analysis = analyzeLog(parsed, effectiveFuel, motorType);
      setResult(analysis);

      // Save + deduct credit for paid users
      if (canAnalyze) {
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: plat, fuel: fuelType, motor: motorType, score: analysis.overall, grade: analysis.grade, resultJson: analysis }),
        }).then(() => updateSession()).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse log file');
    } finally {
      setLoading(false);
    }
  }, [canAnalyze, updateSession]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl">🔧</Link>
            <div>
              <h1 className="text-xl font-bold text-white">TuneAnalyzer</h1>
              <p className="text-xs text-gray-500">Smart BMW Tune Log Analyzer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {plan !== 'free' && <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white">History</Link>}
                {canAnalyze && <span className="text-xs text-gray-500">{credits} credit{credits !== 1 ? 's' : ''}</span>}
                <span className="text-xs text-gray-600">{session.user?.email}</span>
              </>
            ) : (
              <Link href="/login" className="text-sm text-gray-400 hover:text-white">Sign in</Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Upsell banner */}
        {!result && plan === 'free' && (
          <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-xl flex items-center justify-between gap-4">
            <p className="text-sm text-gray-400">🔒 Get the full breakdown — knock per cylinder, AFR details, boost control, warnings</p>
            <Link href="/#pricing" className="shrink-0 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors">See Plans →</Link>
          </div>
        )}
        {!result && canAnalyze && (
          <div className="mb-6 p-3 bg-gray-800/30 border border-gray-700 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-400">Plan: <strong className="text-white capitalize">{plan}</strong></span>
            <span className="text-sm text-gray-400">Credits remaining: <strong className="text-white">{credits}</strong></span>
          </div>
        )}
        {!result && plan !== 'free' && credits === 0 && (
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-xl flex items-center justify-between gap-4">
            <p className="text-sm text-yellow-300">⚠️ You&apos;ve used all your analysis credits for this month.</p>
            <Link href="/#pricing" className="shrink-0 px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg font-medium transition-colors">Upgrade →</Link>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm whitespace-pre-wrap">
            ⚠️ {error}
          </div>
        )}

        {!result ? (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Analyze Your Tune Log</h2>
              <p className="text-gray-400">Upload a CSV datalog and get a pro-level analysis with knock, AFR, boost, and IAT scoring</p>
            </div>
            <UploadZone onFile={handleFile} loading={loading} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-800">
              {[
                { icon: '📂', label: 'Upload CSV', desc: 'Any platform' },
                { icon: '⚙️', label: 'Select Fuel', desc: 'Pump to E85' },
                { icon: '🧠', label: 'Smart Analysis', desc: 'Context-aware' },
                { icon: '📊', label: 'Get Score', desc: '4 categories' },
              ].map((step, i) => (
                <div key={i} className="text-center p-3 bg-gray-800/30 rounded-lg">
                  <div className="text-2xl mb-1">{step.icon}</div>
                  <div className="text-sm font-medium text-white">{step.label}</div>
                  <div className="text-xs text-gray-500">{step.desc}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-800/30 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Scoring Weights</h3>
              <div className="space-y-2">
                {[
                  { label: 'Knock Control', weight: 40, color: 'bg-red-500' },
                  { label: 'AFR / Fueling', weight: 25, color: 'bg-orange-500' },
                  { label: 'Boost Control', weight: 20, color: 'bg-blue-500' },
                  { label: 'IAT / Temps',   weight: 15, color: 'bg-cyan-500' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-400">{s.label}</div>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.weight}%` }} />
                    </div>
                    <div className="text-sm text-gray-500 w-8 text-right">{s.weight}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Free paywall overlay over category breakdown */}
            {!canAnalyze ? (
              <FreeResultsPanel
                result={result}
                onReset={() => setResult(null)}
              />
            ) : (
              <ResultsPanel result={result} fuel={fuel} cylinderCount={0} platform={platform} onReset={() => setResult(null)} />
            )}
          </div>
        )}
      </div>

      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
        TuneAnalyzer — tuneanalyzer.com · Not a substitute for professional tuning advice
      </footer>
    </main>
  );
}
