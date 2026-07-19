"use client";

import { useEffect, useState } from "react";
import { Steps, Form, Input, Button } from "antd";
import {
  ThunderboltOutlined,
  CheckOutlined,
  RocketOutlined,
  SendOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { api, PreferenceInput } from "@/lib/api";
import { PREFERENCE_FIELDS, PREFERENCE_DEFAULTS } from "@/lib/formFields";
import { FormRenderer } from "@/components/FormRenderer";
import { AuthGuard } from "@/components/AuthGuard";
import { useNotify } from "@/hooks/useNotify";

function Step1Content() {
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();
  const notify = useNotify();

  // Preload previously saved preferences so onboarding is resumable
  useEffect(() => {
    api.preferences
      .get()
      .then((res) => {
        form.setFieldsValue({ ...PREFERENCE_DEFAULTS, ...(res.data ?? {}) });
      })
      .catch(() => form.setFieldsValue(PREFERENCE_DEFAULTS));
  }, [form]);

  const onAiSuggest = async () => {
    try {
      setAiLoading(true);
      const res = await api.ai.suggestSearchProfile(aiText);
      // Proposal only — fills the form for the user to review and edit
      const suggestion = Object.fromEntries(
        Object.entries(res.data).filter(
          ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
        ),
      );
      form.setFieldsValue(suggestion);
      notify.success("Form filled from your description — review and adjust below");
    } catch (err) {
      notify.error(err, "Could not understand the description, try rephrasing");
    } finally {
      setAiLoading(false);
    }
  };

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      setLoading(true);
      await api.preferences.save(values as unknown as PreferenceInput);
      notify.success("Preferences saved!");
      router.push("/onboarding/step-2");
    } catch (err) {
      notify.error(err, "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6 fade-in">
        <div className="card text-center" style={{ padding: "2rem" }}>
          <div className="inline-flex items-center gap-2 bg-accent-light rounded-full px-4 py-1.5 mb-3">
            <ThunderboltOutlined className="text-accent text-xs" />
            <span className="text-accent text-xs font-medium">Step 1 of 2</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Set your job preferences</h1>
          <p className="text-sm text-text-secondary mb-6">
            These drive both the job search and the AI match scoring
          </p>
          <Steps
            current={0}
            items={[
              { title: "Preferences", description: "Roles, skills & more", icon: <RocketOutlined /> },
              { title: "Telegram", description: "Alert configuration", icon: <SendOutlined /> },
            ]}
          />
        </div>

        <div className="card" style={{ padding: "1.5rem" }}>
          <div className="flex items-center gap-2 mb-3">
            <BulbOutlined className="text-accent" />
            <h3 className="font-semibold text-text-primary text-sm">Describe your ideal job (optional)</h3>
          </div>
          <div className="flex gap-2">
            <Input.TextArea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder='e.g. "Remote React/Node roles at product startups, 12+ LPA, no agencies"'
              rows={2}
              style={{ resize: "none" }}
            />
            <Button
              type="primary"
              onClick={onAiSuggest}
              loading={aiLoading}
              disabled={aiText.trim().length < 10}
            >
              Fill form
            </Button>
          </div>
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          <FormRenderer
            form={form}
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

export default function OnboardingStep1() {
  return (
    <AuthGuard requires="not-onboarded">
      <Step1Content />
    </AuthGuard>
  );
}
