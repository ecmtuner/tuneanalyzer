import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="text-lg font-bold text-white hover:text-gray-200 transition-colors">
            🔧 TuneAnalyzer Admin
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/users"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Users
            </Link>
            <Link
              href="/analyze"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}
