"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Select, Slider, Alert } from "antd";
import {
  ThunderboltOutlined, ReloadOutlined, ArrowLeftOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { api, JobItem } from "@/lib/api";
import { AuthGuard } from "@/components/AuthGuard";
import { JobsTable } from "@/components/JobsTable";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "New", value: "new" },
  { label: "Saved", value: "saved" },
  { label: "Applied", value: "applied" },
  { label: "Dismissed", value: "dismissed" },
  { label: "Not relevant", value: "not_relevant" },
];

const DECISION_OPTIONS = [
  { label: "Matches & near-misses", value: "" },
  { label: "Matches only", value: "matched" },
  { label: "Below threshold", value: "below_threshold" },
  { label: "Pre-filtered out", value: "prefiltered" },
];

function JobsContent() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [minScore, setMinScore] = useState(0);
  const [status, setStatus] = useState("");
  const [decision, setDecision] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.jobs.history({
        minScore: minScore || undefined,
        status: status || undefined,
        decision: decision || undefined,
      });
      setJobs(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [minScore, status, decision]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="sticky top-0 z-50 border-b border-border bg-(--bg-primary)/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button icon={<ArrowLeftOutlined />} type="text" aria-label="Back to dashboard" />
            </Link>
            <div className="icon-box">
              <ThunderboltOutlined className="text-accent text-sm" />
            </div>
            <span className="font-bold text-text-primary">All Jobs</span>
          </div>
          <Button size="small" icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {error && (
          <Alert
            type="error"
            showIcon
            message="Could not load jobs"
            description={error}
            action={<Button size="small" onClick={load}>Retry</Button>}
          />
        )}

        <section className="card fade-in" style={{ padding: "1.25rem 1.5rem" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            <div>
              <p className="section-label mb-2">Minimum score: {minScore || "any"}</p>
              <Slider
                min={0}
                max={95}
                step={5}
                value={minScore}
                onChange={setMinScore}
                aria-label="Minimum match score filter"
              />
            </div>
            <div>
              <p className="section-label mb-2">Status</p>
              <Select
                className="w-full"
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
                aria-label="Filter by status"
              />
            </div>
            <div>
              <p className="section-label mb-2">Evaluation</p>
              <Select
                className="w-full"
                value={decision}
                onChange={setDecision}
                options={DECISION_OPTIONS}
                aria-label="Filter by evaluation decision"
              />
            </div>
          </div>
        </section>

        <section className="fade-in overflow-hidden rounded-2xl border border-border bg-bg-card">
          <JobsTable
            jobs={jobs}
            loading={loading}
            onChanged={setJobs}
            emptyText="Nothing here with these filters."
          />
        </section>
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <AuthGuard requires="onboarded">
      <JobsContent />
    </AuthGuard>
  );
}
