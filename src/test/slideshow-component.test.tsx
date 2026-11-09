import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Slideshow } from "@/components/order/Slideshow";

const mocks = vi.hoisted(() => ({ record: vi.fn(), wake: vi.fn() }));
vi.mock("@/lib/slideshow-video", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/slideshow-video")>(), recordSlideshow: mocks.record, wakeSlideshowAudio: mocks.wake }));
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.resetAllMocks(); vi.restoreAllMocks(); });

it("defers blocked auto-recording until a tap and still releases retry after cleanup fails", async () => {
  const close = vi.fn().mockRejectedValue(new Error("Already closed"));
  vi.stubGlobal("AudioContext", class { state = "suspended"; close = close; });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["music"]) }));
  mocks.wake.mockResolvedValue(undefined);
  mocks.record.mockRejectedValue(new Error("Recording unavailable"));
  const images = ["one", "two", "three", "four", "five"];
  const blobs = Object.fromEntries(images.map(u => [u, new Blob([u])]));
  render(<Slideshow images={images} blobs={blobs} musicUrl="song" musicTitle="Song" autoStart />);
  const start = await screen.findByRole("button", { name: "Tap to create slideshow with music" });
  expect(mocks.wake).not.toHaveBeenCalled();
  expect(mocks.record).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).toBeNull();
  await act(async () => fireEvent.click(start));
  await waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1));
  await screen.findByRole("button", { name: "Create slideshow video with music" });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create slideshow video with music" })));
  await waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(2));
});

it("never records an incomplete five-photo package or a package without music", async () => {
  const images = ["one", "two", "three", "four"];
  const { rerender } = render(<Slideshow images={images} musicUrl="song" musicTitle="Song" autoStart />);
  expect(screen.getByRole("button", { name: "Create slideshow video with music" })).toBeDisabled();
  expect(mocks.record).not.toHaveBeenCalled();
  rerender(<Slideshow images={[...images, "five"]} musicUrl={null} musicTitle={null} autoStart />);
  expect(screen.getByRole("button", { name: "Create slideshow video with music" })).toBeDisabled();
  expect(mocks.record).not.toHaveBeenCalled();
});

it("aborts photo loading when the slideshow closes before recording", async () => {
  vi.stubGlobal("AudioContext", class { state = "running"; close = vi.fn().mockResolvedValue(undefined); });
  let signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError"))));
  }));
  const { unmount } = render(<Slideshow images={["one", "two", "three", "four", "five"]} musicUrl="song" musicTitle="Song" />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create slideshow video with music" })));
  expect(signal?.aborted).toBe(false);
  await act(async () => unmount());
  expect(signal?.aborted).toBe(true);
  expect(mocks.record).not.toHaveBeenCalled();
});