# Whisper-Node Setup Instructions

## Initial Setup

The app now uses `whisper-node` for local audio transcription instead of OpenAI's API. This means:
- ✅ No API key needed
- ✅ Works offline
- ✅ No API costs
- ⚠️ Requires model download on first use

## Download Whisper Model

Before using audio transcription, you need to download a Whisper model. Run this command in your terminal:

```bash
npx whisper-node download base.en
```

### Available Models

| Model     | Disk   | RAM     | Speed | Accuracy |
|-----------|--------|---------|-------|----------|
| tiny.en   |  75 MB | ~390 MB | Fast  | Good     |
| base.en   | 142 MB | ~500 MB | Medium| Better   |
| small.en  | 466 MB | ~1.0 GB | Slow  | Best     |

**Recommended:** `base.en` - Good balance of speed and accuracy

### Download Command

```bash
# Download base.en model (recommended)
npx whisper-node download base.en

# Or download a different model
npx whisper-node download tiny.en   # Faster, less accurate
npx whisper-node download small.en  # Slower, more accurate
```

## First Use

On the first transcription, whisper-node will automatically download the model if it's not already present. However, it's recommended to download it manually first to avoid delays during transcription.

## Troubleshooting

### Model Not Found Error

If you see "Whisper model not found", run:
```bash
npx whisper-node download base.en
```

### FFmpeg Issues

The app uses `ffmpeg-static` which should work automatically. If you encounter issues:
- Make sure you have write permissions in the temp directory
- Check that ffmpeg-static installed correctly: `npm list ffmpeg-static`

### Performance Tips

- Use `tiny.en` for faster transcription (less accurate)
- Use `base.en` for balanced performance (recommended)
- Use `small.en` for best accuracy (slower)

## Notes

- Models are stored in your home directory under `.whisper-node/`
- First transcription may take longer as the model loads
- Subsequent transcriptions will be faster

