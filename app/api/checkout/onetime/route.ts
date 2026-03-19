import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_ONETIME_PRICE_ID;
  const origin = req.headers.get('origin') || 'http://localhost:3001';

  const body = await req.json().catch(() => ({}));
  const returnTo = body?.returnTo || '/analyze/onetime';

  // Mock mode — Stripe not configured yet
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ url: `${returnTo}?mock=1` });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${returnTo}?session_token={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/analyze/onetime`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('Stripe error:', e);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
