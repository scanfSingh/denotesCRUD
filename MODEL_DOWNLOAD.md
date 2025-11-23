# Whisper Model Download Instructions

## Automatic Download (Recommended)

**Good news!** whisper-node will automatically download the model on the first transcription attempt. You don't need to download it manually.

### How it works:
1. When you record your first audio and try to transcribe it
2. whisper-node detects that the model is missing
3. It automatically downloads the `base.en` model (~142 MB)
4. The first transcription will take longer (downloading + processing)
5. Subsequent transcriptions will be much faster

## Manual Download (Optional)

If you want to download the model before your first transcription (to avoid the delay), you can do it manually:

### Option 1: Interactive Terminal
Open a terminal and run:
```bash
npx whisper-node download
```
Then select `base.en` when prompted.

### Option 2: Direct Download
If you have an interactive terminal, you can try:
```bash
echo "base.en" | npx whisper-node download
```

**Note:** The download script requires an interactive terminal, so it may not work in all environments. That's why auto-download on first use is recommended.

## Model Location

Once downloaded, models are stored in:
```
~/.whisper-node/
```

## Testing

To test if the model is downloaded:
1. Record a short audio (5-10 seconds) in the app
2. The first transcription will download the model if needed
3. Wait for it to complete (may take 2-3 minutes first time)
4. Your note will be created!

## Troubleshooting

### Model Download Fails
- Check your internet connection
- Ensure you have write permissions in your home directory
- Try the manual download in an interactive terminal

### Slow First Transcription
- This is normal - the model is being downloaded and loaded
- Subsequent transcriptions will be much faster
- Consider downloading manually if you want to avoid this delay

