/**
 * Socket.IO client factory (REALTIME_IMPLEMENTATION.md §2). Connects to the standalone
 * Express/Socket.IO server (NEXT_PUBLIC_SOCKET_URL) — never to Next. Handshake auth carries
 * the same Clerk JWT as REST, provided lazily so a token refresh reconnects cleanly.
 */
import { io, type Socket } from 'socket.io-client';
import { env } from '@/lib/env';

export type AppSocket = Socket;

export function makeSocket(getToken: () => Promise<string | null>): AppSocket {
  return io(env.socketUrl, {
    autoConnect: false,
    transports: ['websocket'],
    // socket.io expects a void-returning callback; resolve the token then invoke it.
    auth: (cb: (data: { token: string | null }) => void) => {
      void getToken().then((token) => cb({ token }));
    },
  });
}
