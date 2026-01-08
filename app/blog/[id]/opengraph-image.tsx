import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Blog Post on denotes";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // Fetch post data from our API
  const siteUrl = process.env.NEXTAUTH_URL || "https://denotes.co.in";
  let post = null;
  
  try {
    const response = await fetch(`${siteUrl}/api/blog/${resolvedParams.id}`, {
      next: { revalidate: 60 },
    });
    if (response.ok) {
      post = await response.json();
    }
  } catch (error) {
    console.error("Error fetching blog post for OG image:", error);
  }

  if (!post) {
    // Return a default image for not found posts
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)",
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 900,
              background: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #ec4899 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            denotes
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#a1a1aa",
              marginTop: 20,
            }}
          >
            Blog Post Not Found
          </div>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Background gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "200px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-50px",
            right: "150px",
            width: "350px",
            height: "350px",
            background: "radial-gradient(circle, rgba(217, 70, 239, 0.25) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              background: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: "40px",
            }}
          >
            denotes
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.2,
              marginBottom: "24px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.title}
          </div>

          {/* Excerpt */}
          <div
            style={{
              fontSize: 24,
              color: "#a1a1aa",
              lineHeight: 1.4,
              marginBottom: "auto",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.excerpt.slice(0, 150)}
          </div>

          {/* Bottom row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "40px",
            }}
          >
            {/* Author */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: "#e4e4e7",
                }}
              >
                {post.authorName}
              </div>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                }}
              >
                {post.tags.slice(0, 3).map((tag: string) => (
                  <div
                    key={tag}
                    style={{
                      fontSize: 16,
                      color: "#c4b5fd",
                      padding: "8px 16px",
                      background: "rgba(139, 92, 246, 0.2)",
                      borderRadius: "20px",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    #{tag}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

