import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "denotes - Your Intelligent Note-Taking Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              background: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #ec4899 100%)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-0.05em",
              marginBottom: "20px",
            }}
          >
            denotes
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              color: "#a1a1aa",
              fontWeight: 400,
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            Your intelligent workspace for notes, tasks, and knowledge
          </div>

          {/* Features row */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginTop: "50px",
            }}
          >
            {["🎤 Voice Notes", "📚 Topics", "🔗 Linking", "👥 Sharing"].map(
              (feature) => (
                <div
                  key={feature}
                  style={{
                    fontSize: 22,
                    color: "#e4e4e7",
                    padding: "12px 24px",
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {feature}
                </div>
              )
            )}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            fontSize: 20,
            color: "#71717a",
          }}
        >
          denotes.co.in
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

