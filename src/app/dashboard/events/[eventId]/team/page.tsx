'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Trash2, Mail } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'event_manager' | 'gate_staff' | 'finance';
  status: 'pending' | 'active';
  invitedAt: string;
  joinedAt?: string;
  invitedBy: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  event_manager: 'Event Manager',
  gate_staff: 'Gate Staff',
  finance: 'Finance',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access to all event features',
  event_manager: 'Manage event details and attendees',
  gate_staff: 'Access check-in system only',
  finance: 'View payouts and financial data',
};

export default function TeamPage({ params }: { params: { eventId: string } }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('event_manager');
  const [message, setMessage] = useState('');

  // Fetch team members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(
          `/api/team/members?eventId=${params.eventId}`
        );
        const data = await response.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [params.eventId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setMessage('');

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: params.eventId,
          inviteeEmail: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Invitation sent successfully! ✓');
        setInviteEmail('');
        setInviteRole('event_manager');
        setShowInviteForm(false);

        // Refresh members list
        const membersResponse = await fetch(
          `/api/team/members?eventId=${params.eventId}`
        );
        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
      } else {
        setMessage(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      setMessage('Error sending invitation');
      console.error(error);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;

    try {
      const response = await fetch(
        `/api/team/members?eventId=${params.eventId}&memberId=${memberId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setMembers(members.filter((m) => m.id !== memberId));
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-ivory)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--color-stone-mid)' }}>
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              href={`/dashboard`}
              className="flex items-center gap-2 hover:opacity-75"
            >
              <ArrowLeft className="h-5 w-5" style={{ color: 'var(--color-forest)' }} />
              <span className="font-semibold" style={{ color: 'var(--color-forest)' }}>
                Back
              </span>
            </Link>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-forest)' }}>
              Team Members
            </h1>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-sage)' }}
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Invite Form */}
        {showInviteForm && (
          <div className="mb-8 rounded-lg border p-6" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--color-forest)' }}>
              Invite Team Member
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--color-stone)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full rounded border px-3 py-2 mt-1"
                  style={{ borderColor: 'var(--color-stone-mid)' }}
                  placeholder="colleague@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--color-stone)' }}>
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded border px-3 py-2 mt-1"
                  style={{ borderColor: 'var(--color-stone-mid)' }}
                >
                  <option value="event_manager">Event Manager</option>
                  <option value="gate_staff">Gate Staff</option>
                  <option value="finance">Finance</option>
                </select>
              </div>

              {message && (
                <div
                  className="rounded px-4 py-2 text-sm"
                  style={{
                    backgroundColor: message.includes('✓') ? 'rgba(18, 178, 120, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: message.includes('✓') ? 'var(--color-sage)' : '#ef4444',
                  }}
                >
                  {message}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-sage)' }}
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="rounded px-4 py-2 text-sm font-semibold border"
                  style={{ borderColor: 'var(--color-stone-mid)', color: 'var(--color-stone)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Team Members List */}
        {loading ? (
          <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
            <p style={{ color: 'var(--color-stone)' }}>Loading team members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
            <p style={{ color: 'var(--color-stone)' }}>No team members yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border p-4 flex items-center justify-between"
                style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" style={{ color: 'var(--color-stone-mid)' }} />
                    <span className="font-medium" style={{ color: 'var(--color-forest)' }}>
                      {member.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span
                      className="rounded px-2 py-1"
                      style={{
                        backgroundColor: 'rgba(18, 178, 120, 0.1)',
                        color: 'var(--color-sage)',
                      }}
                    >
                      {ROLE_LABELS[member.role]}
                    </span>
                    <span
                      style={{
                        color: member.status === 'pending' ? '#f59e0b' : 'var(--color-sage)',
                      }}
                    >
                      {member.status === 'pending' ? '⏳ Pending' : '✓ Active'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(member.id)}
                  className="p-2 rounded hover:opacity-75 transition-opacity"
                  style={{ color: '#ef4444' }}
                  title="Remove member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
