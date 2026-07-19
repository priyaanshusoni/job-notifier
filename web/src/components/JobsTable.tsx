"use client";

import { useState } from "react";
import { Table, Tag, Button, Tooltip, Modal, Spin, Dropdown } from "antd";
import {
  LinkOutlined,
  StarOutlined,
  StarFilled,
  CheckCircleOutlined,
  StopOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api, JobItem, JobStatus, JobExplanation } from "@/lib/api";
import { useNotify } from "@/hooks/useNotify";

const STATUS_META: Record<JobStatus, { label: string; color?: string }> = {
  new: { label: "New" },
  saved: { label: "Saved", color: "gold" },
  applied: { label: "Applied", color: "green" },
  dismissed: { label: "Dismissed", color: "default" },
  not_relevant: { label: "Not relevant", color: "red" },
};

function scoreColor(score: number) {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#3b82f6";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

interface JobsTableProps {
  jobs: JobItem[];
  loading?: boolean;
  onChanged?: (updated: JobItem[]) => void;
  emptyText?: string;
}

export function JobsTable({ jobs, loading, onChanged, emptyText }: JobsTableProps) {
  const notify = useNotify();
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explanation, setExplanation] = useState<JobExplanation | null>(null);
  const [explainJob, setExplainJob] = useState<JobItem | null>(null);

  const setStatus = async (job: JobItem, status: JobStatus) => {
    try {
      await api.jobs.setStatus(job.id, status);
      onChanged?.(jobs.map((j) => (j.id === job.id ? { ...j, status } : j)));
      notify.success(`Marked as ${STATUS_META[status].label.toLowerCase()}`);
    } catch (err) {
      notify.error(err, "Failed to update job");
    }
  };

  const openExplain = async (job: JobItem) => {
    setExplainJob(job);
    setExplainOpen(true);
    setExplainLoading(true);
    setExplanation(null);
    try {
      const res = await api.jobs.explain(job.id);
      setExplanation(res.data);
    } catch (err) {
      notify.error(err, "Could not generate explanation");
      setExplainOpen(false);
    } finally {
      setExplainLoading(false);
    }
  };

  const columns: ColumnsType<JobItem> = [
    {
      title: "Score",
      dataIndex: "score",
      width: 80,
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: "descend",
      render: (score) => (
        <span
          aria-label={`Match score ${score} out of 100`}
          className="font-bold text-sm"
          style={{ color: scoreColor(score) }}
        >
          {score}
        </span>
      ),
    },
    {
      title: "Job",
      dataIndex: "title",
      render: (title, record) => (
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-xs text-text-muted">
            {record.company} · {record.location || "—"}
            {record.isRemote ? " · Remote" : ""}
            {record.salary ? ` · ${record.salary}` : ""}
          </p>
        </div>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      width: 110,
      responsive: ["md"],
      render: (src) => <Tag>{src}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (status: JobStatus) => (
        <Tag color={STATUS_META[status]?.color}>{STATUS_META[status]?.label ?? status}</Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "seenAt",
      width: 90,
      responsive: ["md"],
      render: (date) => (
        <span className="text-xs text-text-muted">
          {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      ),
    },
    {
      title: "Actions",
      width: 170,
      render: (_, job) => (
        <div className="flex items-center gap-1">
          <Tooltip title={`Apply to ${job.title} at ${job.company}`}>
            <Button
              size="small"
              type="primary"
              href={job.applyLink}
              target="_blank"
              rel="noreferrer"
              icon={<LinkOutlined />}
              aria-label={`Apply to ${job.title} at ${job.company}`}
            >
              Apply
            </Button>
          </Tooltip>
          <Tooltip title={job.status === "saved" ? "Unsave" : "Save for later"}>
            <Button
              size="small"
              type="text"
              icon={job.status === "saved" ? <StarFilled style={{ color: "#f59e0b" }} /> : <StarOutlined />}
              onClick={() => setStatus(job, job.status === "saved" ? "new" : "saved")}
              aria-label={job.status === "saved" ? "Unsave job" : "Save job"}
            />
          </Tooltip>
          <Tooltip title="Why this score?">
            <Button
              size="small"
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => openExplain(job)}
              aria-label="Explain this match"
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: "applied",
                  label: "Mark as applied",
                  icon: <CheckCircleOutlined />,
                  onClick: () => setStatus(job, "applied"),
                },
                {
                  key: "dismissed",
                  label: "Dismiss",
                  icon: <StopOutlined />,
                  onClick: () => setStatus(job, "dismissed"),
                },
                {
                  key: "not_relevant",
                  label: "Not relevant (improves matching)",
                  icon: <StopOutlined />,
                  onClick: () => setStatus(job, "not_relevant"),
                },
              ],
            }}
          >
            <Button size="small" type="text" icon={<MoreOutlined />} aria-label="More actions" />
          </Dropdown>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={jobs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        expandable={{
          expandedRowRender: (job) => (
            <div className="space-y-2 py-1">
              <p className="text-sm text-text-secondary">{job.reason}</p>
              {job.scoreBreakdown && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <Tag>Role fit {job.scoreBreakdown.roleFit}/40</Tag>
                  <Tag>Skills {job.scoreBreakdown.skills}/30</Tag>
                  <Tag>Location {job.scoreBreakdown.location}/15</Tag>
                  <Tag>Salary {job.scoreBreakdown.salary}/10</Tag>
                  <Tag>Experience {job.scoreBreakdown.experience}/5</Tag>
                </div>
              )}
            </div>
          ),
        }}
        locale={{
          emptyText: (
            <div className="py-12 text-center">
              <ThunderboltOutlined className="text-3xl text-text-muted mb-3" />
              <p className="text-sm text-text-muted">
                {emptyText ?? "No jobs yet. Run the pipeline to fetch today's matches."}
              </p>
            </div>
          ),
        }}
        scroll={{ x: 700 }}
      />

      <Modal
        open={explainOpen}
        title={explainJob ? `Fit analysis — ${explainJob.title}` : "Fit analysis"}
        onCancel={() => setExplainOpen(false)}
        footer={null}
        width={640}
      >
        {explainLoading ? (
          <div className="py-10 text-center">
            <Spin />
            <p className="text-xs text-text-muted mt-3">Analyzing this job against your profile…</p>
          </div>
        ) : explanation ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm font-medium text-text-primary">{explanation.recommendation}</p>
            {explanation.pros.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-500 mb-1">Why it fits</p>
                <ul className="text-sm text-text-secondary list-disc list-inside space-y-1">
                  {explanation.pros.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {explanation.cons.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-400 mb-1">Concerns</p>
                <ul className="text-sm text-text-secondary list-disc list-inside space-y-1">
                  {explanation.cons.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {explanation.missingSkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted mb-1">Skills to brush up</p>
                <div className="flex flex-wrap gap-1.5">
                  {explanation.missingSkills.map((s) => <Tag key={s}>{s}</Tag>)}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
