import { useEffect, useRef, useState } from "react";
import { CheckForm } from "./components/CheckForm.js";
import { ReportView } from "./components/ReportView.js";
import { CredentialsAlert } from "./components/CredentialsAlert.js";
import { createCheck, getJob, type CreateCheckInput } from "./api.js";
import type { Job } from "./types.js";

const POLL_INTERVAL_MS = 2000;

export default function App() {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCredentialsAlert, setShowCredentialsAlert] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleSubmit(input: CreateCheckInput) {
    setError(null);
    setJob(null);
    setShowCredentialsAlert(false);

    try {
      const { jobId } = await createCheck(input);
      pollJob(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start the check.");
    }
  }

  function pollJob(jobId: string) {
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const latest = await getJob(jobId);
        setJob(latest);
        if (latest.status === "done" || latest.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (latest.status === "done" && latest.report?.security.credentialsUsed) {
            setShowCredentialsAlert(true);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch job status.");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    void poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }

  const isRunning = job?.status === "pending" || job?.status === "running";

  return (
    <div className="app">
      <header className="app-header">
        <h1>Performance Checker</h1>
        <p className="muted">
          Lighthouse-style audits, live Core Web Vitals and PageSpeed Insights in one report —
          driven by Playwright.
        </p>
      </header>

      <main>
        <CheckForm disabled={isRunning} onSubmit={handleSubmit} />

        {error && <p className="error">{error}</p>}

        {isRunning && <p className="status">Running check for {job?.url}…</p>}

        {job?.status === "error" && <p className="error">Check failed: {job.error}</p>}

        {job?.status === "done" && job.report && <ReportView report={job.report} />}
      </main>

      {showCredentialsAlert && job?.report?.security.message && (
        <CredentialsAlert
          message={job.report.security.message}
          onDismiss={() => setShowCredentialsAlert(false)}
        />
      )}
    </div>
  );
}
