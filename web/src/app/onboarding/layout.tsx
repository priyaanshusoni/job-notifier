import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup — Job Notifier",
  description:
    "Complete your profile to start receiving personalized job alerts",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className=" bg-bg-primary">{children}</div>;
}
