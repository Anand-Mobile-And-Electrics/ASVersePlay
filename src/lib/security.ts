import bcrypt from "bcryptjs";
import crypto from "crypto";

const PASSWORD_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createRandomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}
