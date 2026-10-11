import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { transcribeFile } from "../src/transcriber.js";
import { fakeClient, writeFakeAmr, writeGatedTone } from "../test-support/helpers.js";

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ct-test-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const baseOptions = { model: "gemini-3.5-flash", retryDelayMs: 1 };

test("קובץ AMR קצר: קריאה אחת ל-Gemini ותמלול מעוצב", () =>
  withTempDir(async (dir) => {
    const amr = path.join(dir, "שיחה.amr");
    writeFakeAmr(amr, 12);
    const client = fakeClient(() => ({
      segments: [
        { speaker: 1, start: "00:00", text: "שלום, מדברת אביה." },
        { speaker: 2, start: "00:04", text: "היי אביה, מה שלומך?" },
        { speaker: 1, start: "00:08", text: "מצוין, תודה." },
      ],
    }));

    const stages = [];
    const result = await transcribeFile(amr, { ...baseOptions, client, sourceName: "שיחה.amr", onProgress: (p) => stages.push(p.stage) });

    assert.equal(client.calls.length, 1);
    assert.equal(client.calls[0].mimeType, "audio/mpeg");
    assert.deepEqual(client.calls[0].config.thinkingConfig, { thinkingLevel: "LOW" });
    assert.equal(client.calls[0].config.responseMimeType, "application/json");
    assert.deepEqual([...new Set(stages)], ["converting", "analyzing", "transcribing", "done"]);
    assert.equal(result.speakers, 2);
    assert.match(result.text, /דובר 1 \[00:00\]:\nשלום, מדברת אביה\./);
    assert.match(result.text, /דובר 2 \[00:04\]:\nהיי אביה, מה שלומך\?/);
    assert.match(result.text, /תמלול שיחה: שיחה\.amr/);
  }));

test("הקלטה ארוכה: חלוקה לקטעים, הסטת זמנים, הקשר לדוברים ומיזוג בגבול הקטע", () =>
  withTempDir(async (dir) => {
    const wav = path.join(dir, "long.wav");
    writeGatedTone(wav, 70);
    const client = fakeClient((call) =>
      call === 0
        ? { segments: [{ speaker: 1, start: "00:01", text: "אני מתחילה משפט" }, { speaker: 2, start: "00:20", text: "הבנתי." }] }
        : { segments: [{ speaker: 2, start: "00:00", text: "ועכשיו ממשיכה." }, { speaker: 1, start: "00:05", text: "תודה." }] },
    );

    const result = await transcribeFile(wav, { ...baseOptions, client, chunkSeconds: 30, timestamps: true });

    assert.ok(client.calls.length >= 3, `צפויים לפחות 3 קטעים, נשלחו ${client.calls.length}`);
    assert.match(client.calls[0].prompt, /part 1 of/);
    assert.doesNotMatch(client.calls[0].prompt, /conversation so far/);
    assert.match(client.calls[1].prompt, new RegExp(`part 2 of ${client.calls.length}`));
    assert.match(client.calls[1].prompt, /Speaker 2: הבנתי\./);

    // הקטע השני מתחיל סביב שנייה 29 (שקט בין 28 ל-30), ו"00:05" בתוכו מוסט ל-~34
    const thanks = result.segments.find((s) => s.text === "תודה.");
    assert.ok(thanks.start >= 32 && thanks.start <= 36, `זמן מוסט צפוי ~34, התקבל ${thanks.start}`);
    // אותו דובר בסוף קטע אחד ובתחילת הבא מתמזגים לשורה אחת, אחרת "הבנתי." ו"ועכשיו" היו נפרדים
    assert.ok(result.segments.some((s) => s.text.includes("הבנתי. ועכשיו ממשיכה.")));
    // זמנים עולים בלבד
    for (let i = 1; i < result.segments.length; i++) assert.ok(result.segments[i].start >= result.segments[i - 1].start);
  }));

test("מספור הדוברים מסודר לפי סדר ההופעה", () =>
  withTempDir(async (dir) => {
    const amr = path.join(dir, "a.amr");
    writeFakeAmr(amr, 10);
    const client = fakeClient(() => ({
      segments: [
        { speaker: 3, start: "00:00", text: "ראשון" },
        { speaker: 7, start: "00:03", text: "שני" },
      ],
    }));
    const { segments } = await transcribeFile(amr, { ...baseOptions, client });
    assert.deepEqual(segments.map((s) => s.speaker), [1, 2]);
  }));

test("שגיאה זמנית (503) מנוסה שוב ואז מצליחה", () =>
  withTempDir(async (dir) => {
    const amr = path.join(dir, "a.amr");
    writeFakeAmr(amr, 10);
    let attempts = 0;
    const client = {
      models: {
        async generateContent() {
          if (++attempts < 3) throw Object.assign(new Error("The model is overloaded"), { status: 503 });
          return { text: JSON.stringify({ segments: [{ speaker: 1, start: "00:00", text: "הצלחה" }] }) };
        },
      },
    };
    const { text } = await transcribeFile(amr, { ...baseOptions, client });
    assert.equal(attempts, 3);
    assert.match(text, /הצלחה/);
  }));

test("מפתח לא תקין לא מנוסה שוב", () =>
  withTempDir(async (dir) => {
    const amr = path.join(dir, "a.amr");
    writeFakeAmr(amr, 10);
    let attempts = 0;
    const client = {
      models: {
        async generateContent() {
          attempts++;
          throw Object.assign(new Error("API key not valid"), { status: 400 });
        },
      },
    };
    await assert.rejects(transcribeFile(amr, { ...baseOptions, client }), /API key/);
    assert.equal(attempts, 1);
  }));

test("לולאת חזרות של המודל נחתכת", () =>
  withTempDir(async (dir) => {
    const amr = path.join(dir, "a.amr");
    writeFakeAmr(amr, 10);
    const looping = { segments: Array.from({ length: 12 }, (_, i) => ({ speaker: 1, start: `00:0${i % 9}`, text: "כן כן" })) };
    const client = fakeClient(() => looping);
    const { segments } = await transcribeFile(amr, { ...baseOptions, client });
    assert.equal(client.calls.length, 4, "מנסה שוב עד למקסימום לפני שמקבל את התשובה");
    assert.equal(segments.length, 3);
  }));

test("הקלטה בלי דיבור נכשלת בהודעה ברורה", () =>
  withTempDir(async (dir) => {
    const amr = path.join(dir, "a.amr");
    writeFakeAmr(amr, 10);
    const client = fakeClient(() => ({ segments: [] }));
    await assert.rejects(transcribeFile(amr, { ...baseOptions, client }), /לא זוהה דיבור/);
  }));
