declare const process: { cwd(): string };

declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}

declare module "node:crypto" {
  export const webcrypto: Crypto;
}
