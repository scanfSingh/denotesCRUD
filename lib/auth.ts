import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import client from "./mongodb";
import bcrypt from "bcryptjs";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const mongoClient = await client.connect();
          const db = mongoClient.db();
          const usersCollection = db.collection("users");

          const user = await usersCollection.findOne({
            email: credentials.email,
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password as string
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

// Create NextAuth instance and export auth function for NextAuth v5
const nextAuth = NextAuth(authOptions);
export const auth = nextAuth.auth;

