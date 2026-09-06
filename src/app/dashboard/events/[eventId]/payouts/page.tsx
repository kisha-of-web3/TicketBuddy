'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, Percent, Download } from 'lucide-react';

interface TicketTierBreakdown {
  tierName: string;
  price: number;
  sold: number;
  revenue: number;
  platformFee: number;
  netRevenue: number;
}

export default function PayoutsPage({ params }: { params: { eventId: string } }) {
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPlatformFee, setTotalPlatformFee] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [feePercentage, setFeePercentage] = useState(6);
  const [breakdown, setBreakdown] = useState<TicketTierBreakdown[]>([]);

  // Fetch payout data
  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/payouts?eventId=${params.eventId}`
        );
        const data = await response.json();

        setEventTitle(data.eventTitle || 'Event');
        setTotalRevenue(data.totalRevenue || 0);
        setTotalPlatformFee(data.totalPlatformFee || 0);
        setNetRevenue(data.netRevenue || 0);
        setFeePercentage(data.platformFeePercentage || 6);
        setBreakdown(data.ticketTierBreakdown || []);
      } catch (error) {
        console.error('Failed to fetch payouts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [params.eventId]);

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-ivory)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--color-stone-mid)' }}>
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
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
              Payouts & Financials
            </h1>
            <button
              className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-sage)' }}
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
            <p style={{ color: 'var(--color-stone)' }}>Loading financial data...</p>
          </div>
        ) : (
          <>
            {/* Financial Summary Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Gross Revenue */}
              <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-stone-mid)' }}>
                    GROSS REVENUE
                  </span>
                  <DollarSign className="h-4 w-4" style={{ color: 'var(--color-sage)' }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-forest)' }}>
                  {formatCurrency(totalRevenue)}
                </p>
              </div>

              {/* Platform Fee */}
              <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-stone-mid)' }}>
                    PLATFORM FEE
                  </span>
                  <Percent className="h-4 w-4" style={{ color: '#f59e0b' }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                  {formatCurrency(totalPlatformFee)}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--color-stone)' }}>
                  {feePercentage}% of revenue
                </p>
              </div>

              {/* Net Revenue */}
              <div className="rounded-lg border p-6 lg:col-span-2" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-stone-mid)' }}>
                    YOUR NET REVENUE
                  </span>
                  <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-sage)' }} />
                </div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-sage)' }}>
                  {formatCurrency(netRevenue)}
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--color-stone)' }}>
                  After platform fees
                </p>
              </div>
            </div>

            {/* Revenue Breakdown by Ticket Tier */}
            <div className="rounded-lg border" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-stone-mid)' }}>
                <h2 className="font-semibold" style={{ color: 'var(--color-forest)' }}>
                  Revenue by Ticket Tier
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-ivory)' }}>
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Ticket Tier
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Sold
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Gross Revenue
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                        Platform Fee
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-forest)' }}>
                        Net Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center" style={{ color: 'var(--color-stone-mid)' }}>
                          No sales data yet
                        </td>
                      </tr>
                    ) : (
                      breakdown.map((tier, index) => (
                        <tr
                          key={index}
                          style={{
                            borderBottom: index < breakdown.length - 1 ? `1px solid var(--color-stone-mid)` : 'none',
                          }}
                        >
                          <td className="px-6 py-4 font-medium" style={{ color: 'var(--color-forest)' }}>
                            {tier.tierName}
                          </td>
                          <td className="px-6 py-4 text-right text-sm" style={{ color: 'var(--color-stone)' }}>
                            {formatCurrency(tier.price)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm" style={{ color: 'var(--color-stone)' }}>
                            {tier.sold}
                          </td>
                          <td className="px-6 py-4 text-right text-sm" style={{ color: 'var(--color-stone)' }}>
                            {formatCurrency(tier.revenue)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm" style={{ color: '#ef4444' }}>
                            -{formatCurrency(tier.platformFee)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold" style={{ color: 'var(--color-sage)' }}>
                            {formatCurrency(tier.netRevenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Row */}
              <div className="px-6 py-4 border-t font-semibold" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'var(--color-ivory)' }}>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--color-stone)' }}>TOTAL</span>
                  <div className="flex gap-8 text-right">
                    <div style={{ color: 'var(--color-forest)' }}>
                      {formatCurrency(totalRevenue)}
                    </div>
                    <div style={{ color: '#ef4444' }}>
                      -{formatCurrency(totalPlatformFee)}
                    </div>
                    <div style={{ color: 'var(--color-sage)' }}>
                      {formatCurrency(netRevenue)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div
              className="mt-8 rounded-lg border-l-4 p-4"
              style={{
                borderColor: 'var(--color-sage)',
                backgroundColor: 'rgba(18, 178, 120, 0.05)',
              }}
            >
              <p style={{ color: 'var(--color-stone)', fontSize: '14px' }}>
                <strong>About Platform Fees:</strong> Ticket Buddy charges {feePercentage}% on each ticket sale to support event infrastructure, payment processing, and customer support. This fee is deducted from your gross revenue to calculate your net payout.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
