import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { teamMembers, events } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/team/members?eventId=...
 * Get all team members for an event
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

    // Verify user is organizer
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get team members
    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.eventId, eventId),
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        email: m.userEmail,
        role: m.role,
        status: m.status,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy,
      })),
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/members?eventId=...&memberId=...
 * Remove a team member from an event
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const eventId = request.nextUrl.searchParams.get('eventId');
    const memberId = request.nextUrl.searchParams.get('memberId');

    if (!eventId || !memberId) {
      return NextResponse.json(
        { error: 'Missing eventId or memberId' },
        { status: 400 }
      );
    }

    // Verify user is organizer
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete team member
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, memberId));

    return NextResponse.json({
      success: true,
      message: 'Team member removed',
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
