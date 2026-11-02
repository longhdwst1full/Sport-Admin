// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialVideoPreview } from './social-video-preview';

const mocks = vi.hoisted(() => ({ useGetAdminMediaAsset: vi.fn() }));

vi.mock('@/generated/api/media/media', () => ({
  useGetAdminMediaAsset: mocks.useGetAdminMediaAsset,
}));

describe('SocialVideoPreview', () => {
  it('opens Facebook without requesting or playing a cleaned source', () => {
    render(<SocialVideoPreview assetId="12" publishedUrl="https://www.facebook.com/reel/123/" title="Video đã đăng" />);
    fireEvent.click(screen.getByRole('button', { name: 'Video đã đăng' }));
    expect(screen.getByRole('link', { name: 'Xem trên Facebook' }).getAttribute('href')).toBe('https://www.facebook.com/reel/123/');
    expect(document.querySelector('video')).toBeNull();
    expect(mocks.useGetAdminMediaAsset).toHaveBeenLastCalledWith('12', expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }));
  });

  it('does not render an untrusted published link', () => {
    render(<SocialVideoPreview assetId="12" publishedUrl="https://facebook.com.evil.example/reel/123" title="Video" />);
    fireEvent.click(screen.getByRole('button', { name: 'Video' }));
    expect(screen.queryByRole('link', { name: 'Xem trên Facebook' })).toBeNull();
  });
  it('shows a useful message when the stored video source is no longer playable', () => {
    render(<SocialVideoPreview assetId="12" videoUrl="https://res.cloudinary.com/demo/missing.mp4" title="Xem video lỗi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem video lỗi' }));
    fireEvent.error(document.querySelector('video')!);
    expect(screen.getByText('Không phát được video nguồn')).toBeTruthy();
    expect(document.querySelector('video')).toBeNull();
  });
  afterEach(cleanup);

  beforeEach(() => {
    mocks.useGetAdminMediaAsset.mockReset();
    mocks.useGetAdminMediaAsset.mockReturnValue({
      data: { secureUrl: 'https://cdn.example/video.mp4' },
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('only enables the media detail request after the preview is opened', () => {
    render(<SocialVideoPreview assetId="12" posterUrl="https://cdn.example/poster.jpg" title="Xem video" />);

    expect(mocks.useGetAdminMediaAsset).toHaveBeenLastCalledWith(
      '12',
      expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xem video' }));

    expect(mocks.useGetAdminMediaAsset).toHaveBeenLastCalledWith(
      '12',
      expect.objectContaining({ query: expect.objectContaining({ enabled: true }) }),
    );
    expect(document.querySelector('video')?.getAttribute('src')).toBe('https://cdn.example/video.mp4');
  });

  it('uses the video URL already present in the detail DTO without enabling another request', () => {
    render(
      <SocialVideoPreview
        assetId="12"
        videoUrl="https://cdn.example/detail-video.mp4"
        posterUrl="https://cdn.example/poster.jpg"
        title="Xem lại video"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xem lại video' }));

    expect(mocks.useGetAdminMediaAsset).toHaveBeenLastCalledWith(
      '12',
      expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }),
    );
    expect(document.querySelector('video')?.getAttribute('src')).toBe('https://cdn.example/detail-video.mp4');
  });
});
