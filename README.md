# OurDM – Instagram‑style Messaging (Vite + Supabase + LiveKit)

Production‑ready starter for OurDM with email auth, follow graph, realtime chat, auto‑delete after delivery/read, PWA, and LiveKit calls.

## Quick start
```bash
npm install
npm run dev          # frontend
npm run dev:server   # LiveKit token API (Express)
```

## Environment
Copy `.env.example` to `.env` and fill:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `VITE_LK_URL`
- `VITE_API_BASE` → origin of the token API (e.g. `https://api.yourdomain.com`)
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` (server only)

## Supabase setup
1) Apply `supabase_schema.sql` (auth profiles, follows, threads, messages, receipts, call_invites, RLS).  
2) Apply `storage_policies.sql` using the Supabase SQL Editor (service role) to create buckets/policies.  
3) Enable Realtime on `messages`, `message_receipts`, and `call_invites`.  
4) Buckets: `avatars` (public), `chat-media` (public unless you prefer signed URLs), `voice-notes` (private).

## LiveKit token API (server)
`server/index.ts` exposes `/api/livekit-token` (Express). Deploy behind HTTPS; set environment variables above. Point `VITE_API_BASE` at this host for the client.

## Features
- Email/password auth + profile setup (username/full name/avatar).
- Instagram‑style follow/following, suggestions, profile peek.
- Realtime DMs with Supabase channels + Dexie offline cache.
- Voice notes, images, faux E2EE badges; auto‑delete server messages after all parties delivered/read (local cache retained).
- 1:1 voice/video calls via LiveKit; ringing/accept/decline with service worker notifications.
- PWA (vite-plugin-pwa) + dark glassmorphism UI with Framer Motion.

## Scripts
- `npm run dev` – Vite dev server
- `npm run dev:server` – LiveKit token API
- `npm run build` – production build
- `npm run preview` – preview build
- `npm run lint` – ESLint

## Notes
- Keep secrets out of the client build. Only public keys go in `VITE_*`; server secrets live in API env.  
- Replace `public/logo.svg` (and generate proper PNGs for `pwa-192x192.png`, `pwa-512x512.png`) with your brand assets for stores/install prompts.  
- Storage limits: enforce size/type limits in Supabase bucket settings for media uploads.
