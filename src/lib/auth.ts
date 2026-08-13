import crypto from "crypto";

export const SESSION_COOKIE = "nabava_session";

function getPassword(): string {
  const pw = process.env.APP_PASSWORD;
  if (!pw) {
    throw new Error("APP_PASSWORD ni nastavljen (glej .env / Vercel env vars).");
  }
  return pw;
}

export function sessionToken(): string {
  return crypto.createHash("sha256").update(getPassword()).digest("hex");
}

export function checkPassword(input: string): boolean {
  return input === getPassword();
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    return token === sessionToken();
  } catch {
    return false;
  }
}
