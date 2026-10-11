import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

/** ffmpeg מגיע מחבילת ffmpeg-static; אפשר לעקוף עם FFMPEG_PATH או ffmpeg מותקן במערכת. */
const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, ["-hide_banner", "-nostdin", ...args]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      reject(
        new Error(
          err.code === "ENOENT"
            ? "ffmpeg לא נמצא. הריצי npm install מחדש, או הגדירי FFMPEG_PATH לנתיב של ffmpeg."
            : `הפעלת ffmpeg נכשלה: ${err.message}`,
        ),
      );
    });
    child.on("close", (code) => {
      if (code === 0) return resolve(stderr);
      const tail = stderr.trim().split("\n").slice(-3).join(" | ");
      reject(new Error(`ffmpeg נכשל (קוד ${code}): ${tail}`));
    });
  });
}

/**
 * ממיר כל קובץ שמע/וידאו (AMR, AMR-WB, 3GP, M4A, MP3, WAV...) ל-FLAC מונו 16kHz.
 * זה הפורמט הביניים שממנו חותכים את הקטעים ששולחים ל-Gemini.
 */
export async function normalizeToFlac(inputPath, outputPath) {
  try {
    await runFfmpeg(["-y", "-v", "error", "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "flac", outputPath]);
  } catch (err) {
    throw new Error(
      `לא הצלחתי לקרוא את קובץ השמע. ודאי שהקובץ תקין ושאינו ריק. (${err.message})`,
    );
  }
}

/**
 * מעבר אחד על הקובץ המנורמל: מחזיר את משך ההקלטה בשניות ואת רשימת קטעי השקט.
 * את המשך לוקחים ממה שנפענח בפועל (ולא מהכותרת), כי לקבצי AMR גולמיים אין כותרת משך אמינה.
 */
export async function analyzeAudio(flacPath, { noiseDb = -30, minSilence = 0.6 } = {}) {
  const log = await runFfmpeg([
    "-v", "info",
    "-i", flacPath,
    "-af", `silencedetect=noise=${noiseDb}dB:d=${minSilence}`,
    "-f", "null", "-",
  ]);

  const times = [...log.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
  const last = times.at(-1);
  const duration = last ? Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]) : 0;

  const silences = [];
  let openStart = null;
  for (const line of log.split(/\r?\n|\r/)) {
    const start = line.match(/silence_start:\s*(-?\d+(?:\.\d+)?)/);
    const end = line.match(/silence_end:\s*(-?\d+(?:\.\d+)?)/);
    if (start) openStart = Math.max(0, Number(start[1]));
    if (end && openStart !== null) {
      silences.push({ start: openStart, end: Number(end[1]) });
      openStart = null;
    }
  }
  return { duration, silences };
}

/**
 * מתכנן חלוקה לקטעים באורך ~target שניות. כל חיתוך מוצמד לשקט הארוך ביותר בטווח
 * ±window סביב נקודת החיתוך האידיאלית, כדי לא לחתוך באמצע משפט.
 */
export function planChunks(duration, silences, { target = 900, window = 90 } = {}) {
  if (duration <= target * 1.25) return [{ start: 0, end: duration }];

  const chunks = [];
  let pos = 0;
  while (duration - pos > target * 1.25) {
    const ideal = pos + target;
    const candidates = silences
      .map((s) => ({ at: (s.start + s.end) / 2, length: s.end - s.start }))
      .filter((s) => Math.abs(s.at - ideal) <= window && s.at > pos + 1);
    candidates.sort((a, b) => b.length - a.length || Math.abs(a.at - ideal) - Math.abs(b.at - ideal));
    const cut = candidates.length ? candidates[0].at : ideal;
    chunks.push({ start: pos, end: cut });
    pos = cut;
  }
  chunks.push({ start: pos, end: duration });
  return chunks;
}

/** חותך קטע מהקובץ המנורמל ומקודד ל-MP3 מונו קל (פורמט שנתמך רשמית ב-Gemini). */
export async function extractChunkMp3(flacPath, { start, end }, outputPath) {
  await runFfmpeg([
    "-y", "-v", "error",
    "-ss", start.toFixed(3),
    "-t", (end - start).toFixed(3),
    "-i", flacPath,
    "-ac", "1", "-ar", "16000",
    "-c:a", "libmp3lame", "-b:a", "48k",
    outputPath,
  ]);
}
