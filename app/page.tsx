'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const features = [
  { icon: '💥', title: 'Knock Detection', desc: 'Per-cylinder knock correction analysis. Spot hardware issues vs tune problems instantly.' },
  { icon: '⛽', title: 'AFR Analysis', desc: 'Fuel-type aware scoring. Know if your AFR is dialed in for pump, E30, E40, E45 or E85.' },
  { icon: '📈', title: 'Boost Control', desc: 'Smart boost target inference — works even when tuned boost exceeds the base map target field.' },
  { icon: '🌡️', title: 'IAT / Heat Soak', desc: 'Intake air temp scoring with heat soak detection. Know if conditions affected your pull.' },
];

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    desc: 'See your overall score instantly',
    cta: 'Try Free',
    href: '/analyze',
    highlight: false,
    features: [
      'Upload any BM3 or MHD log',
      'Overall score + letter grade',
      'Platform + fuel auto-detection',
      'No account required',
    ],
    locked: [
      'Full category breakdown',
      'Per-cylinder knock detail',
      'Log history',
    ],
  },
  {
    name: 'One-Time',
    price: '$4.99',
    period: '',
    desc: 'One full analysis, no subscription',
    cta: 'Buy One Analysis',
    href: '/analyze/onetime',
    highlight: false,
    features: [
      'Everything in Free',
      '1 full analysis credit',
      'Full knock / AFR / boost / IAT breakdown',
      'Per-cylinder knock correction detail',
      'All warnings and recommendations',
      'No subscription required',
    ],
    locked: [],
  },
  {
    name: 'Basic',
    price: '$9.99',
    period: '/month',
    desc: '10 full analyses per month',
    cta: 'Get Basic',
    href: '/signup?plan=basic',
    highlight: false,
    features: [
      'Everything in One-Time',
      '10 analyses per month',
      'Log history (last 10 logs)',
      'Built motor mode',
    ],
    locked: [],
  },
  {
    name: 'Pro',
    price: '$19.99',
    period: '/month',
    desc: '20 analyses + full history',
    cta: 'Get Pro',
    href: '/signup?plan=pro',
    highlight: true,
    features: [
      'Everything in Basic',
      '20 analyses per month',
      'Log history (last 20 logs)',
      'Built motor mode',
      'Side-by-side comparison (coming soon)',
      'Priority support',
    ],
    locked: [],
  },
];

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔧</span>
            <span className="font-bold text-white text-lg">TuneAnalyzer</span>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard</Link>
                <Link href="/analyze" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors">Analyze</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
                <Link href="/signup" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
          🔧 Built for the tuning community
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
          Know Your Tune.<br />
          <span className="text-blue-400">Fix It Faster.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Upload your BM3 or MHD datalog and get a pro-level analysis in seconds.
          Knock, AFR, boost control, and IAT — all scored with context-aware intelligence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/analyze" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition-colors">
            Analyze Your Log →
          </Link>
          <Link href="#pricing" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-lg transition-colors">
            See Pricing
          </Link>
        </div>

        {/* Score preview */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {[
            { label: 'Knock', score: 82, color: 'text-yellow-400' },
            { label: 'AFR', score: 91, color: 'text-green-400' },
            { label: 'Boost', score: 87, color: 'text-blue-400' },
            { label: 'IAT', score: 100, color: 'text-cyan-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className={`text-3xl font-bold ${s.color}`}>{s.score}</div>
              <div className="text-sm text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-gray-800">
        <h2 className="text-3xl font-bold text-center mb-12">Everything your tuner looks at — automated</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-gray-800">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { step: '1', icon: '📂', title: 'Upload your log', desc: 'Drop in a CSV from BM3, MHD, MGFlash, or EcuTek.' },
            { step: '2', icon: '⚙️', title: 'Set your config', desc: 'Pick your platform, fuel type, and motor setup.' },
            { step: '3', icon: '📊', title: 'Get your score', desc: 'Instant analysis across 4 categories with plain-English verdict.' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">{s.step}</div>
              <div className="text-2xl mb-2">{s.icon}</div>
              <h3 className="font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 py-16 border-t border-gray-800">
        <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
        <p className="text-gray-400 text-center mb-12">Start free. Upgrade when you need the full picture.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {TIERS.map(tier => (
            <div key={tier.name} className={`rounded-2xl border p-8 flex flex-col ${tier.highlight ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 bg-gray-800/30'}`}>
              {tier.highlight && (
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Most Popular</div>
              )}
              <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
              <div className="mt-2 mb-1">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-gray-400">{tier.period}</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">{tier.desc}</p>
              <Link href={tier.href} className={`text-center py-3 rounded-xl font-semibold mb-6 transition-colors ${tier.highlight ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                {tier.cta}
              </Link>
              <ul className="space-y-2 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span> {f}
                  </li>
                ))}
                {tier.locked.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-0.5">🔒</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        TuneAnalyzer — tuneanalyzer.com · <Link href="/analyze" className="hover:text-gray-400">Analyze a log</Link>
      </footer>
    </main>
  );
}
