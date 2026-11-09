import { afterEach, describe, expect, it, vi } from "vitest";
import { christmasTitleMotion, createSlideshowRecorder, pickVideoType, wakeSlideshowAudio, SLIDESHOW_PHOTO_SECONDS, SLIDESHOW_TRANSITION_SECONDS, SLIDESHOW_WIDTH, SLIDESHOW_HEIGHT } from "@/lib/slideshow-video";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("playable slideshow recordings", () => {
  it("exports a vertical 9:16 frame", () => {
    expect(SLIDESHOW_WIDTH / SLIDESHOW_HEIGHT).toBe(9 / 16);
  });
  it("pops in quickly and holds the greeting through 4 seconds", () => {
    expect(christmasTitleMotion(0).scale).toBeCloseTo(0);
    expect(christmasTitleMotion(0.3).scale).toBeGreaterThan(1);
    expect(christmasTitleMotion(0.45).scale).toBe(1);
    expect(christmasTitleMotion(4).opacity).toBe(1);
  });
  it("slowly fades the greeting after 4 seconds", () => {
    expect(christmasTitleMotion(5).opacity).toBe(0.5);
    expect(christmasTitleMotion(6).opacity).toBe(0);
    expect(christmasTitleMotion(15).opacity).toBe(0);
  });
  it("uses a fast 0.3-second transition without shortening the 15-second package", () => {
    expect(SLIDESHOW_TRANSITION_SECONDS).toBe(0.3);
    expect(SLIDESHOW_PHOTO_SECONDS * 5).toBe(15);
  });
  it("keeps all five photos in a 15-second slideshow", () => {
    expect(SLIDESHOW_PHOTO_SECONDS * 5).toBe(15);
  });
  it("falls back to WebM when advertised MP4 encoders cannot initialize", () => {
    const attempts: string[] = [];
    vi.stubGlobal("MediaRecorder", class {
      static isTypeSupported() { return true; }
      mimeType: string;
      constructor(_stream: MediaStream, options: MediaRecorderOptions) {
        attempts.push(options.mimeType ?? "");
        if (options.mimeType?.startsWith("video/mp4")) throw new Error("Encoder unavailable");
        this.mimeType = options.mimeType ?? "";
      }
    });
    const recorder = createSlideshowRecorder({} as MediaStream);
    expect(recorder.mimeType).toBe("video/webm;codecs=vp8,opus");
    expect(attempts).toHaveLength(5);
  });
  it("retries an encoder without the bitrate option before changing formats", () => {
    vi.stubGlobal("MediaRecorder", class {
      static isTypeSupported() { return true; }
      mimeType: string;
      constructor(_stream: MediaStream, options: MediaRecorderOptions) {
        if (options.videoBitsPerSecond) throw new Error("Bitrate unsupported");
        this.mimeType = options.mimeType ?? "";
      }
    });
    expect(createSlideshowRecorder({} as MediaStream).mimeType).toBe("video/mp4;codecs=avc1,mp4a.40.2");
  });
  it("uses H.264 and AAC for iPhone-compatible MP4", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: (mime: string) => mime === "video/mp4;codecs=avc1,mp4a.40.2" });
    expect(pickVideoType()).toEqual({ mime: "video/mp4;codecs=avc1,mp4a.40.2", ext: "mp4" });
  });
  it("never mislabels unspecified MP4 codecs as iPhone-compatible", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: (mime: string) => ["video/mp4", "video/webm;codecs=vp8,opus"].includes(mime) });
    expect(pickVideoType()).toEqual({ mime: "video/webm;codecs=vp8,opus", ext: "webm" });
  });
  it("rejects a browser with only unspecified MP4 support", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: (mime: string) => mime === "video/mp4" });
    expect(pickVideoType()).toBeNull();
  });
  it("does not silently record without music when audio stays suspended", async () => {
    const ctx = { state: "suspended", resume: vi.fn().mockResolvedValue(undefined) } as unknown as AudioContext;
    await expect(wakeSlideshowAudio(ctx)).rejects.toThrow("Tap Create slideshow video");
  });
  it("times out blocked autoplay instead of hanging forever", async () => {
    vi.useFakeTimers();
    const ctx = { state: "suspended", resume: () => new Promise(() => {}) } as unknown as AudioContext;
    const rejected = expect(wakeSlideshowAudio(ctx)).rejects.toThrow("Tap Create slideshow video");
    await vi.advanceTimersByTimeAsync(1500);
    await rejected;
  });
});