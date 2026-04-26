import crypto from "node:crypto";

export const ADMIN_COOKIE_NAME = "sspanel_admin_session";

function safeLowerHex(input: string): string {
  return input.trim().toLowerCase();
}

function getAdminPasswordHash(): string {
  const hash = process.env.ADMIN_PASSWORD_SHA256;
  if (!hash) {
    throw new Error("缺少 ADMIN_PASSWORD_SHA256 配置");
  }

  return safeLowerHex(hash);
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "sspanel-admin-session-secret";
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);

  if (ba.length !== bb.length) {
    return false;
  }

  return crypto.timingSafeEqual(ba, bb);
}

export function hashPasswordToSha256(password: string): string {
  return sha256Hex(password).toLowerCase();
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPasswordHash();
  const actual = hashPasswordToSha256(password);
  return timingSafeEqualString(actual, expected);
}

export function createSessionToken(): string {
  const seed = `${getAdminPasswordHash()}:${getSessionSecret()}`;
  return sha256Hex(seed);
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const expected = createSessionToken();
  return timingSafeEqualString(token, expected);
}
