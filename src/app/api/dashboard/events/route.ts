import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events } from '@/db/schema';

/**
 * GET /api/dashboard/events
 * Fetch all events for the authenticated organizer
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

    // TODO: Filter by organization membership
    // For now, fetch all events and filter client-side
    const allEvents = await db.query.events.findMany({
      orderBy: (events, { desc }) => [desc(events.createdAt)],
    });

    const userEvents = allEvents;

    return NextResponse.json({
      events: userEvents.map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        startDatetime: event.startDatetime,
        status: event.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
