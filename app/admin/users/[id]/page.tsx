export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-700 text-gray-300',
  onetime: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
  basic: 'bg-blue-900/50 text-blue-400 border border-blue-700',
  pro: 'bg-indigo-900/50 text-indigo-400 border border-indigo-700',
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  onetime: 'One-time',
  basic: 'Basic',
  pro: '⭐ Pro',
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[plan] ?? PLAN_COLORS.free}`}>
      {PLAN_LABELS[plan] ?? plan}
    </span>
  )
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: 'bg-green-900/50 text-green-400 border border-green-700',
    B: 'bg-blue-900/50 text-blue-400 border border-blue-700',
    C: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
    D: 'bg-red-900/50 text-red-400 border border-red-700',
    F: 'bg-red-900/50 text-red-400 border border-red-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[grade] ?? colors.F}`}>
      {grade}
    </span>
  )
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      logs: { orderBy: { createdAt: 'desc' }, take: 20 },
      _count: { select: { logs: true } },
    },
  })

  if (!user) notFound()

  const totalAnalyses = user._count.logs
  const avgScore =
    user.logs.length > 0
      ? Math.round(user.logs.reduce((sum: number, l: any) => sum + l.score, 0) / user.logs.length)
      : null
  const bestScore =
    user.logs.length > 0
      ? Math.max(...user.logs.map((l: any) => l.score))
      : null

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">User Detail</h1>
        <Link href="/admin/users" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← All Users
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* User Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">User Info</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div className="text-white font-medium mt-0.5">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Plan</div>
              <div className="mt-1"><PlanBadge plan={user.plan} /></div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Credits</div>
              <div className="text-white font-medium mt-0.5">{user.analysisCredits}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Joined</div>
              <div className="text-gray-300 mt-0.5">{formatDate(user.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">User ID</div>
              <div className="text-gray-600 text-xs mt-0.5 font-mono">{user.id}</div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold text-white">{totalAnalyses}</div>
              <div className="text-xs text-gray-400 mt-1">Total Analyses</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{avgScore ?? '—'}</div>
              <div className="text-xs text-gray-400 mt-1">Avg Score</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{bestScore ?? '—'}</div>
              <div className="text-xs text-gray-400 mt-1">Best Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Log History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Log History {totalAnalyses > 20 ? `(last 20 of ${totalAnalyses})` : `(${totalAnalyses})`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-5 py-3">Platform</th>
                <th className="text-left px-5 py-3">Fuel</th>
                <th className="text-left px-5 py-3">Motor</th>
                <th className="text-right px-5 py-3">Score</th>
                <th className="text-right px-5 py-3">Grade</th>
                <th className="text-right px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {user.logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 text-white uppercase">{log.platform}</td>
                  <td className="px-5 py-3 text-gray-300 uppercase">{log.fuel}</td>
                  <td className="px-5 py-3 text-gray-300">{log.motor}</td>
                  <td className="px-5 py-3 text-right text-white font-medium">{log.score}</td>
                  <td className="px-5 py-3 text-right"><GradeBadge grade={log.grade} /></td>
                  <td className="px-5 py-3 text-right text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                </tr>
              ))}
              {user.logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-600">No logs yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
