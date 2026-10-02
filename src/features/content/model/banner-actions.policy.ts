import { BannerStatus } from '@/generated/api/content/content.schemas';

export type BannerAction = 'publish' | 'unpublish' | 'archive';

/** Trạng thái đích của từng hành động (`setAdminBannerStatus`). */
export const BANNER_ACTION_TARGET: Record<BannerAction, BannerStatus> = {
  publish: BannerStatus.PUBLISHED,
  unpublish: BannerStatus.DRAFT,
  archive: BannerStatus.ARCHIVED,
};

/**
 * Vòng đời API: DRAFT ↔ PUBLISHED, mọi trạng thái → ARCHIVED (cuối). PERMISSION: chỉ là affordance;
 * API vẫn trả 409 CMS_BANNER_ARCHIVED/VERSION_STALE nếu hai bên lệch.
 */
export function availableBannerActions(status: BannerStatus): BannerAction[] {
  switch (status) {
    case BannerStatus.DRAFT:
      return ['publish', 'archive'];
    case BannerStatus.PUBLISHED:
      return ['unpublish', 'archive'];
    default:
      return [];
  }
}
