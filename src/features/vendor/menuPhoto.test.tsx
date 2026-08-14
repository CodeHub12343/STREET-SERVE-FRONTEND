import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { darkTheme } from '@/styles/theme';
import { PhotoPicker } from './components/PhotoPicker';

/**
 * Product photos (menu/catalog). The load-bearing behaviour is that a raw phone photo — 3–12MB,
 * which uploadImage() would reject outright — is downscaled BEFORE it reaches the uploader, and
 * that a failed upload never blocks the form the picker sits in.
 */

const uploadImage = vi.hoisted(() => vi.fn());
const prepareProductPhoto = vi.hoisted(() => vi.fn());
vi.mock('@/lib/upload', () => ({ uploadImage }));
vi.mock('@/lib/image', () => ({ prepareProductPhoto }));

/**
 * The file input is visually hidden with `pointer-events: none` on purpose — the user clicks the
 * tile, which forwards to it — so userEvent's pointer-events check has to be off to reach it.
 */
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

function ui(props: Partial<React.ComponentProps<typeof PhotoPicker>> = {}) {
  return (
    <ThemeProvider theme={darkTheme}>
      <PhotoPicker onChange={props.onChange ?? vi.fn()} {...props} />
    </ThemeProvider>
  );
}

/** Stands in for a phone camera shot: far over uploadImage()'s 8MB ceiling. */
function hugePhoto() {
  const file = new File(['x'], 'IMG_4021.HEIC', { type: 'image/heic' });
  Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
  return file;
}

const prepared = new File(['small'], 'photo.webp', { type: 'image/webp' });

beforeEach(() => {
  vi.clearAllMocks();
  prepareProductPhoto.mockResolvedValue(prepared);
  uploadImage.mockResolvedValue({ fileKey: 'product_photo/k', url: 'https://cdn.test/p.webp' });
});

describe('picking a product photo', () => {
  it('downscales before uploading — the raw phone photo never reaches the uploader', async () => {
    const user = setup();
    render(ui());

    await user.upload(document.querySelector('input[type="file"]')!, hugePhoto());

    await waitFor(() => expect(uploadImage).toHaveBeenCalled());
    // The uploader must receive the PREPARED file. Handing it the 11MB original is exactly how
    // this feature fails at the curb: "Image must be under 8MB."
    expect(uploadImage).toHaveBeenCalledWith(prepared, 'menu-item');
    expect(prepareProductPhoto).toHaveBeenCalled();
    expect(prepareProductPhoto.mock.calls[0]?.[0].size).toBe(11 * 1024 * 1024);
  });

  it('hands the public URL back to the form', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(ui({ onChange }));

    await user.upload(document.querySelector('input[type="file"]')!, hugePhoto());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn.test/p.webp'));
  });

  it('reports a failed upload without losing the form', async () => {
    const user = setup();
    const onChange = vi.fn();
    uploadImage.mockRejectedValue(new Error('Upload failed. Please try again.'));
    render(ui({ onChange }));

    await user.upload(document.querySelector('input[type="file"]')!, hugePhoto());

    expect(await screen.findByText('Upload failed. Please try again.')).toBeInTheDocument();
    // A photo is an enhancement — a failed one must not push a URL into the item.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('surfaces an unreadable image as a message, not a crash', async () => {
    const user = setup();
    prepareProductPhoto.mockRejectedValue(new Error('Could not read that image.'));
    render(ui());

    await user.upload(document.querySelector('input[type="file"]')!, hugePhoto());

    expect(await screen.findByText('Could not read that image.')).toBeInTheDocument();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('removing a photo reports null — distinct from never having one', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(ui({ value: 'https://cdn.test/existing.webp', onChange }));

    await user.click(screen.getByRole('button', { name: 'Remove photo' }));

    // null is what tells the backend to clear it; undefined would mean "leave it alone".
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('offers replace rather than add once a photo exists', () => {
    render(ui({ value: 'https://cdn.test/existing.webp' }));
    expect(screen.getByRole('button', { name: 'Replace photo' })).toBeInTheDocument();
  });
});
