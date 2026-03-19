export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'

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

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function AdminPage() {
  const [
    totalUsers,
    payingUsers,
    totalAnalyses,
    freeUsageCount,
    planGroups,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: { not: 'free' } } }),
    prisma.logEntry.count(),
    prisma.freeUsage.count(),
    prisma.user.groupBy({ by: ['plan'], _count: { plan: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { _count: { select: { logs: true } } },
    }),
  ])

  // Calculate MRR (basic + pro only, not free or onetime)
  const planMap: Record<string, number> = {}
  for (const g of planGroups) planMap[g.plan] = g._count.plan
  const mrr =
    (planMap['basic'] ?? 0) * 9.99 + (planMap['pro'] ?? 0) * 19.99

  const planMrrContribution: Record<string, string> = {
    free: '$0.00',
    onetime: '$0.00 (one-time)',
    basic: `$${((planMap['basic'] ?? 0) * 9.99).toFixed(2)}`,
    pro: `$${((planMap['pro'] ?? 0) * 19.99).toFixed(2)}`,
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Users', value: totalUsers.toLocaleString() },
          { label: 'Paying Users', value: payingUsers.toLocaleString() },
          { label: 'MRR', value: `$${mrr.toFixed(2)}` },
          { label: 'Total Analyses', value: totalAnalyses.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {/* Plan Breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Plan Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="text-left pb-2">Plan</th>
                <th className="text-right pb-2">Users</th>
                <th className="text-right pb-2">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {['free', 'onetime', 'basic', 'pro'].map((plan) => (
                <tr key={plan} className="hover:bg-gray-800/50">
                  <td className="py-2"><PlanBadge plan={plan} /></td>
                  <td className="py-2 text-right text-white">{(planMap[plan] ?? 0).toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-400">{planMrrContribution[plan]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Free Usage */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Free Usage</h2>
          <div>
            <div className="text-4xl font-bold text-white">{freeUsageCount.toLocaleString()}</div>
            <div className="text-sm text-gray-400 mt-1">Total free analyses</div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Quick Links</h2>
          <div className="space-y-2">
            <Link href="/admin/users" className="block text-blue-400 hover:text-blue-300 text-sm transition-colors">
              → View all users
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Signups */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Recent Signups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-right px-5 py-3">Credits</th>
                <th className="text-right px-5 py-3">Analyses</th>
                <th className="text-right px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentSignups.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/admin/users/${user.id}`} className="text-white hover:text-blue-400 transition-colors">
                      {user.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3"><PlanBadge plan={user.plan} /></td>
                  <td className="px-5 py-3 text-right text-gray-300">{user.analysisCredits}</td>
                  <td className="px-5 py-3 text-right text-gray-300">{user._count.logs}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
              {recentSignups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-600">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
