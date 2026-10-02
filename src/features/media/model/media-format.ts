import type { MediaAssetSummaryDto } from '@/generated/api/media/media.schemas';

/** "1200×800 · 245 KB"; trường nào provider không trả thì bỏ qua. */
export function formatAssetSize(asset: Pick<MediaAssetSummaryDto, 'width' | 'height' | 'sizeBytes'>): string {
  const parts: string[] = [];
  if (asset.width && asset.height) parts.push(`${asset.width}×${asset.height}`);
  if (asset.sizeBytes !== null && asset.sizeBytes !== undefined) {
    parts.push(asset.sizeBytes >= 1024 * 1024
      ? `${(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(asset.sizeBytes / 1024))} KB`);
  }
  return parts.join(' · ') || '—';
}
