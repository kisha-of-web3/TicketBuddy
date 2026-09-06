import nodemailer from 'nodemailer';

/**
 * Email service for sending transactional emails
 * Supports multiple providers: Resend, SendGrid, SMTP
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

// Initialize email transporter
let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;

  const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

  if (emailProvider === 'resend') {
    // Using Resend via nodemailer
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY || '',
      },
    });
  } else if (emailProvider === 'sendgrid') {
    // Using SendGrid via nodemailer
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY || '',
      },
    });
  } else {
    // Using SMTP (Gmail, custom server, etc.)
    transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });
  }

  return transporter;
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ticketbuddy.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo || 'support@ticketbuddy.com',
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${options.to}:`, result.messageId);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${options.to}:`, error);
    return false;
  }
}

/**
 * Send order confirmation with tickets and QR codes
 */
export async function sendOrderConfirmation(data: {
  attendeeEmail: string;
  attendeeFirstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventCity: string;
  tickets: Array<{
    id: string;
    attendeeName: string;
    qrCode: string; // base64 data URL
    ticketType: string;
  }>;
  orderId: string;
  totalAmount: number;
}): Promise<boolean> {
  const subject = `Your tickets for ${data.eventTitle} are ready! 🎉`;

  const ticketsHtml = data.tickets
    .map(
      (ticket) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 16px; background-color: #ffffff;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">Ticket for</p>
      <h3 style="color: #12372a; margin: 0 0 12px 0; font-size: 18px;">${ticket.attendeeName}</h3>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">${ticket.ticketType}</p>

      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; margin: 16px 0;">
        <img src="${ticket.qrCode}" alt="QR Code" style="width: 200px; height: 200px; margin: 0 auto; display: block;" />
      </div>

      <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
        Show this QR code at the event entrance
      </p>
    </div>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; line-height: 1.5; color: #333; }
          a { color: #12372a; text-decoration: none; }
        </style>
      </head>
      <body style="background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background-color: #12372a; padding: 32px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Your Tickets Are Ready! 🎉</h1>
          </div>

          <!-- Content -->
          <div style="padding: 32px 20px;">
            <p style="color: #374151; margin: 0 0 16px 0;">Hi ${data.attendeeFirstName},</p>

            <p style="color: #6b7280; margin: 0 0 24px 0;">
              Your tickets for <strong>${data.eventTitle}</strong> are confirmed and ready to use. Download or screenshot your QR codes below—you'll need them to enter the event.
            </p>

            <!-- Event Details -->
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Event Details</strong>
              </p>
              <p style="color: #374151; margin: 0 0 4px 0;">${data.eventTitle}</p>
              <p style="color: #6b7280; font-size: 13px; margin: 0;">
                ${data.eventDate} at ${data.eventTime}<br>
                ${data.eventVenue}, ${data.eventCity}
              </p>
            </div>

            <!-- Tickets -->
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
              <strong>Your Tickets</strong>
            </p>

            ${ticketsHtml}

            <!-- Instructions -->
            <div style="background-color: #dbeafe; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
              <p style="color: #075985; font-size: 14px; margin: 0;">
                <strong>How to use your QR code:</strong><br>
                1. Open this email on your phone or print it out<br>
                2. Show your QR code at the event entrance<br>
                3. Our staff will scan it to verify you're all set
              </p>
            </div>

            <!-- Support -->
            <p style="color: #6b7280; font-size: 13px; margin: 24px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Questions? Contact us at <a href="mailto:support@ticketbuddy.com">support@ticketbuddy.com</a>
            </p>

            <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0 0;">
              Order #${data.orderId} | Total: ₦${data.totalAmount.toLocaleString()}
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © Ticket Buddy. Your event infrastructure partner.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: data.attendeeEmail,
    subject,
    html,
  });
}

/**
 * Send event reminder email
 */
export async function sendEventReminder(data: {
  attendeeEmail: string;
  attendeeFirstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
}): Promise<boolean> {
  const subject = `Reminder: ${data.eventTitle} is ${data.eventDate} 🎟️`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; line-height: 1.5; color: #333; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 32px 20px;">
          <h2 style="color: #12372a; margin: 0 0 16px 0;">Event Reminder</h2>

          <p style="color: #374151; margin: 0 0 16px 0;">Hi ${data.attendeeFirstName},</p>

          <p style="color: #6b7280; margin: 0 0 24px 0;">
            This is a friendly reminder that <strong>${data.eventTitle}</strong> is happening soon!
          </p>

          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="color: #374151; margin: 0 0 8px 0;"><strong>${data.eventTitle}</strong></p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              📅 ${data.eventDate}<br>
              🕐 ${data.eventTime}<br>
              📍 ${data.eventVenue}
            </p>
          </div>

          <p style="color: #6b7280; margin: 0;">
            Make sure you have your QR ticket ready. See you there!
          </p>

          <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            © Ticket Buddy
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: data.attendeeEmail,
    subject,
    html,
  });
}
