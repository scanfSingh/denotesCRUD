import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = resolvedParams.id;

    if (!postId || !ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: "Invalid post ID" },
        { status: 400 }
      );
    }

    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");

    const post = await blogsCollection.findOne({ 
      _id: new ObjectId(postId),
      published: true 
    });

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: post._id.toString(),
      title: post.title,
      excerpt: post.excerpt || post.content?.replace(/<[^>]*>/g, "").slice(0, 160) + "...",
      coverImage: post.coverImage,
      authorName: post.authorName || "Unknown Author",
      tags: post.tags || [],
      publishedAt: post.publishedAt,
    });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

