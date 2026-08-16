'use client';

/**
 * ═══ Message the other side of a piece of work. ═══
 *
 * Messaging was hardcoded customer↔business, so a hub and the street seller holding its stock had
 * no way to talk, and neither did the two sides of a job. Threads now name their SUBJECT, and the
 * subject is also the access rule: the server reads membership off the checkout or the application,
 * so there is nothing to pass here but the work itself — a caller cannot name their own
 * counterparty into a conversation.
 *
 * Idempotent on the server (the thread is keyed on the subject), so both sides tapping "Message" at
 * the same moment land in the same conversation rather than creating two.
 */
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

/** The kinds of work a thread can be about. `business` threads use `startThread` instead. */
export type WorkSubjectType = 'consignment' | 'job' | 'delivery' | 'rto';

export interface WorkThread {
  id: string;
  subjectType: WorkSubjectType;
  subjectRefId: string;
  title: string;
}

export function useOpenWorkThread() {
  const router = useRouter();
  return useMutation<WorkThread, unknown, { subjectType: WorkSubjectType; subjectRefId: string }>({
    mutationFn: (input) => api.post<WorkThread>(endpoints.messageThreadOpen, input),
    // Straight into the conversation — opening a thread and then leaving the person on the
    // previous screen would make the button look like it did nothing.
    onSuccess: (thread) => router.push(`/messages/${thread.id}`),
  });
}
