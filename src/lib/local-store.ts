import fs from "fs";
import path from "path";
import { WorkspaceRole } from "@prisma/client";

export interface LocalUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: WorkspaceRole;
    theme?: "dark" | "light";
  };
}

export const DEFAULT_ADMIN: LocalUserRecord = {
  id: "usr_admin_default",
  email: "admin@agencypilot.io",
  name: "AgencyPilot Admin",
  // Hashed bcrypt of 'Password123!'
  passwordHash: "$2a$10$wrV3YRyYVpw8KYIFJjFmfeyKqen.hFzXSG5HozhgHs5MnsbJA6pnK",
  createdAt: new Date().toISOString(),
  workspace: {
    id: "ws_primary_agency",
    name: "Primary Agency Workspace",
    slug: "primary-agency",
    role: WorkspaceRole.OWNER,
    theme: "dark",
  },
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "local-users.json");

function ensureDataFile(): LocalUserRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      const initial = [DEFAULT_ADMIN];
      fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [DEFAULT_ADMIN];
      fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    return parsed;
  } catch (err) {
    console.warn("Failed reading local users file, using in-memory defaults:", err);
    return [DEFAULT_ADMIN];
  }
}

export function getLocalUsers(): LocalUserRecord[] {
  return ensureDataFile();
}

export function findLocalUserByEmail(email: string): LocalUserRecord | null {
  const normalized = email.toLowerCase().trim();
  const users = getLocalUsers();
  return users.find((u) => u.email.toLowerCase().trim() === normalized) || null;
}

export function findLocalUserById(id: string): LocalUserRecord | null {
  const users = getLocalUsers();
  return users.find((u) => u.id === id) || null;
}

export function getWorkspaceTheme(workspaceId: string): "dark" | "light" {
  const users = getLocalUsers();
  const found = users.find((u) => u.workspace.id === workspaceId);
  return found?.workspace.theme || "dark";
}

export function updateWorkspaceTheme(workspaceId: string, theme: "dark" | "light"): boolean {
  const users = getLocalUsers();
  let updated = false;

  for (const user of users) {
    if (user.workspace.id === workspaceId) {
      user.workspace.theme = theme;
      updated = true;
    }
  }

  if (updated) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    } catch (err) {
      console.error("Failed persisting workspace theme update locally:", err);
    }
  }

  return updated;
}

export function saveLocalUser(userData: {
  name: string;
  email: string;
  passwordHash: string;
  workspaceName?: string;
}): LocalUserRecord {
  const users = getLocalUsers();
  const normalizedEmail = userData.email.toLowerCase().trim();

  const existing = users.find((u) => u.email.toLowerCase().trim() === normalizedEmail);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const userId = `usr_${Math.random().toString(36).substring(2, 10)}`;
  const wsId = `ws_${Math.random().toString(36).substring(2, 10)}`;
  const wsName = userData.workspaceName?.trim() || `${userData.name.trim()}'s Workspace`;
  const slug = wsName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 30) + `-${Math.random().toString(36).substring(2, 6)}`;

  const newRecord: LocalUserRecord = {
    id: userId,
    email: normalizedEmail,
    name: userData.name.trim(),
    passwordHash: userData.passwordHash,
    createdAt: new Date().toISOString(),
    workspace: {
      id: wsId,
      name: wsName,
      slug,
      role: WorkspaceRole.OWNER,
      theme: "dark",
    },
  };

  users.push(newRecord);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("Failed persisting user locally:", err);
  }

  return newRecord;
}
