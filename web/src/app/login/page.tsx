"use client";

import { useState } from "react";
import { Form, Input, Button } from "antd";
import { MailOutlined, LockOutlined, ThunderboltOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNotify } from "@/hooks/useNotify";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();
  const notify = useNotify();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      const result = await api.auth.login(values.email, values.password);
      setAuth(result.token, result.user);
      router.push(result.user.isOnboarded ? "/dashboard" : "/onboarding/step-1");
    } catch (err) {
      notify.error(err, "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-blobs">
        <div className="auth-blob bg-accent" style={{ top: "-10%", right: "-10%" }} />
        <div className="auth-blob bg-blue-600" style={{ bottom: "-10%", left: "-10%" }} />
      </div>

      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-logo pulse-glow">
            <ThunderboltOutlined style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your Job Notifier account</p>
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
              <Input id="login-email" prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password id="login-password" prefix={<LockOutlined />} placeholder="••••••••" size="large" />
            </Form.Item>

            <Form.Item className="mb-0 mt-2">
              <Button id="login-submit" type="primary" htmlType="submit" block size="large" loading={loading}>
                Sign in
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-footer">
            Don&apos;t have an account? <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
