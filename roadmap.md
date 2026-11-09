# Slideshow effects and local saving
- [ ] Add quick transitions, snow, and cinematic motion while retaining music and the 15-second five-photo film strip.
- [ ] Provide prepared local downloads for all five photos and the slideshow, including phone saving guidance and tester support.
- [ ] Verify recording, playback, downloaded archive contents, and phone layout; physical iPhone/Messenger saving requires device testing.

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