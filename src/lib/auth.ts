import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: {
                workspace: true,
              },
              orderBy: {
                joinedAt: "asc",
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Resolve primary workspace
        const defaultWorkspace = user.memberships[0]?.workspace;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          activeWorkspaceId: defaultWorkspace?.id || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.activeWorkspaceId = (user as unknown as { activeWorkspaceId?: string }).activeWorkspaceId;
      }

      // Allow updating workspace context dynamically via session update
      if (trigger === "update" && session?.activeWorkspaceId) {
        token.activeWorkspaceId = session.activeWorkspaceId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as { activeWorkspaceId?: string }).activeWorkspaceId =
          token.activeWorkspaceId as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "default-dev-secret-agencypilot-super-secure-key-32chars",
};

/**
 * Hash password securely with bcrypt salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
