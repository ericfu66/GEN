# QY Gen

QY Gen is a BYOK AI media workstation built with Next.js. It combines text-to-image, image-to-image, text-to-video, chat-assisted prompt writing, image reverse prompting, and a reusable prompt plaza in one local web app.

## Features

- BYOK provider configuration for OpenAI-compatible `/v1` endpoints.
- Separate primary media endpoint and optional secondary chat/vision endpoint.
- Text-to-image, image-to-image, and text-to-video generation modes.
- Image analysis page that turns an uploaded image or image URL into a reusable prompt.
- Chat side panel for prompt iteration and creative support.
- Prompt plaza for saving and reusing successful prompts.
- Local account/session storage with server-side API key handling.
- Mobile responsive layout for the main workstation, analysis page, and plaza.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Zustand
- Lucide React

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set a strong `APP_SECRET` in `.env`:

```env
APP_SECRET="replace-with-a-long-random-secret"
DATA_DIR=".data"
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Configuration

After signing in, open the BYOK configuration panel and provide:

- `API Base URL`: OpenAI-compatible primary endpoint.
- `API Key`: primary endpoint key.
- Optional `Chat API Base URL` and `Chat API Key`: secondary endpoint for chat and image analysis.

The app calls `/v1/models` to load available models and maps model IDs to chat, image, image-to-image, and video features.

## Scripts

```bash
npm run dev        # Start local dev server
npm run build      # Build for production
npm run start      # Start production server
npm run typecheck  # Run TypeScript checks
```

## Security Notes

Do not commit real secrets or runtime data. The repository ignores:

- `.env`
- `.env*.local`
- `.data`
- `.next`
- `node_modules`
- `public/uploads`
- `.claude`
- `.vercel`

Only `.env.example` is intended to be committed. API keys are stored in the local runtime data directory and are not exposed by the safe config response.

For production, set a strong `APP_SECRET`; the server rejects the default development secret in production session flows.

## Project Structure

```text
app/                 Next.js app routes and UI components
app/api/             Server routes for auth, config, generation, chat, upload, plaza
lib/client/          Client helpers and Zustand store
lib/server/          Server-only auth, persistence, provider, and security helpers
lib/types.ts         Shared TypeScript types
```

## Deployment

Build the app with:

```bash
npm run build
```

Set production environment variables in the deployment platform instead of committing them:

```env
APP_SECRET="a-long-random-production-secret"
DATA_DIR=".data"
```
