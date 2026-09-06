import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, orders, tickets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-paystack-signature');
    const body = await request.text();

    if (!signature || !verifyPaystackSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);

    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true });
    }

    const { data } = event;
    const { reference, status } = data;

    if (status !== 'success') {
      await db
        .update(payments)
        .set({ status: 'failed' })
        .where(eq(payments.providerReference, reference));

      return NextResponse.json({ received: true });
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.providerReference, reference),
      with: { order: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    await db
      .update(payments)
      .set({
        status: 'success',
        paidAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    await db
      .update(orders)
      .set({ status: 'paid' })
      .where(eq(orders.id, payment.orderId));

    await db
      .update(tickets)
      .set({ status: 'valid' })
      .where(eq(tickets.orderId, payment.orderId));

    console.log(`Payment ${reference} confirmed for order ${payment.orderId}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

function verifyPaystackSignature(body: string, signature: string): boolean {
  if (!PAYSTACK_SECRET) {
    console.error('PAYSTACK_SECRET_KEY not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex');

  return hash === signature;
}
