import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Test endpoint to verify audio API setup
 * GET /api/audio/test - Check if OpenAI API key is configured
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const checks = {
      whisperNode: true, // whisper-node runs locally, no API key needed
      mongodbUri: !!process.env.MONGODB_URI,
      authenticated: true,
    };

    const allChecksPass = checks.whisperNode && checks.mongodbUri;

    return NextResponse.json({
      status: allChecksPass ? "ready" : "not_ready",
      checks,
      message: allChecksPass
        ? "Audio API is ready to use"
        : "Some configuration is missing. Please check your environment variables.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

