import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import ffmpegStatic from "ffmpeg-static";

/**
 * קובץ AMR-NB תקני (כותרת #!AMR + פריימים של 12.2kbps, 20ms כל אחד).
 * ל-ffmpeg אין מקודד AMR, אז בונים את המבנה ידנית; התוכן רעש, אבל המפענח מתייחס אליו כאל AMR אמיתי.
 */
export function writeFakeAmr(filePath, seconds) {
  const frames = [Buffer.from("#!AMR\n")];
  for (let i = 0; i < seconds * 50; i++) {
    frames.push(Buffer.from([0x3c]), randomBytes(31)); // FT=7 (12.2kbps), Q=1
  }
  writeFileSync(filePath, Buffer.concat(frames));
}

/** WAV עם צליל של 8 שניות ושקט של 2 שניות, לסירוגין. */
export function writeGatedTone(filePath, seconds) {
  const result = spawnSync(
    ffmpegStatic,
    [
      "-y", "-v", "error",
      "-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}:sample_rate=16000`,
      "-af", "volume='if(lt(mod(t,10),8),1,0)':eval=frame",
      filePath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`יצירת קובץ הבדיקה נכשלה: ${result.stderr}`);
}

/** לקוח Gemini מזויף. `reply(callIndex, prompt)` מחזיר את אובייקט ה-JSON להחזרה. */
export function fakeClient(reply) {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent(request) {
        const [audio, prompt] = request.contents[0].parts;
        const call = { model: request.model, config: request.config, mimeType: audio.inlineData.mimeType, bytes: audio.inlineData.data.length, prompt: prompt.text };
        calls.push(call);
        return { text: JSON.stringify(await reply(calls.length - 1, prompt.text)) };
      },
    },
  };
}
