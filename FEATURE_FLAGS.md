# Feature Flags

This application uses feature flags to enable/disable functionality. Feature flags can be configured via environment variables.

## Configuration

Add these to your `.env.local` file. Set to `"false"` to disable a feature, or `"true"` (or omit) to enable.

## Available Feature Flags

### Audio Notes Features

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_AUDIO_NOTES` | `true` | Enable/disable the entire audio notes feature |
| `NEXT_PUBLIC_FF_AI_PROCESSING` | `false` | Enable AI processing of transcriptions (requires OpenAI API key) |
| `NEXT_PUBLIC_FF_LIVE_PREVIEW` | `true` | Show live transcription preview while recording |
| `NEXT_PUBLIC_FF_TOPIC_LINKING` | `true` | Allow linking notes to topics |

### Topics Features

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_TOPICS` | `true` | Enable/disable topics feature |
| `NEXT_PUBLIC_FF_TOPIC_SHARING` | `true` | Enable sharing topics with friends |

### Notes Features

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_NOTES` | `true` | Enable/disable notes feature |
| `NEXT_PUBLIC_FF_RICH_TEXT` | `true` | Enable rich text editor for notes |
| `NEXT_PUBLIC_FF_SUMMARIES` | `true` | Enable note summaries |

### Social Features

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_FRIENDS` | `true` | Enable friends feature |
| `NEXT_PUBLIC_FF_SHARED_TOPICS` | `true` | Enable shared topics view |

### Auth Features

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_GOOGLE_AUTH` | `true` | Enable Google OAuth login |
| `NEXT_PUBLIC_FF_EMAIL_AUTH` | `true` | Enable email/password login |
| `NEXT_PUBLIC_FF_FORGOT_PASSWORD` | `true` | Enable forgot password feature |

### UI Features

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_DARK_MODE` | `true` | Enable dark mode toggle |
| `NEXT_PUBLIC_FF_API_STATUS` | `true` | Show API status indicator |

### Navigation Features

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_FF_NAV_HOME` | `true` | Show Home link in navigation |
| `NEXT_PUBLIC_FF_NAV_TASKS` | `true` | Show Tasks link in navigation |
| `NEXT_PUBLIC_FF_NAV_TOPICS` | `true` | Show Topics link in navigation |
| `NEXT_PUBLIC_FF_NAV_TOPICS_VIEW` | `true` | Show Topics View link in navigation |
| `NEXT_PUBLIC_FF_NAV_SHARED` | `true` | Show Shared Topics link in navigation |
| `NEXT_PUBLIC_FF_NAV_AUDIO_NOTES` | `true` | Show Audio Notes link in navigation |
| `NEXT_PUBLIC_FF_NAV_FRIENDS` | `true` | Show Friends link in navigation |
| `NEXT_PUBLIC_FF_NAV_PROFILE` | `true` | Show Profile link in navigation |

## Example .env.local

```bash
# Disable AI processing (no OpenAI needed)
NEXT_PUBLIC_FF_AI_PROCESSING=false

# Disable topic linking
NEXT_PUBLIC_FF_TOPIC_LINKING=false

# Disable summaries
NEXT_PUBLIC_FF_SUMMARIES=false

# Disable API status indicator
NEXT_PUBLIC_FF_API_STATUS=false
```

## Usage in Code

```typescript
import { featureFlags } from "@/lib/featureFlags";

// Check if a feature is enabled
if (featureFlags.audioNotes.aiProcessing) {
  // AI processing is enabled
}

// Or use the helper function
import { isFeatureEnabled } from "@/lib/featureFlags";

if (isFeatureEnabled("audioNotes", "aiProcessing")) {
  // AI processing is enabled
}
```

