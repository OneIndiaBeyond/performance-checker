import "dotenv/config";
import express from "express";
import cors from "cors";
import { checkRouter } from "./routes/check.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", checkRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`performance-checker server listening on http://localhost:${port}`);
});
