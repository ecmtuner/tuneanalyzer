import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const origin = req.headers.get('origin') || 'https://tuneanalyzer.com';
  const { plan } = await req.json();

  const priceId = plan === 'pro'
    ? process.env.STRIPE_PRO_PRICE_ID
    : process.env.STRIPE_BASIC_PRICE_ID;

  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  if (!stripeKey || stripeKey.includes('placeholder')) {
    return NextResponse.json({ url: `/?mock=1&plan=${plan}` });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    const user = session.user as { email?: string };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/#pricing`,
      metadata: { userId: (session.user as any).id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error('Stripe subscription error:', e);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
