'use client';

/**
 * A-03 Category & license review (docs/13 A-03) — approve/reject taxonomy suggestions and
 * license-document proofs.
 *
 * Approving is where governance actually happens (BP-5): the admin picks the **archetype**, which
 * decides the default modules of every business that ever registers under the new category, plus
 * the licence metadata that gates their go-live. Hence a dialog rather than a bare Approve button.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Check, X, FileText } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import {
  useCategoryReview,
  useLicenseReview,
  type AdminCategorySuggestion,
} from '../hooks/useAdmin';
import { SuggestionReviewModal } from './SuggestionReviewModal';

export function CategoryReview() {
  const { show } = useToast();
  const { suggestions, isLoading: suggestionsLoading, reviewSuggestion } = useCategoryReview();
  const { licenses, isLoading: licensesLoading, review: reviewLicense } = useLicenseReview();
  const [approving, setApproving] = useState<AdminCategorySuggestion | null>(null);

  return (
    <Wrap>
      <SectionTitle>Category suggestions</SectionTitle>
      {suggestionsLoading ? (
        <Skeleton $h="64px" $radius={16} />
      ) : !suggestions || suggestions.length === 0 ? (
        <Empty>No pending suggestions.</Empty>
      ) : (
        suggestions.map((s) => (
          <Card key={s.id}>
            <Info>
              <Name>{s.proposedName}</Name>
              <Sub>
                suggested by {s.businessName} · {new Date(s.createdAt).toLocaleDateString()}
              </Sub>
            </Info>
            <Actions>
              <Button size="compact" onClick={() => setApproving(s)}>
                <Check size={15} /> Review
              </Button>
              <Button
                size="compact"
                variant="secondary"
                aria-label={`Reject ${s.proposedName}`}
                onClick={() =>
                  reviewSuggestion.mutate(
                    { id: s.id, approve: false },
                    {
                      onSuccess: () => show('Suggestion rejected', 'default'),
                      onError: () => show('Could not reject the suggestion', 'danger'),
                    },
                  )
                }
              >
                <X size={15} />
              </Button>
            </Actions>
          </Card>
        ))
      )}

      {approving ? (
        <SuggestionReviewModal
          suggestion={approving}
          pending={reviewSuggestion.isPending}
          onCancel={() => setApproving(null)}
          onApprove={(details) =>
            reviewSuggestion.mutate(
              { ...details, id: approving.id, approve: true },
              {
                onSuccess: () => {
                  setApproving(null);
                  show(`“${approving.proposedName}” is now a category`, 'success');
                },
                onError: () => show('Could not approve the category', 'danger'),
              },
            )
          }
        />
      ) : null}

      <SectionTitle>License documents</SectionTitle>
      {licensesLoading ? (
        <Skeleton $h="64px" $radius={16} />
      ) : !licenses || licenses.length === 0 ? (
        <Empty>No pending license reviews.</Empty>
      ) : (
        licenses.map((l) => (
          <Card key={l.id}>
            <Info>
              <Name><FileText size={14} /> {l.businessName}</Name>
              <Sub>
                {l.categoryName} license{l.regulatedBy ? ` · ${l.regulatedBy}` : ''} · submitted{' '}
                {new Date(l.createdAt).toLocaleDateString()}
              </Sub>
            </Info>
            <Actions>
              {l.documentUrl && l.documentUrl !== '#' ? (
                <ViewLink href={l.documentUrl} target="_blank" rel="noopener noreferrer">
                  View
                </ViewLink>
              ) : null}
              <Button size="compact" loading={reviewLicense.isPending} onClick={() => reviewLicense.mutate({ id: l.id, approve: true })}><Check size={15} /> Approve</Button>
              <Button size="compact" variant="secondary" onClick={() => reviewLicense.mutate({ id: l.id, approve: false })}><X size={15} /></Button>
            </Actions>
          </Card>
        ))
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  max-width: 640px;
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: ${({ theme }) => theme.space[4]}px;
  &:first-child {
    margin-top: 0;
  }
`;
const Card = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Info = styled.div`
  min-width: 0;
`;
const Name = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 14px;
`;
const Sub = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  flex: none;
`;
const Empty = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const ViewLink = styled.a`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentSecondary};
  align-self: center;
`;
