import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import client from "./mongodb";
import bcrypt from "bcryptjs";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
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

          // Check if user signed up with OAuth (no password)
          if (!user.password) {
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
            emailVerified: user.emailVerified || false,
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
    async signIn({ user, account }: any) {
      // For OAuth providers, create or update user in database
      if (account?.provider === "google") {
        try {
          const mongoClient = await client.connect();
          const db = mongoClient.db();
          const usersCollection = db.collection("users");

          const existingUser = await usersCollection.findOne({
            email: user.email,
          });

          if (!existingUser) {
            // Create new user for Google OAuth
            const result = await usersCollection.insertOne({
              email: user.email,
              name: user.name || user.email,
              image: user.image,
              provider: "google",
              providerId: account.providerAccountId,
              createdAt: new Date(),
            });
            user.id = result.insertedId.toString();
          } else {
            // Update existing user with Google info if needed
            if (!existingUser.provider) {
              await usersCollection.updateOne(
                { _id: existingUser._id },
                {
                  $set: {
                    provider: "google",
                    providerId: account.providerAccountId,
                    image: user.image,
                    updatedAt: new Date(),
                  },
                }
              );
            }
            user.id = existingUser._id.toString();
          }
        } catch (error) {
          console.error("Error handling Google sign in:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
      }
      if (account?.provider === "google") {
        token.provider = "google";
        // Google OAuth users are considered verified since Google verifies emails
        token.emailVerified = true;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.provider = token.provider;
        session.user.emailVerified = token.emailVerified ?? true;
      }
      return session;
    },
  },
};

// Create NextAuth instance and export auth function for NextAuth v5
const nextAuth = NextAuth(authOptions);
export const auth = nextAuth.auth;
