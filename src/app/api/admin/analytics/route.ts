import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { orders } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const allOrders = await db.query.orders.findMany({ with: { payment: true } });

    const relevantOrders = allOrders.filter((o) => new Date(o.createdAt) >= startDate && o.payment?.status === 'success');

    const dailyData: Record<string, { revenue: number; orders: number; platformFee: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { revenue: 0, orders: 0, platformFee: 0 };
    }

    relevantOrders.forEach((order) => {
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].revenue += order.total;
        dailyData[dateStr].orders += 1;
        dailyData[dateStr].platformFee += order.total * 0.06;
      }
    });

    const revenueData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      revenue: parseFloat(data.revenue.toFixed(2)),
      orders: data.orders,
      platformFee: parseFloat(data.platformFee.toFixed(2)),
    }));

    const totalRevenue = relevantOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = relevantOrders.length;
    const totalPlatformFee = totalRevenue * 0.06;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const prevPeriodStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);
    const prevPeriodEnd = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevOrders = allOrders.filter((o) => new Date(o.createdAt) >= prevPeriodStart && new Date(o.createdAt) < prevPeriodEnd && o.payment?.status === 'success');
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total, 0);
    const growthRate = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(2) : '0';

    return NextResponse.json({
      period: `Last ${days} days`,
      metrics: { totalRevenue: parseFloat(totalRevenue.toFixed(2)), totalOrders, totalPlatformFee: parseFloat(totalPlatformFee.toFixed(2)), avgOrderValue: parseFloat(avgOrderValue.toFixed(2)), growthRate: parseFloat(growthRate as string) },
      dailyRevenue: revenueData,
      topMetrics: { highestDayRevenue: Math.max(...revenueData.map((d) => d.revenue)), bestDay: revenueData.reduce((prev, current) => current.revenue > prev.revenue ? current : prev) },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
