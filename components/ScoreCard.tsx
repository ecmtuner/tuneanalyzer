'use client';
import { CategoryScore } from '@/lib/scorer';

interface Props {
  category: CategoryScore;
  weight: number;
  bonus?: boolean;
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function barColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function ScoreCard({ category, weight, bonus }: Props) {
  return (
    <div className={`bg-gray-800/50 border rounded-xl p-4 space-y-3 ${bonus ? 'border-blue-700/50' : 'border-gray-700'}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{category.label}</h3>
            {bonus && <span className="text-xs text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">bonus</span>}
          </div>
          <p className="text-xs text-gray-500">{weight}% of total score</p>
        </div>
        <span className={`text-3xl font-bold ${scoreColor(category.score)}`}>
          {category.score}
        </span>
      </div>

      {/* Bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor(category.score)}`}
          style={{ width: `${category.score}%` }}
        />
      </div>

      {/* Details */}
      {category.details.length > 0 && (
        <ul className="space-y-1">
          {category.details.map((d, i) => (
            <li key={i} className="text-xs text-gray-400 flex items-start gap-1">
              <span className="text-gray-600 mt-0.5">•</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Warnings */}
      {category.warnings.length > 0 && (
        <ul className="space-y-1">
          {category.warnings.map((w, i) => (
            <li key={i} className="text-xs text-orange-400 flex items-start gap-1">
              <span className="mt-0.5">⚠️</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
