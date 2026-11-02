# Denotes: Low-Level Design

Mermaid diagrams render on GitHub and in most Markdown viewers.

## 1. System overview (layers and dependencies)

```mermaid
flowchart TB
    subgraph Client["Client (Next.js App Router, React 19)"]
        Pages["Pages: blog, topics, topics-view, shared-topics,<br/>friends, crud (tasks), audio-notes,<br/>mock-interview, profile, admin, inventory, login"]
        Comps["Components: Navigation, ProtectedRoute,<br/>RichTextEditor (Tiptap), AudioRecorder,<br/>RagChatWidget, FeatureFlagsProvider, ThemeProvider"]
        Hook["lib/useRagChat.ts"]
    end

    subgraph Server["Server (Next.js on Vercel)"]
        SA["Server actions<br/>app/actions.ts<br/>app/interview-actions.ts<br/>app/rag-actions.ts<br/>app/feature-flags-actions.ts"]
        API["API routes<br/>/api/auth/*<br/>/api/rag/chat|ingest|health|chat/reset<br/>/api/audio/transcribe|process|test<br/>/api/interview/start|resume<br/>/api/blog/[id]"]
    end

    subgraph Lib["lib/"]
        Auth["auth.ts<br/>(next-auth v5)"]
        Flags["featureFlags.ts<br/>featureFlagOverrides.ts"]
        Mail["email.ts<br/>(nodemailer)"]
        Mongo["mongodb.ts<br/>(lazy client proxy)"]
        Whisper["whisper-fix.ts"]
        RAG["rag/*<br/>config, loader, notesLoader, chunker,<br/>vectorStore, generator, pipeline, history, ingest"]
        Interview["interview/*<br/>config, resumeParser, resumeStore,<br/>generator, store, insightsGenerator, insightsStore"]
    end

    subgraph Ext["External services"]
        DB[("MongoDB")]
        Upstash[("Upstash Vector")]
        Gemini["Gemini (primary LLM)"]
        Groq["Groq (fallback LLM)"]
        OpenAI["OpenAI (audio AI processing)"]
        SMTP["SMTP server"]
        Google["Google OAuth"]
        FF["ffmpeg + whisper-node (local binaries)"]
    end

    Pages --> Comps
    Comps --> SA
    Comps --> API
    Hook --> API
    Pages --> Flags

    SA --> Auth
    SA --> Mongo
    SA --> Mail
    SA --> RAG
    SA --> Interview
    API --> Auth
    API --> RAG
    API --> Interview
    API --> Whisper

    Auth --> Mongo
    Auth --> Google
    Mongo --> DB
    Mail --> SMTP
    RAG --> Upstash
    RAG --> Gemini
    RAG -. fallback .-> Groq
    RAG --> Mongo
    Interview --> Gemini
    Interview -. fallback .-> Groq
    Interview --> Mongo
    Whisper --> FF
    API -->|audio/process| OpenAI
```

## 2. Authentication and session

```mermaid
flowchart TD
    A([User opens /login]) --> B{Method}
    B -->|Google| C[Google OAuth consent]
    B -->|Email + password| D[Credentials authorize]
    D --> E[Find user in users collection]
    E --> F{User exists and has password?}
    F -->|No| X[Return null / login error]
    F -->|Yes| G{bcrypt.compare OK?}
    G -->|No| X
    G -->|Yes| H[Create session]
    C --> H
    H --> I[auth returns session.user.id]
    I --> J[getCurrentUserId used by server actions and API routes]

    K([Sign up]) --> L[Hash password with bcryptjs, insert user]
    L --> M[Send verification email]
    M --> N[/api/auth/verify-email marks email verified/]

    O([Forgot password]) --> P[Create token in passwordResets]
    P --> Q[Send reset email]
    Q --> R[reset-password page sets new hash]
```

## 3. Core CRUD server action flow (topics, notes, tasks, friends, sharing)

```mermaid
flowchart TD
    UI([Page / component]) -->|calls| SA["Server action in app/actions.ts"]
    SA --> U{getCurrentUserId}
    U -->|null| Err[Return error / redirect to login]
    U -->|userId| V[Validate input]
    V --> Q["MongoDB op scoped by userId<br/>(topics, notes, subjects, tasks,<br/>sharedTopics, friendRequests, users, blogs, inventory)"]
    Q --> S{Mutation touching topics or notes?}
    S -->|Yes| R["scheduleUserContentReindex(userId)"]
    S -->|No| T
    R --> T{Needs notification?}
    T -->|Share topic / friend request / task assigned| M["lib/email.ts helper"]
    T -->|No| W
    M --> W["revalidatePath(route)"]
    W --> Ret[Return serialized result<br/>ObjectId to string]
    Ret --> UI
```

## 4. Audio notes flow

```mermaid
flowchart TD
    A([User records on /audio-notes]) --> B{FF_AUDIO_NOTES enabled?}
    B -->|No| Z[Feature hidden]
    B -->|Yes| C[AudioRecorder captures audio]
    C --> D["POST /api/audio/transcribe"]
    D --> E{auth session?}
    E -->|No| E1[401]
    E -->|Yes| F[Write temp file in tmpdir]
    F --> G[ffmpeg converts to wav]
    G --> H[whisper-node transcribes<br/>paths from whisper-fix.ts]
    H --> I{Success?}
    I -->|No, fallback| J[Run whisper via exec]
    I -->|Yes| K[Delete temp files, return text]
    J --> K
    K --> L{FF_AI_PROCESSING enabled?}
    L -->|Yes| M["POST /api/audio/process<br/>OpenAI structures title, content, action items"]
    L -->|No| N
    M --> N{FF_TOPIC_LINKING?}
    N -->|Yes| O[Link note to topic]
    N -->|No| P
    O --> P[Server action creates note in notes collection]
    P --> Q["scheduleUserContentReindex"]
```

## 5. RAG chat: ingest and query

```mermaid
flowchart TD
    subgraph Ingest
        I1([npm run rag:ingest or POST /api/rag/ingest<br/>with RAG_INGEST_SECRET]) --> I2[loader.ts fetches URLs<br/>docs, blog, public topics]
        I3([Notes / topics mutation]) --> I4["scheduleUserContentReindex(userId)"]
        I4 --> I5[notesLoader.ts reads user notes and topics from MongoDB]
        I2 --> CH[chunker.ts<br/>size 800, overlap 150]
        I5 --> CH
        CH --> ST["vectorStore.storeChunks(chunks, namespace)"]
        ST --> NS{Namespace}
        NS -->|public| UP1[(Upstash default)]
        NS -->|personal| UP2[("Upstash user:id")]
    end

    subgraph Query
        Q1([User asks in RagChatWidget / RagChatMainStage]) --> Q2["useRagChat → POST /api/rag/chat"]
        Q2 --> Q3{auth session?}
        Q3 -->|No| Q3a[401]
        Q3 -->|Yes| Q4["pipeline.chat(userId, sessionId, question)"]
        Q4 --> Q5[history.getHistory from MongoDB]
        Q4 --> Q6["vectorStore.retrieveForUser<br/>public + user namespace, top K merged by score"]
        Q5 --> Q7
        Q6 --> Q7["generator.generateAnswer(question, history, context)"]
        Q7 --> Q8{Gemini ok?}
        Q8 -->|Quota / rate limit| Q9[Groq fallback]
        Q8 -->|Yes| Q10
        Q9 --> Q10[Answer + source URLs]
        Q10 --> Q11[history.appendTurn]
        Q11 --> Q12([Return to client])
        Q13([POST /api/rag/chat/reset]) --> Q14[history.clearSession]
    end
```

## 6. Mock interview flow

```mermaid
flowchart TD
    A([/mock-interview]) --> B[Upload resume or reuse saved<br/>GET /api/interview/resume]
    B --> C["POST /api/interview/start<br/>(duration 30 / 60 / 90 min)"]
    C --> D[resumeParser.parseResumeFile<br/>pdf-parse / mammoth, max 5 MB]
    D --> E[resumeStore.saveUserResume]
    E --> F[store.createInterviewSession]
    F --> G["generator.generateInterviewTurn<br/>Gemini, Groq fallback"]
    G --> H[store.appendQuestion]
    H --> I([Show question])
    I --> J["submitInterviewAnswer (server action)"]
    J --> K[store.answerLastTurn]
    K --> L{isInterviewTimeUp or maxTurns reached?}
    L -->|No| G
    L -->|Yes| M[generateInterviewTurn returns feedback]
    M --> N[store.completeInterviewSession]
    O([endInterviewEarly]) --> M
    N --> P[getMyInterviewSessions]
    P --> Q["generateMyLearningInsights<br/>insightsGenerator + insightsStore"]
```

## 7. Feature flag gating

```mermaid
flowchart LR
    ENV[".env.local / Vercel env<br/>NEXT_PUBLIC_FF_*"] --> FF["lib/featureFlags.ts"]
    OV["featureFlagOverrides.ts<br/>feature-flags-actions.ts (admin)"] --> FF
    FF --> Prov["FeatureFlagsProvider"]
    Prov --> Nav["Navigation links"]
    Prov --> Pg["Pages and components"]
    FF --> Srv["Server actions / API routes"]
```

## 8. MongoDB collections

`users`, `topics`, `notes`, `subjects`, `tasks`, `sharedTopics`, `friendRequests`, `passwordResets`, `blogs`, `blogComments`, `inventory`, `families` (feature disabled by default). RAG chat history and interview sessions, resumes and insights are stored through `lib/rag/history.ts` and `lib/interview/*Store.ts`.
