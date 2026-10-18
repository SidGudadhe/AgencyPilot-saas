import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/encryption";
import {
  ConnectedAccountRecord,
  ConnectionStatus,
  ConnectionSummary,
  OAuthStatePayload,
  ProviderKey,
} from "./types";
import { getAllProviders } from "./registry";

const DATA_DIR = path.join(process.cwd(), "data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "local-ad-accounts.json");
const AUDIT_FILE = path.join(DATA_DIR, "local-connection-audit.json");
const OAUTH_STATES_FILE = path.join(DATA_DIR, "local-oauth-states.json");

function ensureDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    ensureDirectory();
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Failed reading ${filePath}, using default:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDirectory();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Failed writing to ${filePath}:`, err);
  }
}

/**
 * Safely executes Prisma operations with a short timeout and graceful fallback
 * to high-availability local store when database is offline or in unit tests.
 */
async function withPrisma<T>(fn: () => Promise<T>, timeoutMs = 500): Promise<T | null> {
  if (process.env.NODE_ENV === "test" && !process.env.TEST_WITH_LIVE_DB) {
    return null;
  }
  try {
    const promise = fn();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), timeoutMs)
    );
    return await Promise.race([promise, timeout]);
  } catch {
    return null;
  }
}

// ─── OAuth State Storage with Single-Use Replay Protection ───────────────────

export function saveOAuthState(payload: OAuthStatePayload): void {
  const states = readJsonFile<OAuthStatePayload[]>(OAUTH_STATES_FILE, []);
  // Prune expired states (> 15 minutes)
  const now = Date.now();
  const validStates = states.filter((s) => s.expiresAt > now);
  validStates.push(payload);
  writeJsonFile(OAUTH_STATES_FILE, validStates);
}

export function validateAndConsumeOAuthState(
  state: string,
  expectedWorkspaceId?: string
): OAuthStatePayload | null {
  const states = readJsonFile<OAuthStatePayload[]>(OAUTH_STATES_FILE, []);
  const now = Date.now();

  const foundIndex = states.findIndex((s) => s.state === state);
  if (foundIndex === -1) {
    return null;
  }

  const found = states[foundIndex];
  // Remove immediately (single-use replay protection)
  states.splice(foundIndex, 1);
  writeJsonFile(OAUTH_STATES_FILE, states);

  if (found.expiresAt < now) {
    return null; // Expired
  }

  if (expectedWorkspaceId && found.workspaceId !== expectedWorkspaceId) {
    return null; // Cross-workspace state mismatch (CSRF attempt)
  }

  return found;
}

// ─── Connected Accounts Management ───────────────────────────────────────────

export function getLocalAccounts(): ConnectedAccountRecord[] {
  return readJsonFile<ConnectedAccountRecord[]>(ACCOUNTS_FILE, []);
}

export function saveLocalAccounts(accounts: ConnectedAccountRecord[]): void {
  writeJsonFile(ACCOUNTS_FILE, accounts);
}

/**
 * Retrieves all connected ad accounts for a specific workspace.
 * Guaranteed zero cross-tenant leakage.
 */
export async function getConnectedAccounts(
  workspaceId: string,
  filters?: {
    search?: string;
    provider?: ProviderKey;
    status?: ConnectionStatus;
    sortBy?: "name" | "date" | "status";
    sortDir?: "asc" | "desc";
  }
): Promise<ConnectedAccountRecord[]> {
  // 1. Try Prisma DB if available
  let accounts: ConnectedAccountRecord[] = [];
  const dbAccounts = await withPrisma(async () => {
    return prisma.adAccount.findMany({
      where: {
        workspaceId,
      },
      include: {
        integration: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  if (dbAccounts && dbAccounts.length > 0) {
    accounts = dbAccounts.map((a) => {
      const metadata = (a.metadata as Record<string, unknown>) || {};
      return {
        id: a.id,
        workspaceId: a.workspaceId,
        provider: (a.integration.provider as unknown as ProviderKey) || "META",
        externalAccountId: a.externalId,
        accountName: a.name,
        currency: a.currency,
        timezone: a.timezone || "Asia/Kolkata",
        status: (a.status as ConnectionStatus) || "CONNECTED",
        grantedScopes: (metadata.grantedScopes as string[]) || [],
        encryptedAccessToken: a.integration.encryptedAccessToken || "",
        encryptedRefreshToken: a.integration.encryptedRefreshToken || undefined,
        tokenExpiresAt: a.integration.tokenExpiresAt?.toISOString(),
        connectedAt: a.createdAt.toISOString(),
        lastValidatedAt: (metadata.lastValidatedAt as string) || a.createdAt.toISOString(),
        lastSuccessfulSyncAt: a.integration.lastSyncAt?.toISOString(),
        syncPausedAt: (metadata.syncPausedAt as string) || undefined,
        lastErrorCategory: (metadata.lastErrorCategory as string) || undefined,
        lastErrorMessage: (metadata.lastErrorMessage as string) || undefined,
        metadata,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    });
  }

  // 2. High-availability local store fallback
  if (accounts.length === 0) {
    const allLocal = getLocalAccounts();
    accounts = allLocal.filter((a) => a.workspaceId === workspaceId);
  }

  // 3. Apply filters
  if (filters?.provider) {
    accounts = accounts.filter((a) => a.provider === filters.provider);
  }

  if (filters?.status) {
    accounts = accounts.filter((a) => a.status === filters.status);
  }

  if (filters?.search) {
    const term = filters.search.toLowerCase().trim();
    accounts = accounts.filter(
      (a) =>
        a.accountName.toLowerCase().includes(term) ||
        a.externalAccountId.toLowerCase().includes(term) ||
        a.provider.toLowerCase().includes(term)
    );
  }

  // 4. Sorting
  const dir = filters?.sortDir === "asc" ? 1 : -1;
  if (filters?.sortBy === "name") {
    accounts.sort((a, b) => a.accountName.localeCompare(b.accountName) * dir);
  } else if (filters?.sortBy === "status") {
    accounts.sort((a, b) => a.status.localeCompare(b.status) * dir);
  } else {
    // Default by date (newest first)
    accounts.sort((a, b) => (new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()) * dir);
  }

  return accounts;
}

/**
 * Get single connected account by ID within workspace context.
 */
export async function getConnectedAccountById(
  workspaceId: string,
  accountId: string
): Promise<ConnectedAccountRecord | null> {
  const accounts = await getConnectedAccounts(workspaceId);
  return accounts.find((a) => a.id === accountId || a.externalAccountId === accountId) || null;
}

/**
 * Saves or updates a connected account with encrypted credentials.
 */
export async function saveConnectedAccount(data: {
  workspaceId: string;
  provider: ProviderKey;
  externalAccountId: string;
  accountName: string;
  currency: string;
  timezone?: string;
  rawAccessToken: string;
  rawRefreshToken?: string;
  tokenExpiresAt?: Date;
  grantedScopes: string[];
  status?: ConnectionStatus;
  metadata?: Record<string, unknown>;
}): Promise<ConnectedAccountRecord> {
  const encryptedAccessToken = encryptToken(data.rawAccessToken);
  const encryptedRefreshToken = data.rawRefreshToken ? encryptToken(data.rawRefreshToken) : undefined;
  const now = new Date().toISOString();
  const accountStatus = data.status || "CONNECTED";

  const recordId = `acc_${Math.random().toString(36).substring(2, 11)}`;

  const newRecord: ConnectedAccountRecord = {
    id: recordId,
    workspaceId: data.workspaceId,
    provider: data.provider,
    externalAccountId: data.externalAccountId,
    accountName: data.accountName,
    currency: data.currency || "INR",
    timezone: data.timezone || "Asia/Kolkata",
    status: accountStatus,
    grantedScopes: data.grantedScopes,
    encryptedAccessToken,
    encryptedRefreshToken,
    tokenExpiresAt: data.tokenExpiresAt?.toISOString(),
    connectedAt: now,
    lastValidatedAt: now,
    metadata: {
      ...data.metadata,
      grantedScopes: data.grantedScopes,
      lastValidatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  // 1. Try Prisma DB if available
  await withPrisma(async () => {
    // Upsert ProviderIntegration
    const integration = await prisma.providerIntegration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: data.workspaceId,
          provider: data.provider as any,
        },
      },
      create: {
        workspaceId: data.workspaceId,
        provider: data.provider as any,
        status: "CONNECTED",
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        metadata: data.metadata as any,
      },
      update: {
        status: "CONNECTED",
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        metadata: data.metadata as any,
      },
    });

    // Upsert AdAccount
    await prisma.adAccount.upsert({
      where: {
        integrationId_externalId: {
          integrationId: integration.id,
          externalId: data.externalAccountId,
        },
      },
      create: {
        integrationId: integration.id,
        workspaceId: data.workspaceId,
        externalId: data.externalAccountId,
        name: data.accountName,
        currency: data.currency || "INR",
        timezone: data.timezone || "Asia/Kolkata",
        status: accountStatus,
        metadata: {
          ...data.metadata,
          grantedScopes: data.grantedScopes,
          lastValidatedAt: now,
        },
      },
      update: {
        name: data.accountName,
        currency: data.currency || "INR",
        timezone: data.timezone || "Asia/Kolkata",
        status: accountStatus,
        metadata: {
          ...data.metadata,
          grantedScopes: data.grantedScopes,
          lastValidatedAt: now,
        },
      },
    });
  });

  // 2. High-availability local store persistence
  const localAccounts = getLocalAccounts();
  const existingIndex = localAccounts.findIndex(
    (a) => a.workspaceId === data.workspaceId && a.externalAccountId === data.externalAccountId
  );

  if (existingIndex >= 0) {
    localAccounts[existingIndex] = {
      ...localAccounts[existingIndex],
      accountName: data.accountName,
      currency: data.currency || localAccounts[existingIndex].currency,
      timezone: data.timezone || localAccounts[existingIndex].timezone,
      status: accountStatus,
      grantedScopes: data.grantedScopes,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt: data.tokenExpiresAt?.toISOString(),
      lastValidatedAt: now,
      updatedAt: now,
      metadata: {
        ...localAccounts[existingIndex].metadata,
        ...data.metadata,
        grantedScopes: data.grantedScopes,
      },
    };
    saveLocalAccounts(localAccounts);
    return localAccounts[existingIndex];
  } else {
    localAccounts.push(newRecord);
    saveLocalAccounts(localAccounts);
    return newRecord;
  }
}

/**
 * Pauses data synchronization for a connected account.
 */
export async function pauseAccountSync(
  workspaceId: string,
  accountId: string
): Promise<ConnectedAccountRecord | null> {
  const now = new Date().toISOString();
  const localAccounts = getLocalAccounts();
  const account = localAccounts.find(
    (a) => a.workspaceId === workspaceId && (a.id === accountId || a.externalAccountId === accountId)
  );

  if (!account) return null;

  account.status = "PAUSED";
  account.syncPausedAt = now;
  account.updatedAt = now;
  saveLocalAccounts(localAccounts);

  await withPrisma(() =>
    prisma.adAccount.updateMany({
      where: { workspaceId, externalId: account.externalAccountId },
      data: { status: "PAUSED" },
    })
  );

  return account;
}

/**
 * Resumes data synchronization for a connected account.
 */
export async function resumeAccountSync(
  workspaceId: string,
  accountId: string
): Promise<ConnectedAccountRecord | null> {
  const now = new Date().toISOString();
  const localAccounts = getLocalAccounts();
  const account = localAccounts.find(
    (a) => a.workspaceId === workspaceId && (a.id === accountId || a.externalAccountId === accountId)
  );

  if (!account) return null;

  account.status = "CONNECTED";
  account.syncPausedAt = undefined;
  account.updatedAt = now;
  saveLocalAccounts(localAccounts);

  await withPrisma(() =>
    prisma.adAccount.updateMany({
      where: { workspaceId, externalId: account.externalAccountId },
      data: { status: "CONNECTED" },
    })
  );

  return account;
}

/**
 * Updates status and validation metadata on a connected account.
 */
export async function updateAccountValidation(
  workspaceId: string,
  accountId: string,
  updates: {
    status: ConnectionStatus;
    lastErrorCategory?: string;
    lastErrorMessage?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const localAccounts = getLocalAccounts();
  const account = localAccounts.find(
    (a) => a.workspaceId === workspaceId && (a.id === accountId || a.externalAccountId === accountId)
  );

  if (account) {
    account.status = updates.status;
    account.lastValidatedAt = now;
    account.lastErrorCategory = updates.lastErrorCategory;
    account.lastErrorMessage = updates.lastErrorMessage;
    account.updatedAt = now;
    saveLocalAccounts(localAccounts);
  }
}

/**
 * Disconnects an ad account, stops future sync, and marks it disconnected.
 */
export async function disconnectAccount(
  workspaceId: string,
  accountId: string
): Promise<boolean> {
  const localAccounts = getLocalAccounts();
  const index = localAccounts.findIndex(
    (a) => a.workspaceId === workspaceId && (a.id === accountId || a.externalAccountId === accountId)
  );

  if (index === -1) return false;

  const targetAccount = localAccounts[index];

  // Stop any pending sync jobs in DB if available
  await withPrisma(async () => {
    await prisma.syncJob.updateMany({
      where: {
        workspaceId,
        status: { in: ["PENDING", "RUNNING"] },
      },
      data: {
        status: "FAILED",
        error: "Connection disconnected by user",
      },
    });
    await prisma.adAccount.deleteMany({
      where: { workspaceId, externalId: targetAccount.externalAccountId },
    });
  });

  // Remove from local active accounts
  localAccounts.splice(index, 1);
  saveLocalAccounts(localAccounts);

  return true;
}

/**
 * Decrypts access token for real API calls server-side.
 * Never exposed to frontend!
 */
export function getDecryptedAccessToken(account: ConnectedAccountRecord): string {
  return decryptToken(account.encryptedAccessToken);
}

// ─── Connection Summary KPIs ─────────────────────────────────────────────────

export async function getConnectionSummary(workspaceId: string): Promise<ConnectionSummary> {
  const accounts = await getConnectedAccounts(workspaceId);
  const providers = getAllProviders();

  const totalConnected = accounts.length;
  const active = accounts.filter((a) => a.status === "CONNECTED").length;
  const attention = accounts.filter(
    (a) => a.status !== "CONNECTED" && a.status !== "PAUSED"
  ).length;
  const available = providers.filter((p) => p.readiness === "AVAILABLE").length;

  return {
    totalConnectedAccounts: totalConnected,
    activeConnections: active,
    attentionRequired: attention,
    availableProviders: available,
    totalProvidersInDirectory: providers.length,
  };
}

// ─── Connection Audit Events ─────────────────────────────────────────────────

export interface ConnectionAuditEventRecord {
  id: string;
  workspaceId: string;
  actorUserId?: string;
  action: string;
  resourceId?: string;
  safeMetadata: Record<string, unknown>;
  createdAt: string;
}

export function getLocalAuditEvents(): ConnectionAuditEventRecord[] {
  return readJsonFile<ConnectionAuditEventRecord[]>(AUDIT_FILE, []);
}

export async function recordConnectionAuditEvent(
  workspaceId: string,
  actorUserId: string | undefined,
  action: string,
  safeMetadata: Record<string, unknown>,
  resourceId?: string
): Promise<void> {
  const now = new Date().toISOString();
  const eventId = `aud_${Math.random().toString(36).substring(2, 11)}`;

  const eventRecord: ConnectionAuditEventRecord = {
    id: eventId,
    workspaceId,
    actorUserId,
    action,
    resourceId,
    safeMetadata,
    createdAt: now,
  };

  const events = getLocalAuditEvents();
  events.unshift(eventRecord);
  // Keep last 500 audit events
  if (events.length > 500) events.pop();
  writeJsonFile(AUDIT_FILE, events);

  await withPrisma(() =>
    prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: actorUserId,
        action,
        resourceType: "AdProviderConnection",
        resourceId,
        metadata: safeMetadata as any,
      },
    })
  );
}
