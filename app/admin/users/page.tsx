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

const PAGE_SIZE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { _count: { select: { logs: true } } },
    }),
    prisma.user.count(),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">All Users</h1>
          <p className="text-sm text-gray-500 mt-1">{totalCount.toLocaleString()} total</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      {user.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3"><PlanBadge plan={user.plan} /></td>
                  <td className="px-5 py-3 text-right text-gray-300">{user.analysisCredits}</td>
                  <td className="px-5 py-3 text-right text-gray-300">{user._count.logs}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-600">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/users?page=${page - 1}`}
                  className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/users?page=${page + 1}`}
                  className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
