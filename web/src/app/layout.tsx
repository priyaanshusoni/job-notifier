import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AntdThemeProvider } from "@/context/AntdThemeProvider";

export const metadata: Metadata = {
  title: "Job Notifier — Your Personal Job Alert System",
  description:
    "Get personalized job alerts via Telegram, powered by AI scoring. Never miss the perfect opportunity.",
  keywords: [
    "job alerts",
    "telegram notifications",
    "job search",
    "AI scoring",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <AntdThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </AntdThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
