/**
 * A business as the admin console needs to see it: enough to identify WHICH business, by a human,
 * before acting on it. The id is carried but never shown — it is what the API needs, not what the
 * operator reads.
 */
export interface AdminBusiness {
  id: string;
  name: string;
  status: string;
  isHub: boolean;
  /** Null when the owner record is missing — shown as "owner unknown" rather than hidden. */
  ownerName: string | null;
  ownerEmail: string | null;
}
