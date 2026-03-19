import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type SessionUser = { id: string; email?: string; plan?: string; analysisCredits?: number };

const ADMIN_EMAIL = 'sergeybirioukov@gmail.com';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as SessionUser;
  const isAdmin = user.email === ADMIN_EMAIL;

  if (!isAdmin && user.plan === 'free') return NextResponse.json({ error: 'Pro only' }, { status: 403 });
  const logs = await prisma.logEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: isAdmin ? 100 : user.plan === 'pro' ? 20 : 10,
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = session.user as SessionUser;
  const isAdmin = user.email === ADMIN_EMAIL;

  if (!isAdmin && user.plan === 'free') return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Admin bypasses credit check entirely
  if (!isAdmin && dbUser.analysisCredits <= 0) {
    return NextResponse.json({ error: 'No analysis credits remaining', code: 'NO_CREDITS' }, { status: 402 });
  }

  const { platform, fuel, motor, score, grade, resultJson } = await req.json();

  if (isAdmin) {
    // Admin: save log, no credit deduction
    const log = await prisma.logEntry.create({
      data: { userId: user.id, platform, fuel, motor, score, grade, resultJson: JSON.stringify(resultJson) },
    });
    return NextResponse.json({ log, creditsRemaining: 999 });
  }

  // Regular user: deduct credit and save log
  const [log] = await prisma.$transaction([
    prisma.logEntry.create({
      data: { userId: user.id, platform, fuel, motor, score, grade, resultJson: JSON.stringify(resultJson) },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { analysisCredits: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ log, creditsRemaining: dbUser.analysisCredits - 1 });
}
