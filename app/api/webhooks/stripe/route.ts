import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const config = { api: { bodyParser: false } };

const PLAN_CREDITS: Record<string, number> = {
  'basic': 10,
  'pro': 20,
};

function getPlanFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_BASIC_PRICE_ID) return 'basic';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_ONETIME_PRICE_ID) return 'onetime';
  return 'free';
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || stripeKey.includes('placeholder')) {
    return NextResponse.json({ received: true });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: any;
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);
    event = webhookSecret && !webhookSecret.includes('placeholder')
      ? stripe.webhooks.constructEvent(body, sig, webhookSecret)
      : JSON.parse(body);
  } catch (e) {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email;
      if (!email) return NextResponse.json({ received: true });

      if (session.mode === 'payment') {
        // One-time purchase — give 1 credit
        await prisma.user.update({
          where: { email },
          data: { plan: 'onetime', analysisCredits: { increment: 1 } },
        });
      }
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const email = invoice.customer_email;
      const priceId = invoice.lines?.data?.[0]?.price?.id;
      if (!email || !priceId) return NextResponse.json({ received: true });

      const plan = getPlanFromPriceId(priceId);
      const credits = PLAN_CREDITS[plan] ?? 0;

      await prisma.user.update({
        where: { email },
        data: { plan, analysisCredits: credits },
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const email = sub.customer_email;
      if (email) {
        await prisma.user.update({
          where: { email },
          data: { plan: 'free', analysisCredits: 0 },
        });
      }
    }
  } catch (e) {
    console.error('Webhook handler error:', e);
  }

  return NextResponse.json({ received: true });
}
