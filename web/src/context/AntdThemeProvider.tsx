"use client";

import { App, ConfigProvider, theme } from "antd";

export function AntdThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          colorBgContainer: "#141418",
          colorBgElevated: "#1a1a1f",
          colorBgLayout: "#09090b",
          colorBorder: "#27272a",
          colorBorderSecondary: "#27272a",
          colorText: "#fafafa",
          colorTextSecondary: "#a1a1aa",
          colorTextTertiary: "#71717a",
          colorTextQuaternary: "#71717a",
          borderRadius: 8,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          colorSuccess: "#22c55e",
          colorWarning: "#f59e0b",
          colorError: "#ef4444",
          colorBgBase: "#09090b",
        },
        components: {
          Button: {
            primaryShadow: "none",
            defaultBg: "transparent",
            defaultBorderColor: "#27272a",
            defaultColor: "#a1a1aa",
          },
          Input: {
            activeBorderColor: "#3b82f6",
            activeShadow: "0 0 0 2px rgba(59, 130, 246, 0.1)",
          },
          Select: {
            optionActiveBg: "rgba(59, 130, 246, 0.1)",
            optionSelectedBg: "rgba(59, 130, 246, 0.15)",
            optionSelectedColor: "#3b82f6",
          },
          Table: {
            headerBg: "#0f0f12",
            headerColor: "#a1a1aa",
            rowHoverBg: "#1a1a1f",
            borderColor: "#27272a",
          },
          Modal: {
            contentBg: "#141418",
            headerBg: "#141418",
            footerBg: "#141418",
            titleColor: "#fafafa",
          },
          Tag: {
            defaultBg: "rgba(59, 130, 246, 0.1)",
            defaultColor: "#3b82f6",
          },
          Steps: {
            colorPrimary: "#3b82f6",
          },
          Form: {
            labelColor: "#a1a1aa",
          },
          Alert: {
            borderRadiusLG: 8,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
