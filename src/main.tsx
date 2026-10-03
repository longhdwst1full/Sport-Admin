import React from 'react';
import ReactDOM from 'react-dom/client';
// Thân chữ: Be Vietnam Pro. Admin dày chữ nên nạp đủ 400-700.
// File `<weight>.css` chứa đủ latin + latin-ext + vietnamese kèm `unicode-range`: chỉ nạp subset
// `vietnamese` thì chữ Latin thường (a-z, số) rơi về font khác và một dòng chữ bị lẫn hai font.
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
// Tiêu đề màn hình và số liệu thống kê.
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/noto-sans/vietnamese-400.css';
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
