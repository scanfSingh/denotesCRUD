import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

// Generate a basic note without AI
function createBasicNote(transcription: string, topicId?: string) {
  // Create a simple title from the first few words
  const words = transcription.trim().split(/\s+/);
  const titleWords = words.slice(0, 6).join(" ");
  const title = titleWords.length > 50 
    ? titleWords.substring(0, 47) + "..." 
    : titleWords + (words.length > 6 ? "..." : "");
  
  // Create a summary from the first ~200 characters
  const summary = transcription.length > 200 
    ? transcription.substring(0, 197) + "..." 
    : transcription;

  return {
    title: title || "Voice Note",
    content: transcription,
    summary: summary,
    transcription: transcription,
    topicId: topicId || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { transcription, topicId, skipAI } = body;

    if (!transcription || transcription.trim() === "") {
      return NextResponse.json(
        { error: "No transcription provided" },
        { status: 400 }
      );
    }

    // If skipAI is true or no API key, use basic note creation
    if (skipAI || !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        note: createBasicNote(transcription, topicId),
        aiProcessed: false,
      });
    }

    const openai = getOpenAIClient();
    
    if (!openai) {
      return NextResponse.json({
        note: createBasicNote(transcription, topicId),
        aiProcessed: false,
      });
    }

    try {
      // Process transcription with AI to create structured notes
      const prompt = `You are a helpful assistant that creates well-structured notes from audio transcriptions. 
    
Given the following transcription, create a structured note with:
1. A clear, concise title (max 10 words)
2. A well-organized summary/notes section that captures the key points
3. Extract any important action items, dates, or key information

Transcription:
${transcription}

Please respond in the following JSON format:
{
  "title": "A clear title for the note",
  "content": "Well-organized notes with key points, action items, and important information",
  "summary": "A brief 2-3 sentence summary"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that creates well-structured notes from transcriptions. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      let processedNote;
      
      try {
        processedNote = JSON.parse(responseText);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return NextResponse.json({
          note: createBasicNote(transcription, topicId),
          aiProcessed: false,
        });
      }

      return NextResponse.json({
        note: {
          title: processedNote.title || "Audio Note",
          content: processedNote.content || transcription,
          summary: processedNote.summary || processedNote.content?.substring(0, 200) || "",
          transcription: transcription,
          topicId: topicId || null,
        },
        aiProcessed: true,
      });
    } catch (openaiError: any) {
      // OpenAI API error (quota, rate limit, etc.) - fallback to basic note
      console.warn("OpenAI API error, using fallback:", openaiError.message);
      return NextResponse.json({
        note: createBasicNote(transcription, topicId),
        aiProcessed: false,
        warning: "AI processing unavailable, created basic note instead.",
      });
    }
  } catch (error: any) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      {
        error: "Failed to process audio",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

