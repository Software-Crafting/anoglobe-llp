import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { decrypt, encrypt } from "./secure";

// Outside public/, encrypted, and only readable through the signed-in admin route.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const FILE_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

export const fileExtension = (name: string) => path.extname(name).toLowerCase();

export async function storeFile(data: Buffer): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 });
  const key = crypto.randomUUID();
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, key), encrypt(data), { mode: 0o600 });
  return key;
}

const safePath = (key: string) => path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, path.basename(key));

export async function readFile(key: string): Promise<Buffer> {
  return decrypt(await fs.readFile(safePath(key)));
}

export async function removeFile(key: string) {
  await fs.rm(safePath(key), { force: true });
}
