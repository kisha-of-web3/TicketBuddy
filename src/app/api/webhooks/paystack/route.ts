import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { db } from '@/db';
import { payments, orders, tickets } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * POST /api/webhooks/paystack
 * Handle Paystack payment webhooks
 * Verifies payment and triggers ticket generation + email
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-paystack-signature');
    const body = await request.text();

    if (!signature || !PAYSTACK_SECRET) {
      return NextResponse.json(
        { error: 'Missing signature or secret' },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA512 signature
    const hash = createHmac('sha512', PAYSTACK_SECRET).update(body).digest('hex');

    if (hash !== signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event = JSON.parse(body);

    // Only process successful charges
    if (event.event !== 'charge.success') {
      return NextResponse.json({ success: true });
    }

    const reference = event.data.reference;

    if (!reference) {
      return NextResponse.json(
        { error: 'Missing reference' },
        { status: 400 }
      );
    }

    // Find payment record
    const payment = await db.query.payments.findFirst({
      where: eq(payments.providerReference, reference),
      with: {
        order: true,
      },
    });

    if (!payment) {
      console.log(`Payment reference not found: ${reference}`);
      return NextResponse.json({
        success: true,
        message: 'Payment reference not found - may be duplicate',
      });
    }

    // Check if already processed (idempotent)
    if (payment.status === 'success') {
      console.log(`Payment already processed: ${reference}`);
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
      });
    }

    // Update payment status
    await db
      .update(payments)
      .set({
        status: 'success',
        paidAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Update order status
    if (payment.order) {
      await db
        .update(orders)
        .set({
          status: 'paid',
        })
        .where(eq(orders.id, payment.order.id));

      // Update all tickets for this order to valid status
      await db
        .update(tickets)
        .set({
          status: 'valid',
        })
        .where(eq(tickets.orderId, payment.order.id));

      // Send confirmation email with QR codes
      try {
        const emailResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tickets/send-email`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: payment.order.id }),
          }
        );

        if (!emailResponse.ok) {
          console.error('Failed to send confirmation email:', await emailResponse.text());
        }
      } catch (emailError) {
        // Email sending is best-effort, don't fail the webhook
        console.error('Error sending confirmation email:', emailError);
      }

      console.log(`Order ${payment.order.id} payment confirmed and email sent`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
