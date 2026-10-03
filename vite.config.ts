import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';

import type { Rollup } from 'vite';

type ManualChunkMeta = Rollup.ManualChunkMeta;

/**
 * Lõi antd mà mọi trang đều cần: ConfigProvider/theme/App (message, modal), hệ CSS-in-JS, bảng màu
 * và khung icon. Code từng component (Table, Form, DatePicker...) KHÔNG nằm ở đây — để Rollup tự
 * chia theo route lazy, trang /login không phải tải Table hay DatePicker.
 */
const ANTD_CORE_ROOTS = [
  /\/antd\/es\/(config-provider|theme|app|locale|_util|style|version)\//,
  /\/@ant-design\/(cssinjs|cssinjs-utils|colors|fast-color)\//,
  /\/@ant-design\/icons\/es\/(components|utils\.js|index\.js)/,
];

let antdCore: Set<string> | undefined;

/**
 * Chunk lõi phải ĐÓNG theo import tĩnh: mọi module mà lõi import cũng nằm trong lõi. Nếu lõi import
 * ngược sang một chunk khác đang import lõi, hai chunk tạo vòng và thứ tự khởi tạo không còn bảo đảm.
 *
 * Đó chính là lỗi cũ: tách `@ant-design/icons` khỏi antd tạo vòng (antd → icons → colors → antd);
 * chunk icons chạy trước, `blue` của `@ant-design/colors` chưa khởi tạo và
 * `setTwoToneColor(blue.primary)` ở cấp module ném "Cannot read properties of undefined (reading
 * 'primary')" — trang trắng ngay khi tải. Lấy bao đóng (thay vì liệt kê tay tên gói) giữ icons-base,
 * colors và config-provider cùng một chunk, còn từng icon/component chỉ import một chiều vào lõi.
 */
function collectAntdCore(meta: ManualChunkMeta): Set<string> {
  if (antdCore) return antdCore;
  const core = new Set<string>();
  const stack = Array.from(meta.getModuleIds()).filter((id) =>
    ANTD_CORE_ROOTS.some((root) => root.test(id)),
  );
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (core.has(id) || !id.includes('node_modules') || reactChunk(id)) continue;
    core.add(id);
    stack.push(...(meta.getModuleInfo(id)?.importedIds ?? []));
  }
  antdCore = core;
  return core;
}

function reactChunk(id: string): boolean {
  return (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('react-router') ||
    id.includes('/scheduler/')
  );
}

function vendorChunk(id: string, meta: ManualChunkMeta): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('ckeditor4-react') || id.includes('ckeditor4-integrations-common')) {
    return 'vendor-editor';
  }
  if (reactChunk(id)) return 'vendor-react';
  if (collectAntdCore(meta).has(id)) return 'vendor-antd-core';
  if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
    return 'vendor-charts';
  }
  if (
    id.includes('@reduxjs') ||
    id.includes('react-redux') ||
    id.includes('redux-saga') ||
    id.includes('@tanstack')
  ) {
    return 'vendor-state';
  }
  if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/yup/')) {
    return 'vendor-forms';
  }
  if (id.includes('/axios/')) return 'vendor-http';
  return undefined;
}

export default {
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5173 },
  // Vitest chỉ chạy unit test trong `src`. Spec trong `e2e/` do Playwright chạy,
  // để mặc định vitest sẽ gom nhầm và fail vì thiếu runtime trình duyệt.
  test: { include: ['src/**/*.{test,spec}.{ts,tsx}'] },
  build: {
    rollupOptions: { output: { manualChunks: vendorChunk } },
  },
};
