# Pasko Photo Magic

**Balik Alaala sa Pasko** — a mobile-first Christmas AI photo web app for the Filipino audience. A customer uploads one photo, pays ₱99 or ₱149, and receives 5 magical Christmas photos. The ₱149 package adds a slideshow video with Christmas music.

## Packages

| Package | Price | What the customer gets |
|---|---|---|
| Basic Magic | ₱99 | 1 uploaded photo → 5 Christmas styles. Customer picks which template is made first. No music. |
| Magic with Music | ₱149 | No template choice — all 5 styles are included automatically. Slideshow of the 5 photos with jolly Christmas music, playable on the page and downloadable as a video. |

Payments: GCash, Maya, bank transfer. An order is never shown as paid until an admin verifies it.

## Order process

1. Upload photo
2. Choose template (₱99 only; ₱149 skips this and shows all 5 styles as included)
3. Payment (GCash / Maya / bank transfer details shown)
4. After admin verifies payment, 5 photos are generated — selected template first, then the remaining four

Order statuses: Pending Payment → Payment Verified → Processing → Completed / Failed. Customers never sign in; each order has a unique `XM-...` reference and a secret access token. Tracking requires the order number + mobile number.

## The 5 Christmas templates

Stored catalog keys are stable and never change (existing orders depend on them):

| Key | Style | Scene |
|---|---|---|
| `santa` | Simbang Gabi | Filipino stone church at dusk, parol lanterns, casual modest mass-outing clothes (no barong) |
| `family` | Pajama | Matching red-and-green tartan pajamas + red Santa hats, sofa, tree, gifts, hot chocolate |
| `winter` | Snow | Snow-covered pine forest, ivory winter coats |
| `lights` | Street Celebration | Filipino street at night under colorful parols, food stalls |
| `fashion` | Traditional / Spanish / Barong | Spanish-colonial home, capiz windows, cream barong Tagalog + burgundy Filipiniana |

## AI generation

- **Paid orders**: Replicate (`black-forest-labs/flux-kontext-pro`) through the Lovable connector gateway, server-side only. Auto-retry/replay is disabled so failed runs never double-bill. Output must be a verified PNG.
- **Test photos** (admin dialog + public checkout tester): the built-in Lovable AI gateway, so testing never spends the owner's Replicate balance.
- Prices are always read from `app_settings` on the server — client prices are never trusted.
- Generation requires a stored admin payment-verification timestamp, not just a status, so unpaid orders can never be generated.

## Slideshow video (₱149)

- Recorded entirely in the customer's browser (canvas + MediaRecorder, `src/lib/slideshow-video.ts`) from the already-loaded photos and the stored site music — no server video rendering.
- 720×1280 vertical 9:16, 3 seconds per photo (15 s), soft crossfades and slow zoom, warm faded-film tint, subtle grain, and a continuously scrolling three-photo strip below the main photo. Playback and the downloaded video use the same drawing routine. The existing Christmas greeting and music are retained; no reference text, audio, or watermark is copied.
- On the order page the video builds **automatically** when the photos load; a "Save slideshow video" button appears when done.
- Current music: "Star ng Pasko (Intro)" — a 30-second cut of the uploaded licensed song with a fade-out, stored in the private `site-media` bucket. The admin can replace it anytime with the "Upload MP3" button.

## PWA & downloads

- Installable PWA: manifest ("Pasko Photo Magic" / "Pasko Magic"), parol icons (180/192/512), iOS meta tags, standalone display.
- Smart install prompt (`src/components/InstallPrompt.tsx`): Christmas-themed bottom banner, shown only after engagement (tap Create, pick a photo, or ~18 s). Android/Chrome gets the native install button; iPhone gets Share → Add to Home Screen steps. Dismissal is remembered (localStorage); never shows when already installed. English + Filipino.
- Offline support (`vite-plugin-pwa`, `src/lib/pwa.ts`): precaches only built static assets; pages are NetworkFirst; photos and API data are never cached; old caches clear on new publish. Uploading or generating while offline shows a friendly bilingual toast.
- iPhone / in-app-browser saving (`src/lib/download.ts`, `src/components/SaveImageSheet.tsx`): detects iOS and Messenger/Facebook/Instagram in-app browsers. Normal downloads on Android/desktop; on iOS/Messenger a Christmas-themed guide shows "long press the image → Save to Photos" plus an "Open Image in New Tab" button. Touch devices use the native share sheet. Order page preloads photo blobs so taps save instantly; "Save all 5 photos" shares all five at once.

## Admin dashboard

- First account to sign up becomes admin (trigger `handle_first_admin`); roles live in `user_roles`.
- Verify payments (one tap: "Verify payment & generate 5 photos"), generate/retry styles one at a time, manage samples, site settings, and music.
- Admin-only Test Photo dialog for diagnostics.
- Expired orders and their photos are deleted by a daily cleanup job.

## Testing-phase notes (remove before launch)

- The public no-code **TEST PHOTO / TEST ₱149** button on the checkout payment step is deliberate for testers only — it spends AI credit and must be removed or locked before launch.
- Security scan warnings accepted by design for now: order tracking uses order number + mobile number; expired-order photo links should be blocked after expiry.

## Tech stack

- TanStack Start v1 (React 19, Vite 7, Cloudflare Workers target)
- TypeScript, Tailwind CSS v4, shadcn components
- Lovable Cloud (auth, database, private storage buckets `order-photos` / `site-media`)
- Server logic: `createServerFn` in `src/lib/api/*.functions.ts`; server-only helpers in `src/server/*.server.ts`

## Development

```sh
bun install
bun run dev      # dev server
bunx vitest run  # 35 checks
```

## Deploying to Vercel

The repo is Vercel-ready: `vite.config.ts` builds with nitro's `vercel` preset outside the Lovable sandbox, producing `.vercel/output` (Build Output API) — static assets + service worker in `static/`, SSR and server functions in `functions/__server.func`. `vercel.json` pins the build command.

1. Import the repo in Vercel (Framework Preset: **Other**; build `npm run build`, install `npm install` — already set in `vercel.json`).
2. Add these environment variables in the Vercel project settings:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (browser)
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `LOVABLE_API_KEY` (test-photo AI gateway)
3. Deploy. The PWA service worker, manifest, and icons are included in the static output.

Notes:
- Builds inside Lovable keep the Cloudflare target automatically; the Vercel preset only applies to external CI.
- Paid-order generation calls Replicate through Lovable's connector gateway — verify that path works from Vercel before relying on it there, or move the Replicate key into a Vercel secret.
- The daily cleanup job (`/api/public/jobs/cleanup`) needs a cron trigger; on Vercel add a Cron Job pointing at it with the cron secret header.
