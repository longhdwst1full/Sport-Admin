import type { ThemeConfig } from 'antd';

export const ADMIN_THEME: ThemeConfig = {
  token: {
    colorPrimary: '#006c5b',
    colorInfo: '#00bad1',
    colorSuccess: '#28c76f',
    colorWarning: '#ff9f43',
    colorError: '#ff4c51',
    colorText: '#434050',
    colorTextSecondary: '#6d6b77',
    colorBorder: '#dddde3',
    colorBgLayout: '#f8f7fa',
    borderRadius: 12,
    fontFamily: "'Noto Sans', system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
  components: {
    Layout: { headerBg: '#ffffff', siderBg: '#003129', bodyBg: '#f8f7fa' },
    Table: { headerBg: '#f8f7fa', rowHoverBg: '#ebf1ff' },
  },
};
