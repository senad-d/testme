import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { STORAGE_KEY, type StorageLike } from "./store";
import { PARENT_ACCESS_KEY, inspectParentAccess, setupParentAccess, unlockParentAccess } from "./parent-access";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const crypto = webcrypto as unknown as Crypto;

describe("local parent access", () => {
  it("detects first run, stores only a salted verifier, and unlocks the right PIN", async () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "game-data");
    expect(inspectParentAccess(storage)).toEqual({ code: "setup-required", unlocked: false });
    expect(await setupParentAccess(storage, crypto, "246810", "246810")).toEqual({ code: "setup-success", unlocked: true });

    const raw = storage.getItem(PARENT_ACCESS_KEY)!;
    const record = JSON.parse(raw);
    expect(record).toMatchObject({ version: 1, algorithm: "PBKDF2", hash: "SHA-256", iterations: 120_000 });
    expect(record.salt).toBeTruthy();
    expect(record.verifier).toBeTruthy();
    expect(raw).not.toContain("246810");
    expect(storage.getItem(STORAGE_KEY)).toBe("game-data");
    expect(await unlockParentAccess(storage, crypto, "111111")).toEqual({ code: "wrong-pin", unlocked: false });
    expect(await unlockParentAccess(storage, crypto, "246810")).toEqual({ code: "unlock-success", unlocked: true });
  });

  it("rejects invalid and mismatched values without writing", async () => {
    const storage = new MemoryStorage();
    expect(await setupParentAccess(storage, crypto, "12345", "12345")).toEqual({ code: "invalid-format", unlocked: false });
    expect(await setupParentAccess(storage, crypto, "123456", "654321")).toEqual({ code: "mismatch", unlocked: false });
    expect(storage.data.size).toBe(0);
  });

  it("uses a fresh random salt for independent setups", async () => {
    const first = new MemoryStorage();
    const second = new MemoryStorage();
    await setupParentAccess(first, crypto, "123456", "123456");
    await setupParentAccess(second, crypto, "123456", "123456");
    expect(JSON.parse(first.getItem(PARENT_ACCESS_KEY)!).salt).not.toBe(JSON.parse(second.getItem(PARENT_ACCESS_KEY)!).salt);
    expect(first.getItem(PARENT_ACCESS_KEY)).not.toBe(second.getItem(PARENT_ACCESS_KEY));
  });

  it("fails closed for malformed, unknown, unavailable, and failing dependencies", async () => {
    const malformed = new MemoryStorage();
    malformed.setItem(PARENT_ACCESS_KEY, "not-json");
    expect(inspectParentAccess(malformed)).toEqual({ code: "malformed-record", unlocked: false });
    expect(await unlockParentAccess(malformed, crypto, "123456")).toEqual({ code: "malformed-record", unlocked: false });
    expect(malformed.getItem(PARENT_ACCESS_KEY)).toBe("not-json");

    const unknown = new MemoryStorage();
    unknown.setItem(PARENT_ACCESS_KEY, JSON.stringify({ version: 9 }));
    expect(await unlockParentAccess(unknown, crypto, "123456")).toEqual({ code: "unknown-version", unlocked: false });

    const readFail: StorageLike = { getItem: () => { throw new Error("native read"); }, setItem: () => undefined };
    expect(await unlockParentAccess(readFail, crypto, "123456")).toEqual({ code: "storage-unavailable", unlocked: false });

    const writeFail: StorageLike = { getItem: () => null, setItem: () => { throw new Error("native write"); } };
    expect(await setupParentAccess(writeFail, crypto, "123456", "123456")).toEqual({ code: "storage-unavailable", unlocked: false });

    const noCrypto = undefined;
    expect(await setupParentAccess(new MemoryStorage(), noCrypto, "123456", "123456")).toEqual({ code: "crypto-unavailable", unlocked: false });

    const randomFail = { ...crypto, subtle: crypto.subtle, getRandomValues: () => { throw new Error("native random"); } } as unknown as Crypto;
    expect(await setupParentAccess(new MemoryStorage(), randomFail, "123456", "123456")).toEqual({ code: "crypto-unavailable", unlocked: false });

    const deriveFail = { getRandomValues: crypto.getRandomValues.bind(crypto), subtle: { importKey: async () => { throw new Error("native derive"); } } } as unknown as Crypto;
    expect(await setupParentAccess(new MemoryStorage(), deriveFail, "123456", "123456")).toEqual({ code: "crypto-unavailable", unlocked: false });
  });
});
