import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/db';
import { orders, tickets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendOrderConfirmation } from '@/lib/email-service';

/**
 * POST /api/tickets/send-email
 * Generate QR codes and send confirmation email to attendees
 * Called after payment is verified
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    // Fetch order with related data
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        event: true,
        tickets: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Generate QR codes for all tickets
    const ticketsWithQR = await Promise.all(
      order.tickets.map(async (ticket) => {
        // Create QR value with ticket info
        const qrValue = JSON.stringify({
          ticketId: ticket.id,
          token: ticket.qrToken,
          attendeeName: ticket.attendeeName,
          eventTitle: order.event.title,
          timestamp: new Date().toISOString(),
        });

        // Generate QR code as data URL
        const qrCode = await QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 0.95,
          margin: 1,
          color: {
            dark: '#12372A', // Forest green
            light: '#ffffff',
          },
        });

        return {
          id: ticket.id,
          attendeeName: ticket.attendeeName,
          qrCode,
          ticketType: 'Standard', // In future: get from ticket type
        };
      })
    );

    // Send confirmation email
    const emailSent = await sendOrderConfirmation({
      attendeeEmail: order.email,
      attendeeFirstName: order.email.split('@')[0], // Extract first name from email as fallback
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
      eventVenue: order.event.venueName,
      eventCity: order.event.city,
      tickets: ticketsWithQR,
      orderId: order.id,
      totalAmount: order.total,
    });

    if (!emailSent) {
      console.error(`Failed to send confirmation email for order ${orderId}`);
      // Don't fail the request - email is best-effort
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent',
      emailSent,
    });
  } catch (error) {
    console.error('Error sending ticket email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
