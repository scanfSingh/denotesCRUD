# Quick Start Guide - Audio Transcription

## Step 1: Download Whisper Model

Before using audio transcription, download the Whisper model:

```bash
npm run download-whisper
```

Or manually:
```bash
npx whisper-node download base.en
```

**Note:** The first time you use transcription, whisper-node will attempt to auto-download the model if it's not found. However, it's recommended to download it manually first to avoid delays.

## Step 2: Start the Server

```bash
npm run dev
```

## Step 3: Test Audio Transcription

1. Navigate to `http://localhost:3000/audio-notes`
2. Click the microphone button
3. Record a short audio (5-10 seconds)
4. Click stop
5. Wait for processing (first time may take longer as model loads)
6. Your note should be created automatically!

## Troubleshooting

### Model Not Found Error
If you see "Whisper model not found":
```bash
npm run download-whisper
```

### FFmpeg Issues
Make sure `ffmpeg-static` is installed:
```bash
npm install ffmpeg-static
```

### Slow First Transcription
The first transcription is slower because:
- Model needs to be loaded into memory
- If auto-downloading, it needs to download the model first

Subsequent transcriptions will be faster.

## Model Options

You can download different models:

```bash
# Fast, less accurate (~75 MB)
npx whisper-node download tiny.en

# Balanced (recommended, ~142 MB)
npx whisper-node download base.en

# Slower, more accurate (~466 MB)
npx whisper-node download small.en
```

