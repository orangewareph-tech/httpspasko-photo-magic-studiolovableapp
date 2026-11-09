import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, ExternalLink, Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { recordSlideshow, wakeSlideshowAudio } from "@/lib/slideshow-video";
import { LocalFileSave, LocalPackageDownload } from "@/components/LocalDownloadControls";
import { Button } from "@/components/ui/button";
import { FilmSlideshowPreview } from "@/components/order/FilmSlideshowPreview";

type SlideshowProps = { images: string[]; musicUrl: string | null; musicTitle: string | null; blobs?: Record<string, Blob>; fileName?: string; autoStart?: boolean };

export function Slideshow(props: SlideshowProps) {
  return <SlideshowPlayer key={JSON.stringify([props.images, props.musicUrl])} {...props} />;
}

function SlideshowPlayer({ images, musicUrl, musicTitle, blobs = {}, fileName = "PaskoPhotoMagic-slideshow", autoStart = false }: SlideshowProps) {
  const [making, setMaking] = useState<number | null>(null);
  const [video, setVideo] = useState<{ blob: Blob; ext: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [needsTap, setNeedsTap] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<Blob[]>([]);
  const packagePhotos = useMemo(() => loadedPhotos.map((blob, i) => ({ blob, name: `pasko-${i + 1}.png` })), [loadedPhotos]);
  const packageVideo = useMemo(() => video ? { blob: video.blob, name: `${fileName}.${video.ext}` } : undefined, [video, fileName]);
  const recording = useRef(false);
  const mounted = useRef(true);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.abort(); }; }, []);
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url); }, [video]);

  // Step 1 builds the video; a separate tap saves it (iPhone blocks saves that wait).
  async function makeVideo(automatic = false) {
    if (recording.current) return;
    if (images.length !== 5 || !musicUrl) return;
    recording.current = true;
    const controller = new AbortController();
    pending.current = controller;
    setPlaying(false);
    audio.current?.pause();
    setMaking(0);
    setError("");
    setNeedsTap(false);
    setVideo(null);
    let audioContext: AudioContext | undefined;
    try {
      // Resume before fetching so a retry tap retains iPhone's audio permission.
      if (musicUrl) {
        audioContext = new AudioContext();
        // Autoplay restrictions are normal in iPhone/in-app browsers and editor frames.
        // Do not turn a blocked automatic attempt into a failed customer video.
        if (automatic && audioContext.state !== "running") {
          setNeedsTap(true);
          return;
        }
        await wakeSlideshowAudio(audioContext);
      }
      const load = async (url: string) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load the photos or music. Refresh the page and try again.");
        return response.blob();
      };
      const photos = await Promise.all(images.map(u => blobs[u] ?? load(u)));
      if (mounted.current) setLoadedPhotos(photos);
      const music = musicUrl ? await load(musicUrl) : null;
      controller.signal.throwIfAborted();
      const r = await recordSlideshow(photos, music, p => { if (mounted.current) setMaking(p); }, audioContext, controller.signal);
      if (mounted.current) setVideo({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create the slideshow video.";
      if (mounted.current) { setError(message); toast.error(message); }
    } finally {
      if (audioContext && audioContext.state !== "closed") await audioContext.close().catch(() => {});
      recording.current = false;
      if (mounted.current) setMaking(null);
    }
  }

  // ₱149 orders: start building the video as soon as the photos are on the page.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current || images.length !== 5) return;
    autoStarted.current = true;
    void makeVideo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, images.length]);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("pasko-slideshow-audio", { detail: playing || making !== null }));
    return () => { window.dispatchEvent(new CustomEvent("pasko-slideshow-audio", { detail: false })); };
  }, [playing, making !== null]);

  function toggle() {
    if (!images.length || recording.current) return;
    const next = !playing;
    setPlaying(next);
    if (audio.current) next ? audio.current.play().catch(() => {}) : audio.current.pause();
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-festive p-3 shadow-card">
      <FilmSlideshowPreview images={images} playing={playing} />
      <div className="flex items-center justify-between gap-2 p-3 text-pine-foreground">
        <div className="text-sm">
          <p className="font-semibold">🎵 Christmas Slideshow</p>
          <p className="text-xs text-pine-foreground/70">{musicUrl ? musicTitle ?? "Christmas music" : "Music will be added soon"}</p>
        </div>
        <div className="flex gap-2">
          {musicUrl && (
            <Button size="icon" variant="snow" onClick={() => { setMuted(!muted); if (audio.current) audio.current.muted = !muted; }} aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
          )}
          <Button variant="gold" disabled={!images.length || making !== null} onClick={toggle}>{playing ? <><Pause /> Pause</> : <><Play /> Play</>}</Button>
        </div>
      </div>
      <div className="space-y-2 px-3 pb-3 text-pine-foreground">
        {making !== null ? (
          <div>
            <Progress value={making * 100} />
            <p className="mt-1 flex items-center gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Creating your slideshow video with music… about 15 seconds. Keep this page open.</p>
          </div>
        ) : video ? (
          <div className="space-y-3">
            <video src={video.url} controls playsInline preload="metadata" aria-label="Slideshow video preview" className="max-h-96 w-full rounded-xl" onError={() => { setError("This browser cannot play the video. Open this page in Safari or Chrome and create it again."); setVideo(null); }} />
            <div className="flex flex-wrap gap-2">
            <LocalFileSave blob={video.blob} name={`${fileName}.${video.ext}`} label="Save slideshow video" />
            <Button asChild variant="snow"><a href={video.url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open video</a></Button>
            </div>
            <LocalPackageDownload photos={packagePhotos} video={packageVideo} name={`${fileName}-complete-package`} />
            {video.ext === "webm" && <p className="text-xs text-pine-foreground/80">WebM video · For an iPhone Photos-compatible MP4, open this page in Safari and create the video there.</p>}
          </div>
        ) : (
          <Button variant="snow" className="w-full" disabled={images.length !== 5 || !musicUrl} onClick={() => void makeVideo()}><Clapperboard /> {needsTap ? "Tap to create slideshow with music" : "Create slideshow video with music"}</Button>
        )}
        {needsTap && <p className="text-sm text-pine-foreground">Your browser needs one tap to enable music. / I-tap para paganahin ang music.</p>}
        {(images.length !== 5 || !musicUrl) && <p className="text-sm text-pine-foreground">Waiting for all 5 photos and Christmas music before creating your video.</p>}
        {error && <p role="alert" className="text-sm text-pine-foreground">{error}</p>}
      </div>
      {musicUrl && <audio ref={audio} src={musicUrl} loop preload="none" />}
    </div>
  );
}
