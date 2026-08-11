import type { StorageLike } from "./store";

export const PARENT_ACCESS_KEY = "croatian-money-pet-game:parent-access:v1";

const ITERATIONS = 120_000;
const SALT_BYTES = 16;
const HASH = "SHA-256";
const DERIVED_BITS = 256;

export const PARENT_ACCESS_CODES = [
  "setup-required",
  "credential-present",
  "setup-success",
  "unlock-success",
  "invalid-format",
  "mismatch",
  "wrong-pin",
  "malformed-record",
  "unknown-version",
  "crypto-unavailable",
  "storage-unavailable",
] as const;

export type ParentAccessCode = (typeof PARENT_ACCESS_CODES)[number];
export interface ParentAccessResult { code: ParentAccessCode; unlocked: boolean }

interface ParentAccessRecordV1 {
  version: 1;
  algorithm: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
  verifier: string;
}

type CryptoLike = Pick<Crypto, "getRandomValues" | "subtle">;

function closed(code: ParentAccessCode): ParentAccessResult {
  return { code, unlocked: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return bytesToBase64(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

function parseRecord(raw: string): { record?: ParentAccessRecordV1; code?: ParentAccessCode } {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { code: "malformed-record" }; }
  if (!isRecord(parsed) || parsed.version !== 1) return { code: "unknown-version" };
  if (
    parsed.algorithm !== "PBKDF2" || parsed.hash !== HASH || parsed.iterations !== ITERATIONS ||
    typeof parsed.salt !== "string" || typeof parsed.verifier !== "string"
  ) return { code: "malformed-record" };
  const salt = base64ToBytes(parsed.salt);
  const verifier = base64ToBytes(parsed.verifier);
  if (!salt || salt.length !== SALT_BYTES || !verifier || verifier.length !== DERIVED_BITS / 8) return { code: "malformed-record" };
  return { record: parsed as unknown as ParentAccessRecordV1 };
}

function hasCrypto(crypto: CryptoLike | undefined): crypto is CryptoLike {
  return Boolean(crypto?.subtle && typeof crypto.getRandomValues === "function");
}

async function derive(pin: string, record: Pick<ParentAccessRecordV1, "hash" | "iterations" | "salt">, crypto: CryptoLike): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const salt = base64ToBytes(record.salt);
  if (!salt) throw new Error("invalid salt");
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: record.hash, iterations: record.iterations, salt }, material, DERIVED_BITS);
  return new Uint8Array(bits);
}

export function inspectParentAccess(storage: StorageLike): ParentAccessResult {
  let raw: string | null;
  try { raw = storage.getItem(PARENT_ACCESS_KEY); }
  catch { return closed("storage-unavailable"); }
  if (raw === null) return closed("setup-required");
  const parsed = parseRecord(raw);
  return closed(parsed.code ?? "credential-present");
}

export async function setupParentAccess(storage: StorageLike, crypto: CryptoLike | undefined, pin: string, confirmation: string): Promise<ParentAccessResult> {
  if (!/^\d{6}$/.test(pin) || !/^\d{6}$/.test(confirmation)) return closed("invalid-format");
  if (pin !== confirmation) return closed("mismatch");
  const status = inspectParentAccess(storage);
  if (status.code !== "setup-required") return status;
  if (!hasCrypto(crypto)) return closed("crypto-unavailable");

  let serialized: string;
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const record: ParentAccessRecordV1 = { version: 1, algorithm: "PBKDF2", hash: HASH, iterations: ITERATIONS, salt: bytesToBase64(salt), verifier: "" };
    record.verifier = bytesToBase64(await derive(pin, record, crypto));
    serialized = JSON.stringify(record);
  } catch {
    return closed("crypto-unavailable");
  }
  try { storage.setItem(PARENT_ACCESS_KEY, serialized); }
  catch { return closed("storage-unavailable"); }
  return { code: "setup-success", unlocked: true };
}

export async function unlockParentAccess(storage: StorageLike, crypto: CryptoLike | undefined, pin: string): Promise<ParentAccessResult> {
  if (!/^\d{6}$/.test(pin)) return closed("invalid-format");
  let raw: string | null;
  try { raw = storage.getItem(PARENT_ACCESS_KEY); }
  catch { return closed("storage-unavailable"); }
  if (raw === null) return closed("setup-required");
  const parsed = parseRecord(raw);
  if (!parsed.record) return closed(parsed.code ?? "malformed-record");
  if (!hasCrypto(crypto)) return closed("crypto-unavailable");
  try {
    const expected = base64ToBytes(parsed.record.verifier);
    const actual = await derive(pin, parsed.record, crypto);
    if (!expected || expected.length !== actual.length) return closed("malformed-record");
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
    return difference === 0 ? { code: "unlock-success", unlocked: true } : closed("wrong-pin");
  } catch {
    return closed("crypto-unavailable");
  }
}
