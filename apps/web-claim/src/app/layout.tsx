import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ping — Claim your money',
  description:
    'Receive money sent to you via Ping. Choose how you want to cash out.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <a href="https://ping.cash" className="logo" aria-label="Ping home">
            <Image
              src="/logo.svg"
              alt="Ping"
              width={48}
              height={40}
              className="logo-mark"
              priority
            />
            <span className="logo-wordmark">Ping</span>
          </a>
        </header>
        <main className="main">{children}</main>
        <footer className="footer">
          <div className="footer-brand">
            <Image
              src="/logo-icon.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden
            />
            <span>Built on Solana · Powered by USDC · Non-custodial</span>
          </div>
          <p className="footer-links">
            <a href="https://ping.cash/privacy">Privacy</a>
            <a href="https://ping.cash/terms">Terms</a>
            <a href="https://ping.cash/help">Help</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
