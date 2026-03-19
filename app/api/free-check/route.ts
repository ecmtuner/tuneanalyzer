import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = 'sergeybirioukov@gmail.com';

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

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check IP usage in last 24h
    const ipCount = await prisma.freeUsage.count({
      where: { ip, createdAt: { gte: oneDayAgo } },
    });

    if (ipCount >= 1) {
      return NextResponse.json({
        allowed: false,
        reason: "You've already used your free analysis today. Come back tomorrow or upgrade for unlimited access.",
      }, { status: 429 });
    }

    // Check fingerprint lifetime cap (3 total)
    if (fingerprint) {
      const fpCount = await prisma.freeUsage.count({
        where: { fingerprint },
      });

      if (fpCount >= 3) {
        return NextResponse.json({
          allowed: false,
          reason: 'Free limit reached. Upgrade to continue analyzing logs.',
        }, { status: 429 });
      }
    }

    // Record usage
    await prisma.freeUsage.create({
      data: { ip, fingerprint },
    });

    return NextResponse.json({ allowed: true });

  } catch (e) {
    console.error('free-check error:', e);
    return NextResponse.json({ allowed: false, reason: 'Server error. Please try again.' }, { status: 500 });
  }
}
