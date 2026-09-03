import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

// Ticket Buddy brand typeface (see brand system: Manrope)
const manrope = localFont({
  src: "../fonts/Manrope-Variable.ttf",
  variable: "--font-manrope",
  weight: "200 800",
});

export const metadata: Metadata = {
  title: "Ticket Buddy",
  description:
    "Your event journey starts here. Discover events, book tickets securely, and experience more of what matters.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
