# Audio API Testing Guide

## Quick Test

1. **Check API Status**
   - Visit: `http://localhost:3000/api/audio/test` (while logged in)
   - Should return status: "ready" if everything is configured

2. **Test Audio Recording Flow**
   - Navigate to `/audio-notes` page
   - Click the microphone button
   - Record a short audio (5-10 seconds)
   - Click stop
   - The system should:
     - Transcribe the audio
     - Process it with AI
     - Create a note automatically

## Manual Testing Steps

### 1. Test API Configuration
```bash
# Check if test endpoint works (requires authentication)
curl http://localhost:3000/api/audio/test
```

### 2. Test Audio Recording Component
- Open browser DevTools Console
- Navigate to `/audio-notes`
- Check for any console errors
- Verify microphone permission prompt appears

### 3. Test Full Flow
1. Start recording
2. Speak for 5-10 seconds
3. Stop recording
4. Watch for:
   - Processing indicator
   - Success message
   - New note appearing in the list

## Expected Behavior

✅ **Working:**
- Microphone permission request
- Recording timer shows elapsed time
- Audio blob is created
- Transcription API is called
- AI processing creates structured note
- Note is saved to database

❌ **Common Issues:**
- Missing OpenAI API key → Error message shown
- Network connection issues → Automatic retry (3 attempts)
- Large audio files → Size validation error
- Empty recordings → Validation error

## Debugging

Check browser console for:
- API errors
- Network request failures
- Audio recording errors

Check server logs for:
- Transcription errors
- OpenAI API errors
- Database connection issues

