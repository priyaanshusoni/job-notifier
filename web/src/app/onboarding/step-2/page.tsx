"use client";

import { useState } from "react";
import { Steps, Button } from "antd";
import { SendOutlined, CheckOutlined, RocketOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TELEGRAM_FIELDS } from "@/lib/formFields";
import { FormRenderer } from "@/components/FormRenderer";
import { useNotify } from "@/hooks/useNotify";

export default function OnboardingStep2() {
  const [loading, setLoading] = useState(false);
  const { setAuth, user, token } = useAuth();
  const router = useRouter();
  const notify = useNotify();

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      setLoading(true);
      await api.telegram.save(values.botToken as string, values.chatId as string);
      const result = await api.auth.completeOnboarding();
      if (user && token) setAuth(token, result.user);
      notify.success("Setup complete!");
      router.push("/dashboard");
    } catch (err) {
      notify.error(err, "Failed to save Telegram config");
    } finally {
      setLoading(false);
    }
  };

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
            Job alerts will be delivered directly to your Telegram chat
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
            fields={TELEGRAM_FIELDS}
            onSubmit={onFinish}
            submitText="Finish Setup"
            submitIcon={<CheckOutlined />}
            loading={loading}
          />
        </div>

        <div className="text-center">
          <Button type="link" onClick={() => router.back()} className="text-text-muted text-sm">
            ← Back to preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
