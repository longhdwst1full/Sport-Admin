import type { ThemeConfig } from 'antd';

/**
 * Theme Ant Design của Admin — bảng màu đĩa tạ, chung với Storefront.
 *
 * Giá trị phải khớp `src/styles.css` (khối `--ba-*`). antd không đọc được biến CSS
 * trong token nên chỗ này buộc phải là hex; đổi một bên thì đổi cả hai.
 *
 * Xanh #1b54b8 lo hành động. Vàng đĩa tạ KHÔNG xuất hiện ở đây: nó dành riêng cho
 * giá bán ở Storefront, dùng cho nút bấm là làm loãng tín hiệu giá.
 * Vẫn giữ triết lý cũ: desktop-first, cỡ gọn, mật độ thông tin cao.
 */
export const ADMIN_THEME: ThemeConfig = {
  token: {
    // ── Brand & semantic colors ─────────────────────────────
    colorPrimary: '#1b54b8',
    colorInfo: '#3c72d2',
    colorSuccess: '#2e7d4f',
    colorWarning: '#e07b02',
    colorError: '#c62828',
    colorLink: '#1b54b8',

    // ── Typography ──────────────────────────────────────────
    colorText: '#1b1f24',
    colorTextSecondary: '#5a626c',
    colorTextTertiary: '#7c848f',
    colorTextQuaternary: '#a6adb6',

    // ── Borders & backgrounds ───────────────────────────────
    colorBorder: '#cbd0d6',
    colorBorderSecondary: '#e0e3e6',
    colorBgLayout: '#e9ebec',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#14171b',

    // ── Shape (Compact ERP aesthetic) ───────────────────────
    borderRadius: 4,
    borderRadiusLG: 4,
    borderRadiusSM: 2,
    borderRadiusXS: 2,

    // ── Sizing (High density) ────────────────────────────────
    controlHeight: 34,
    controlHeightLG: 40,
    controlHeightSM: 28,
    fontSize: 13,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 15,
    fontSizeHeading5: 13,
    fontSizeLG: 15,
    fontSizeSM: 12,

    // ── Shadows ─────────────────────────────────────────────
    boxShadow: '0 1px 2px rgba(20, 23, 27, 0.08)',
    boxShadowSecondary: '0 12px 32px -8px rgba(20, 23, 27, 0.28)',

    // ── Typography ──────────────────────────────────────────
    fontFamily:
      "'Be Vietnam Pro', 'Noto Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  },

  components: {
    // ── Layout shell ────────────────────────────────────────
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#14171b',
      bodyBg: '#e9ebec',
      headerPadding: '0 12px',
      headerHeight: 44,
    },

    // ── Cards ───────────────────────────────────────────────
    Card: {
      borderRadiusLG: 4,
      paddingLG: 16,
    },

    // ── Tables (Compact ERP padding) ────────────────────────
    Table: {
      headerBg: '#eff1f2',
      headerColor: '#5a626c',
      headerSplitColor: '#e0e3e6',
      rowHoverBg: '#eff1f2',
      borderColor: '#e0e3e6',
      cellPaddingBlock: 8,
      cellPaddingInline: 10,
      fontSize: 12.5,
    },

    // ── Buttons ─────────────────────────────────────────────
    Button: {
      primaryShadow: 'none',
      defaultBorderColor: '#cbd0d6',
      borderRadiusSM: 2,
      controlHeight: 34,
      controlHeightSM: 28,
    },

    // ── Menu ────────────────────────────────────────────────
    Menu: {
      itemBorderRadius: 2,
      itemMarginInline: 6,
      itemMarginBlock: 2,
      subMenuItemBg: 'transparent',
      itemSelectedBg: 'rgba(27, 84, 184, 0.18)',
      itemSelectedColor: '#6e99e2',
      itemHoverBg: 'rgba(255, 255, 255, 0.06)',
      itemActiveBg: 'rgba(27, 84, 184, 0.24)',
      groupTitleColor: '#7c848f',
      groupTitleFontSize: 10.5,
    },

    // ── Inputs ──────────────────────────────────────────────
    Input: {
      activeBorderColor: '#1b54b8',
      hoverBorderColor: '#3c72d2',
      activeShadow: '0 0 0 2px rgba(27, 84, 184, 0.18)',
      controlHeight: 34,
    },

    // ── Select ──────────────────────────────────────────────
    Select: {
      controlHeight: 34,
      borderRadius: 2,
    },

    // ── Tabs ────────────────────────────────────────────────
    Tabs: {
      inkBarColor: '#1b54b8',
      itemActiveColor: '#1b54b8',
      itemHoverColor: '#3c72d2',
      itemSelectedColor: '#1b54b8',
    },

    // ── Drawer ──────────────────────────────────────────────
    Drawer: {
      footerPaddingBlock: 12,
      footerPaddingInline: 16,
    },

    // ── Tag ─────────────────────────────────────────────────
    Tag: {
      borderRadiusSM: 2,
    },

    // ── Badge ───────────────────────────────────────────────
    Badge: {
      dotSize: 7,
    },

    // ── Statistic ───────────────────────────────────────────
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 24,
    },

    // ── Modal ───────────────────────────────────────────────
    Modal: {
      borderRadiusLG: 6,
    },

    // ── Alert ───────────────────────────────────────────────
    Alert: {
      borderRadiusLG: 4,
    },
  },
};

