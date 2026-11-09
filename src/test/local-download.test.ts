import { afterEach, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { buildLocalPackage, deliverFile } from "@/lib/download";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("includes all five actual photos and the slideshow in a local ZIP without overwriting duplicate names", async () => {
  const nativeBlob = (await import("node:buffer")).Blob;
  vi.stubGlobal("Blob", nativeBlob);
  const photos = Array.from({ length: 5 }, (_, i) => ({ name: "photo.png", blob: new Blob([`photo-${i}`], { type: "image/png" }) }));
  // JSZip consumes bytes reliably across browser and test-realm Blob implementations.
  const archive = await buildLocalPackage(photos, { name: "slideshow.mp4", blob: new Blob(["video-with-audio"], { type: "video/mp4" }) });
  const zip = await JSZip.loadAsync(await archive.arrayBuffer());
  expect(Object.keys(zip.files)).toHaveLength(6);
  expect(await zip.file("05-photo.png")?.async("string")).toBe("photo-4");
  expect(await zip.file("slideshow.mp4")?.async("string")).toBe("video-with-audio");
});

it("does not offer a five-photo archive with incomplete results", async () => {
  await expect(buildLocalPackage([{ name: "one.png", blob: new Blob(["one"]) }])).rejects.toThrow("All 5 photos");
});

it("does not silently attempt a blocked download after the phone share menu fails", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal("navigator", { canShare: () => true, share: vi.fn().mockRejectedValue(new Error("Blocked")) });
  await expect(deliverFile(new Blob(["video"], { type: "video/mp4" }), "slideshow.mp4")).rejects.toThrow("Try Download file");
});