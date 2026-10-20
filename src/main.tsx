import React from 'react';
import ReactDOM from 'react-dom/client';
// Thân chữ: Be Vietnam Pro 400-700, subset latin + vietnamese, chỉ woff2 (xem fonts.css).
import './fonts.css';
import { App } from './app/app';
import { Providers } from './app/providers';
import 'antd/dist/reset.css';
import './styles.css';

// Sau mỗi lần deploy, tab đang mở còn trỏ tới chunk cũ đã bị xoá: tải lại MỘT lần để lấy bản mới thay vì
// rơi vào màn lỗi. Cờ sessionStorage: mỗi tab chỉ tự tải lại MỘT lần, không lặp nếu chunk vẫn lỗi.
const PRELOAD_RELOAD_KEY = 'dctd-admin:preload-reload';
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem(PRELOAD_RELOAD_KEY)) return;
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
