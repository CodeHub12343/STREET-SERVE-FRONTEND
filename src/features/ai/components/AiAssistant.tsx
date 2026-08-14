'use client';

/**
 * S-11 AI Assistant feed (docs/13 S-11, docs/06 §1 progressive disclosure) — ONE recommendation
 * card at a time with a one-line "why", never a dashboard dump. Accept acts on it; dismiss moves to
 * the next. Rule-based recommendations from the backend; demo mode uses the local set.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoAiRecs } from '@/lib/demo';

interface AiRec {
  id: string;
  title: string;
  why: string;
  action: string;
}

/** What the API actually returns — the card's own shape came from the demo fixture. */
interface ApiRec {
  recommendationId: string;
  productId: string;
  name: string;
  unitValueCents: number;
  reasonSummary: string;
  factors: string[];
}

/**
 * The live endpoint returns product facts, not card copy, so its fields have to be mapped. Without
 * this the card read `title`/`why`/`action` — which exist only on the demo fixture — and rendered
 * an empty suggestion against the real API.
 */
function toCard(r: ApiRec): AiRec {
  return {
    id: r.recommendationId,
    title: r.name,
    why: r.reasonSummary,
    action: 'Reserve stock',
  };
}

export function AiAssistant() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const { data: recs, isLoading } = useQuery<AiRec[]>({
    queryKey: keys.aiRecs,
    queryFn: async () =>
      isMapDemo
        ? demoAiRecs()
        : (await api.get<ApiRec[]>(endpoints.aiRecommendationsProducts)).map(toCard),
    staleTime: isMapDemo ? Infinity : 60_000,
  });

  // Acting on a suggestion is the training signal behind `accepted`; nothing recorded it before.
  // Best-effort only — a failed log must never block the seller from acting on the advice.
  const accept = useMutation({
    mutationFn: (id: string) => api.post(endpoints.aiRecommendationAccept(id), {}),
  });

  if (isLoading) return <TabPage title="AI Assistant"><Skeleton $h="200px" $radius={16} /></TabPage>;

  const list = recs ?? [];
  const rec = list[index];

  return (
    <TabPage title="AI Assistant">
      {!rec ? (
        <EmptyState icon="✨" title="You’re all caught up" description="New suggestions appear as you sell. Check back later." />
      ) : (
        <Card>
          <Badge><Sparkles size={14} aria-hidden /> Suggestion {index + 1} of {list.length}</Badge>
          <Title>{rec.title}</Title>
          <Why>{rec.why}</Why>
          <Actions>
            <Button
              fullWidth
              onClick={() => {
                if (!isMapDemo) accept.mutate(rec.id);
                router.push('/seller');
              }}
            >
              {rec.action} <ArrowRight size={16} />
            </Button>
            <Button variant="tertiary" fullWidth onClick={() => setIndex((i) => i + 1)}>
              Not now
            </Button>
          </Actions>
        </Card>
      )}
    </TabPage>
  );
}

const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.statusDiscount};
`;
const Title = styled.h2`
  font-size: 22px;
  letter-spacing: -0.01em;
`;
const Why = styled.p`
  font-size: 15px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
