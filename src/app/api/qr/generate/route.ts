import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const ticketId = request.nextUrl.searchParams.get('ticketId');
    const attendeeName = request.nextUrl.searchParams.get('attendeeName');
    const eventTitle = request.nextUrl.searchParams.get('eventTitle');

    if (!token || !ticketId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const qrValue = JSON.stringify({
      ticketId,
      token,
      attendeeName: attendeeName || 'Attendee',
      eventTitle: eventTitle || 'Event',
      timestamp: new Date().toISOString(),
    });

    // Generate QR code as PNG
    const qrImage = await QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      color: {
        dark: '#12372A', // Forest green
        light: '#ffffff',
      },
    });

    // Return as data URL that can be embedded in emails or downloaded
    return NextResponse.json({
      qrCode: qrImage,
      ticketId,
      token,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
