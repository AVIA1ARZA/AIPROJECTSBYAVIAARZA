import assert from "node:assert/strict";
import test from "node:test";
import { formatClock, formatTranscript, parseClock, toFileContent } from "../src/format.js";

test("parseClock מפענח MM:SS, H:MM:SS ופורמטים שגויים", () => {
  assert.equal(parseClock("01:05"), 65);
  assert.equal(parseClock("1:02:03"), 3723);
  assert.equal(parseClock("[00:07]"), 7);
  assert.equal(parseClock("45"), 45);
  assert.equal(parseClock("abc"), null);
  assert.equal(parseClock(undefined), null);
});

test("formatClock מוסיף שעות רק כשצריך", () => {
  assert.equal(formatClock(65), "01:05");
  assert.equal(formatClock(3723), "1:02:03");
  assert.equal(formatClock(65, true), "0:01:05");
});

test("formatTranscript: שם הדובר ראשון בכל בלוק, עם זמן או בלעדיו", () => {
  const segments = [
    { speaker: 1, start: 0, text: "שלום, מדברת אביה." },
    { speaker: 2, start: 4, text: "היי, מה שלומך?" },
  ];
  const meta = { sourceName: "call.amr", durationSec: 9, date: new Date("2026-10-11T10:00:00Z") };

  const withTime = formatTranscript(segments, { ...meta, timestamps: true });
  assert.match(withTime, /^תמלול שיחה: call\.amr/);
  assert.match(withTime, /מספר דוברים: 2/);
  assert.match(withTime, /\nדובר 1 \[00:00\]:\nשלום, מדברת אביה\.\n\nדובר 2 \[00:04\]:\nהיי, מה שלומך\?\n$/);

  const without = formatTranscript(segments, { ...meta, timestamps: false });
  assert.match(without, /\nדובר 2:\nהיי, מה שלומך\?\n$/);
  assert.doesNotMatch(without, /\[\d\d:\d\d\]/);
});

test("toFileContent מוסיף BOM של UTF-8", () => {
  assert.equal(toFileContent("שלום").charCodeAt(0), 0xfeff);
});
