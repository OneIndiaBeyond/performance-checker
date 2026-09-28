import { Router } from "express";
import type { AuthConfig, CheckOptions, DeviceStrategy } from "@performance-checker/core";
import { createJob, getJob } from "../jobs.js";

export const checkRouter = Router();

interface CheckRequestBody {
  url: string;
  device?: DeviceStrategy;
  runLighthouse?: boolean;
  runPageSpeedInsights?: boolean;
  auth?: AuthConfig;
}

checkRouter.post("/checks", (req, res) => {
  const body = req.body as CheckRequestBody;

  if (!body?.url || typeof body.url !== "string") {
    res.status(400).json({ error: "A 'url' string is required." });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    res.status(400).json({ error: "The provided 'url' is not valid." });
    return;
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    res.status(400).json({ error: "Only http/https URLs are supported." });
    return;
  }

  const options: CheckOptions = {
    url: body.url,
    device: body.device === "desktop" ? "desktop" : "mobile",
    runLighthouse: body.runLighthouse ?? true,
    runPageSpeedInsights: Boolean(body.runPageSpeedInsights),
    psiApiKey: process.env.PSI_API_KEY,
    auth: body.auth,
  };

  const job = createJob(options);
  res.status(202).json({ jobId: job.id, status: job.status });
});

checkRouter.get("/checks/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  res.json(job);
});
