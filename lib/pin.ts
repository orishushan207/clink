// Server-only helpers for hashing/verifying guest PINs.
// Uses Node's built-in crypto (scrypt) — no extra dependency needed.
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const hashBuffer = Buffer.from(hash, "hex");
    const candidate = scryptSync(pin, salt, 64);
    if (candidate.length !== hashBuffer.length) return false;
    return timingSafeEqual(candidate, hashBuffer);
  } catch {
    return false;
  }
}
