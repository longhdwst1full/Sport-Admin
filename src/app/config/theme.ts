import type { ThemeConfig } from 'antd';

/**
 * Premium Admin Design System — Ant Design theme tokens.
 *
 * Palette: Emerald-centric with slate neutrals.
 * Philosophy: Clean surfaces, generous radius, subtle shadows, vibrant accents.
 */
export const ADMIN_THEME: ThemeConfig = {
  token: {
    // ── Brand & semantic colors ─────────────────────────────
    colorPrimary: '#059669',
    colorInfo: '#0ea5e9',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorLink: '#059669',

    // ── Typography ──────────────────────────────────────────
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#cbd5e1',

    // ── Borders & backgrounds ───────────────────────────────
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#0f172a',

    // ── Shape ───────────────────────────────────────────────
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 6,

    // ── Sizing ──────────────────────────────────────────────
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    fontSize: 14,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,

    // ── Shadows ─────────────────────────────────────────────
    boxShadow:
      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
    boxShadowSecondary:
      '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',

    // ── Typography ──────────────────────────────────────────
    fontFamily:
      "'Noto Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },

  components: {
    // ── Layout shell ────────────────────────────────────────
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f8fafc',
      headerPadding: '0 24px',
      headerHeight: 72,
    },

    // ── Cards ───────────────────────────────────────────────
    Card: {
      borderRadiusLG: 16,
      paddingLG: 24,
    },

    // ── Tables ──────────────────────────────────────────────
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#475569',
      headerSplitColor: '#f1f5f9',
      rowHoverBg: '#f0fdf4',
      borderColor: '#f1f5f9',
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
    },

    // ── Buttons ─────────────────────────────────────────────
    Button: {
      primaryShadow: '0 4px 14px 0 rgb(5 150 105 / 0.30)',
      defaultBorderColor: '#e2e8f0',
      borderRadiusSM: 8,
    },

    // ── Menu ────────────────────────────────────────────────
    Menu: {
      itemBorderRadius: 10,
      itemMarginInline: 6,
      itemMarginBlock: 2,
      subMenuItemBg: 'transparent',
      itemSelectedBg: '#ecfdf5',
      itemSelectedColor: '#059669',
      itemHoverBg: '#f1f5f9',
      itemActiveBg: '#d1fae5',
      groupTitleColor: '#94a3b8',
      groupTitleFontSize: 11,
    },

    // ── Inputs ──────────────────────────────────────────────
    Input: {
      activeBorderColor: '#059669',
      hoverBorderColor: '#34d399',
      activeShadow: '0 0 0 3px rgba(5, 150, 105, 0.08)',
    },

    // ── Tabs ────────────────────────────────────────────────
    Tabs: {
      inkBarColor: '#059669',
      itemActiveColor: '#059669',
      itemHoverColor: '#10b981',
      itemSelectedColor: '#059669',
    },

    // ── Drawer ──────────────────────────────────────────────
    Drawer: {
      footerPaddingBlock: 16,
      footerPaddingInline: 24,
    },

    // ── Tag ─────────────────────────────────────────────────
    Tag: {
      borderRadiusSM: 6,
    },

    // ── Badge ───────────────────────────────────────────────
    Badge: {
      dotSize: 8,
    },

    // ── Statistic ───────────────────────────────────────────
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
    },

    // ── Modal ───────────────────────────────────────────────
    Modal: {
      borderRadiusLG: 16,
    },

    // ── Alert ───────────────────────────────────────────────
    Alert: {
      borderRadiusLG: 12,
    },
  },
};
