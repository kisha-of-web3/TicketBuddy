import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/db';
import { orders, tickets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendOrderConfirmation } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        event: true,
        tickets: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const ticketsWithQR = await Promise.all(
      order.tickets.map(async (ticket) => {
        const qrValue = JSON.stringify({
          ticketId: ticket.id,
          token: ticket.qrToken || '',
          attendeeName: ticket.attendeeName || 'Attendee',
          eventTitle: order.event.title,
          timestamp: new Date().toISOString(),
        });

        const qrCode = await QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          margin: 1,
          color: {
            dark: '#12372A',
            light: '#ffffff',
          },
        });

        return {
          id: ticket.id,
          attendeeName: ticket.attendeeName || 'Attendee',
          qrCode,
          ticketType: 'Standard',
        };
      })
    );

    const emailSent = await sendOrderConfirmation({
      attendeeEmail: order.email || '',
      attendeeFirstName: (order.email || '').split('@')[0] || 'Customer',
      eventTitle: order.event.title,
      eventDate: new Date(order.event.startDatetime).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      eventTime: new Date(order.event.startDatetime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      eventVenue: order.event.venueName || 'TBA',
      eventCity: order.event.city || 'TBA',
      tickets: ticketsWithQR,
      orderId: order.id,
      totalAmount: order.total || 0,
    });

    if (!emailSent) {
      console.error(`Failed to send confirmation email for order ${orderId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent',
      emailSent,
    });
  } catch (error) {
    console.error('Error sending ticket email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
