import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Snowfall } from "@/components/brand/Snowfall";
import { ChristmasSound, magicFlight } from "@/lib/christmas-magic";
import santa from "@/assets/santa-flyby.png";

export function ChristmasMagic() {
  const flight = useRef<HTMLDivElement>(null);
  const sound = useRef<ChristmasSound | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    const visibility = () => { if (document.hidden) { sound.current?.stop(); setEnabled(false); } };
    const otherMedia = () => { sound.current?.stop(); setEnabled(false); };
    const slideshow = (event: Event) => {
      const active = (event as CustomEvent<boolean>).detail;
      setQuiet(active);
      if (active) otherMedia();
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("play", otherMedia, true);
    window.addEventListener("pasko-slideshow-audio", slideshow);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("play", otherMedia, true);
      window.removeEventListener("pasko-slideshow-audio", slideshow);
      sound.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (reduced || quiet) return;
    let timer: ReturnType<typeof setTimeout>;
    let animation: Animation | undefined;
    let disposed = false;
    const pass = () => {
      if (disposed) return;
      const element = flight.current;
      if (element && !document.hidden) {
        const path = magicFlight();
        element.dataset['direction'] = path.reverse ? "left" : "right";
        const transform = (x: number, y: number) => `translate(${x}vw, ${y}svh) rotate(${(path.toY - path.fromY) * (path.reverse ? -0.3 : 0.3)}deg)`;
        animation = element.animate([
          { transform: transform(path.fromX, path.fromY), opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, offset: 0.85 },
          { transform: transform(path.toX, path.toY), opacity: 0 },
        ], { duration: path.duration, easing: "ease-in-out" });
        sound.current?.greet(path.duration);
      }
      timer = setTimeout(pass, 10000 + Math.random() * 12000);
    };
    timer = setTimeout(pass, 4500);
    return () => { disposed = true; clearTimeout(timer); animation?.cancel(); };
  }, [reduced, quiet]);

  async function toggle() {
    if (enabled) { sound.current?.stop(); setEnabled(false); return; }
    sound.current ??= new ChristmasSound();
    try {
      const running = await sound.current.start();
      setEnabled(running);
    } catch { sound.current.stop(); setEnabled(false); }
  }

  return <>
    {!reduced && !quiet && <div className="christmas-magic-layer" aria-hidden="true">
      <Snowfall />
      <div ref={flight} className="magic-flyby" data-direction="right">
        <div className="magic-sleigh">
          <img src={santa} loading="lazy" width={1152} height={576} alt="" />
          <div className="magic-trail">{Array.from({ length: 20 }, (_, i) => <span key={i} className={`magic-dust magic-dust-${i % 5}`} style={{ left: `${i * 5}%`, animationDelay: `${-i * 0.09}s` }}>✦</span>)}</div>
        </div>
      </div>
    </div>}
    <Button variant="gold" size="icon" className="fixed bottom-5 left-3 z-40" disabled={quiet} onClick={() => void toggle()} aria-pressed={enabled} aria-label={enabled ? "Mute Christmas sounds" : "Play Christmas sounds"} title={enabled ? "Mute Christmas sounds" : "Play Christmas sounds"}>
      {enabled ? <Volume2 /> : <VolumeX />}
    </Button>
  </>;
}