import type { Metadata } from 'next';
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
          <a href="https://ping.cash" className="logo">
            Ping
          </a>
        </header>
        <main className="main">{children}</main>
        <footer className="footer">
          <p>Non-custodial · Solana · USDC</p>
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
