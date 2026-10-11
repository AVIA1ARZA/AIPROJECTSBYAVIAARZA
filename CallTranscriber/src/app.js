import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { getClient, getModel, hasApiKey } from "./client.js";
import { toFileContent } from "./format.js";
import { friendlyError, transcribeFile } from "./transcriber.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const JOB_TTL_MS = 60 * 60 * 1000;

/** multer מפענח שמות קבצים כ-latin1; מחזירים לעברית תקינה. */
function fixFilename(name) {
  const decoded = Buffer.from(name, "latin1").toString("utf8");
  return decoded.includes("�") ? name : decoded;
}

/**
 * @param {object} [deps] תלויות להזרקה בבדיקות
 */
export function createApp(deps = {}) {
  const {
    getClient: clientFactory = getClient,
    hasApiKey: keyPresent = hasApiKey,
    model = getModel(),
    transcribe = transcribeFile,
    chunkSeconds,
    retryDelayMs,
  } = deps;

  const uploadDir = path.join(os.tmpdir(), "call-transcriber-uploads");
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => mkdir(uploadDir, { recursive: true }).then(() => cb(null, uploadDir), cb),
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).slice(0, 10)}`),
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  });

  /** @type {Map<string, any>} */
  const jobs = new Map();
  const sweeper = setInterval(() => {
    for (const [id, job] of jobs) if (Date.now() - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }, 10 * 60 * 1000);
  sweeper.unref();

  async function runJob(job, file, timestamps) {
    try {
      const result = await transcribe(file.path, {
        client: clientFactory(),
        model,
        sourceName: job.sourceName,
        timestamps,
        chunkSeconds,
        retryDelayMs,
        onProgress: (p) => Object.assign(job, p),
      });
      job.result = {
        text: result.text,
        segments: result.segments,
        durationSec: result.durationSec,
        speakers: result.speakers,
      };
      job.status = "done";
      job.progress = 1;
      job.message = "התמלול מוכן";
    } catch (err) {
      console.error("[transcribe]", err);
      job.status = "error";
      job.error = friendlyError(err);
    } finally {
      await rm(file.path, { force: true });
    }
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.static(PUBLIC_DIR));

  app.get("/api/status", (_req, res) => {
    res.json({ ready: keyPresent(), model });
  });

  app.post(
    "/api/transcribe",
    (_req, res, next) => {
      // בודקים את המפתח לפני שמקבלים קובץ גדול.
      if (!keyPresent()) {
        return res.status(503).json({ error: "חסר מפתח GEMINI_API_KEY בקובץ .env. ראי הוראות ב-README." });
      }
      next();
    },
    upload.single("audio"),
    (req, res) => {
      if (!req.file) return res.status(400).json({ error: "לא נבחר קובץ." });

      const job = {
        id: randomUUID(),
        createdAt: Date.now(),
        sourceName: fixFilename(req.file.originalname),
        status: "working",
        stage: "converting",
        progress: 0,
        message: "מתחיל…",
      };
      jobs.set(job.id, job);
      runJob(job, req.file, req.body?.timestamps !== "off");
      res.status(202).json({ id: job.id });
    },
  );

  app.get("/api/jobs/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "המשימה לא נמצאה (ייתכן שפג תוקפה). העלי את הקובץ מחדש." });
    const { id, status, stage, progress, message, error, result, sourceName } = job;
    res.json({ id, status, stage, progress, message, error, result, sourceName });
  });

  app.get("/api/jobs/:id/download", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job?.result) return res.status(404).send("התמלול לא נמצא.");
    const base = path.parse(job.sourceName).name || "שיחה";
    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="transcript.txt"; filename*=UTF-8''${encodeURIComponent(`${base}-תמלול.txt`)}`,
    });
    res.send(toFileContent(job.result.text));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "הקובץ גדול מדי (עד 500MB)." });
    }
    console.error("[server]", err);
    res.status(500).json({ error: "שגיאה בשרת. נסי שוב." });
  });

  return app;
}
