import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
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

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables." },
        { status: 500 }
      );
    }

    const openai = getOpenAIClient();

    const body = await request.json();
    const { transcription, topicId } = body;

    if (!transcription || transcription.trim() === "") {
      return NextResponse.json(
        { error: "No transcription provided" },
        { status: 400 }
      );
    }

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
      processedNote = {
        title: "Audio Note",
        content: transcription,
        summary: transcription.substring(0, 200) + "...",
      };
    }

    return NextResponse.json({
      note: {
        title: processedNote.title || "Audio Note",
        content: processedNote.content || transcription,
        summary: processedNote.summary || processedNote.content?.substring(0, 200) || "",
        transcription: transcription,
        topicId: topicId || null,
      },
    });
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

