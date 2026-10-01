"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { useAuth } from "@/context/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Where users belong based on onboarding state. */
  requires?: "onboarded" | "not-onboarded" | "any";
}

/**
 * Client-side route guard (the JWT lives in localStorage, so server
 * middleware cannot see it). Redirects unauthenticated users to /login and
 * routes users to the right side of the onboarding boundary.
 */
export function AuthGuard({ children, requires = "any" }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (requires === "onboarded" && !user.isOnboarded) {
      router.replace("/onboarding/step-1");
    } else if (requires === "not-onboarded" && user.isOnboarded) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, requires, router]);

  const allowed =
    user &&
    (requires === "any" ||
      (requires === "onboarded" && user.isOnboarded) ||
      (requires === "not-onboarded" && !user.isOnboarded));

  if (isLoading || !allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
