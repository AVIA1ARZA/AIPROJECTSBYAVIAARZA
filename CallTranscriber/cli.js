import "./src/env.js";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getClient, getModel } from "./src/client.js";
import { toFileContent } from "./src/format.js";
import { friendlyError, transcribeFile } from "./src/transcriber.js";

const USAGE = "שימוש: node cli.js <קובץ-שמע> [-o <קובץ-פלט.txt>] [--no-timestamps]";

const args = process.argv.slice(2);
const timestamps = !args.includes("--no-timestamps");
const outIndex = args.indexOf("-o");
const output = outIndex >= 0 ? args[outIndex + 1] : undefined;
const outValueIndex = outIndex >= 0 ? outIndex + 1 : -1;
const input = args.find((a, i) => !a.startsWith("-") && i !== outValueIndex);

if (!input || (outIndex >= 0 && !output)) {
  console.error(USAGE);
  process.exit(1);
}

const outPath = output ?? path.join(path.dirname(input), `${path.parse(input).name}-תמלול.txt`);

try {
  const result = await transcribeFile(input, {
    client: getClient(),
    model: getModel(),
    timestamps,
    onProgress: ({ message }) => console.error(message),
  });
  await writeFile(outPath, toFileContent(result.text), "utf8");
  console.error(`נשמר: ${outPath} (${result.speakers} דוברים)`);
} catch (err) {
  console.error(`שגיאה: ${friendlyError(err)}`);
  process.exit(1);
}
