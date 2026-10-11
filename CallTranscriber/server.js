import "./src/env.js";
import { createApp } from "./src/app.js";
import { getModel, hasApiKey } from "./src/client.js";

const port = Number(process.env.PORT) || 3000;
// ברירת מחדל: נגיש רק מהמחשב הזה, כי כל תמלול נחשב על חשבון מפתח ה-API שלך.
const host = process.env.HOST || "127.0.0.1";

createApp().listen(port, host, () => {
  console.log(`מתמלל השיחות פועל: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  console.log(`מודל: ${getModel()}`);
  if (!hasApiKey()) console.warn("אזהרה: GEMINI_API_KEY לא מוגדר. צרי קובץ .env לפי .env.example.");
});
