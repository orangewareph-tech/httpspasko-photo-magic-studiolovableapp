// iPhone-safe file delivery. Call deliverFile synchronously inside a click handler
// with an already-loaded Blob — iOS Safari drops the tap permission after an await.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function deliverFile(blob: Blob, filename: string): Promise<"shared" | "cancelled" | "downloaded"> {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  const touch = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
      // An awaited share failure has lost iOS tap permission. Ask for a fresh tap.
      throw new Error("Could not open phone saving. Try Download file, or open this page in Safari / Chrome.");
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

export type LocalPhoto = { blob: Blob; name: string };

/** Prepare before the saving tap; customer media is never written to localStorage or a server. */
export async function buildLocalPackage(photos: LocalPhoto[], video?: LocalPhoto): Promise<Blob> {
  if (photos.length !== 5 || photos.some(photo => photo.blob.size === 0)) throw new Error("All 5 photos must be ready before saving.");
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  photos.forEach((photo, i) => zip.file(`${String(i + 1).padStart(2, "0")}-${photo.name}`, photo.blob));
  if (video) {
    if (!video.blob.size) throw new Error("The slideshow is not ready yet.");
    zip.file(video.name, video.blob);
  }
  return zip.generateAsync({ type: "blob", compression: "STORE", mimeType: "application/zip" });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head = "", b64 = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Messenger, Facebook, Instagram and similar in-app browsers. */
export function isInAppBrowser(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /FBAN|FBAV|FB_IAB|FBIOS|Messenger|MessengerForiOS|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Bytedance|Snapchat|Twitter/i.test(ua);
}
export function isIOSDevice(ua = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  const touchMac = typeof navigator !== "undefined" && ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || touchMac;
}
/** Where normal downloads are unreliable and long-press instructions should be shown instead. */
export function needsLongPressSave(ua?: string) {
  return isIOSDevice(ua) || isInAppBrowser(ua);
}
