'use client';
import Link from 'next/link';
import { AnalysisResult } from '@/lib/scorer';

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

export default function FreeResultsPanel({ result, onReset }: Props) {
  const { knock, stats } = result;
  const maxCorr = stats.maxKnockCorrection;

  function corrLabel(val: number) {
    if (val === 0) return { text: 'Clean', color: 'text-green-400' };
    if (val >= -1.5) return { text: 'Mild', color: 'text-yellow-400' };
    if (val >= -3.0) return { text: 'Moderate', color: 'text-orange-400' };
    if (val >= -5.0) return { text: 'Severe', color: 'text-red-400' };
    return { text: 'Critical', color: 'text-red-600' };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Knock Analysis</h2>
        <button onClick={onReset} className="px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 hover:text-white transition-all">
          ← New Log
        </button>
      </div>

      {/* Free tier notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <span className="text-blue-400 text-lg mt-0.5">ℹ️</span>
        <div>
          <p className="text-blue-300 text-sm font-medium">Free tier — Knock data only</p>
          <p className="text-blue-400/70 text-xs mt-0.5">Upgrade to see full score, AFR, boost control, IAT analysis, and your overall tune grade.</p>
        </div>
      </div>

      {/* Knock summary */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg">Knock Detection</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">{stats.wotSamples} WOT samples</span>
        </div>

        {stats.cylindersKnocking === 0 ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-green-400 font-bold text-lg">No knock detected</p>
            <p className="text-gray-400 text-sm mt-1">All cylinders clean during WOT pull</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-800/40 rounded-lg">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-300 font-semibold">{stats.cylindersKnocking} cylinder{stats.cylindersKnocking > 1 ? 's' : ''} knocking</p>
              <p className="text-red-400/70 text-sm">Worst correction: {maxCorr.toFixed(1)}° — {corrLabel(maxCorr).text}</p>
            </div>
          </div>
        )}

        {knock.details.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-1">
            {knock.details.map((d, i) => (
              <p key={i} className="text-sm text-gray-400 flex items-start gap-2"><span className="text-gray-600 mt-0.5">•</span>{d}</p>
            ))}
          </div>
        )}
        {knock.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {knock.warnings.map((w, i) => (
              <p key={i} className="text-sm text-orange-400 flex items-start gap-2"><span>⚠️</span>{w}</p>
            ))}
          </div>
        )}
      </div>

      {/* Locked sections */}
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none space-y-4">
          <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-white">Overall Score</span>
              <span className="text-3xl font-bold text-gray-500">??</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full w-full" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['AFR / Fueling', 'Boost Control', 'IAT / Temps'].map(l => (
              <div key={l} className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">--</div>
                <div className="text-xs text-gray-600 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80 rounded-xl">
          <span className="text-4xl mb-3">🔒</span>
          <p className="text-white font-bold text-lg mb-1">See the full picture</p>
          <p className="text-gray-400 text-sm mb-1 text-center px-4">Score, grade, AFR, boost, IAT + recommendations</p>
          <p className="text-gray-500 text-xs mb-5 text-center">No account needed · One-time $4.99</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/analyze/onetime"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors text-center"
            >
              Get Full Analysis — $4.99
            </Link>
            <Link href="/#pricing" className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold text-sm transition-colors text-center">
              Monthly Plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
