'use client';

/**
 * A square product-photo picker: choose → crop/downscale locally → presigned PUT to R2 → hand the
 * public URL back. Owns its own busy + error state so a failed upload never blocks the form it
 * sits in; a photo is always an enhancement to a working flow, never a prerequisite.
 */
import { useRef, useState, useId } from 'react';
import styled from 'styled-components';
import { Camera, Loader2, X } from 'lucide-react';
import { uploadImage } from '@/lib/upload';
import { prepareProductPhoto } from '@/lib/image';

export function PhotoPicker({
  value,
  onChange,
  size = 64,
  label = 'Add a photo',
}: {
  value?: string;
  /** null = the vendor removed the photo. */
  onChange: (url: string | null) => void;
  size?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const errorId = useId();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    setBusy(true);
    try {
      // Crop + downscale BEFORE upload: a raw phone photo is 3–12MB and would be rejected.
      const prepared = await prepareProductPhoto(file);
      const { url } = await uploadImage(prepared, 'menu-item');
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      // Let the same file be re-picked after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Wrap>
      <Tile
        type="button"
        $size={size}
        $hasImage={Boolean(value)}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={value ? 'Replace photo' : label}
        aria-describedby={error ? errorId : undefined}
      >
        {busy ? (
          <Spinner size={18} aria-hidden />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Thumb src={value} alt="" />
        ) : (
          <Camera size={18} aria-hidden />
        )}
      </Tile>

      {value && !busy ? (
        <Remove type="button" onClick={() => onChange(null)} aria-label="Remove photo">
          <X size={12} aria-hidden />
        </Remove>
      ) : null}

      <HiddenInput
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={(e) => void pick(e.target.files?.[0])}
        tabIndex={-1}
      />
      {error ? <ErrorText id={errorId}>{error}</ErrorText> : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  position: relative;
  display: inline-grid;
  justify-items: center;
`;
const Tile = styled.button<{ $size: number; $hasImage: boolean }>`
  display: grid;
  place-items: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: none;
  overflow: hidden;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: ${({ $hasImage, theme }) =>
    $hasImage ? `1px solid ${theme.color.line}` : `1px dashed ${theme.color.line2}`};
  color: ${({ theme }) => theme.color.textTertiary};
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.color.accentSecondary};
    color: ${({ theme }) => theme.color.textSecondary};
  }
  &:disabled {
    cursor: default;
  }
`;
const Thumb = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
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
/** NOT `Error` — that would shadow the global constructor and break `e instanceof Error` above. */
const ErrorText = styled.p`
  margin-top: 4px;
  max-width: 160px;
  font-size: 11px;
  text-align: center;
  color: ${({ theme }) => theme.color.statusDanger};
`;
