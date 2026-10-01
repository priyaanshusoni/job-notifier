"use client";

import { useState } from "react";
import { Steps } from "antd";
import { ThunderboltOutlined, CheckOutlined, RocketOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PREFERENCE_FIELDS } from "@/lib/formFields";
import { FormRenderer } from "@/components/FormRenderer";
import { useNotify } from "@/hooks/useNotify";

export default function OnboardingStep1() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const notify = useNotify();

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      setLoading(true);
      await api.preferences.save(values as unknown as Parameters<typeof api.preferences.save>[0]);
      notify.success("Preferences saved!");
      router.push("/onboarding/step-2");
    } catch (err) {
      notify.error(err, "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10">
      <div className="mx-auto w-full max-w-2xl fade-in">
        <div className="card text-center" style={{ padding: "2rem" }}>
          <div className="inline-flex items-center gap-2 bg-accent-light rounded-full px-4 py-1.5 mb-3">
            <ThunderboltOutlined className="text-accent text-xs" />
            <span className="text-accent text-xs font-medium">Step 1 of 2</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Set your job preferences</h1>
          <p className="text-sm text-text-secondary mb-6">
            We&apos;ll use this to find and score the most relevant jobs for you
          </p>
          <Steps
            current={0}
            items={[
              { title: "Preferences", description: "Roles, skills & more", icon: <RocketOutlined /> },
              { title: "Telegram", description: "Alert configuration", icon: <CheckOutlined /> },
            ]}
          />
        </div>

        <div className="card mt-10" style={{ padding: "2rem" }}>
          <FormRenderer
            fields={PREFERENCE_FIELDS}
            onSubmit={onFinish}
            submitText="Save & Continue"
            submitIcon={<CheckOutlined />}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
