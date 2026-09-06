'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, XCircle, Clock, QrCode } from 'lucide-react';

interface PaymentStatus {
  status: 'success' | 'failed' | 'pending' | 'loading';
  message: string;
  orderId?: string;
  tickets?: Array<{
    id: string;
    qrToken: string;
    attendeeName: string;
    attendeeEmail: string;
  }>;
}

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'loading',
    message: 'Verifying your payment...',
  });

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setPaymentStatus({
          status: 'failed',
          message: 'No payment reference found',
        });
        return;
      }

      try {
        const response = await fetch(`/api/payment/verify?reference=${reference}`);
        const data = await response.json();

        if (data.status === 'success') {
          setPaymentStatus({
            status: 'success',
            message: 'Payment successful! Your tickets are ready.',
            orderId: data.orderId,
            tickets: data.tickets,
          });
        } else if (data.status === 'pending') {
          setPaymentStatus({
            status: 'pending',
            message: 'Payment is being processed. Check your email shortly.',
            orderId: data.orderId,
          });
        } else {
          setPaymentStatus({
            status: 'failed',
            message: data.message || 'Payment verification failed',
          });
        }
      } catch (error) {
        setPaymentStatus({
          status: 'failed',
          message: 'Failed to verify payment. Please contact support.',
        });
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-ivory)' }}>
      <header className="border-b" style={{ borderColor: 'var(--color-stone-mid)' }}>
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ticket Buddy" width={40} height={40} className="h-10 w-10" />
            <span className="font-bold" style={{ color: 'var(--color-forest)' }}>
              Ticket Buddy
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--color-stone-mid)', backgroundColor: 'white' }}>
          {paymentStatus.status === 'success' && (
            <CheckCircle className="mx-auto h-16 w-16" style={{ color: 'var(--color-sage)' }} />
          )}
          {paymentStatus.status === 'failed' && (
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
          )}
          {(paymentStatus.status === 'pending' || paymentStatus.status === 'loading') && (
            <Clock className="mx-auto h-16 w-16 animate-spin" style={{ color: 'var(--color-forest)' }} />
          )}

          <h1 className="mt-6 text-3xl font-bold" style={{ color: 'var(--color-forest)' }}>
            {paymentStatus.status === 'success' && 'Payment Confirmed! 🎉'}
            {paymentStatus.status === 'failed' && 'Payment Failed'}
            {paymentStatus.status === 'pending' && 'Processing Payment'}
            {paymentStatus.status === 'loading' && 'Verifying Payment'}
          </h1>

          <p className="mt-4 text-lg" style={{ color: 'var(--color-stone)' }}>
            {paymentStatus.message}
          </p>

          {paymentStatus.status === 'success' && paymentStatus.tickets && paymentStatus.tickets.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-forest)' }}>
                Your Tickets
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {paymentStatus.tickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="rounded-lg border p-4 text-left"
                    style={{ borderColor: 'var(--color-stone-mid)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-stone)' }}>
                          Ticket {index + 1}
                        </p>
                        <p className="mt-1 font-bold" style={{ color: 'var(--color-forest)' }}>
                          {ticket.attendeeName}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-stone-mid)' }}>
                          {ticket.attendeeEmail}
                        </p>
                      </div>
                      <QrCode className="h-8 w-8 flex-shrink-0" style={{ color: 'var(--color-sage)' }} />
                    </div>

                    <div className="mt-4 rounded bg-gray-100 p-4">
                      <div className="mx-auto h-32 w-32 flex items-center justify-center">
                        <p className="text-xs text-center" style={{ color: 'var(--color-stone-mid)' }}>
                          QR: {ticket.qrToken.slice(0, 12)}...
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-center" style={{ color: 'var(--color-stone-mid)' }}>
                        QR code sent to your email
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm" style={{ color: 'var(--color-stone)' }}>
                Check your email for ticket confirmations and QR codes
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/events"
              className="rounded px-6 py-3 font-semibold transition-opacity text-white"
              style={{ backgroundColor: 'var(--color-forest)' }}
            >
              Browse More Events
            </Link>

            {paymentStatus.status === 'failed' && (
              <Link
                href="/events"
                className="rounded border px-6 py-3 font-semibold transition-opacity"
                style={{ borderColor: 'var(--color-stone-mid)', color: 'var(--color-forest)' }}
              >
                Try Again
              </Link>
            )}
          </div>

          {reference && (
            <p className="mt-8 text-xs" style={{ color: 'var(--color-stone-mid)' }}>
              Reference: <code className="font-mono">{reference}</code>
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <p style={{ color: 'var(--color-stone)' }}>
            Questions? Contact{' '}
            <a href="mailto:support@ticketbuddy.com" className="font-semibold" style={{ color: 'var(--color-forest)' }}>
              support@ticketbuddy.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
