import { useEffect, useRef, useState } from "react";
import { drawFilmFrame, loadFilmPhoto, makeGrain, SLIDESHOW_HEIGHT, SLIDESHOW_PHOTO_SECONDS, SLIDESHOW_WIDTH } from "@/lib/slideshow-video";

export function FilmSlideshowPreview({ images, playing }: { images: string[]; playing: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const [photos, setPhotos] = useState<ImageBitmap[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const loaded: ImageBitmap[] = [];
    let disposed = false;
    elapsed.current = 0;
    async function load() {
      try {
        for (const url of images) {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error("Photo unavailable");
          const bitmap = await loadFilmPhoto(await response.blob());
          if (disposed) { bitmap.close(); return; }
          loaded.push(bitmap);
        }
        if (!disposed) setPhotos([...loaded]);
      } catch { /* Keep the original photo visible if canvas decoding is unavailable. */ }
    }
    void load();
    return () => { disposed = true; controller.abort(); loaded.forEach(photo => photo.close()); };
  }, [images]);

  useEffect(() => {
    if (!photos.length) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const grain = makeGrain();
    let frame = 0;
    let previous = performance.now();
    const duration = photos.length * SLIDESHOW_PHOTO_SECONDS;
    const draw = (now: number) => {
      if (playing && !document.hidden) elapsed.current = (elapsed.current + (now - previous) / 1000) % duration;
      previous = now;
      drawFilmFrame(ctx, photos, elapsed.current, grain);
      if (playing) frame = requestAnimationFrame(draw);
    };
    draw(previous);
    return () => cancelAnimationFrame(frame);
  }, [playing, photos]);

  return <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-film-background">
    {images[0] && <img src={images[0]} alt="Christmas slideshow" className="absolute inset-0 h-full w-full object-cover" />}
    <canvas ref={canvas} width={SLIDESHOW_WIDTH} height={SLIDESHOW_HEIGHT} aria-label="Christmas film-strip slideshow" className="relative h-full w-full" />
  </div>;
}