'use client';

/**
 * Root fatal boundary (App Router). Must render its own <html>/<body> because it replaces the
 * root layout. Deliberately dependency-free so it renders even if the app tree is broken.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#0E0F12',
          color: '#F4F4F5',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>StreetServe hit a snag</h1>
          <p style={{ color: '#9C9FA8', marginBottom: 20 }}>Please reload the app.</p>
          <button
            onClick={reset}
            style={{
              height: 44,
              padding: '0 20px',
              borderRadius: 8,
              border: 'none',
              background: '#FF6B45',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
