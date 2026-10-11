import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.js";
import { fakeClient, writeFakeAmr } from "../test-support/helpers.js";

let server, base, dir, client;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "ct-test-"));
  client = fakeClient(() => ({
    segments: [
      { speaker: 1, start: "00:00", text: "שלום, זו בדיקה." },
      { speaker: 2, start: "00:05", text: "קיבלתי, תודה." },
    ],
  }));
  const app = createApp({ getClient: () => client, hasApiKey: () => true, retryDelayMs: 1 });
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

async function upload(fileName, { timestamps = "on" } = {}) {
  const amr = path.join(dir, "src.amr");
  writeFakeAmr(amr, 12);
  const form = new FormData();
  form.append("timestamps", timestamps);
  form.append("audio", new Blob([await (await import("node:fs/promises")).readFile(amr)]), fileName);
  return fetch(`${base}/api/transcribe`, { method: "POST", body: form });
}

async function waitForDone(id) {
  for (let i = 0; i < 100; i++) {
    const job = await (await fetch(`${base}/api/jobs/${id}`)).json();
    if (job.status !== "working") return job;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("timeout");
}

test("הממשק נטען ובודק סטטוס", async () => {
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /מתמלל/);
  assert.deepEqual(await (await fetch(`${base}/api/status`)).json(), { ready: true, model: "gemini-3.5-flash" });
});

test("העלאה → תמלול → הורדה, עם שם קובץ בעברית", async () => {
  const res = await upload("שיחה עם לקוח.amr");
  assert.equal(res.status, 202);
  const { id } = await res.json();

  const job = await waitForDone(id);
  assert.equal(job.status, "done", job.error);
  assert.equal(job.sourceName, "שיחה עם לקוח.amr");
  assert.equal(job.result.speakers, 2);
  assert.equal(job.result.segments.length, 2);

  const download = await fetch(`${base}/api/jobs/${id}/download`);
  assert.match(download.headers.get("content-type"), /text\/plain; charset=utf-8/);
  assert.equal(
    decodeURIComponent(download.headers.get("content-disposition").split("filename*=UTF-8''")[1]),
    "שיחה עם לקוח-תמלול.txt",
  );
  const bytes = Buffer.from(await download.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], "BOM של UTF-8");
  assert.match(bytes.toString("utf8"), /דובר 1 \[00:00\]:\nשלום, זו בדיקה\./);

  // קבצי ההעלאה הזמניים נמחקים בסוף
  const leftovers = await readdir(path.join(os.tmpdir(), "call-transcriber-uploads"));
  assert.equal(leftovers.length, 0);
});

test("בלי זמנים כשביקשו לכבות", async () => {
  const { id } = await (await upload("a.amr", { timestamps: "off" })).json();
  const job = await waitForDone(id);
  assert.doesNotMatch(job.result.text, /\[\d\d:\d\d\]/);
});

test("קובץ פגום מחזיר שגיאה בעברית ולא תוקע", async () => {
  const form = new FormData();
  form.append("audio", new Blob(["זה לא שמע"]), "bad.amr");
  const { id } = await (await fetch(`${base}/api/transcribe`, { method: "POST", body: form })).json();
  const job = await waitForDone(id);
  assert.equal(job.status, "error");
  assert.match(job.error, /לא הצלחתי לקרוא את קובץ השמע/);
});

test("בקשה בלי קובץ ומשימה לא קיימת", async () => {
  const none = await fetch(`${base}/api/transcribe`, { method: "POST", body: new FormData() });
  assert.equal(none.status, 400);
  assert.equal((await fetch(`${base}/api/jobs/nope`)).status, 404);
  assert.equal((await fetch(`${base}/api/jobs/nope/download`)).status, 404);
});

test("בלי מפתח API השרת מסרב לפני קבלת הקובץ", async () => {
  const app = createApp({ hasApiKey: () => false });
  const s = await new Promise((resolve) => { const x = app.listen(0, "127.0.0.1", () => resolve(x)); });
  try {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/api/transcribe`, { method: "POST", body: new FormData() });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /GEMINI_API_KEY/);
    const status = await (await fetch(`http://127.0.0.1:${s.address().port}/api/status`)).json();
    assert.equal(status.ready, false);
  } finally {
    s.close();
  }
});
