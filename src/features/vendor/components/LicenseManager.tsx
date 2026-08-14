'use client';

/**
 * V-01b License documents — the screen the registration wizard promises ("you'll upload it after
 * setup, before going live"). Upload a photo of the licence, see its review status, and know
 * exactly what is standing between you and going live (docs/06 §1: never a dead end).
 *
 * Approval is an admin decision, so the honest state here is "pending review" — we never imply the
 * vendor is cleared before an admin says so.
 */
import { useRef, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2, Clock, XCircle, Upload } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { uploadImage } from '@/lib/upload';
import { useLicenseDocuments, useSubmitLicense, type LicenseStatus } from '../hooks/useLicenseDocuments';
import { useVendorBusinessDetail } from '../hooks/useVendorBusinessDetail';

const STATUS_META: Record<LicenseStatus, { label: string; icon: React.ReactNode; tone: LicenseStatus }> = {
  pending: { label: 'Pending review', icon: <Clock size={16} />, tone: 'pending' },
  approved: { label: 'Approved', icon: <CheckCircle2 size={16} />, tone: 'approved' },
  rejected: { label: 'Rejected', icon: <XCircle size={16} />, tone: 'rejected' },
};

export function LicenseManager({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data: business } = useVendorBusinessDetail(businessId);
  const { data: docs, isLoading } = useLicenseDocuments(businessId);
  const submit = useSubmitLicense(businessId);

  const onFile = async (file: File | undefined) => {
    if (!file || !business) return;
    setBusy(true);
    try {
      const { url } = await uploadImage(file, 'license');
      await submit.mutateAsync({ categoryId: business.categoryId, documentUrl: url });
      show('License submitted — an admin will review it shortly', 'success');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not submit your license', 'danger');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const approved = docs?.some((d) => d.status === 'approved') ?? false;
  const pending = docs?.some((d) => d.status === 'pending') ?? false;

  return (
    <Wrap>
      <Head>
        <h1>License documents</h1>
        <p>
          {business?.name ?? 'Your business'} operates in a category that needs a valid license
          before you can go live on the map.
        </p>
      </Head>

      {approved ? (
        <Banner tone="success" title="You’re cleared to go live">
          An approved license is on file for this category.
        </Banner>
      ) : pending ? (
        <Banner tone="info" title="Waiting on review">
          Your license is with our team. You’ll be able to go live as soon as it’s approved.
        </Banner>
      ) : (
        <Banner tone="warning" title="License required">
          Upload a clear photo of your license for this category. We’ll review it and unlock going
          live.
        </Banner>
      )}

      <UploadCard>
        <HiddenInput
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button loading={busy || submit.isPending} onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> {docs && docs.length > 0 ? 'Upload another' : 'Upload license photo'}
        </Button>
        <Fine>JPG, PNG or WebP · up to 8MB · a photo of the document is fine</Fine>
      </UploadCard>

      <Section>
        <h2>Submitted</h2>
        {isLoading ? (
          <Skeleton $h="72px" $radius={16} />
        ) : !docs || docs.length === 0 ? (
          <EmptyState
            icon="📄"
            title="Nothing submitted yet"
            description="Once you upload a license it’ll appear here with its review status."
          />
        ) : (
          <List>
            {docs.map((d) => (
              <Row key={d.id}>
                <div>
                  <RowTitle>{d.categoryName}</RowTitle>
                  <RowMeta>
                    Submitted {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                  </RowMeta>
                </div>
                <Status $tone={STATUS_META[d.status].tone}>
                  {STATUS_META[d.status].icon}
                  {STATUS_META[d.status].label}
                </Status>
              </Row>
            ))}
          </List>
        )}
      </Section>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
`;
const Head = styled.div`
  display: grid;
  gap: 6px;
  h1 {
    font-size: 24px;
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: 14px;
  }
`;
const UploadCard = styled.div`
  display: grid;
  justify-items: start;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const HiddenInput = styled.input`
  display: none;
`;
const Fine = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  h2 {
    font-size: 15px;
  }
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const RowTitle = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const RowMeta = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Status = styled.span<{ $tone: LicenseStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme, $tone }) =>
    $tone === 'approved'
      ? theme.color.statusLive
      : $tone === 'rejected'
        ? theme.color.statusDanger
        : theme.color.statusWarning};
`;
