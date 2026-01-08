import type { Metadata } from "next";
import client from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

async function getBlogPostForMeta(postId: string) {
  try {
    const mongoClient = await client.connect();
    const db = mongoClient.db();
    const blogsCollection = db.collection("blogs");

    const post = await blogsCollection.findOne({ _id: new ObjectId(postId) });

    if (!post || !post.published) {
      return null;
    }

    return {
      title: post.title,
      excerpt: post.excerpt || post.content?.replace(/<[^>]*>/g, "").slice(0, 160) + "...",
      coverImage: post.coverImage,
      authorName: post.authorName,
      tags: post.tags || [],
      publishedAt: post.publishedAt,
    };
  } catch (error) {
    console.error("Error fetching blog post for metadata:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPostForMeta(resolvedParams.id);

  if (!post) {
    return {
      title: "Blog Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  const siteUrl = process.env.NEXTAUTH_URL || "https://denotes.co.in";
  const postUrl = `${siteUrl}/blog/${resolvedParams.id}`;

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: post.authorName }],
    
    openGraph: {
      type: "article",
      locale: "en_US",
      url: postUrl,
      title: post.title,
      description: post.excerpt,
      siteName: "denotes",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.authorName],
      tags: post.tags,
      images: post.coverImage
        ? [
            {
              url: post.coverImage,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : [
            {
              url: `${siteUrl}/blog/${resolvedParams.id}/opengraph-image`,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ],
    },

    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage
        ? [post.coverImage]
        : [`${siteUrl}/blog/${resolvedParams.id}/opengraph-image`],
      creator: "@denotes",
    },

    alternates: {
      canonical: postUrl,
    },
  };
}

export default function BlogPostLayout({ children }: Props) {
  return <>{children}</>;
}

