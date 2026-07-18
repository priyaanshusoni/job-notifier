"use client";

import { useState } from "react";
import { Form, Input, Button, Alert } from "antd";
import {
  MailOutlined,
  LockOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuth();
  const router = useRouter();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.auth.login(values.email, values.password);
      setAuth(result.token, result.user);
      if (result.user.isOnboarded) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding/step-1");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[var(--accent)] opacity-[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-600 opacity-[0.06] blur-3xl" />
      </div>

      <div className="w-full max-w-[400px] fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-light)] mb-4 pulse-glow">
            <ThunderboltOutlined className="text-2xl text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Sign in to your Job Notifier account
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-8 shadow-2xl">
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              className="mb-5"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
              }}
            />
          )}

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email address"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input
                id="login-email"
                prefix={<MailOutlined className="text-[var(--text-muted)]" />}
                placeholder="you@example.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password
                id="login-password"
                prefix={<LockOutlined className="text-[var(--text-muted)]" />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item className="mb-0 mt-2">
              <Button
                id="login-submit"
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
              >
                Sign in
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 text-center">
            <span className="text-[var(--text-muted)] text-sm">
              Don&apos;t have an account?{" "}
            </span>
            <Link
              href="/signup"
              className="text-[var(--accent)] text-sm font-medium hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
