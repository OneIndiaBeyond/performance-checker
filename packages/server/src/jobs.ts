import { randomUUID } from "node:crypto";
import type { CheckOptions, PerformanceReport } from "@performance-checker/core";
import { runCheck } from "@performance-checker/core";

export type JobStatus = "pending" | "running" | "done" | "error";

export interface Job {
  id: string;
  status: JobStatus;
  url: string;
  createdAt: string;
  report?: PerformanceReport;
  error?: string;
}

const jobs = new Map<string, Job>();

export function createJob(options: CheckOptions): Job {
  const job: Job = {
    id: randomUUID(),
    status: "pending",
    url: options.url,
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);

  job.status = "running";
  runCheck(options)
    .then((report) => {
      job.status = "done";
      job.report = report;
    })
    .catch((error: unknown) => {
      job.status = "error";
      job.error = error instanceof Error ? error.message : "Unknown error.";
    });

  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}
