// Records Christmas photos and music locally; never uploads customer media.
export const SLIDESHOW_WIDTH = 720;
export const SLIDESHOW_HEIGHT = 1280;
export const SLIDESHOW_PHOTO_SECONDS = 3;
const W = SLIDESHOW_WIDTH;
const H = SLIDESHOW_HEIGHT;
const MAIN_H = H;
const PER_PHOTO = SLIDESHOW_PHOTO_SECONDS;
export const SLIDESHOW_TRANSITION_SECONDS = 0.3;
const FADE = SLIDESHOW_TRANSITION_SECONDS;

const VIDEO_TYPES = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus"];

export function pickVideoType(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  // Generic video/mp4 can silently select VP9 + Opus, which iPhone Photos cannot play.
  for (const mime of VIDEO_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" };
  }
  return null;
}

export function createSlideshowRecorder(stream: MediaStream): MediaRecorder {
  if (typeof MediaRecorder !== "undefined") {
    for (const mimeType of VIDEO_TYPES) {
      if (!MediaRecorder.isTypeSupported(mimeType)) continue;
      // Some phones advertise a codec but cannot initialize its encoder.
      for (const options of [{ mimeType, videoBitsPerSecond: 4_000_000 }, { mimeType }]) {
        try { return new MediaRecorder(stream, options); } catch { /* Try safer options, then the next codec. */ }
      }
    }
  }
  throw new Error("This browser can't create a playable video. Please open the page in Safari or Chrome.");
}

export async function wakeSlideshowAudio(ctx: AudioContext) {
  const isRunning = () => ctx.state === "running";
  if (isRunning()) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      ctx.resume(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Tap Create slideshow video to enable the music, and keep this page open.")), 1500); }),
    ]);
    if (!isRunning()) throw new Error("Tap Create slideshow video to enable the music, and keep this page open.");
  } finally {
    clearTimeout(timer);
  }
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, alpha: number, zoom: number, x = 0, y = 0, w = W, h = H) {
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

export function christmasTitleMotion(t: number) {
  const progress = Math.max(0, Math.min(t / 0.45, 1));
  const scale = progress === 1 ? 1 : 1 + 2.70158 * Math.pow(progress - 1, 3) + 1.70158 * Math.pow(progress - 1, 2);
  return { scale, opacity: t <= 4 ? 1 : Math.max(0, 1 - (t - 4) / 2) };
}

export function makeGrain(): HTMLCanvasElement {
  const g = document.createElement("canvas");
  g.width = 256; g.height = 256;
  const gctx = g.getContext("2d");
  if (gctx) {
    const data = gctx.createImageData(256, 256);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.random() * 255;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      data.data[i + 3] = 10;
    }
    gctx.putImageData(data, 0, 0);
  }
  return g;
}

export async function loadFilmPhoto(photo: Blob): Promise<ImageBitmap> {
  const original = await createImageBitmap(photo);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, H / Math.max(original.width, original.height));
    canvas.width = Math.round(original.width * scale);
    canvas.height = Math.round(original.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo rendering is unavailable.");
    ctx.filter = "sepia(0.12) saturate(1.08) contrast(1.02) brightness(1.02)";
    ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
    return await createImageBitmap(canvas);
  } finally { original.close(); }
}

// Full-height Christmas composition shared by playback and downloaded recordings.
export function drawFilmFrame(ctx: CanvasRenderingContext2D, bitmaps: ImageBitmap[], t: number, grain: HTMLCanvasElement) {
  if (!bitmaps.length) return;
  const tokens = getComputedStyle(document.documentElement);
  const color = (name: string) => tokens.getPropertyValue(`--film-${name}`).trim();
  const idx = Math.min(Math.floor(t / PER_PHOTO), bitmaps.length - 1);
  const local = t - idx * PER_PHOTO;
  ctx.filter = "none";
  ctx.fillStyle = color("background");
  ctx.fillRect(0, 0, W, H);
  const current = bitmaps[idx];
  const motion = 1 - Math.pow(1 - Math.min(local / PER_PHOTO, 1), 2);
  if (current) drawCover(ctx, current, 1, 1 + 0.14 * motion, 0, 0, W, MAIN_H);
  const next = bitmaps[(idx + 1) % bitmaps.length];
  if (next && local > PER_PHOTO - FADE) drawCover(ctx, next, (local - (PER_PHOTO - FADE)) / FADE, 1, 0, 0, W, MAIN_H);

  // Warm tint + vignette + grain
  ctx.fillStyle = color("tint");
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, MAIN_H / 2, W * 0.3, W / 2, MAIN_H / 2, W * 0.95);
  vg.addColorStop(0, color("clear"));
  vg.addColorStop(1, color("vignette"));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, MAIN_H);
  ctx.save();
  ctx.translate(-Math.random() * 128, -Math.random() * 128);
  ctx.fillStyle = ctx.createPattern(grain, "repeat") ?? color("clear");
  ctx.fillRect(0, 0, W + 128, H + 128);
  ctx.restore();

  // Soft warm lights along the outer edges, leaving faces unobscured.
  for (let i = 0; i < 16; i++) {
    const x = i % 2 ? W - 20 - (i % 4) * 12 : 20 + (i % 4) * 12;
    const y = 65 + i * 73;
    const radius = 18 + (i % 3) * 8;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color("light"));
    glow.addColorStop(1, color("clear"));
    ctx.save();
    ctx.globalAlpha = 0.22 + 0.12 * Math.sin(t * 0.9 + i);
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  // Evergreen sprigs and shaded glass ornaments in both upper corners.
  for (const side of [1, -1]) {
    ctx.save();
    ctx.translate(side === 1 ? 0 : W, 0);
    ctx.scale(side, 1);
    ctx.lineCap = "round";
    for (let branch = 0; branch < 5; branch++) {
      ctx.save();
      ctx.rotate(0.12 + branch * 0.22);
      ctx.strokeStyle = color("pine");
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(215 - branch * 14, 24); ctx.stroke();
      for (let needle = 0; needle < 22; needle++) {
        const x = needle * 9;
        ctx.strokeStyle = needle % 2 ? color("needle") : color("pine");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 23); ctx.lineTo(x + 17, 23 - 26 + needle * 0.65);
        ctx.moveTo(x, 23); ctx.lineTo(x + 17, 23 + 26 - needle * 0.65);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (let ornament = 0; ornament < 3; ornament++) {
      const x = 38 + ornament * 64;
      const y = 110 + (ornament % 2) * 48;
      const r = 22 + (ornament % 2) * 6;
      ctx.strokeStyle = color("gold"); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, y - r); ctx.stroke();
      const glass = ctx.createRadialGradient(x - 8, y - 9, 2, x, y, r);
      glass.addColorStop(0, color("text"));
      glass.addColorStop(0.22, color(ornament % 2 ? "gold" : "red"));
      glass.addColorStop(1, color(ornament % 2 ? "light" : "red-dark"));
      ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color("gold"); ctx.fillRect(x - 5, y - r - 6, 10, 7);
    }
    ctx.restore();
  }

  // Gentle cinematic gold light sweep, never a strobe or full-frame flash.
  ctx.save();
  ctx.globalAlpha = 0.16;
  const sweepX = ((t * 115) % (W * 2)) - W / 2;
  const sweep = ctx.createLinearGradient(sweepX - 150, 0, sweepX + 150, MAIN_H);
  sweep.addColorStop(0, color("clear"));
  sweep.addColorStop(0.5, color("light"));
  sweep.addColorStop(1, color("clear"));
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, W, MAIN_H);
  ctx.restore();

  // Deterministic layered snowfall: identical in the player and local recording.
  ctx.save();
  ctx.fillStyle = color("snow");
  for (let i = 0; i < 100; i++) {
    const depth = (i % 3) + 1;
    const x = ((i * 137.5 + Math.sin(t * 0.6 + i) * 28 + t * 12) % W + W) % W;
    const y = ((i * 83.7 + t * (24 + depth * 16)) % (H + 20)) - 10;
    ctx.globalAlpha = 0.3 + depth * 0.17;
    ctx.beginPath();
    ctx.arc(x, y, depth * 1.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Snow bank at the bottom edge.
  ctx.fillStyle = color("snow");
  ctx.beginPath(); ctx.moveTo(0, H);
  ctx.lineTo(0, H - 27);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H - 25 - Math.sin(x / 80) * 9);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  // Only the Christmas greeting and ribbon signature are drawn as text.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "0px";
  const title = christmasTitleMotion(t);
  if (title.opacity > 0 && title.scale > 0) {
    ctx.save(); ctx.globalAlpha = title.opacity;
    ctx.translate(W / 2, H * 0.46); ctx.scale(title.scale, title.scale);
    const festive = ctx.createLinearGradient(0, -28, 0, 28);
    festive.addColorStop(0, color("red")); festive.addColorStop(0.48, color("red"));
    festive.addColorStop(0.52, color("green")); festive.addColorStop(1, color("green"));
    ctx.font = "900 62px Outfit, sans-serif";
    ctx.shadowColor = color("shadow"); ctx.shadowBlur = 16;
    ctx.lineWidth = 7; ctx.strokeStyle = color("snow");
    ctx.strokeText("MERRY CHRISTMAS", 0, 0, W - 80);
    ctx.fillStyle = festive; ctx.fillText("MERRY CHRISTMAS", 0, 0, W - 80);
    ctx.shadowBlur = 0;
    // Santa cap perched on the first letter.
    ctx.fillStyle = color("red"); ctx.beginPath();
    ctx.moveTo(-304, -31); ctx.quadraticCurveTo(-299, -109, -244, -78);
    ctx.quadraticCurveTo(-275, -80, -266, -32); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color("snow"); ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(-305, -32); ctx.lineTo(-265, -32); ctx.stroke();
    ctx.fillStyle = color("snow"); ctx.beginPath(); ctx.arc(-244, -78, 10, 0, Math.PI * 2); ctx.fill();
    // Holly leaves, red berries, and tiny gold star glints.
    for (const side of [-1, 1]) {
      ctx.fillStyle = color("green");
      for (const angle of [-0.5, 0.5]) {
        ctx.save(); ctx.translate(side * 277, 46); ctx.rotate(angle);
        ctx.beginPath(); ctx.ellipse(0, 0, 21, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = color("red");
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(side * 277 + i * 6 - 6, 48 + (i % 2) * 6, 4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.strokeStyle = color("gold"); ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const x = -290 + i * 65; const y = i % 2 ? 68 : -63;
      const r = 3 + 3 * (0.5 + 0.5 * Math.sin(t * 3 + i));
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    }
    ctx.restore();
  }

  // Permanent red ribbon, safely above the snow and phone playback controls.
  const ribbonY = H - 155;
  ctx.save();
  ctx.fillStyle = color("red-dark");
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(W / 2 + side * 240, ribbonY - 22);
    ctx.lineTo(W / 2 + side * 326, ribbonY - 22); ctx.lineTo(W / 2 + side * 306, ribbonY + 15);
    ctx.lineTo(W / 2 + side * 326, ribbonY + 56); ctx.lineTo(W / 2 + side * 240, ribbonY + 56); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = color("red"); ctx.shadowColor = color("shadow"); ctx.shadowBlur = 14;
  ctx.fillRect(76, ribbonY - 34, W - 152, 81);
  ctx.shadowBlur = 0; ctx.strokeStyle = color("gold"); ctx.lineWidth = 1.5;
  ctx.strokeRect(82, ribbonY - 28, W - 164, 69);
  ctx.fillStyle = color("text"); ctx.font = "46px 'Great Vibes', cursive";
  ctx.fillText("PINOY PHOTO MAGIC", W / 2, ribbonY + 8, W - 190);
  ctx.restore();
}

export async function recordSlideshow(photos: Blob[], music: Blob | null, onProgress: (p: number) => void, preparedAudio?: AudioContext, signal?: AbortSignal): Promise<{ blob: Blob; ext: string }> {
  const type = pickVideoType();
  if (!type) throw new Error("This browser can't create a playable video. Please open the page in Safari or Chrome.");
  if (!photos.length) throw new Error("Your photos are not ready yet.");
  let bitmaps: ImageBitmap[] = [];
  let audioCtx: AudioContext | null = preparedAudio ?? null;
  let source: AudioBufferSourceNode | null = null;
  let stream: MediaStream | null = null;
  let rec: MediaRecorder | null = null;
  let frame = 0;
  try {
    signal?.throwIfAborted();
    if (music) {
      audioCtx ??= new AudioContext();
      await wakeSlideshowAudio(audioCtx);
    }
    await Promise.all(["46px 'Great Vibes'", "900 62px Outfit"].map(f => document.fonts?.load(f).catch(() => {})));
    for (const photo of photos) bitmaps.push(await loadFilmPhoto(photo));
    signal?.throwIfAborted();
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.captureStream) throw new Error("Video recording is unavailable here. Please open this page in Safari or Chrome.");
    stream = canvas.captureStream(30);
    const total = bitmaps.length * PER_PHOTO;
    if (music && audioCtx) {
      const buf = await audioCtx.decodeAudioData(await music.arrayBuffer());
      const dest = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      source = audioCtx.createBufferSource();
      source.buffer = buf;
      source.loop = true;
      source.connect(gain).connect(dest);
      gain.gain.setValueAtTime(1, audioCtx.currentTime);
      gain.gain.setValueAtTime(1, audioCtx.currentTime + total - 2);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + total);
      dest.stream.getAudioTracks().forEach(t => stream?.addTrack(t));
    }
    rec = createSlideshowRecorder(stream);
    const chunks: Blob[] = [];
    let recordedMs = total * 1000;
    const recorder = rec;
    const grain = makeGrain();
    const draw = (t: number) => drawFilmFrame(ctx, bitmaps, t, grain);
    await new Promise<void>((resolve, reject) => {
      let stopped = false;
      const cleanup = () => {
        stopped = true;
        cancelAnimationFrame(frame);
        document.removeEventListener("visibilitychange", visibility);
        signal?.removeEventListener("abort", abort);
      };
      const fail = (error: Error) => {
        cleanup();
        reject(error);
        if (recorder.state !== "inactive") recorder.stop();
      };
      const abort = () => fail(new DOMException("Slideshow cancelled", "AbortError"));
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { cleanup(); resolve(); };
      recorder.onerror = () => fail(new Error("Video recording failed. Please try again in Safari or Chrome."));
      const visibility = () => {
        if (!document.hidden) return;
        fail(new Error("Recording was interrupted. Keep this page open and tap Create slideshow video again."));
      };
      document.addEventListener("visibilitychange", visibility);
      signal?.addEventListener("abort", abort, { once: true });
      const animate = () => {
        if (stopped) return;
        source?.start();
        const start = performance.now();
        const tick = () => {
          if (stopped) return;
          const t = (performance.now() - start) / 1000;
          if (t >= total) { recordedMs = t * 1000; recorder.stop(); return; }
          draw(t);
          onProgress(t / total);
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      };
      try {
        signal?.throwIfAborted();
        draw(0);
        recorder.start(250);
        animate();
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Could not start video recording."));
        return;
      }
    });
    const mime = recorder.mimeType || type.mime;
    let blob = new Blob(chunks, { type: mime.split(";")[0] ?? type.mime });
    if (blob.size < 1024) throw new Error("The video recording was empty. Please try again.");
    if (mime.startsWith("video/webm")) {
      const { default: fixWebmDuration } = await import("fix-webm-duration");
      blob = await fixWebmDuration(blob, recordedMs, { logger: false });
    }
    onProgress(1);
    return { blob, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" };
  } finally {
    cancelAnimationFrame(frame);
    if (rec && rec.state !== "inactive") rec.stop();
    try { source?.stop(); } catch { /* A source can fail before it has started. */ }
    stream?.getTracks().forEach(t => t.stop());
    if (audioCtx && audioCtx.state !== "closed") await audioCtx.close().catch(() => {});
    bitmaps.forEach(b => b.close());
  }
}
