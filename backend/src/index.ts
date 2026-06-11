import express from "express";
import "express-async-errors";
import cors from "cors";
import { sweepstakesRouter } from "./routes/sweepstakes";
import { presetsRouter } from "./routes/presets";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/presets", presetsRouter);
app.use("/api/sweepstakes", sweepstakesRouter);

// Centralised error handler so route handlers can throw safely.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Sweepstakes API listening on http://0.0.0.0:${PORT}`);
});
