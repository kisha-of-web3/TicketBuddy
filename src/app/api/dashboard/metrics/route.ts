import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, tickets, orders, ticketTypes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/dashboard/metrics?eventId=xyz
 * Fetch metrics for a specific event
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventId = request.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId parameter' },
        { status: 400 }
      );
    }

    // Fetch event and verify ownership
    const event = await db.query.events.findFirst({
      where: and(
        eq(events.id, eventId),
        eq(events.organizerId, session.user.email)
      ),
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch ticket types for this event
    const eventTicketTypes = await db.query.ticketTypes.findMany({
      where: eq(ticketTypes.eventId, eventId),
    });

    // Fetch all tickets for this event
    const eventTickets = await db.query.tickets.findMany({
      where: eq(tickets.eventId, eventId),
    });

    // Calculate basic metrics
    const totalTickets = eventTicketTypes.reduce((sum, tt) => sum + tt.quantityTotal, 0);
    const soldTickets = eventTickets.filter((t) => t.status === 'valid' || t.status === 'checked_in').length;
    const checkedInTickets = eventTickets.filter((t) => t.status === 'checked_in').length;

    // Fetch orders to calculate revenue
    const eventOrders = await db.query.orders.findMany({
      where: and(eq(orders.eventId, eventId), eq(orders.status, 'paid')),
    });

    const totalRevenue = eventOrders.reduce((sum, order) => sum + order.total, 0);

    // Build ticket breakdown by type
    const ticketBreakdown = eventTicketTypes.map((ticketType) => {
      const typeTickets = eventTickets.filter(
        (t) => t.ticketTypeId === ticketType.id && (t.status === 'valid' || t.status === 'checked_in')
      );

      const typeOrders = eventOrders.filter((o) =>
        eventTickets
          .filter((t) => t.orderId === o.id && t.ticketTypeId === ticketType.id)
          .some((t) => t.status === 'valid' || t.status === 'checked_in')
      );

      const typeRevenue = typeOrders.reduce((sum, order) => {
        const ticketCount = eventTickets.filter(
          (t) => t.orderId === order.id && t.ticketTypeId === ticketType.id
        ).length;
        return sum + (order.total / eventOrders.reduce((s, o) => s + (eventTickets.filter((t) => t.orderId === o.id).length || 1), 1)) * ticketCount;
      }, 0);

      return {
        tier: ticketType.name,
        sold: typeTickets.length,
        remaining: ticketType.quantityTotal - typeTickets.length,
        revenue: Math.round(typeRevenue),
      };
    });

    return NextResponse.json({
      ticketsSold: soldTickets,
      ticketsTotal: totalTickets,
      revenue: totalRevenue,
      checkedIn: checkedInTickets,
      eventTitle: event.title,
      ticketBreakdown,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
