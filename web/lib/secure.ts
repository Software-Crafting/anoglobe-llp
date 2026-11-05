// Passwords, tokens and encryption at rest. Node crypto only.
import crypto from "node:crypto";

export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Tokens are long and random, so a plain hash is enough to store them. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function checkPassword(password: string, stored: string | null): boolean {
  // A missing account still does the scrypt work, so timing does not reveal which emails exist.
  const [, saltHex, hashHex] = (stored ?? `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`).split("$");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return crypto.timingSafeEqual(actual, Buffer.from(hashHex, "hex")) && stored !== null;
}

function encryptionKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SECRET must be set to at least 32 characters");
  return crypto.createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Output is iv + tag + ciphertext. */
export function encrypt(plain: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function decrypt(data: Buffer): Buffer {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
}

export const encryptText = (text: string) => encrypt(Buffer.from(text)).toString("base64");
export const decryptText = (text: string) => decrypt(Buffer.from(text, "base64")).toString();
