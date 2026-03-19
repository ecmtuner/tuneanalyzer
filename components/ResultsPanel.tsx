'use client';
import { AnalysisResult, FuelType } from '@/lib/scorer';
import ScoreCard from './ScoreCard';

interface Props {
  result: AnalysisResult;
  fuel: FuelType;
  cylinderCount: number;
  platform: string;
  onReset: () => void;
}

function gradeColor(grade: string) {
  if (grade === 'A') return 'text-green-400';
  if (grade === 'B') return 'text-green-500';
  if (grade === 'C') return 'text-yellow-400';
  if (grade === 'D') return 'text-orange-400';
  return 'text-red-500';
}

function overallColor(score: number) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function overallRingColor(score: number) {
  if (score >= 80) return 'stroke-green-400';
  if (score >= 60) return 'stroke-yellow-400';
  return 'stroke-red-400';
}

export default function ResultsPanel({ result, fuel, cylinderCount, platform, onReset }: Props) {
  const { overall, grade, knock, afr, boost, iat, verdict, stats } = result;
  const circumference = 2 * Math.PI * 54;
  const dash = (overall / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Analysis Results</h2>
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-500 hover:text-white transition-all"
        >
          ← New Log
        </button>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 bg-gray-800 rounded-full text-gray-400">{platform.toUpperCase()}</span>
        <span className="px-2 py-1 bg-gray-800 rounded-full text-gray-400">{fuel.toUpperCase()}</span>
        <span className="px-2 py-1 bg-gray-800 rounded-full text-gray-400">{cylinderCount}-cyl engine detected</span>
        <span className="px-2 py-1 bg-gray-800 rounded-full text-gray-400">{stats.wotSamples} WOT samples</span>
      </div>

      {/* Overall score */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="54" fill="none" stroke="#374151" strokeWidth="10" />
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className={`transition-all duration-1000 ${overallRingColor(overall)}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${overallColor(overall)}`}>{overall}</span>
            <span className={`text-lg font-bold ${gradeColor(grade)}`}>{grade}</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Overall Score</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{verdict.summary}</p>
        </div>
      </div>

      {/* Category scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScoreCard category={knock} weight={result.fuelPressure ? 37 : 40} />
        <ScoreCard category={afr} weight={result.fuelPressure ? 23 : 25} />
        <ScoreCard category={boost} weight={result.fuelPressure ? 19 : 20} />
        <ScoreCard category={iat} weight={result.fuelPressure ? 14 : 15} />
        {result.fuelPressure && <ScoreCard category={result.fuelPressure} weight={7} bonus />}
      </div>

      {/* Verdict */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-white text-lg">Verdict</h3>

        {verdict.good.length > 0 && (
          <div>
            <h4 className="text-green-400 text-sm font-semibold mb-2">✅ Looking Good</h4>
            <ul className="space-y-1">
              {verdict.good.map((g, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {verdict.attention.length > 0 && (
          <div>
            <h4 className="text-orange-400 text-sm font-semibold mb-2">⚠️ Needs Attention</h4>
            <ul className="space-y-1">
              {verdict.attention.map((a, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 border-t border-gray-700">
          <h4 className="text-blue-400 text-sm font-semibold mb-1">🔧 Recommendation</h4>
          <p className="text-sm text-gray-300">{verdict.recommendation}</p>
        </div>
      </div>

      {/* Key stats */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
        <h3 className="font-bold text-white mb-4">Key Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Peak Boost', value: `${stats.peakBoost.toFixed(1)} psi` },
            { label: 'Avg WOT AFR', value: stats.avgWotAfr > 0 ? stats.avgWotAfr.toFixed(2) : 'N/A' },
            { label: 'Max Knock Corr.', value: stats.maxKnockCorrection < 0 ? `${stats.maxKnockCorrection.toFixed(1)}°` : 'None' },
            { label: 'Peak IAT', value: `${stats.peakIat.toFixed(0)}°F` },
            { label: 'RPM Range', value: `${stats.rpmRange[0].toFixed(0)}–${stats.rpmRange[1].toFixed(0)}` },
            { label: 'Cyls Knocking', value: stats.cylindersKnocking > 0 ? `${stats.cylindersKnocking} cyl` : 'None ✓' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
