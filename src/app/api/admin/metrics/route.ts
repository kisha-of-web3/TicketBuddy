import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, orders, tickets } from '@/db/schema';

const PLATFORM_FEE = 0.06;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allEvents = await db.query.events.findMany();
    const totalEvents = allEvents.length;
    const activeEvents = allEvents.filter((e) => e.status === 'active').length;
    const totalOrganizers = new Set(allEvents.map((e) => e.organizerId)).size;

    const allOrders = await db.query.orders.findMany({
      with: { payment: true },
    });

    const paidOrders = allOrders.filter((o) => o.payment?.status === 'success');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const platformEarnings = totalRevenue * PLATFORM_FEE;
    const organizerPayouts = totalRevenue * (1 - PLATFORM_FEE);

    const allTickets = await db.query.tickets.findMany();
    const totalAttendees = allTickets.length;
    const checkedInAttendees = allTickets.filter((t) => t.status === 'checked_in').length;
    const checkInRate = totalAttendees > 0 ? ((checkedInAttendees / totalAttendees) * 100).toFixed(2) : '0';

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = paidOrders.filter((o) => new Date(o.createdAt) > sevenDaysAgo);
    const recentRevenue = recentOrders.reduce((sum, o) => sum + o.total, 0);

    return NextResponse.json({
      overview: { totalEvents, activeEvents, totalOrganizers, totalAttendees },
      financial: { totalRevenue, platformEarnings, organizerPayouts, recentRevenue, averageDailyRevenue: (recentRevenue / 7).toFixed(2) },
      engagement: { checkedInAttendees, checkInRate, totalAttendees },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
