/**
 * Messaging contracts (docs/12 §2, SCREEN_TO_API_MAPPING.md §5). Scoped customer↔business threads.
 */
export interface Thread {
  id: string;
  businessId: string;
  businessName: string;
  /**
   * Who the reader is actually talking to — the business's name when you're the customer, the
   * customer's name when you own the business. This is what the header/inbox row shows; using
   * `businessName` for both sides is what made a vendor see their own name at the top.
   */
  counterpartyName: string;
  /** The counterparty's picture (business logo / customer avatar). */
  avatarUrl?: string | null;
  /** The counterparty's user id — for presence. */
  counterpartyId?: string | null;
  /** Whether the counterparty currently holds a live messages socket. */
  online?: boolean;
  /** ISO time the counterparty was last connected (for "last seen …"). */
  lastSeen?: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export interface Message {
  id: string;
  threadId: string;
  from: 'me' | 'them';
  body: string;
  at: string;
  /**
   * When the recipient read this message (ISO), else null/undefined. Only meaningful for your own
   * messages, where a set value renders as "Seen".
   */
  readAt?: string | null;
  /** Optimistic-send flag until the server/socket confirms. */
  pending?: boolean;
}
