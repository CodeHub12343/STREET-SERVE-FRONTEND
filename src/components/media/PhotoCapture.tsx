'use client';

/**
 * PhotoCapture (docs/06 §2.6g, DATA_FETCHING_STRATEGY.md §7) — condition/evidence photo capture.
 * On mobile the file input opens the camera; captured images upload via the presigned R2 flow. In
 * demo mode it previews locally without a backend. Reports the attachable URL/key per photo.
 */
import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';
import { uploadImage, type UploadPurpose } from '@/lib/upload';
import { isMapDemo } from '@/lib/env';

export function PhotoCapture({
  purpose,
  onChange,
  label = 'Add photo',
  max = 3,
}: {
  purpose: UploadPurpose;
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}) {
  const { show } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const add = async (file: File | undefined) => {
    if (!file || photos.length >= max) return;
    setBusy(true);
    try {
      const url = isMapDemo ? URL.createObjectURL(file) : (await uploadImage(file, purpose)).url;
      const next = [...photos, url];
      setPhotos(next);
      onChange(next);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not add photo', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const remove = (url: string) => {
    const next = photos.filter((p) => p !== url);
    setPhotos(next);
    onChange(next);
  };

  return (
    <Wrap>
      <Grid>
        {photos.map((url) => (
          <Thumb key={url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Captured" />
            <Remove type="button" aria-label="Remove photo" onClick={() => remove(url)}>
              <X size={12} />
            </Remove>
          </Thumb>
        ))}
        {photos.length < max ? (
          <Button variant="secondary" size="compact" loading={busy} onClick={() => inputRef.current?.click()}>
            <Camera size={16} /> {label}
          </Button>
        ) : null}
      </Grid>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void add(e.target.files?.[0])}
      />
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
  align-items: center;
`;
const Thumb = styled.div`
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
const Remove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
`;
