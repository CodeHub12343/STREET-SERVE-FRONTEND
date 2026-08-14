'use client';

/**
 * C-16 Reviews list + composer (docs/13 C-16). The composer is gated to a completed transaction
 * (H3) — enforced server-side; here it's presented as "review your recent visit". Star rating +
 * text.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { Star } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { TextArea } from '@/components/primitives/TextArea';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatRelativeMinutes } from '@/lib/format';
import { useBusiness, useReviews, useSubmitReview } from '../hooks/useBusiness';

export function Reviews({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { show } = useToast();
  // The transactionId of the completed order being reviewed (passed from the receipt). Required
  // server-side (H3); without it, submit is disabled outside demo mode.
  const transactionId = useSearchParams().get('transactionId') ?? undefined;
  const { data: biz } = useBusiness(businessId);
  const { data: reviews, isLoading } = useReviews(businessId);
  const submit = useSubmitReview(businessId);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');

  const post = () => {
    if (rating === 0) return show('Pick a star rating', 'warning');
    submit.mutate(
      { rating, body: body.trim(), transactionId },
      {
        onSuccess: () => {
          show('Thanks for your review!', 'success');
          setRating(0);
          setBody('');
        },
        onError: () =>
          show('You can review a business after a completed order with them.', 'danger'),
      },
    );
  };

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title={`Reviews · ${biz?.name ?? ''}`.trim()}
      onBack={() => router.back()}
      footer={
        <Button fullWidth loading={submit.isPending} onClick={post}>
          Post review
        </Button>
      }
    >
      <Composer>
        <Label>Review your recent visit</Label>
        <Stars role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <StarBtn key={n} type="button" role="radio" aria-checked={rating === n} $active={n <= rating} onClick={() => setRating(n)}>
              <Star size={28} fill={n <= rating ? 'currentColor' : 'none'} />
            </StarBtn>
          ))}
        </Stars>
        <TextArea aria-label="Review" placeholder="What stood out?" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} />
      </Composer>

      <SectionTitle>What others say</SectionTitle>
      {isLoading ? (
        <Skeleton $h="120px" $radius={16} />
      ) : !reviews || reviews.length === 0 ? (
        <EmptyState icon="⭐" title="No reviews yet" description="Be the first after your visit." />
      ) : (
        <List>
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHead>
                <b>{r.author}</b>
                <RowStars role="img" aria-label={`${r.rating} of 5`}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} fill={i < r.rating ? 'currentColor' : 'none'} />)}
                </RowStars>
              </CardHead>
              <Body>{r.body}</Body>
              <When>{formatRelativeMinutes(r.createdAt)}</When>
            </Card>
          ))}
        </List>
      )}
    </WizardFlow>
  );
}

const Composer = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Label = styled.p`
  font-weight: 600;
  font-size: 15px;
`;
const Stars = styled.div`
  display: flex;
  gap: 6px;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const StarBtn = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.color.statusWarning : theme.color.line2)};
  padding: 0;
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Card = styled.div`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
`;
const RowStars = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const Body = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const When = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
