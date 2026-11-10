<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## XmasMagic PH architecture
- Customers never sign in; orders are created and read only through server functions in `src/lib/api/orders.functions.ts` using a secret per-order access token — keeps photos private without customer accounts.
- Server functions live in `src/lib/api/*.functions.ts`; server-only helpers live in `src/server/*.server.ts` and are imported dynamically inside handlers — the `src/server` folder is blocked from client bundles.
- Storage buckets are private (`order-photos`, `site-media`); browsers only get short-lived signed URLs — workspace blocks public buckets.
- Prices are always read from `app_settings` on the server when creating an order — never trust client prices.
- Orders move to Payment Verified only by an admin; AI generation runs one style per server call from the admin dashboard — avoids worker timeouts.
- The first account to sign up becomes admin (trigger `handle_first_admin`); roles live in `user_roles`.
- The homepage Christmas studio presentation lives in a dedicated section and reads the shared catalog and site settings, so visual redesigns do not change checkout rules.
- Checkout uses a gated photo/template/payment sequence; the stored template is generated first, followed by the remaining catalog styles, so every order still includes five photos.
- Generation and retries require a stored admin payment-verification timestamp, not just a failed/processing status, to prevent unpaid generation.
- Paid-order photo editing uses the official Replicate SDK through the connector gateway with the linked connection key; transport disables automatic replay and results remain private PNGs — honors the owner's provider choice without duplicating billed work.
- Test photos (admin dialog and public checkout tester) use the Lovable AI gateway (`/v1/images/generations`, generate-content format) instead of Replicate — keeps tester traffic off the owner's Replicate balance.
- Admin photo tests require server-verified admin access and return transient images without touching orders or payments — permits diagnostics without bypassing customer payment gates.
- Checkout photo tests are deliberately public during testing and reuse a server-only single-image helper; neither test endpoint accesses orders or payments — allows no-code tester access while preserving paid-order generation gates.
- Template updates retain stored catalog keys and indices while replacing shared previews and scene prompts — keeps existing orders compatible and tester/order generation consistent.

- Offline support uses vite-plugin-pwa generateSW (outDir dist/client) registered only from `src/lib/pwa.ts`, which refuses dev/preview/iframe hosts; only built static assets are precached and pages are NetworkFirst, never photos or API data — keeps previews fresh and customer images private.
- The ₱149 slideshow video is recorded locally only with all five photos and music ready, using explicit H.264/AAC MP4 or correctly named WebM with encoder-construction fallback; suspended audio defers to a tap, input changes/unmount cancel recording, interruptions stop animation, and recordings are previewed before saving — prevents incomplete, stale, or incompatible exports without uploading customer media.
- Slideshow playback and recording share the full-height Christmas composition in `drawFilmFrame` and timing constants; canvas colors read semantic film tokens from global CSS — keeps animated decorations and greetings identical in the preview and saved video without importing reference media.
- Local photo/video archives are prepared before a saving tap through shared download controls; phone saving uses native sharing or persistent Blob links, never localStorage or server uploads — preserves user activation and avoids browser storage limits for private media.
- Browser-recorded WebM files get duration metadata before preview or packaging — makes downloaded videos seekable instead of reporting infinite duration.
- App-wide Christmas effects live in a pointer-transparent shared overlay with reduced-motion and visibility guards; local synthesis and browser speech unlock on the first eligible page interaction, respect manual mute, and stop when slideshow/media playback begins; each flyby selects a greeting and sets distance-based volume on short speech segments because browser engines ignore live utterance-volume changes — preserves phone performance, browser autoplay rules, customer controls, and slideshow audio.
