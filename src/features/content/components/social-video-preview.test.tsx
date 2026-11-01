// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialVideoPreview } from './social-video-preview';

const mocks = vi.hoisted(() => ({ useGetAdminMediaAsset: vi.fn() }));

vi.mock('@/generated/api/media/media', () => ({
  useGetAdminMediaAsset: mocks.useGetAdminMediaAsset,
}));

describe('SocialVideoPreview', () => {
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
