import { lazy } from 'react';

// Mỗi trang là một chunk lazy riêng: barrel gom nhiều trang, export tĩnh sẽ dồn cả nhóm vào một chunk.
export const AttributesPage = lazy(() =>
  import('./pages/attributes-page').then((module) => ({ default: module.AttributesPage })),
);
export const BrandsPage = lazy(() =>
  import('./pages/brands-page').then((module) => ({ default: module.BrandsPage })),
);
export const CategoriesPage = lazy(() =>
  import('./pages/categories-page').then((module) => ({ default: module.CategoriesPage })),
);
