/**
 * Landing page for ping.cash root.
 * Most users arrive at /c/<code> from a claim link, not here.
 * This page is a fallback for direct visits.
 */
export default function HomePage() {
  return (
    <div className="claim-card">
      <h1 style={{ marginBottom: 16, fontSize: 28 }}>Welcome to Ping</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        You probably arrived here from a link. If you're trying to claim money
        sent to you, please make sure to open the full link from your WhatsApp
        or SMS.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Want to send money? Get the Ping app at{' '}
        <a href="https://ping.cash/app" style={{ color: 'var(--accent)' }}>
          ping.cash/app
        </a>
      </p>
    </div>
  );
}
