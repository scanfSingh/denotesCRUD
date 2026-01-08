import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=missing-token", request.url)
      );
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const usersCollection = db.collection("users");

    // Find user with matching verification token
    const user = await usersCollection.findOne({
      verificationToken: token,
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=invalid-token", request.url)
      );
    }

    // Check if token has expired
    if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
      return NextResponse.redirect(
        new URL("/login?error=token-expired", request.url)
      );
    }

    // Mark email as verified and remove token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        $unset: {
          verificationToken: "",
          verificationTokenExpiry: "",
        },
      }
    );

    // Redirect to login with success message
    return NextResponse.redirect(
      new URL("/login?verified=true", request.url)
    );
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.redirect(
      new URL("/login?error=verification-failed", request.url)
    );
  }
}



