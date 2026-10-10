import React from 'react';
import ReactDOM from 'react-dom/client';
// Thân chữ: Be Vietnam Pro 400-700, subset latin + vietnamese, chỉ woff2 (xem fonts.css).
import './fonts.css';
import { App } from './app/app';
import { Providers } from './app/providers';
import 'antd/dist/reset.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
