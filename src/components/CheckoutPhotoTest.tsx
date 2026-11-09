import { blockIfOffline } from "@/lib/offline";
import { deliverFile, dataUrlToBlob, needsLongPressSave } from "@/lib/download";
import { SaveImageSheet, type SaveTarget } from "@/components/SaveImageSheet";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, FlaskConical, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { testCheckoutPhoto, testSlideshowMusic } from "@/lib/api/photo-test.functions";
import { Slideshow } from "@/components/order/Slideshow";
import { STYLES } from "@/lib/catalog";
import type { TemplateId } from "@/lib/order-process";
import { LocalPackageDownload } from "@/components/LocalDownloadControls";

type Slot = { image: string; error: string; busy: boolean };

const emptySlots = (): Slot[] => STYLES.map(() => ({ image: "", error: "", busy: false }));

export function CheckoutPhotoTest({ photo, template, pkg = "basic" }: { photo: string; template: TemplateId; pkg?: "basic" | "premium" }) {
  const run = useServerFn(testCheckoutPhoto);
  const getMusic = useServerFn(testSlideshowMusic);
  const [music, setMusic] = useState<{ url: string | null; title: string | null } | null>(null);
  const premium = pkg === "premium";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<Slot[]>(emptySlots);
  const [saveTarget, setSaveTarget] = useState<SaveTarget>(null);
  const first = STYLES.findIndex(style => style.key === template);
  // Selected template first, then the remaining styles — same order as paid orders.
  const order = [first < 0 ? 0 : first, ...STYLES.map((_, i) => i).filter(i => i !== (first < 0 ? 0 : first))];

  async function generate() {
    if (busy || blockIfOffline("generate")) return;
    setBusy(true);
    setSlots(emptySlots());
    for (const index of order) {
      setSlots(prev => prev.map((slot, i) => (i === index ? { ...slot, busy: true } : slot)));
      try {
        const result = await run({ data: { photo, index } });
        setSlots(prev => prev.map((slot, i) => (i === index ? { image: result.image, error: "", busy: false } : slot)));
      } catch (e) {
        const message = e instanceof Error ? e.message : "Photo test failed. Please try again.";
        setSlots(prev => prev.map((slot, i) => (i === index ? { image: "", error: message, busy: false } : slot)));
      }
    }
    if (premium) setMusic(await getMusic().catch(() => ({ url: null, title: null })));
    setBusy(false);
  }

  const done = slots.some(slot => slot.image || slot.error);
  const finished = slots.filter(slot => slot.image);
  // Slideshow follows the generation order, selected/first style first.
  const slideImages = order.map(i => slots[i]?.image).filter((x): x is string => !!x);
  const slideKey = slideImages.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slideBlobs = useMemo(() => Object.fromEntries(slideImages.map(u => [u, dataUrlToBlob(u)])), [slideKey]);
  const localPhotos = useMemo(() => Object.entries(slideBlobs).map(([, blob], i) => ({ blob, name: `pasko-test-${i + 1}.png` })), [slideBlobs]);

  return <>
    <Button type="button" variant="festive" size="lg" className="mt-4 h-16 w-full text-lg font-bold shadow-lg" onClick={() => { setOpen(true); setSlots(emptySlots()); }}><FlaskConical className="size-6" />{premium ? "TEST ₱149 — 5 photos + slideshow & music" : "TEST PHOTO — Try 5 styles"}</Button>
    <>
    <SaveImageSheet target={saveTarget} onClose={() => setSaveTarget(null)} />
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{premium ? "Test ₱149 Magic with Music" : "Test Christmas Photos"}</DialogTitle>
          <DialogDescription>{premium ? "Creates all 5 styles, then the slideshow with Christmas music and a downloadable video — exactly what ₱149 customers get. No payment or order is created." : "Generates all 5 styles, one at a time, using the app's built-in AI. No payment or customer order is created."}</DialogDescription>
        </DialogHeader>
        {!done && <img src={photo} alt="Your uploaded photo" className="mx-auto max-h-60 w-full object-contain" />}
        <div className="grid grid-cols-2 gap-3">
          {STYLES.map((style, index) => {
            const slot = slots[index] ?? { image: "", error: "", busy: false };
            return (
              <div key={style.key} className="space-y-1">
                <p className="text-xs font-semibold text-pine">{style.name}{index === first ? " (selected)" : ""}</p>
                {slot.image ? (
                  <img src={slot.image} alt={`${style.name} test photo`} className="w-full select-auto rounded-xl object-contain [-webkit-touch-callout:default]" />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-xl bg-snow/60 text-xs text-pine/70">
                    {slot.busy ? <LoaderCircle className="animate-spin" /> : slot.error ? <span role="alert" className="break-words p-2 text-destructive">{slot.error}</span> : "Waiting…"}
                  </div>
                )}
                {slot.image && (
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { if (!slot.image) return; const blob = dataUrlToBlob(slot.image); const name = `pasko-test-${style.key}.png`; if (needsLongPressSave()) setSaveTarget({ src: slot.image, blob, name }); else void deliverFile(blob, name); }}>
                    <Download />Save photo
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {!busy && finished.length === 5 && <LocalPackageDownload photos={localPhotos} name="pasko-test-photos" />}
        {premium && !busy && finished.length === 5 && music && (
          <Slideshow images={slideImages} musicUrl={music.url} musicTitle={music.title} blobs={slideBlobs} fileName="pasko-test-slideshow" autoStart />
        )}
        <Button type="button" variant="festive" disabled={busy} onClick={generate}>
          {busy ? <LoaderCircle className="animate-spin" /> : <FlaskConical />}
          {busy ? "Generating…" : done ? "Test again" : "Generate 5 Test Photos"}
        </Button>
      </DialogContent>
    </Dialog>
    </>
  </>;
}
