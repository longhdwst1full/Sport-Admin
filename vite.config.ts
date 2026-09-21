import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';

function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('ckeditor4-react') || id.includes('ckeditor4-integrations-common')) {
    return 'vendor-editor';
  }
  // antd là thư viện lớn nhất trong ứng dụng. Không tách ra thì nó nằm chung `index.js` với toàn bộ
  // mã nghiệp vụ, nên mỗi lần deploy đổi một dòng code là người dùng tải lại cả thư viện.
  //
  // `@ant-design/icons` PHẢI nằm chung chunk với `@ant-design/colors` và `antd`. Tách riêng sẽ tạo
  // vòng import giữa hai chunk (antd → icons → colors → antd); khi đó chunk icons được chạy trước,
  // `blue` từ `@ant-design/colors` chưa được khởi tạo và dòng `setTwoToneColor(blue.primary)` chạy
  // ở cấp module ném "Cannot read properties of undefined (reading 'primary')" — trang trắng ngay
  // khi tải. Kích thước tiết kiệm được không đáng để đánh đổi.
  if (id.includes('/antd/') || id.includes('@ant-design/') || id.includes('rc-')) {
    return 'vendor-antd';
  }
  if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
    return 'vendor-charts';
  }
  if (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('react-router') ||
    id.includes('/scheduler/')
  ) {
    return 'vendor-react';
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
