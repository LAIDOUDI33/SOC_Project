import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// Define extended user type
interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Find user in database
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (!user.isActive) {
          throw new Error("Account is disabled");
        }

        // In production, use bcrypt to compare passwords
        // For demo purposes, we accept any password (or check against a simple hash)
        const isValidPassword = credentials.password.length >= 6; // Simple validation
        
        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        };
      }
    })
  ],
  
  session: {
    strategy: "jwt"
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as ExtendedUser).role;
        token.department = (user as ExtendedUser).department;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).department = token.department;
      }
      return session;
    }
  },
  
  pages: {
    signIn: "/auth/login",
    error: "/auth/error"
  },
  
  secret: process.env.NEXTAUTH_SECRET || "soc-algeria-secret-key-change-in-production",
});
