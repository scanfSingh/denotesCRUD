import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import type { NextRequest } from "next/server";

// Use the same NextAuth instance
const handler = NextAuth(authOptions);

export async function GET(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return handler.handlers.GET(req);
}

export async function POST(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return handler.handlers.POST(req);
}


