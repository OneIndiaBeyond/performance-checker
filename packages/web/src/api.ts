import type { AuthInput, DeviceStrategy, Job } from "./types.js";

export interface CreateCheckInput {
  url: string;
  device: DeviceStrategy;
  runLighthouse: boolean;
  runPageSpeedInsights: boolean;
  auth?: AuthInput;
}

export async function createCheck(input: CreateCheckInput): Promise<{ jobId: string }> {
  const response = await fetch("/api/checks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? "Failed to start the check.");
  }
  return response.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const response = await fetch(`/api/checks/${jobId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch job status.");
  }
  return response.json();
}
