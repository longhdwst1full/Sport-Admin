import { lazy } from 'react';

// Mỗi trang là một chunk lazy riêng: barrel gom nhiều trang, export tĩnh sẽ dồn cả nhóm vào một chunk.
export const BannersPage = lazy(() =>
  import('./pages/banners-page').then((module) => ({ default: module.BannersPage })),
);
export const ContentPage = lazy(() =>
  import('./pages/content-page').then((module) => ({ default: module.ContentPage })),
);
export const SocialDashboardPage = lazy(() =>
  import('./pages/social-dashboard-page').then((module) => ({
    default: module.SocialDashboardPage,
  })),
);
export const TikTokCallbackPage = lazy(() =>
  import('./pages/tiktok-callback-page').then((module) => ({
    default: module.TikTokCallbackPage,
  })),
);
