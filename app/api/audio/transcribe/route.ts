import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { getWhisperPaths, verifyWhisperSetup } from "@/lib/whisper-fix";

const execAsync = promisify(exec);

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;
  let tempOutputPath: string | null = null;

  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Get the audio file as a buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create temp directory if it doesn't exist
    const tempDir = join(tmpdir(), "whisper-transcriptions");
    try {
      await mkdir(tempDir, { recursive: true });
    } catch (e) {
      // Directory might already exist, ignore
    }

    // Generate unique file names
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    tempInputPath = join(tempDir, `input-${timestamp}-${randomId}.webm`);
    tempOutputPath = join(tempDir, `output-${timestamp}-${randomId}.wav`);

    // Save the uploaded file temporarily
    await writeFile(tempInputPath, buffer);

    // Convert audio to WAV format with 16kHz sample rate (required by whisper-node)
    if (!tempInputPath || !tempOutputPath) {
      throw new Error("Failed to create temporary file paths");
    }
    
    const inputPath = tempInputPath;
    const outputPath = tempOutputPath;
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("wav")
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec("pcm_s16le")
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .save(outputPath);
    });

    // Verify whisper setup first
    const setupCheck = verifyWhisperSetup();
    if (!setupCheck.valid) {
      throw new Error(`Whisper setup error: ${setupCheck.error}`);
    }

    // Transcribe using whisper-node with path fix
    // Use direct whisper.cpp binary to avoid path resolution issues
    const { whisperCppPath } = getWhisperPaths();
    
    // Try multiple possible model locations
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const possibleModelPaths = [
      join(homeDir, ".whisper-node", "ggml-base.en.bin"),
      join(whisperCppPath, "models", "ggml-base.en.bin"),
      join(process.cwd(), "node_modules", "whisper-node", "lib", "whisper.cpp", "models", "ggml-base.en.bin"),
    ];
    
    // Find the first existing model path
    const modelPath = possibleModelPaths.find(path => existsSync(path));
    
    if (!modelPath) {
      throw new Error(
        "Whisper model 'base.en' not found. Please download it: npx whisper-node download base.en"
      );
    }
    
    let transcript;
    try {
      // Try using whisper-node first (dynamic import to avoid build-time initialization)
      const whisperModule = await import("whisper-node");
      const whisper = whisperModule.default;
      transcript = await whisper(outputPath, {
        modelName: "base.en",
      });
    } catch (error: any) {
      // If whisper-node fails due to path issues, use direct whisper.cpp binary
      const errorMsg = error.message || error.toString();
      
      if (errorMsg.includes("whisper.cpp not initialized") || errorMsg.includes("ROOT")) {
        // Fallback: Use whisper.cpp binary directly
        console.log("Using direct whisper.cpp binary due to path resolution issue");
        
        const command = `cd "${whisperCppPath}" && ./main -m "${modelPath}" -f "${outputPath}" -ml 1`;
        const { stdout } = await execAsync(command);
        
        // Parse whisper.cpp output (format: [start] --> [end]  text)
        const lines = stdout.split("\n").filter(line => line.trim());
        transcript = lines
          .map((line) => {
            const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*-->\s*\[(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+(.+)/);
            if (match) {
              return {
                start: match[1],
                end: match[2],
                speech: match[3].trim(),
              };
            }
            // Fallback for lines without timestamps
            return {
              start: "00:00:00.000",
              end: "00:00:00.000",
              speech: line.trim(),
            };
          })
          .filter((seg) => seg.speech.length > 0);
      } else if (
        errorMsg.includes("model") || 
        errorMsg.includes("not found") ||
        errorMsg.includes("download")
      ) {
        throw new Error(
          "Whisper model not found. Please download it: npx whisper-node download base.en " +
          "(Note: This requires an interactive terminal)"
        );
      } else {
        throw error;
      }
    }

    // Clean up temp files
    try {
      if (tempInputPath) await unlink(tempInputPath);
      if (tempOutputPath) await unlink(tempOutputPath);
    } catch (e) {
      console.warn("Failed to clean up temp files:", e);
    }

    // whisper-node returns an array of segments: [{start, end, speech}]
    // Combine all segments into a single transcription text
    const transcriptionText = transcript
      .map((segment: any) => segment.speech)
      .join(" ")
      .trim();

    if (!transcriptionText) {
      throw new Error("No transcription text generated");
    }

    return NextResponse.json({
      transcription: transcriptionText,
    });
  } catch (error: any) {
    // Clean up temp files on error
    try {
      if (tempInputPath) await unlink(tempInputPath).catch(() => {});
      if (tempOutputPath) await unlink(tempOutputPath).catch(() => {});
    } catch (e) {
      // Ignore cleanup errors
    }

    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
