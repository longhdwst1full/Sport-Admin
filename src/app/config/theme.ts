import type { ThemeConfig } from 'antd';

/**
 * Enterprise Admin / ERP Design System — Ant Design theme tokens.
 *
 * Palette: Dark Navy Sidebar (#151d2f) + Amber/Gold Accent (#f59e0b) + Corporate Blue (#2563eb).
 * Philosophy: Desktop-first, compact sizing, high information density, clean borders, crisp typography.
 */
export const ADMIN_THEME: ThemeConfig = {
  token: {
    // ── Brand & semantic colors ─────────────────────────────
    colorPrimary: '#f59e0b',
    colorInfo: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorLink: '#2563eb',

    // ── Typography ──────────────────────────────────────────
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#cbd5e1',

    // ── Borders & backgrounds ───────────────────────────────
    colorBorder: '#cbd5e1',
    colorBorderSecondary: '#e2e8f0',
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#151d2f',

    // ── Shape (Compact ERP aesthetic) ───────────────────────
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 3,

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
    boxShadow:
      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    boxShadowSecondary:
      '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',

    // ── Typography ──────────────────────────────────────────
    fontFamily:
      "'Be Vietnam Pro', 'Noto Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  },

  components: {
    // ── Layout shell ────────────────────────────────────────
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#151d2f',
      bodyBg: '#f8fafc',
      headerPadding: '0 12px',
      headerHeight: 44,
    },

    // ── Cards ───────────────────────────────────────────────
    Card: {
      borderRadiusLG: 8,
      paddingLG: 16,
    },

    // ── Tables (Compact ERP padding) ────────────────────────
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSplitColor: '#e2e8f0',
      rowHoverBg: '#f8fafc',
      borderColor: '#f1f5f9',
      cellPaddingBlock: 8,
      cellPaddingInline: 10,
      fontSize: 12.5,
    },

    // ── Buttons ─────────────────────────────────────────────
    Button: {
      primaryShadow: '0 1px 2px rgba(245, 158, 11, 0.25)',
      defaultBorderColor: '#cbd5e1',
      borderRadiusSM: 4,
      controlHeight: 34,
      controlHeightSM: 28,
    },

    // ── Menu ────────────────────────────────────────────────
    Menu: {
      itemBorderRadius: 6,
      itemMarginInline: 6,
      itemMarginBlock: 2,
      subMenuItemBg: 'transparent',
      itemSelectedBg: 'rgba(245, 158, 11, 0.12)',
      itemSelectedColor: '#f5b400',
      itemHoverBg: 'rgba(255, 255, 255, 0.06)',
      itemActiveBg: 'rgba(245, 158, 11, 0.18)',
      groupTitleColor: '#64748b',
      groupTitleFontSize: 10.5,
    },

    // ── Inputs ──────────────────────────────────────────────
    Input: {
      activeBorderColor: '#f59e0b',
      hoverBorderColor: '#fbbf24',
      activeShadow: '0 0 0 2px rgba(245, 158, 11, 0.15)',
      controlHeight: 34,
    },

    // ── Select ──────────────────────────────────────────────
    Select: {
      controlHeight: 34,
      borderRadius: 6,
    },

    // ── Tabs ────────────────────────────────────────────────
    Tabs: {
      inkBarColor: '#2563eb',
      itemActiveColor: '#2563eb',
      itemHoverColor: '#3b82f6',
      itemSelectedColor: '#2563eb',
    },

    // ── Drawer ──────────────────────────────────────────────
    Drawer: {
      footerPaddingBlock: 12,
      footerPaddingInline: 16,
    },

    // ── Tag ─────────────────────────────────────────────────
    Tag: {
      borderRadiusSM: 4,
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
      borderRadiusLG: 10,
    },

    // ── Alert ───────────────────────────────────────────────
    Alert: {
      borderRadiusLG: 8,
    },
  },
};

