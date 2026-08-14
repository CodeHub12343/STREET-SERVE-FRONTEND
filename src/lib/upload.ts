/**
 * Image upload via the backend's presigned R2 flow (DATA_FETCHING_STRATEGY.md §7):
 *   1. POST /storage/upload-url { contentType, purpose } → { uploadUrl, fileKey, publicUrl }
 *   2. PUT the raw file directly to uploadUrl (never through our API)
 *   3. return the fileKey/publicUrl to attach to the domain resource
 * Client-side type/size validation happens before requesting a URL.
 */
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export interface PresignResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl?: string;
}

export type UploadPurpose =
  | 'avatar'
  | 'business-cover'
  | 'business-logo'
  | 'menu-item'
  | 'condition'
  | 'evidence'
  | 'license';

/**
 * The backend's storage `purpose` vocabulary (see storage.routes.ts UploadUrlBody). It differs
 * from the frontend's UI-oriented names, so map before sending — `purpose` is `.strict()`-validated
 * server-side and only controls the storage key prefix.
 */
const PURPOSE_MAP: Record<UploadPurpose, string> = {
  avatar: 'profile',
  'business-cover': 'product_photo',
  'business-logo': 'product_photo',
  'menu-item': 'product_photo',
  condition: 'condition_photo',
  evidence: 'dispute_evidence',
  license: 'proof',
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
// The server's allow-list also includes image/heic, but a canvas can't encode it, so anything
// that goes through prepareProductPhoto() lands here as webp/jpeg regardless.
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadImage(
  file: File,
  purpose: UploadPurpose,
): Promise<{ fileKey: string; url: string }> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Please use a JPG, PNG, or WebP image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be under 8MB.');
  }

  const presign = await api.post<PresignResponse>(endpoints.uploadUrl, {
    contentType: file.type,
    purpose: PURPOSE_MAP[purpose],
  });

  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) throw new Error('Upload failed. Please try again.');

  return { fileKey: presign.fileKey, url: presign.publicUrl ?? presign.fileKey };
}
