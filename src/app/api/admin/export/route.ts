import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, orders, tickets } from '@/db/schema';

/**
 * GET /api/admin/export?format=csv|pdf&type=events|financials
 * Export admin data in CSV or PDF format
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = request.nextUrl.searchParams.get('format') || 'csv'; // csv or pdf
    const type = request.nextUrl.searchParams.get('type') || 'events'; // events, financials, attendees

    if (format === 'csv') {
      let csv = '';

      if (type === 'events') {
        // Export all events with metrics
        const allEvents = await db.query.events.findMany({
          with: { organizer: true },
        });

        csv =
          'Event ID,Title,Organizer,Email,Status,Start Date,Venue,City,Tickets Sold,Revenue\n';

        for (const event of allEvents) {
          const eventOrders = await db.query.orders.findMany({
            where: (o) => o.eventId === event.id,
            with: { payment: true },
          });

          const revenue = eventOrders
            .filter((o) => o.payment?.status === 'success')
            .reduce((sum, o) => sum + o.total, 0);

          const attendees = await db.query.tickets.findMany({
            where: (t) => t.eventId === event.id,
          });

          csv += `"${event.id}","${event.title}","${event.organizer?.name || 'N/A'}","${event.organizer?.email || 'N/A'}","${event.status}","${event.startDatetime}","${event.venueName}","${event.city}",${attendees.length},${revenue}\n`;
        }
      } else if (type === 'financials') {
        // Export financial data
        const allOrders = await db.query.orders.findMany({
          with: { event: true, payment: true },
        });

        csv =
          'Order ID,Event,Amount,Fee (6%),Net Revenue,Status,Date,Organizer\n';

        for (const order of allOrders) {
          if (order.payment?.status === 'success') {
            const fee = order.total * 0.06;
            const net = order.total - fee;
            csv += `"${order.id}","${order.event?.title || 'N/A'}",${order.total},${fee},${net},"${order.payment.status}","${order.createdAt}","${order.organizerEmail}"\n`;
          }
        }
      } else if (type === 'attendees') {
        // Export all attendees
        csv =
          'Ticket ID,Event,Attendee Name,Email,Status,Ticket Type,Checked In,Purchase Date\n';

        const allTickets = await db.query.tickets.findMany({
          with: { event: true },
        });

        for (const ticket of allTickets) {
          csv += `"${ticket.id}","${ticket.event?.title || 'N/A'}","${ticket.attendeeName}","${ticket.attendeeEmail}","${ticket.status}","Standard","${ticket.checkedInAt || 'No'}","${ticket.createdAt}"\n`;
        }
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // For PDF, return JSON that frontend can use to generate PDF
      const allEvents = await db.query.events.findMany({
        with: { organizer: true },
      });

      const reportData = {
        title: `Ticket Buddy Admin Report - ${type}`,
        generatedAt: new Date().toLocaleString(),
        data: allEvents.map((e) => ({
          event: e.title,
          organizer: e.organizer?.name,
          status: e.status,
        })),
      };

      return NextResponse.json(reportData);
    }

    return NextResponse.json(
      { error: 'Invalid format or type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
