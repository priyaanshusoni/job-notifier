"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button, Tag, Spin, Modal, Form, Alert, Input, Popconfirm,
} from "antd";
import {
  ThunderboltOutlined, SendOutlined, LogoutOutlined,
  RocketOutlined, EditOutlined, CheckOutlined, CloseOutlined,
  ReloadOutlined, UserOutlined, FileTextOutlined, DeleteOutlined,
  UnorderedListOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  api, Preference, TelegramConfig, JobItem, PipelineStatus, PreferenceInput,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { FormRenderer } from "@/components/FormRenderer";
import { JobsTable } from "@/components/JobsTable";
import { PREFERENCE_FIELDS, ALERT_FIELDS, TELEGRAM_FIELDS, PREFERENCE_DEFAULTS } from "@/lib/formFields";
import { useNotify } from "@/hooks/useNotify";

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const notify = useNotify();

  const [preference, setPreference] = useState<Preference | null>(null);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [resume, setResume] = useState<{ hasResume: boolean; skills: string[] } | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [triggering, setTriggering] = useState(false);
  const [testingTg, setTestingTg] = useState(false);

  const [editPrefOpen, setEditPrefOpen] = useState(false);
  const [editTgOpen, setEditTgOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [saving, setSaving] = useState(false);
  const [prefForm] = Form.useForm();
  const [tgForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [prefRes, tgRes, histRes, statusRes, resumeRes] = await Promise.all([
        api.preferences.get(),
        api.telegram.get(),
        api.jobs.history(),
        api.jobs.pipelineStatus(),
        api.ai.resumeStatus(),
      ]);
      setPreference(prefRes.data);
      setTelegramConfig(tgRes.data);
      setJobs(histRes.data || []);
      setPipeline(statusRes.data);
      setResume(resumeRes.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTrigger = async () => {
    try {
      setTriggering(true);
      const res = await api.jobs.trigger();
      const s = res.stats;
      notify.success(
        `Done! ${s.fetched} fetched · ${s.new} new · ${s.evaluated} AI-scored · ${s.matched} matched · ${s.notified} sent`,
      );
      await loadData();
    } catch (err) {
      notify.error(err, "Pipeline failed");
    } finally {
      setTriggering(false);
    }
  };

  const savePref = async () => {
    try {
      const values = await prefForm.validateFields();
      setSaving(true);
      const res = await api.preferences.save(values as PreferenceInput);
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

  const testTelegram = async () => {
    try {
      setTestingTg(true);
      await api.telegram.test();
      notify.success("Test message sent — check your Telegram!");
    } catch (err) {
      notify.error(err, "Test failed. Re-check your bot token and chat ID.");
    } finally {
      setTestingTg(false);
    }
  };

  const saveResume = async () => {
    try {
      setSaving(true);
      const res = await api.ai.saveResume(resumeText);
      setResume({ hasResume: true, skills: res.data.skills });
      setResumeOpen(false);
      setResumeText("");
      notify.success(`Resume saved — ${res.data.skills.length} skills extracted`);
    } catch (err) {
      notify.error(err, "Failed to process resume");
    } finally {
      setSaving(false);
    }
  };

  const deleteResume = async () => {
    try {
      await api.ai.deleteResume();
      setResume({ hasResume: false, skills: [] });
      notify.success("Resume deleted");
    } catch (err) {
      notify.error(err, "Failed to delete resume");
    }
  };

  const openEditPref = () => {
    prefForm.setFieldsValue({ ...PREFERENCE_DEFAULTS, ...(preference ?? {}) });
    setEditPrefOpen(true);
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  const lastRun = pipeline?.lastRun;

  return (
    <div className="min-h-screen bg-bg-primary">
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
            <Link href="/jobs">
              <Button icon={<UnorderedListOutlined />}>
                <span className="hidden sm:inline">All Jobs</span>
              </Button>
            </Link>
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
        {loadError && (
          <Alert
            type="error"
            showIcon
            message="Could not load your data"
            description={loadError}
            action={<Button size="small" onClick={loadData}>Retry</Button>}
          />
        )}

        {/* Pipeline panel */}
        <section className="relative overflow-hidden rounded-2xl border border-(--accent)/30 bg-accent-light p-6 fade-in">
          <div className="absolute inset-0 bg-linear-to-r from-(--accent)/8 to-blue-400/8 pointer-events-none" />
          <div className="relative space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
                  <RocketOutlined className="text-accent" />
                  Job Pipeline
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Search is built from your preferences, scored by AI, delivered to Telegram
                </p>
              </div>
              <Button
                id="trigger-pipeline-btn"
                type="primary"
                size="large"
                icon={triggering ? <ReloadOutlined spin /> : <ThunderboltOutlined />}
                loading={triggering || pipeline?.running}
                onClick={handleTrigger}
                className="pulse-glow"
                style={{ minWidth: 160 }}
              >
                {triggering || pipeline?.running ? "Running..." : "Run Now"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-secondary">
              {lastRun ? (
                <>
                  <span>
                    Last run:{" "}
                    <span className={lastRun.status === "success" ? "text-success" : "text-red-400"}>
                      {lastRun.status === "success" ? "succeeded" : "failed"}
                    </span>{" "}
                    {new Date(lastRun.startedAt).toLocaleString("en-IN", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}{" "}
                    ({lastRun.trigger})
                  </span>
                  {lastRun.stats && (
                    <span>
                      {lastRun.stats.fetched} fetched · {lastRun.stats.new} new ·{" "}
                      {lastRun.stats.matched} matched · {lastRun.stats.notified} alerted
                    </span>
                  )}
                  {lastRun.error && <span className="text-red-400">{lastRun.error}</span>}
                </>
              ) : (
                <span>No runs yet</span>
              )}
              {pipeline && (
                <span className="flex items-center gap-1">
                  <ClockCircleOutlined />
                  Next scheduled:{" "}
                  {new Date(pipeline.nextScheduledAt).toLocaleString("en-IN", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Config Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 fade-in">
          {/* Preferences Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="icon-box">
                  <RocketOutlined className="text-accent text-xs" />
                </div>
                <h3 className="font-semibold text-text-primary">Preferences</h3>
              </div>
              <Button id="edit-pref-btn" size="small" icon={<EditOutlined />} onClick={openEditPref}>
                Edit
              </Button>
            </div>

            {preference ? (
              <div className="space-y-3">
                <div>
                  <p className="section-label">Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preference.roles.map((r) => <Tag key={r}>{r}</Tag>)}
                  </div>
                </div>
                <div>
                  <p className="section-label">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preference.skills.slice(0, 6).map((s) => <Tag key={s}>{s}</Tag>)}
                    {preference.skills.length > 6 && <Tag>+{preference.skills.length - 6} more</Tag>}
                  </div>
                </div>
                <div>
                  <p className="section-label">Locations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preference.location.map((l) => <Tag key={l}>{l}</Tag>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
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
                  <div>
                    <p className="section-label">Threshold</p>
                    <p className="text-sm font-medium text-text-primary">{preference.minScore}+</p>
                  </div>
                </div>
                {preference.metaInfo && (
                  <div>
                    <p className="section-label">Notes</p>
                    <p className="text-xs text-text-secondary">{preference.metaInfo}</p>
                  </div>
                )}
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
                <h3 className="font-semibold text-text-primary">Telegram</h3>
              </div>
              <Button id="edit-tg-btn" size="small" icon={<EditOutlined />} onClick={() => setEditTgOpen(true)}>
                Edit
              </Button>
            </div>

            {telegramConfig ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-bg-secondary p-3">
                  <p className="section-label">Bot Token</p>
                  <p className="font-mono text-sm text-text-primary">{telegramConfig.botToken}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-secondary p-3">
                  <p className="section-label">Chat ID</p>
                  <p className="font-mono text-sm text-text-primary">{telegramConfig.chatId}</p>
                </div>
                <Button size="small" loading={testingTg} onClick={testTelegram} icon={<SendOutlined />}>
                  Send test message
                </Button>
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

          {/* Resume Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="icon-box">
                  <FileTextOutlined className="text-accent text-xs" />
                </div>
                <h3 className="font-semibold text-text-primary">Resume (AI)</h3>
              </div>
              <Button size="small" icon={<EditOutlined />} onClick={() => setResumeOpen(true)}>
                {resume?.hasResume ? "Update" : "Add"}
              </Button>
            </div>

            {resume?.hasResume ? (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Skills from your resume are weighed as demonstrated experience during scoring.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.slice(0, 10).map((s) => <Tag key={s}>{s}</Tag>)}
                  {resume.skills.length > 10 && <Tag>+{resume.skills.length - 10} more</Tag>}
                </div>
                <Popconfirm title="Delete your resume data?" onConfirm={deleteResume}>
                  <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
                </Popconfirm>
              </div>
            ) : (
              <p className="text-sm text-text-muted py-4">
                Optional: paste your resume to make match scores resume-aware. Stored encrypted; delete anytime.
              </p>
            )}
          </div>
        </div>

        {/* Recent matches */}
        <section className="fade-in overflow-hidden rounded-2xl border border-border bg-bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary">Recent Matches</h3>
              {jobs.length > 0 && (
                <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
                  {jobs.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/jobs">
                <Button size="small" icon={<UnorderedListOutlined />}>View all & filter</Button>
              </Link>
              <Button id="refresh-history-btn" size="small" icon={<ReloadOutlined />} onClick={loadData}>
                Refresh
              </Button>
            </div>
          </div>
          <JobsTable jobs={jobs} onChanged={setJobs} />
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
        width={620}
      >
        <div className="mt-4">
          <FormRenderer form={prefForm} fields={[...PREFERENCE_FIELDS, ...ALERT_FIELDS]} />
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

      {/* Resume Modal */}
      <Modal
        open={resumeOpen}
        title="Paste your resume"
        onCancel={() => setResumeOpen(false)}
        onOk={saveResume}
        confirmLoading={saving}
        okText="Save & Extract Skills"
        okButtonProps={{ disabled: resumeText.trim().length < 50 }}
        width={640}
      >
        <p className="text-xs text-text-muted mb-3">
          Plain text works best. It is stored encrypted, used only for scoring your matches, and can be deleted anytime.
        </p>
        <Input.TextArea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={12}
          placeholder="Paste your resume text here..."
        />
      </Modal>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard requires="onboarded">
      <DashboardContent />
    </AuthGuard>
  );
}
