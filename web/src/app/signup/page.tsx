"use client";

import { useState, useEffect } from "react";
import { Form, Input, Button } from "antd";
import { MailOutlined, LockOutlined, ThunderboltOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNotify } from "@/hooks/useNotify";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const notify = useNotify();

  // Already signed in → skip signup
  useEffect(() => {
    if (isLoading || !user) return;
    router.replace(user.isOnboarded ? "/dashboard" : "/onboarding/step-1");
  }, [user, isLoading, router]);

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      await api.auth.signup(values.email, values.password);
      // Signup creates the account only — a session is issued at sign-in
      notify.success("Account created! Sign in to continue.");
      router.push("/login");
    } catch (err) {
      notify.error(err, "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-blobs">
        <div className="auth-blob bg-accent" style={{ top: "-10%", left: "-10%" }} />
        <div className="auth-blob bg-blue-600" style={{ bottom: "-10%", right: "-10%" }} />
      </div>

      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-logo pulse-glow">
            <ThunderboltOutlined style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start getting personalized job alerts</p>
        </div>

        <div className="auth-card">
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email address"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input id="signup-email" prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Password is required" },
                { min: 8, message: "Minimum 8 characters" },
              ]}
            >
              <Input.Password id="signup-password" prefix={<LockOutlined />} placeholder="Min. 8 characters" size="large" />
            </Form.Item>

            <Form.Item
              name="confirm"
              label="Confirm password"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) return Promise.resolve();
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password id="signup-confirm" prefix={<LockOutlined />} placeholder="Repeat password" size="large" />
            </Form.Item>

            <Form.Item className="mb-0 mt-2">
              <Button id="signup-submit" type="primary" htmlType="submit" block size="large" loading={loading}>
                Create account
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 text-center text-xs text-text-secondary">
          {["AI Scoring", "Telegram Alerts", "Daily Digest"].map((f) => (
            <div key={f} className="bg-bg-card border border-border rounded-xl py-2">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
