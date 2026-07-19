"use client";

import { useEffect, useState } from "react";
import { Steps, Button, Form, Spin } from "antd";
import {
  SendOutlined,
  CheckOutlined,
  RocketOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TELEGRAM_FIELDS } from "@/lib/formFields";
import { FormRenderer } from "@/components/FormRenderer";
import { AuthGuard } from "@/components/AuthGuard";
import { useNotify } from "@/hooks/useNotify";

function Step2Content() {
  const [loading, setLoading] = useState(false);
  const [checkingPrefs, setCheckingPrefs] = useState(true);
  const { setAuth } = useAuth();
  const [form] = Form.useForm();
  const router = useRouter();
  const notify = useNotify();

  // Step 2 requires step 1: without preferences the pipeline cannot run
  useEffect(() => {
    api.preferences
      .get()
      .then((res) => {
        if (!res.data) {
          notify.error("Set your job preferences first");
          router.replace("/onboarding/step-1");
        } else {
          setCheckingPrefs(false);
        }
      })
      .catch(() => setCheckingPrefs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      setLoading(true);
      await api.telegram.save(values.botToken as string, values.chatId as string);
      // Send a real test message so "connected" is verified, not assumed
      await api.telegram.test();
      const result = await api.auth.completeOnboarding();
      setAuth(result.user);
      notify.success("Test message sent — setup complete!");
      router.push("/dashboard");
    } catch (err) {
      notify.error(err, "Telegram setup failed. Check the token and chat ID, and make sure you messaged your bot first.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingPrefs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto w-full max-w-xl space-y-6 fade-in">
        <div className="card text-center" style={{ padding: "2rem" }}>
          <div className="inline-flex items-center gap-2 bg-accent-light rounded-full px-4 py-1.5 mb-3">
            <SendOutlined className="text-accent text-xs" />
            <span className="text-accent text-xs font-medium">Step 2 of 2</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Connect Telegram</h1>
          <p className="text-sm text-text-secondary mb-6">
            We&apos;ll send a test message to verify the connection before finishing
          </p>
          <Steps
            current={1}
            items={[
              { title: "Preferences", description: "Roles, skills & more", icon: <RocketOutlined /> },
              { title: "Telegram", description: "Alert configuration", icon: <SendOutlined /> },
            ]}
          />
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          <div className="rounded-xl bg-accent-light p-4 mb-6">
            <div className="flex items-start gap-3">
              <InfoCircleOutlined className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-accent text-sm font-medium mb-2">How to get your Telegram credentials:</p>
                <ol className="text-text-secondary text-xs space-y-1.5 list-decimal list-inside">
                  <li>Message <span className="text-accent font-mono">@BotFather</span> on Telegram → send <span className="font-mono">/newbot</span></li>
                  <li>Follow the steps to get your Bot Token</li>
                  <li>Message <span className="text-accent font-mono">@userinfobot</span> to get your Chat ID</li>
                  <li>Start a chat with your new bot first (send it any message)</li>
                </ol>
              </div>
            </div>
          </div>

          <FormRenderer
            form={form}
            fields={TELEGRAM_FIELDS}
            onSubmit={onFinish}
            submitText="Send Test & Finish"
            submitIcon={<CheckOutlined />}
            loading={loading}
          />
        </div>

        <div className="text-center">
          <Link href="/onboarding/step-1" className="text-text-muted text-sm hover:text-accent">
            ← Back to preferences
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingStep2() {
  return (
    <AuthGuard requires="not-onboarded">
      <Step2Content />
    </AuthGuard>
  );
}
