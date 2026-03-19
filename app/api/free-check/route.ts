import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Database from 'better-sqlite3';
import path from 'path';

const ADMIN_EMAIL = 'sergeybirioukov@gmail.com';

// Use raw SQLite directly — Prisma 7 BetterSQLite3 adapter has issues with count/date queries
function getDb() {
  return new Database(path.join(process.cwd(), 'logiq.db'));
}

export async function POST(req: NextRequest) {
  try {
    // Admin bypass — unlimited free analyses
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.email === ADMIN_EMAIL) {
      return NextResponse.json({ allowed: true, admin: true });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const body = await req.json().catch(() => ({}));
    const fingerprint: string | null = body?.fingerprint ?? null;

    const db = getDb();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Check IP usage in last 24h
    const ipRow = db.prepare(
      `SELECT COUNT(*) as cnt FROM FreeUsage WHERE ip = ? AND createdAt >= ?`
    ).get(ip, oneDayAgo) as { cnt: number };

    if (ipRow.cnt >= 1) {
      db.close();
      return NextResponse.json({
        allowed: false,
        reason: "You've already used your free analysis today. Come back tomorrow or upgrade for unlimited access.",
      }, { status: 429 });
    }

    // Check fingerprint lifetime cap (3 total)
    if (fingerprint) {
      const fpRow = db.prepare(
        `SELECT COUNT(*) as cnt FROM FreeUsage WHERE fingerprint = ?`
      ).get(fingerprint) as { cnt: number };

      if (fpRow.cnt >= 3) {
        db.close();
        return NextResponse.json({
          allowed: false,
          reason: 'Free limit reached. Upgrade to continue analyzing logs.',
        }, { status: 429 });
      }
    }

    // Record usage
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    db.prepare(
      `INSERT INTO FreeUsage (id, ip, fingerprint, createdAt) VALUES (?, ?, ?, ?)`
    ).run(id, ip, fingerprint, new Date().toISOString());

    db.close();
    return NextResponse.json({ allowed: true });

  } catch (e) {
    console.error('free-check error:', e);
    return NextResponse.json({ allowed: false, reason: 'Server error. Please try again.' }, { status: 500 });
  }
}
