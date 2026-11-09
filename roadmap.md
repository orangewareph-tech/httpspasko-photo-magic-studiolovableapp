# App-wide Christmas magic
- [x] Add lightweight snowfall and randomized fast Santa flybys with magical sparkling trails across all pages, without blocking controls.
- [x] Add tap-enabled locally synthesized instrumental Jingle Bells and browser-spoken Santa laughter; stop when hidden or slideshow audio plays and respect reduced motion. Verified desktop/phone screenshots, sound enable/mute, pricing-page snow, slideshow protection, reduced motion, no overflow or runtime errors, and six tests. Physical phone audio quality remains unverified.

# Festive Christmas slideshow
- [x] Replace the film strip and old greetings with full-height photos, the timed Christmas title, and a permanent ribbon signature; retain 15 seconds and shuffled audio.
- [x] Add corner greenery and ornaments, warm lights, golden glow, and continuous snowfall; verified title/fade screenshots, a downloaded 15.033-second 720×1280 video with music, phone layout without overflow, and 18 automated checks. Physical iPhone/Messenger saving remains unverified.

# Slideshow effects and local saving
- [x] Add 0.3-second transitions, layered snow, cinematic zoom/light sweeps while retaining music and the 15-second five-photo film strip.
- [x] Provide prepared local ZIP downloads for all five photos and the slideshow, including phone saving guidance and tester support; retain single-photo/video saving.
- [x] Verify recording with catalog photos and actual site music: 15.007-second video plays with audio, ZIP contains five photos plus video, simulated iPhone download succeeds, no phone overflow, 25 relevant tests pass. Physical iPhone/Messenger and paid-order customer saving remain unverified.

# Reference UI update
- [x] Match the uploaded video's warm photo fades and scrolling strip in playback and downloads; retained Christmas greeting/music and 15-second timing. Browser recording reached 14.9 seconds with audio, downloaded and played, with no mobile overflow; 11 slideshow tests pass.
- [x] Scan slideshow rendering failures, fix recording fallback and lifecycle handling, and verify a downloaded 30-second five-photo video plays with music and no mobile overflow; physical iPhone/Messenger remains unverified.
- [x] Fix slideshow recording/download compatibility; verified a 30-second five-photo file downloads and plays with an audio track, with 40 tests passing. Physical iPhone/Messenger saving remains unverified.
- [x] Match the snowy Christmas reference, photo collage, pricing, and benefit strip.
- [x] Preserve Pasko Photo Magic branding and all ordering behavior.
- [x] Verify desktop and mobile layout and package navigation.

# Uploaded homepage artwork
- [x] Replace the opening collage with the complete uploaded artwork; retain the name, logo, and checkout buttons.
- [x] Verify artwork and package navigation on mobile and desktop.

# Order process
- [x] Implement upload → template → payment → five-photo generation sequence.
- [x] Save the chosen template with the order and show it in payment and admin views.
- [x] Test customer ordering end-to-end through pending payment and test the generation payment gate; no live generation or transfer performed.

# Google Gemini integration
- [x] Connect verified photo generation to the saved Gemini key without exposing credentials.
- [x] Attempt a real sample photo edit: Google returns 429 with a zero free-tier image quota; do not retry or change providers.
- [x] Gemini billing blocker superseded by the owner's request to switch to Replicate.
- [x] Verify the homepage and admin sign-in gate, pass 12 automated checks including payment protection, and save the changes.

# Replicate switch
- [x] Link Replicate and switch reference-photo editing to FLUX Kontext Pro, preserving the paid-order gate and private PNG storage.
- [x] Pass 17 automated checks and generate a real Christmas sample PNG using the linked account.
- [ ] Verify a paid order generates and reads back in the admin/customer screens; blocked because no admin account has been created yet.

# Tester access
- [x] Add a no-code Test Photo button beside payment methods, using the uploaded photo and selected template without changing orders or payments.
- [x] Verify a real signed-out test generates and displays a downloadable photo; mobile has no overflow and 20 automated checks retain paid-order protections.

# Latest five-template artwork
- [x] Replace the five template pictures and sample gallery with the owner's latest artwork.
- [x] Match generation instructions and prompt.md to the five new scenes, retaining stored template keys and payment rules.
- [x] Verify all five template selections, gallery navigation, mobile/desktop layout, and prompt coverage; 28 automated checks pass. No new billed photo generation performed.