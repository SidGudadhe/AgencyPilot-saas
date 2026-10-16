import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      activeWorkspaceId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    activeWorkspaceId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    activeWorkspaceId?: string | null;
  }
}
