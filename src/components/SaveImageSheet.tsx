import { useEffect, useState } from "react";
import { ExternalLink, Hand, ImageDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { LocalFileSave } from "@/components/LocalDownloadControls";

export type SaveTarget = { src: string; blob?: Blob | undefined; name: string } | null;

const copy = {
  en: { title: "To save this photo", s1: "Long press the image", s2: "Tap “Save to Photos” or “Add to Photos”", open: "Open Image in New Tab", hint: "If long press doesn't work here, open the image in a new tab and long press it there." },
  fil: { title: "Para i-save ang photo", s1: "Pindutin nang matagal ang larawan", s2: "I-tap ang “Save to Photos” o “Add to Photos”", open: "Buksan ang Larawan sa Bagong Tab", hint: "Kung hindi gumana dito, buksan ang larawan sa bagong tab at pindutin nang matagal doon." },
};

/** Christmas-themed long-press instructions for iPhone and in-app browsers (Messenger, Facebook, Instagram). */
export function SaveImageSheet({ target, onClose }: { target: SaveTarget; onClose: () => void }) {
  const { lang } = useLang();
  const t = copy[lang] ?? copy.en;
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!target) return undefined;
    // Prefer a real web address for "new tab"; in-app browsers often refuse data: links.
    if (target.blob && target.src.startsWith("data:")) {
      const u = URL.createObjectURL(target.blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(target.src);
    return undefined;
  }, [target]);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-2 border-gold">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-pine">
            <ImageDown className="h-5 w-5 text-primary" /> 🎄 {t.title}
          </DialogTitle>
          <DialogDescription className="sr-only">{t.hint}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-2 rounded-2xl bg-festive p-4 text-sm text-pine-foreground">
          <li className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-foreground">1</span>{t.s1} <Hand className="h-4 w-4 text-gold" /></li>
          <li className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-foreground">2</span>{t.s2}</li>
        </ol>
        {target && (
          <img
            src={target.src}
            alt={target.name}
            className="mx-auto max-h-[50vh] w-full select-auto rounded-xl object-contain [-webkit-touch-callout:default]"
            draggable
          />
        )}
        {url && (
          <Button asChild variant="festive" size="lg" className="w-full">
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /> {t.open}</a>
          </Button>
        )}
        {target?.blob && <LocalFileSave blob={target.blob} name={target.name} label="Save photo to phone" />}
        <p className="text-center text-xs text-muted-foreground">{t.hint}</p>
      </DialogContent>
    </Dialog>
  );
}
