export const tokens = {
  colors: {
    primary: "#6366f1",
    primaryHover: "#4f46e5",
    primaryActive: "#4338ca",
    primaryLight: "rgba(99, 102, 241, 0.08)",
    primaryBorder: "rgba(99, 102, 241, 0.2)",

    bg: "#ffffff",
    bgSecondary: "#f8fafc",
    bgTertiary: "#f1f5f9",
    bgHover: "#f1f5f9",
    bgActive: "#e2e8f0",
    bgOverlay: "rgba(0, 0, 0, 0.4)",

    text: "#0f172a",
    textSecondary: "#475569",
    textTertiary: "#94a3b8",
    textInverse: "#ffffff",
    textLink: "#6366f1",

    border: "#e2e8f0",
    borderLight: "#f1f5f9",
    borderFocus: "#6366f1",

    success: "#22c55e",
    successBg: "rgba(34, 197, 94, 0.08)",
    warning: "#f59e0b",
    warningBg: "rgba(245, 158, 11, 0.08)",
    error: "#ef4444",
    errorBg: "rgba(239, 68, 68, 0.08)",

    highlight: "rgba(99, 102, 241, 0.12)",
    highlightBorder: "rgba(99, 102, 241, 0.4)",

    shadow: "rgba(0, 0, 0, 0.08)",
    shadowHeavy: "rgba(0, 0, 0, 0.16)"
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    xxl: "24px",
    xxxl: "32px"
  },

  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px"
  },

  fontSize: {
    xs: "11px",
    sm: "12px",
    md: "13px",
    lg: "14px",
    xl: "16px",
    xxl: "18px"
  },

  lineHeight: {
    tight: "1.3",
    normal: "1.5",
    relaxed: "1.7"
  },

  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700"
  },

  transition: {
    fast: "0.15s ease",
    normal: "0.2s ease",
    slow: "0.3s ease"
  },

  zIndex: {
    sidebar: 2147483640,
    trigger: 2147483641,
    overlay: 2147483639,
    tooltip: 2147483642
  },

  size: {
    sidebarWidth: "320px",
    triggerSize: "44px",
    iconSm: "14px",
    iconMd: "16px",
    iconLg: "20px",
    inputHeight: "36px",
    buttonHeight: "32px"
  }
} as const

export type DesignTokens = typeof tokens
