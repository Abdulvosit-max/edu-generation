# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on http://localhost:3000
npm run build      # Production build → dist/
npm run lint       # TypeScript type-check (tsc --noEmit)
npm run preview    # Preview production build locally
```

Deploy to Vercel production:
```bash
npx vercel --prod --yes
```

## Architecture

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4. No backend — all AI calls go directly from the browser to external APIs.

### AI Layer (`src/lib/gemini.ts`)
Single file handles all AI. `smartAIRequest()` is the core dispatcher:
1. Tries Gemini models in order: `gemini-1.5-flash` → `gemini-1.5-pro` → `gemini-pro`
2. Falls back to Groq (`llama-3.3-70b-versatile`) if all Gemini models fail
3. Results are cached in-memory for 30 minutes (keyed by prompt + jsonMode) — chat history requests are never cached

Image generation uses Pollinations.ai (no API key, URL-based): `https://image.pollinations.ai/prompt/...`

Required env vars: `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY`

### State & Context (`src/lib/AppContext.tsx`)
Global state is only theme (`light`/`dark`) and language (`uz`/`ru`/`en`), persisted to localStorage. All page-level state is local `useState`. No Redux/Zustand.

Translations live in `src/lib/i18n.ts` as a static object — 87 keys per language. Access via `const { t } = useAppContext()`.

### Firebase (`src/lib/firebase.ts`)
**Firebase is completely disabled.** The file exports mock objects (`db = null`, `auth` = a hardcoded guest user). All Firestore imports in pages are commented out. Feed page shows empty state because of this.

### Routing & Code Splitting (`src/App.tsx`)
All 7 routes are lazy-loaded with `React.lazy` + `Suspense`. The `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`) wraps all routes — AI errors show a "Qayta urinish" (retry) button instead of crashing.

### Adding a New Translation Key
Add to all three language objects in `src/lib/i18n.ts`, then access via `t.yourKey` in any component.

### Export Features
- **PDF** (TestGen): `jsPDF` — generates questions + answer key on separate pages
- **PPT** (SlideGen): `pptxgenjs` — fetches slide images as Base64 before writing; the export uses a separate `exporting` state so the main `loading` state isn't hijacked
