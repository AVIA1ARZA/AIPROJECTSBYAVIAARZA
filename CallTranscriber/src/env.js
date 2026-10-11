import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// טוען את .env מתיקיית הפרויקט, בלי קשר לתיקייה שממנה הופעלה התוכנה.
dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
  quiet: true,
});
