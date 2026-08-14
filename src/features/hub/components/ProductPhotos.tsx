'use client';

/**
 * Multi-photo picker for hub product listings: pick several → each is cropped/downscaled locally
 * (prepareProductPhoto) → presigned PUT to R2 → public URLs handed back in order. Upload state is
 * owned here so a failed photo never blocks the add-product form — photos are an enhancement,
 * never a prerequisite (same contract as the vendor PhotoPicker).
 */
import { useRef, useState, useId } from 'react';
import styled from 'styled-components';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadImage } from '@/lib/upload';
import { prepareProductPhoto } from '@/lib/image';
import { isMapDemo } from '@/lib/env';

const MAX_PHOTOS = 6;

export function ProductPhotos({
  value,
  onChange,
  max = MAX_PHOTOS,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string>();
  const errorId = useId();

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const slots = max - value.length;
    const batch = Array.from(files).slice(0, slots);
    if (files.length > slots) setError(`Up to ${max} photos per product`);
    else setError(undefined);
    setPending(batch.length);
    // Demo mode: no storage backend — preview via local object URLs so the flow stays testable.
    if (isMapDemo) {
      onChange([...value, ...batch.map((f) => URL.createObjectURL(f))]);
      setPending(0);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const uploaded: string[] = [];
    for (const file of batch) {
      try {
        const prepared = await prepareProductPhoto(file);
        const { url } = await uploadImage(prepared, 'menu-item');
        uploaded.push(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
      }
      setPending((n) => n - 1);
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
    // Let the same files be re-picked after a failure.
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <Wrap role="group" aria-label="Product photos">
      <Row>
        {value.map((url, i) => (
          <Cell key={url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Thumb src={url} alt={`Product photo ${i + 1}`} />
            <Remove type="button" onClick={() => remove(url)} aria-label={`Remove photo ${i + 1}`}>
              <X size={12} aria-hidden />
            </Remove>
          </Cell>
        ))}
        {Array.from({ length: pending }).map((_, i) => (
          <Cell key={`pending-${i}`} aria-hidden>
            <Busy><Spinner size={16} /></Busy>
          </Cell>
        ))}
        {value.length + pending < max ? (
          <AddTile
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending > 0}
            aria-label={value.length ? 'Add more photos' : 'Add photos'}
            aria-describedby={error ? errorId : undefined}
          >
            <ImagePlus size={18} aria-hidden />
          </AddTile>
        ) : null}
      </Row>
      <Hint>{value.length ? `${value.length}/${max} photos — first is the cover` : `Add up to ${max} photos (optional)`}</Hint>
      <HiddenInput
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={(e) => void pick(e.target.files)}
        tabIndex={-1}
      />
      {error ? <ErrorText id={errorId}>{error}</ErrorText> : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: 4px;
`;
const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Cell = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  flex: none;
`;
const Thumb = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Busy = styled.div`
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textTertiary};
`;
const AddTile = styled.button`
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  flex: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textTertiary};
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.accentSecondary};
    color: ${({ theme }) => theme.color.textSecondary};
  }
  &:disabled {
    cursor: default;
  }
`;
const Spinner = styled(Loader2)`
  animation: spin 0.9s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2.4s;
  }
`;
const Remove = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  &:hover {
    color: ${({ theme }) => theme.color.statusDanger};
    border-color: ${({ theme }) => theme.color.statusDanger};
  }
`;
const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;
const Hint = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
/** NOT `Error` — that would shadow the global constructor used in the catch above. */
const ErrorText = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.statusDanger};
`;
