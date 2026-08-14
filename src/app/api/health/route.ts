/**
 * Frontend liveness endpoint (NEXTJS_ARCHITECTURE.md §6) — lets the platform/uptime ping the
 * Next app independently of the backend. Not the system-of-record health (that's the backend's
 * /healthz + /readyz).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'streetserve-frontend',
    time: new Date().toISOString(),
  });
}
