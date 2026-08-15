'use client';

/**
 * Step 4 — the design.
 *
 * ## This is the step that saves people money
 *
 * The file is checked the moment it lands: real format, pixel dimensions, resolution at printed
 * size, page size for PDFs. A file that would print badly is caught here, where the fix is "export
 * it again" — not after payment, when the fix is a refund conversation about 2,000 blurry cards
 * already in the post (ARCHITECTURAL_IMPROVEMENTS §7).
 *
 * ## Errors block, warnings do not
 *
 * A deliberate split. Blocking an upload is the platform overruling somebody about their own
 * design, so it is reserved for files that will genuinely print badly or that the vendor will
 * reject. Anything arguable — a slightly soft image, RGB colour the press can convert — is shown
 * and left as the buyer's call. Overruling people about aesthetics is not our job; stopping them
 * wasting $400 is.
 *
 * All the wording comes from the server so the same words appear wherever the file is looked at.
 */
import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { AppApiError } from '@/lib/api/errors';
import { useAgreement, useAcceptAgreement } from '@/features/vendor';
import { useArtworkSpec, useUploadArtwork } from '../../hooks/usePostcards';
import type { PostcardAsset } from '../../types';

export function ArtworkStep({
  businessId,
  sku,
  currentAssetId,
  busy,
  onConfirm,
}: {
  businessId: string;
  sku: string;
  currentAssetId: string | null;
  busy: boolean;
  onConfirm: (assetId: string) => void;
}) {
  const spec = useArtworkSpec(sku);
  const upload = useUploadArtwork(businessId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [asset, setAsset] = useState<PostcardAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * R28 clickwrap, same shape as go-live in LiveStatusControl.
   *
   * `artwork.service.ts` refuses to issue an upload URL until `postcard_artwork` has been accepted,
   * and nothing in the app offered it — so every upload failed with "You must accept the current
   * Postcard Artwork & Acceptable Use before continuing" and there was no way to accept. Enforced,
   * never offered: the mirror image of the "stored but never enforced" defects the audit found.
   *
   * Surfaced on AGREEMENT_REQUIRED rather than fetched up front, so a vendor who has already
   * accepted never sees a wall of terms they have signed once.
   */
  const [needsAgreement, setNeedsAgreement] = useState(false);
  const agreement = useAgreement('postcard_artwork', needsAgreement);
  const acceptAgreement = useAcceptAgreement('postcard_artwork');
  /** Held so accepting can retry the exact file the vendor already chose. */
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    setError(null);
    setAsset(null);
    try {
      setAsset(await upload.mutateAsync({ file, sku }));
      setPendingFile(null);
    } catch (err) {
      if (err instanceof AppApiError && err.code === 'AGREEMENT_REQUIRED') {
        // Not an upload failure — a missing signature. Keep the file so accepting can finish the job.
        setPendingFile(file);
        setNeedsAgreement(true);
        return;
      }
      setError(err instanceof AppApiError ? err.message : 'That upload did not finish. Try again.');
    }
  }

  /** Accept the exact version + hash shown, then complete the upload the vendor already started. */
  const acceptAndUpload = () => {
    const a = agreement.data;
    acceptAgreement.mutate(a ? { version: a.version, contentHash: a.contentHash } : undefined, {
      onSuccess: () => {
        setNeedsAgreement(false);
        const file = pendingFile;
        setPendingFile(null);
        if (file) void handleFile(file);
      },
      onError: (e) =>
        setError(e instanceof AppApiError ? e.message : 'Could not record your acceptance.'),
    });
  };

  const s = spec.data;
  const passed = asset?.prepressStatus === 'passed';

  return (
    <section aria-labelledby="pc-art-heading">
      <Heading id="pc-art-heading">Upload your design</Heading>

      {s ? (
        <SpecCard>
          <SpecTitle>What we need</SpecTitle>
          <SpecList>
            <li>
              <strong>Front only.</strong> The address side is set up for you.
            </li>
            <li>
              <strong>
                {s.recommendedWidthPx.toLocaleString()} × {s.recommendedHeightPx.toLocaleString()}{' '}
                pixels
              </strong>{' '}
              or larger — that is {s.fullWidthIn}″ × {s.fullHeightIn}″ at {s.targetDpi} DPI,
              including a {s.bleedIn}″ margin that gets trimmed off.
            </li>
            <li>
              Keep text at least {s.safeAreaIn}″ inside the edge, or the cutter may catch it.
            </li>
            <li>JPG, PNG or PDF. A print-ready PDF is best.</li>
          </SpecList>
          <SpecLink href={s.templatesUrl} target="_blank" rel="noreferrer noopener">
            Download our printer&rsquo;s templates
          </SpecLink>
        </SpecCard>
      ) : null}

      <UploadRow>
        <HiddenInput
          ref={inputRef}
          id="pc-artwork-file"
          type="file"
          /**
           * The input is visually hidden but still in the accessibility tree — deliberately, so it
           * stays reachable — which means it needs its own name. Caught by axe: without this it is
           * an unlabelled control that a screen-reader user meets as "file, button".
           */
          aria-label="Choose your postcard design file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          loading={upload.isPending}
          disabled={upload.isPending}
        >
          {asset ? 'Choose a different file' : 'Choose a file'}
        </Button>
        {upload.isPending ? <Muted role="status">Checking your file…</Muted> : null}
      </UploadRow>

      {error ? (
        <Banner tone="danger" title="Upload failed">
          {error}
        </Banner>
      ) : null}

      {/*
        Shown only when the server asks for it. Presenting the exact version and hash the vendor
        reads is the point of the clickwrap — acceptance attests to what was on screen, so it stays
        tamper-evident server-side rather than being a bare "I agree" flag.
      */}
      {needsAgreement ? (
        <Agreement>
          <AgreementTitle>
            {agreement.data?.title ?? 'Postcard Artwork & Acceptable Use'}
          </AgreementTitle>
          <AgreementBody>
            {agreement.isLoading ? 'Loading the current terms…' : agreement.data?.body}
          </AgreementBody>
          <AgreementActions>
            <Button
              size="compact"
              variant="secondary"
              onClick={() => {
                setNeedsAgreement(false);
                setPendingFile(null);
              }}
            >
              Not now
            </Button>
            <Button
              size="compact"
              loading={acceptAgreement.isPending || upload.isPending}
              disabled={!agreement.data}
              onClick={acceptAndUpload}
            >
              Agree and upload
            </Button>
          </AgreementActions>
        </Agreement>
      ) : null}

      {/**
       * Findings live in a `role="status"` region so they are announced on arrival — the whole
       * point of this step is that the buyer notices a problem now rather than later.
       */}
      <div role="status">
        {asset?.errors.length ? (
          <Banner tone="danger" title="This file needs fixing before we can print it">
            <Findings>
              {asset.errors.map((f) => (
                <li key={f.code}>{f.message}</li>
              ))}
            </Findings>
          </Banner>
        ) : null}

        {asset?.warnings.length ? (
          <Banner tone="warning" title="Worth checking before you continue">
            <Findings>
              {asset.warnings.map((f) => (
                <li key={f.code}>{f.message}</li>
              ))}
            </Findings>
          </Banner>
        ) : null}

        {passed && !asset?.errors.length ? (
          <Banner tone="success" title="This file is ready to print">
            {asset?.effectiveDpi
              ? `We measured it at about ${asset.effectiveDpi} DPI at postcard size.`
              : 'Your PDF is the right size for this postcard.'}
          </Banner>
        ) : null}
      </div>

      <Banner tone="info" title="A person checks every design">
        Before anything is printed, someone here reviews your artwork. It is a quick check that we
        can legally print and post it — not an opinion on your design. If it is turned down you are
        refunded in full.
      </Banner>

      <Actions>
        <Button
          onClick={() => asset && onConfirm(asset.id)}
          disabled={!passed || busy}
          loading={busy}
        >
          Use this design
        </Button>
      </Actions>

      {currentAssetId && !asset ? (
        <Muted>A design is already attached to this order. Uploading replaces it.</Muted>
      ) : null}
    </section>
  );
}

const Heading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[3]}px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[3]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const SpecCard = styled.div`
  padding: ${({ theme }) => theme.space[4]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const SpecTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[2]}px;
  font-size: ${({ theme }) => theme.typography.scale[2]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const SpecList = styled.ul`
  margin: 0 0 ${({ theme }) => theme.space[3]}px;
  padding-left: ${({ theme }) => theme.space[4]}px;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
  line-height: ${({ theme }) => theme.typography.lineBody};

  li + li {
    margin-top: ${({ theme }) => theme.space[1]}px;
  }
`;

const SpecLink = styled.a`
  color: ${({ theme }) => theme.color.accentPrimary};
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
`;

/**
 * `flex-wrap` + `min-width: 0`: the row holds the file picker and the chosen file's name, and a
 * camera-generated name is both long and unbreakable. Without these the name refuses to wrap and
 * drags the page's width with it.
 */
const UploadRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;

  > * {
    min-width: 0;
  }
`;

/** Hidden but focusable and labelled — never `display: none`, which removes it from the a11y tree. */
const HiddenInput = styled.input`
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
`;

const Findings = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.space[4]}px;
  /* Findings quote file names and dimensions — long tokens with nothing to break on. */
  overflow-wrap: anywhere;

  li + li {
    margin-top: ${({ theme }) => theme.space[1]}px;
  }
`;

/**
 * The terms are long and the page is a wizard step, so the body scrolls inside a fixed height
 * rather than pushing the actions off screen. `overflow-wrap` because a placeholder legal body
 * contains long unbroken tokens.
 */
const Agreement = styled.div`
  margin-top: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  min-width: 0;
`;
const AgreementTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[2]}px;
  font-size: ${({ theme }) => theme.typography.scale[2]}px;
`;
const AgreementBody = styled.pre`
  margin: 0;
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: inherit;
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const AgreementActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[3]}px;
`;

const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.space[4]}px;
`;
