import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { teamMembers, events } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from '@/lib/email-service';

/**
 * POST /api/team/invite
 * Invite a team member to an event
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { eventId, inviteeEmail, role } = await request.json();

    if (!eventId || !inviteeEmail || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['owner', 'event_manager', 'gate_staff', 'finance'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user is organizer of the event
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event || event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if already a member
    const existing = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.eventId, eventId),
        eq(teamMembers.userEmail, inviteeEmail)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User already a team member' },
        { status: 400 }
      );
    }

    // Create team member invite
    const inviteToken = crypto.randomBytes(32).toString('hex');

    await db.insert(teamMembers).values({
      id: crypto.randomUUID(),
      eventId,
      userEmail: inviteeEmail,
      role,
      status: 'pending',
      inviteToken,
      invitedAt: new Date(),
      invitedBy: session.user.email,
    });

    // Send invite email
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/team/accept-invite?token=${inviteToken}`;

    await sendEmail({
      to: inviteeEmail,
      subject: `You've been invited to join ${event.title} team`,
      html: `
        <h2>Team Invitation</h2>
        <p>You've been invited to join the team for <strong>${event.title}</strong></p>
        <p>Role: <strong>${role.replace(/_/g, ' ').toUpperCase()}</strong></p>
        <p>
          <a href="${inviteUrl}" style="background-color: #12372A; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p>This link expires in 7 days.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
