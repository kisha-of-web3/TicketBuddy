'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BarChart3, Users, DollarSign, Ticket, Plus, Settings, LogOut } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  slug: string;
  startDatetime: string;
}

interface EventMetrics {
  ticketsSold: number;
  ticketsTotal: number;
  revenue: number;
  checkedIn: number;
  eventTitle: string;
  ticketBreakdown: Array<{
    tier: string;
    sold: number;
    remaining: number;
    revenue: number;
  }>;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Fetch organizer's events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/dashboard/events');
        const data = await response.json();

        if (data.events && data.events.length > 0) {
          setEvents(data.events);
          setSelectedEventId(data.events[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Fetch metrics for selected event
  useEffect(() => {
    if (!selectedEventId) return;

    const fetchMetrics = async () => {
      setMetricsLoading(true);
      try {
        const response = await fetch(`/api/dashboard/metrics?eventId=${selectedEventId}`);
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedEventId]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-ivory)' }}>
        <div className="flex items-center justify-center h-screen">
          <p style={{ color: 'var(--color-stone)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-ivory)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--color-stone-mid)' }}>
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Ticket Buddy" width={40} height={40} className="h-10 w-10" />
              <span className="font-bold" style={{ color: 'var(--color-forest)' }}>
                Ticket Buddy
              </span>
            </Link>
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-75"
              style={{ backgroundColor: 'var(--color-sage-pale)', color: 'var(--color-forest)' }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Events Selector & Navigation */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p style={{ color: 'var(--color-stone-mid)' }} className="text-sm">
              Your Events
            </p>
            {events.length > 0 ? (
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="rounded border px-4 py-2 font-semibold"
                style={{ borderColor: 'var(--color-stone-mid)', color: 'var(--color-forest)' }}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            ) : (
              <p style={{ color: 'var(--color-stone)' }}>No events yet</p>
            )}
          </div>

          <Link
            href="/events/create"
            className="flex items-center gap-2 rounded px-6 py-2 font-semibold transition-opacity text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--color-forest)' }}
          >
            <Plus className="h-5 w-5" />
            Create Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="rounded-lg border p-12 text-center" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
            <Ticket className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--color-sage)' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-forest)' }}>
              No events yet
            </h2>
            <p className="mb-6" style={{ color: 'var(--color-stone)' }}>
              Create your first event to get started
            </p>
            <Link
              href="/events/create"
              className="inline-flex items-center gap-2 rounded px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-forest)' }}
            >
              <Plus className="h-5 w-5" />
              Create Your First Event
            </Link>
          </div>
        ) : metricsLoading ? (
          <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
            <p style={{ color: 'var(--color-stone)' }}>Loading metrics...</p>
          </div>
        ) : metrics ? (
          <>
            {/* Top Metrics Grid */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Tickets Sold */}
              <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-stone-mid)' }}>
                      Tickets Sold
                    </p>
                    <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--color-forest)' }}>
                      {metrics.ticketsSold}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-stone)' }}>
                      of {metrics.ticketsTotal}
                    </p>
                  </div>
                  <Ticket className="h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                </div>
              </div>

              {/* Revenue */}
              <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-stone-mid)' }}>
                      Revenue
                    </p>
                    <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--color-forest)' }}>
                      ₦{metrics.revenue.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                </div>
              </div>

              {/* Checked In */}
              <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-stone-mid)' }}>
                      Checked In
                    </p>
                    <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--color-forest)' }}>
                      {metrics.checkedIn}
                    </p>
                  </div>
                  <Users className="h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                </div>
              </div>

              {/* Remaining */}
              <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-stone-mid)' }}>
                      Remaining
                    </p>
                    <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--color-forest)' }}>
                      {metrics.ticketsTotal - metrics.ticketsSold}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                </div>
              </div>
            </div>

            {/* Ticket Breakdown Table */}
            <div className="mb-8 rounded-lg border" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
              <div className="border-b px-6 py-4" style={{ borderColor: 'var(--color-stone-mid)' }}>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-forest)' }}>
                  Ticket Breakdown
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-ivory)' }}>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Sold
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Remaining
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.ticketBreakdown.map((breakdown, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid var(--color-stone-mid)` }}>
                        <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-forest)' }}>
                          {breakdown.tier}
                        </td>
                        <td className="px-6 py-4" style={{ color: 'var(--color-stone)' }}>
                          {breakdown.sold}
                        </td>
                        <td className="px-6 py-4" style={{ color: 'var(--color-stone)' }}>
                          {breakdown.remaining}
                        </td>
                        <td className="px-6 py-4 font-semibold" style={{ color: 'var(--color-forest)' }}>
                          ₦{breakdown.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href={`/events/${selectedEvent?.slug}`}
                className="rounded-lg border p-6 text-center transition-opacity hover:opacity-75"
                style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}
              >
                <Ticket className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--color-forest)' }}>
                  View Event
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-stone-mid)' }}>
                  See event details
                </p>
              </Link>

              <Link
                href={`/dashboard/events/${selectedEventId}/attendees`}
                className="rounded-lg border p-6 text-center transition-opacity hover:opacity-75"
                style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}
              >
                <Users className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--color-forest)' }}>
                  Manage Attendees
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-stone-mid)' }}>
                  View attendee list
                </p>
              </Link>

              <Link
                href={`/dashboard/events/${selectedEventId}/check-in`}
                className="rounded-lg border p-6 text-center transition-opacity hover:opacity-75"
                style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}
              >
                <BarChart3 className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--color-forest)' }}>
                  Check-In
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-stone-mid)' }}>
                  Scan and verify
                </p>
              </Link>

              <Link
                href={`/dashboard/events/${selectedEventId}/settings`}
                className="rounded-lg border p-6 text-center transition-opacity hover:opacity-75"
                style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}
              >
                <Settings className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--color-sage)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--color-forest)' }}>
                  Settings
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-stone-mid)' }}>
                  Manage event
                </p>
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
