import crypto from "crypto";
import bcrypt from "bcrypt";

// Unambiguous lowercase alphabet (no 0/o/1/l/i) so codes are easy to read aloud
// and re-type. Each code is two 5-char groups, e.g. "k7m2p-r9xqs".
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const GROUP_LEN = 5;
const GROUPS = 2;
export const RECOVERY_CODE_COUNT = 10;

/** Generate `count` fresh plaintext recovery codes (format "xxxxx-xxxxx"). */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  const codes = [];
  const total = GROUP_LEN * GROUPS;
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(total);
    let raw = "";
    for (let j = 0; j < total; j++) raw += ALPHABET[bytes[j] % ALPHABET.length];
    codes.push(`${raw.slice(0, GROUP_LEN)}-${raw.slice(GROUP_LEN)}`);
  }
  return codes;
}

/** Strip formatting so "K7M2P-R9XQS" and "k7m2pr9xqs" hash/compare identically. */
export function normalizeRecoveryCode(input) {
  return String(input || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Bcrypt-hash a batch of plaintext codes for at-rest storage. */
export function hashRecoveryCodes(codes) {
  return Promise.all(codes.map((c) => bcrypt.hash(normalizeRecoveryCode(c), 10)));
}

/**
 * Find which stored hash a supplied code matches. Returns the index, or -1 if
 * none match. Callers consume the code by dropping that index.
 */
export async function findRecoveryCodeMatch(plain, hashes) {
  const normalized = normalizeRecoveryCode(plain);
  if (!normalized || !Array.isArray(hashes)) return -1;
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalized, hashes[i])) return i;
  }
  return -1;
}
