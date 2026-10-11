import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { analyzeAudio, extractChunkMp3, normalizeToFlac, planChunks } from "../src/audio.js";
import { writeFakeAmr, writeGatedTone } from "../test-support/helpers.js";

test("planChunks: הקלטה קצרה נשארת קטע אחד", () => {
  assert.deepEqual(planChunks(600, []), [{ start: 0, end: 600 }]);
});

test("planChunks: חיתוך מוצמד לשקט הארוך ביותר בטווח", () => {
  const silences = [
    { start: 880, end: 881 }, // קצר
    { start: 905, end: 908 }, // הארוך ביותר בטווח ±90 מ-900
    { start: 1500, end: 1510 }, // רחוק מדי
  ];
  const chunks = planChunks(2000, silences, { target: 900, window: 90 });
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].end, 906.5);
  assert.equal(chunks[1].start, 906.5);
  assert.equal(chunks.at(-1).end, 2000);
});

test("planChunks: בלי שקט חותכים בנקודה האידיאלית והקטעים רציפים", () => {
  const chunks = planChunks(3000, [], { target: 900 });
  assert.deepEqual(chunks.map((c) => c.start), [0, 900, 1800, 2700]);
  assert.equal(chunks.at(-1).end, 3000);
  for (let i = 1; i < chunks.length; i++) assert.equal(chunks[i].start, chunks[i - 1].end);
});

test("קובץ AMR מתפענח לפי המשך האמיתי ומומר ל-MP3", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ct-test-"));
  try {
    const amr = path.join(dir, "call.amr");
    writeFakeAmr(amr, 20);
    const flac = path.join(dir, "n.flac");
    await normalizeToFlac(amr, flac);

    const { duration } = await analyzeAudio(flac);
    assert.ok(Math.abs(duration - 20) < 0.5, `משך צפוי ~20 שניות, התקבל ${duration}`);

    const mp3 = path.join(dir, "c.mp3");
    await extractChunkMp3(flac, { start: 5, end: 15 }, mp3);
    assert.ok((await stat(mp3)).size > 10_000);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("analyzeAudio מזהה קטעי שקט", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ct-test-"));
  try {
    const wav = path.join(dir, "tone.wav");
    writeGatedTone(wav, 30);
    const { duration, silences } = await analyzeAudio(wav);
    assert.ok(Math.abs(duration - 30) < 0.5);
    // שקט בין 8 ל-10, 18 ל-20, 28 ל-30 (האחרון נפתח בלי סגירה ולכן לא נספר)
    assert.ok(silences.length >= 2);
    assert.ok(Math.abs(silences[0].start - 8) < 0.3 && Math.abs(silences[0].end - 10) < 0.3);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("קובץ שאינו שמע נדחה בהודעה ברורה", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ct-test-"));
  try {
    const bogus = path.join(dir, "bogus.amr");
    (await import("node:fs")).writeFileSync(bogus, "this is not audio");
    await assert.rejects(normalizeToFlac(bogus, path.join(dir, "o.flac")), /לא הצלחתי לקרוא את קובץ השמע/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
