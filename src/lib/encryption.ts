import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from ENCRYPTION_KEY or a fallback for dev/testing.
 */
function getDerivedKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || "agencypilot_encryption_key_32b!";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a sensitive string (such as an OAuth access or refresh token) using AES-256-GCM.
 * Formats output as: "ivHex:authTagHex:cipherTextHex"
 * 
 * Never logs or exposes the plaintext secret.
 */
export function encryptToken(plainText: string): string {
  if (!plainText) {
    throw new Error("Cannot encrypt empty token");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getDerivedKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a sensitive string previously encrypted with encryptToken.
 */
export function decryptToken(cipherPayload: string): string {
  if (!cipherPayload) {
    throw new Error("Cannot decrypt empty payload");
  }

  const parts = cipherPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Safely masks an external account ID or client ID for UI display.
 * E.g., "act_123456789012" -> "act_***9012"
 */
export function maskAccountId(accountId: string): string {
  if (!accountId) return "";
  if (accountId.length <= 6) return accountId;
  const prefix = accountId.startsWith("act_") ? "act_" : "";
  const cleanId = accountId.replace(/^act_/, "");
  if (cleanId.length <= 4) return accountId;
  const lastFour = cleanId.slice(-4);
  return `${prefix}***${lastFour}`;
}
