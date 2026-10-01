"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Tag, Table, Progress, Tooltip, Spin,
  Modal, Form,
} from "antd";
import {
  ThunderboltOutlined, SendOutlined, LogoutOutlined,
  RocketOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  LinkOutlined, ReloadOutlined, UserOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { api, Preference, TelegramConfig, SeenJob } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FormRenderer } from "@/components/FormRenderer";
import { PREFERENCE_FIELDS, TELEGRAM_FIELDS } from "@/lib/formFields";
import { useNotify } from "@/hooks/useNotify";
import type { ColumnsType } from "antd/es/table";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? "#22c55e" :
    score >= 75 ? "#3b82f6" :
    score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <Progress
      type="circle"
      percent={score}
      size={36}
      strokeColor={color}
      strokeWidth={8}
      format={(p) => <span style={{ color, fontSize: 10, fontWeight: 700 }}>{p}</span>}
    />
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [preference, setPreference] = useState<Preference | null>(null);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);
  const [jobHistory, setJobHistory] = useState<SeenJob[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const notify = useNotify();
  const [triggering, setTriggering] = useState(false);

  const [editPrefOpen, setEditPrefOpen] = useState(false);
  const [editTgOpen, setEditTgOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefForm] = Form.useForm();
  const [tgForm] = Form.useForm();

  const loadData = useCallback(async () => {
    try {
      const [prefRes, tgRes, histRes] = await Promise.all([
        api.preferences.get().catch(() => ({ data: null })),
        api.telegram.get().catch(() => ({ data: null })),
        api.jobs.history().catch(() => ({ data: [] })),
      ]);
      setPreference(prefRes.data);
      setTelegramConfig(tgRes.data);
      setJobHistory(histRes.data || []);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (!user.isOnboarded) { router.replace("/onboarding/step-1"); return; }
    loadData();
  }, [user, router, loadData]);

  const handleTrigger = async () => {
    try {
      setTriggering(true);
      const res = await api.jobs.trigger();
      notify.success(
        `Pipeline complete! Fetched ${res.stats?.total ?? "?"} jobs, ${res.stats?.matched ?? "?"} matched.`
      );
      const hist = await api.jobs.history();
      setJobHistory(hist.data || []);
    } catch (err) {
      notify.error(err, "Failed to run pipeline");
    } finally {
      setTriggering(false);
    }
  };

  const savePref = async () => {
    try {
      const values = await prefForm.validateFields();
      setSaving(true);
      const res = await api.preferences.save(values);
      setPreference(res.data);
      setEditPrefOpen(false);
      notify.success("Preferences saved!");
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      notify.error(err, "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const saveTg = async () => {
    try {
      const values = await tgForm.validateFields();
      setSaving(true);
      const res = await api.telegram.save(values.botToken, values.chatId);
      setTelegramConfig(res.data);
      setEditTgOpen(false);
      tgForm.resetFields();
      notify.success("Telegram config saved!");
    } catch (err) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      notify.error(err, "Failed to save Telegram config");
    } finally {
      setSaving(false);
    }
  };

  const openEditPref = () => {
    if (preference) prefForm.setFieldsValue(preference);
    setEditPrefOpen(true);
  };

  const columns: ColumnsType<SeenJob> = [
    {
      title: "Score",
      dataIndex: "score",
      width: 70,
      sorter: (a, b) => b.score - a.score,
      defaultSortOrder: "ascend",
      render: (score) => <ScoreBadge score={score} />,
    },
    {
      title: "Job",
      dataIndex: "title",
      render: (title, record) => (
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-xs text-text-muted">{record.company}</p>
        </div>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      width: 110,
      render: (src) => <Tag>{src}</Tag>,
    },
    {
      title: "AI Reason",
      dataIndex: "reason",
      render: (reason) => (
        <Tooltip title={reason}>
          <span className="text-xs text-text-secondary line-clamp-2 cursor-help">{reason}</span>
        </Tooltip>
      ),
    },
    {
      title: "Date",
      dataIndex: "seenAt",
      width: 100,
      render: (date) => (
        <span className="text-xs text-text-muted">
          {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      ),
    },
    {
      title: "Apply",
      dataIndex: "applyLink",
      width: 70,
      render: (link) => (
        <a href={link} target="_blank" rel="noreferrer" className="text-accent hover:opacity-75 transition-opacity">
          <LinkOutlined />
        </a>
      ),
    },
  ];

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-accent opacity-[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-blue-600 opacity-[0.03] blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-(--bg-primary)/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="icon-box">
              <ThunderboltOutlined className="text-accent text-sm" />
            </div>
            <span className="font-bold text-text-primary">Job Notifier</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-bg-card px-3 py-1.5">
              <UserOutlined className="text-text-muted text-xs" />
              <span className="text-xs text-text-secondary">{user?.email}</span>
            </div>
            <Button
              id="logout-btn"
              icon={<LogoutOutlined />}
              onClick={() => { logout(); router.push("/login"); }}
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Trigger Pipeline */}
        <section className="relative overflow-hidden rounded-2xl border border-(--accent)/30 bg-accent-light p-6 fade-in">
          <div className="absolute inset-0 bg-linear-to-r from-(--accent)/8 to-blue-400/8 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                <RocketOutlined className="text-accent" />
                Run Job Pipeline
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Fetch, score & deliver today&apos;s best matching jobs via Telegram
              </p>
            </div>
            <Button
              id="trigger-pipeline-btn"
              type="primary"
              size="large"
              icon={triggering ? <ReloadOutlined spin /> : <ThunderboltOutlined />}
              loading={triggering}
              onClick={handleTrigger}
              className="pulse-glow"
              style={{ minWidth: 160 }}
            >
              {triggering ? "Running..." : "Trigger Now"}
            </Button>
          </div>
        </section>

        {/* Config Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
          {/* Preferences Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="icon-box">
                  <RocketOutlined className="text-accent text-xs" />
                </div>
                <h3 className="font-semibold text-text-primary">Job Preferences</h3>
              </div>
              <Button id="edit-pref-btn" size="small" icon={<EditOutlined />} onClick={openEditPref}>
                Edit
              </Button>
            </div>

            {preference ? (
              <div className="space-y-4">
                <div>
                  <p className="section-label">Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preference.roles.map((r) => <Tag key={r}>{r}</Tag>)}
                  </div>
                </div>
                <div>
                  <p className="section-label">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preference.skills.slice(0, 8).map((s) => <Tag key={s}>{s}</Tag>)}
                    {preference.skills.length > 8 && (
                      <Tag>+{preference.skills.length - 8} more</Tag>
                    )}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="section-label">Min Salary</p>
                    <p className="text-sm font-medium text-text-primary">
                      ₹{preference.minSalary.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="section-label">Experience</p>
                    <p className="text-sm font-medium text-text-primary">{preference.experience}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-text-muted mb-3">No preferences set yet</p>
                <Button type="primary" size="small" onClick={openEditPref}>Set preferences</Button>
              </div>
            )}
          </div>

          {/* Telegram Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="icon-box">
                  <SendOutlined className="text-accent text-xs" />
                </div>
                <h3 className="font-semibold text-text-primary">Telegram Config</h3>
              </div>
              <Button id="edit-tg-btn" size="small" icon={<EditOutlined />} onClick={() => setEditTgOpen(true)}>
                Edit
              </Button>
            </div>

            {telegramConfig ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-bg-secondary p-4">
                  <p className="section-label">Bot Token</p>
                  <p className="font-mono text-sm text-text-primary">{telegramConfig.botToken}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-secondary p-4">
                  <p className="section-label">Chat ID</p>
                  <p className="font-mono text-sm text-text-primary">{telegramConfig.chatId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-success">Connected</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-text-muted mb-3">No Telegram config set</p>
                <Button type="primary" size="small" onClick={() => setEditTgOpen(true)}>
                  Connect Telegram
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Job History */}
        <section className="fade-in overflow-hidden rounded-2xl border border-border bg-bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary">Job History</h3>
              {jobHistory.length > 0 && (
                <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
                  {jobHistory.length}
                </span>
              )}
            </div>
            <Button id="refresh-history-btn" size="small" icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
          </div>
          <Table
            dataSource={jobHistory}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{
              emptyText: (
                <div className="py-12 text-center">
                  <ThunderboltOutlined className="text-3xl text-text-muted mb-3" />
                  <p className="text-sm text-text-muted">
                    No jobs yet. Hit &quot;Trigger Now&quot; to run the pipeline!
                  </p>
                </div>
              ),
            }}
            scroll={{ x: 600 }}
          />
        </section>
      </main>

      {/* Edit Preferences Modal */}
      <Modal
        open={editPrefOpen}
        title="Edit Preferences"
        onCancel={() => setEditPrefOpen(false)}
        onOk={savePref}
        confirmLoading={saving}
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{ icon: <CheckOutlined /> }}
        cancelButtonProps={{ icon: <CloseOutlined /> }}
        width={580}
      >
        <div className="mt-4">
          <FormRenderer form={prefForm} fields={PREFERENCE_FIELDS} />
        </div>
      </Modal>

      {/* Edit Telegram Modal */}
      <Modal
        open={editTgOpen}
        title="Edit Telegram Config"
        onCancel={() => { setEditTgOpen(false); tgForm.resetFields(); }}
        onOk={saveTg}
        confirmLoading={saving}
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{ icon: <CheckOutlined /> }}
      >
        <div className="mt-4">
          <FormRenderer form={tgForm} fields={TELEGRAM_FIELDS} />
        </div>
      </Modal>
    </div>
  );
}
