import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const publishedEvents = await db.query.events.findMany({
      where: eq(events.status, 'published'),
      with: {
        ticketTypes: true,
      },
      orderBy: (events, { desc }) => desc(events.startDatetime),
    });

    return NextResponse.json(publishedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
