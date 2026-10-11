import { Type } from "@google/genai";

/** סכמת התשובה: Gemini מחזיר JSON מובנה, ואנחנו מרכיבים ממנו את קובץ הטקסט בעצמנו. */
export const responseSchema = {
  type: Type.OBJECT,
  properties: {
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.INTEGER },
          start: { type: Type.STRING },
          text: { type: Type.STRING },
        },
        required: ["speaker", "start", "text"],
      },
    },
  },
  required: ["segments"],
};

/**
 * @param {{ index: number, total: number, previousLines?: string[] }} part
 *   index מתחיל ב-0. previousLines הן השורות האחרונות שתומללו בקטע הקודם, לשמירה על מספור דוברים עקבי.
 */
export function buildPrompt({ index, total, previousLines = [] }) {
  const lines = [
    "You are a professional Hebrew transcriber of recorded phone conversations.",
    "Transcribe the attached audio and separate it by speaker.",
    "",
    "Rules:",
    "1. Write the transcript in Hebrew letters with natural punctuation. Transcribe exactly what was said: do not summarize, translate, paraphrase or correct grammar.",
    "2. Keep Hebrew slang and colloquial forms as spoken. Omit non-word fillers such as \"אההה\" or \"ממממ\". Write numbers, prices and phone numbers as digits.",
    "3. Words or sentences in another language (English brand names, Arabic, Russian, etc.) stay in that language's own script. Do not translate them.",
    "4. Identify speakers by voice. Number them 1, 2, 3... in order of first appearance. The same person always keeps the same number. A phone call usually has 2 speakers; do not invent extra speakers. An automated voice (IVR, voicemail greeting) counts as its own speaker.",
    "5. Start a new segment whenever the speaker changes. Split a long uninterrupted monologue into segments of at most ~40 seconds, keeping the same speaker number. When speakers overlap, order the segments by who started first.",
    "6. \"start\" is the time the segment begins, relative to the start of THIS audio clip, formatted as MM:SS (or H:MM:SS if over an hour).",
    "7. If a word is truly unintelligible write [לא ברור] in its place; do not guess. Ignore music, ringing, silence and noise. Never invent speech: if the clip contains no speech, return an empty segments array.",
  ];

  if (total > 1) {
    lines.push("", `This clip is part ${index + 1} of ${total} of one continuous call.`);
  }
  if (previousLines.length) {
    lines.push(
      "The conversation so far ended with the lines below. They are given ONLY so you keep the speaker numbers consistent. Do NOT repeat them in your output:",
      ...previousLines.map((l) => `  ${l}`),
    );
  }

  return lines.join("\n");
}
