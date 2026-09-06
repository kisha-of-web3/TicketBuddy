import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, ticketTypes, orders, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PLATFORM_FEE_PERCENTAGE = 0.06; // 6% platform fee

/**
 * GET /api/dashboard/payouts?eventId=...
 * Get financial data for an event
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
        { error: 'Missing eventId' },
        { status: 400 }
      );
    }

    // Fetch event
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch ticket types for event
    const ticketTypesData = await db.query.ticketTypes.findMany({
      where: eq(ticketTypes.eventId, eventId),
    });

    // Fetch paid orders for event
    const paidOrders = await db.query.orders.findMany({
      where: eq(orders.eventId, eventId),
      with: {
        tickets: true,
        payment: true,
      },
    });

    // Calculate financials
    let totalRevenue = 0;
    const ticketTierBreakdown: Record<string, {
      tierName: string;
      price: number;
      sold: number;
      revenue: number;
      platformFee: number;
      netRevenue: number;
    }> = {};

    paidOrders.forEach((order) => {
      if (order.payment && order.payment.status === 'success') {
        totalRevenue += order.total;

        // Group by ticket tier
        order.tickets.forEach((ticket) => {
          const ticketType = ticketTypesData.find((t) => t.id === ticket.ticketTypeId);
          if (ticketType) {
            if (!ticketTierBreakdown[ticketType.id]) {
              ticketTierBreakdown[ticketType.id] = {
                tierName: ticketType.name,
                price: ticketType.price,
                sold: 0,
                revenue: 0,
                platformFee: 0,
                netRevenue: 0,
              };
            }
            ticketTierBreakdown[ticketType.id].sold += 1;
            ticketTierBreakdown[ticketType.id].revenue += ticketType.price;
          }
        });
      }
    });

    // Calculate fees
    const totalPlatformFee = totalRevenue * PLATFORM_FEE_PERCENTAGE;
    const netRevenue = totalRevenue - totalPlatformFee;

    // Add fees to breakdown
    Object.keys(ticketTierBreakdown).forEach((key) => {
      const tier = ticketTierBreakdown[key];
      tier.platformFee = tier.revenue * PLATFORM_FEE_PERCENTAGE;
      tier.netRevenue = tier.revenue - tier.platformFee;
    });

    return NextResponse.json({
      eventTitle: event.title,
      totalRevenue,
      totalPlatformFee,
      netRevenue,
      ticketTierBreakdown: Object.values(ticketTierBreakdown),
      platformFeePercentage: PLATFORM_FEE_PERCENTAGE * 100,
    });
  } catch (error) {
    console.error('Error fetching payout data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payout data' },
      { status: 500 }
    );
  }
}
