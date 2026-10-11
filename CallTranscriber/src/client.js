import { GoogleGenAI } from "@google/genai";

export const DEFAULT_MODEL = "gemini-3.5-flash";

let cached = null;

export function getModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function hasApiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getClient() {
  if (!hasApiKey()) {
    throw new Error("חסר מפתח GEMINI_API_KEY. צרי קובץ .env בתיקיית CallTranscriber (לפי .env.example) והוסיפי אליו את המפתח.");
  }
  cached ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 10 * 60 * 1000 },
  });
  return cached;
}
