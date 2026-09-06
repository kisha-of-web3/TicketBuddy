import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // For V1, assume organizer creates events directly
    // In future, we'll have organization/team support
    const userEvents = await db.query.events.findMany({
      where: eq(events.organizerId, session.user.email),
      orderBy: (events, { desc }) => [desc(events.createdAt)],
    });

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
