/** "MM:SS" / "H:MM:SS" / "SS" -> שניות. מחזיר null אם הערך לא קריא. */
export function parseClock(value) {
  if (typeof value !== "string") return null;
  const parts = value.trim().replace(/[\[\]]/g, "").split(":").map(Number);
  if (!parts.length || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

export function formatClock(seconds, withHours = false) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return withHours || h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${sec}`
    : `${String(m).padStart(2, "0")}:${sec}`;
}

/** BOM בתחילת הקובץ גורם לעורכי טקסט ישנים (Notepad ב-Windows) לזהות UTF-8 ולהציג עברית נכון. */
export function toFileContent(text) {
  return `﻿${text}`;
}

/**
 * בונה את קובץ הטקסט. שם הדובר מופיע ראשון בכל בלוק כדי שעורכי טקסט
 * (כמו Notepad) יזהו את הפסקה כמימין לשמאל לפי האות העברית הראשונה.
 */
export function formatTranscript(segments, { sourceName, durationSec, timestamps = true, date = new Date() }) {
  const speakers = new Set(segments.map((s) => s.speaker)).size;
  const withHours = durationSec >= 3600;

  const header = [
    `תמלול שיחה: ${sourceName}`,
    `משך ההקלטה: ${formatClock(durationSec, withHours)} | מספר דוברים: ${speakers} | תומלל בתאריך: ${date.toLocaleDateString("he-IL")}`,
    "=".repeat(48),
  ];

  const blocks = segments.map((seg) => {
    const label = timestamps
      ? `דובר ${seg.speaker} [${formatClock(seg.start, withHours)}]:`
      : `דובר ${seg.speaker}:`;
    return `${label}\n${seg.text}`;
  });

  return `${header.join("\n")}\n\n${blocks.join("\n\n")}\n`;
}
