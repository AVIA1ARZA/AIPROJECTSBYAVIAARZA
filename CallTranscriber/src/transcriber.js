import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ThinkingLevel } from "@google/genai";
import { analyzeAudio, extractChunkMp3, normalizeToFlac, planChunks } from "./audio.js";
import { formatTranscript, parseClock } from "./format.js";
import { buildPrompt, responseSchema } from "./prompt.js";

const MAX_ATTEMPTS = 4;
const CONTEXT_LINES = 6;

class BadResponseError extends Error {}

function isRetryable(err) {
  if (err instanceof BadResponseError || err instanceof SyntaxError) return true;
  if ([408, 429, 500, 502, 503, 504].includes(err?.status)) return true;
  return /UNAVAILABLE|overloaded|RESOURCE_EXHAUSTED|ECONNRESET|ETIMEDOUT|fetch failed|timed? ?out/i.test(String(err?.message));
}

/** הופך שגיאות של Gemini להודעה ברורה בעברית. */
export function friendlyError(err) {
  const msg = String(err?.message ?? err);
  if (/API key|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg) || [401, 403].includes(err?.status)) {
    return "מפתח ה-API של Gemini נדחה. בדקי שהמפתח בקובץ .env נכון ושהוא פעיל.";
  }
  if (err?.status === 429 || /RESOURCE_EXHAUSTED/i.test(msg)) {
    return "חרגת ממכסת השימוש ב-Gemini. נסי שוב בעוד כמה דקות או בדקי את המכסה בחשבון.";
  }
  if (isRetryable(err)) return "השירות של Gemini עמוס או לא זמין כרגע, גם אחרי כמה ניסיונות. נסי שוב בעוד כמה דקות.";
  return msg;
}

async function withRetry(task, { delayMs }) {
  for (let attempt = 1; ; attempt++) {
    const last = attempt >= MAX_ATTEMPTS;
    try {
      return await task({ last });
    } catch (err) {
      if (last || !isRetryable(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** (attempt - 1)));
    }
  }
}

/** מזהה לולאה של Gemini שחוזר שוב ושוב על אותו משפט. */
function collapseRepeats(segments, { strict }) {
  const out = [];
  let run = 0;
  for (const seg of segments) {
    const prev = out.at(-1);
    run = prev && prev.speaker === seg.speaker && prev.text === seg.text ? run + 1 : 1;
    if (run > 3) {
      if (strict) throw new BadResponseError("Gemini חזר על אותו משפט שוב ושוב");
      continue;
    }
    out.push(seg);
  }
  return out;
}

async function transcribeChunk({ client, model, mp3Path, part, retryDelayMs }) {
  const data = (await readFile(mp3Path)).toString("base64");
  const config = { responseMimeType: "application/json", responseSchema };
  if (model.startsWith("gemini-3")) config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };

  return withRetry(
    async ({ last }) => {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: "audio/mpeg", data } }, { text: buildPrompt(part) }],
          },
        ],
        config,
      });
      const raw = response.text?.trim();
      if (!raw) throw new BadResponseError("Gemini החזיר תשובה ריקה");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.segments)) throw new BadResponseError("מבנה התשובה מ-Gemini לא תקין");
      return collapseRepeats(parsed.segments, { strict: !last });
    },
    { delayMs: retryDelayMs },
  );
}

/** ממפה מספרי דוברים לפי סדר הופעה ראשונה בכל השיחה, כדי שהמספור יהיה רציף (1, 2, 3...). */
function renumberSpeakers(segments) {
  const order = new Map();
  for (const seg of segments) {
    if (!order.has(seg.speaker)) order.set(seg.speaker, order.size + 1);
  }
  return segments.map((seg) => ({ ...seg, speaker: order.get(seg.speaker) }));
}

/**
 * @param {string} inputPath נתיב לקובץ שמע (AMR וכו')
 * @param {object} options
 * @param {import("@google/genai").GoogleGenAI} options.client
 * @param {string} options.model
 * @param {string} [options.sourceName] שם הקובץ להצגה בראש התמלול
 * @param {boolean} [options.timestamps]
 * @param {(p: {stage: string, progress: number, message: string}) => void} [options.onProgress]
 * @param {number} [options.chunkSeconds] אורך יעד לכל קטע שנשלח ל-Gemini
 * @param {number} [options.retryDelayMs]
 */
export async function transcribeFile(inputPath, options) {
  const {
    client,
    model,
    sourceName = path.basename(inputPath),
    timestamps = true,
    onProgress = () => {},
    chunkSeconds = 900,
    retryDelayMs = 2000,
  } = options;

  const workDir = await mkdtemp(path.join(os.tmpdir(), "call-transcriber-"));
  try {
    onProgress({ stage: "converting", progress: 0.02, message: "ממיר את הקובץ…" });
    const flacPath = path.join(workDir, "normalized.flac");
    await normalizeToFlac(inputPath, flacPath);

    onProgress({ stage: "analyzing", progress: 0.08, message: "מנתח את ההקלטה…" });
    const { duration, silences } = await analyzeAudio(flacPath);
    if (!(duration > 0.5)) throw new Error("ההקלטה ריקה או קצרה מדי לתמלול.");
    const chunks = planChunks(duration, silences, { target: chunkSeconds, window: Math.min(90, chunkSeconds / 4) });

    const all = [];
    for (const [index, chunk] of chunks.entries()) {
      onProgress({
        stage: "transcribing",
        progress: 0.1 + 0.88 * (index / chunks.length),
        message: chunks.length > 1 ? `מתמלל קטע ${index + 1} מתוך ${chunks.length}…` : "מתמלל…",
      });

      const mp3Path = path.join(workDir, `chunk-${index}.mp3`);
      await extractChunkMp3(flacPath, chunk, mp3Path);

      const previousLines = all.slice(-CONTEXT_LINES).map((s) => `Speaker ${s.speaker}: ${s.text.slice(0, 200)}`);
      const raw = await transcribeChunk({
        client,
        model,
        mp3Path,
        part: { index, total: chunks.length, previousLines },
        retryDelayMs,
      });

      const length = chunk.end - chunk.start;
      let lastStart = all.at(-1)?.start ?? chunk.start;
      const converted = [];
      for (const seg of raw) {
        const text = String(seg.text ?? "").trim();
        if (!text) continue;
        const relative = parseClock(seg.start);
        const start = relative === null ? lastStart : chunk.start + Math.min(relative, length);
        lastStart = Math.max(lastStart, start);
        converted.push({
          speaker: Math.max(1, Math.round(Number(seg.speaker)) || 1),
          start: lastStart,
          text,
        });
      }

      // קטע שנחתך באמצע דיבור של אותו דובר ממשיך את השורה האחרונה של הקטע הקודם.
      if (index > 0 && converted[0] && all.at(-1)?.speaker === converted[0].speaker) {
        all.at(-1).text += ` ${converted.shift().text}`;
      }
      all.push(...converted);
    }

    if (!all.length) throw new Error("לא זוהה דיבור בהקלטה.");

    const segments = renumberSpeakers(all);
    const text = formatTranscript(segments, { sourceName, durationSec: duration, timestamps });
    onProgress({ stage: "done", progress: 1, message: "התמלול מוכן" });
    return { text, segments, durationSec: duration, speakers: new Set(segments.map((s) => s.speaker)).size };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
