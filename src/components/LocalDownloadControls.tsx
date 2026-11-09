import { useEffect, useState } from "react";
import { Download, FolderDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildLocalPackage, deliverFile, isInAppBrowser, isIOSDevice, type LocalPhoto } from "@/lib/download";

export function LocalFileSave({ blob, name, label }: { blob: Blob; name: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => { setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000); };
  }, [blob]);
  async function save() {
    try { await deliverFile(blob, name); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Please try saving again."); }
  }
  return <>
    <Button variant="gold" disabled={!url} onClick={() => { if (isIOSDevice() || isInAppBrowser()) setOpen(true); else void save(); }}><Download />{label}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90svh] w-[calc(100%-2rem)] overflow-y-auto border-gold">
        <DialogHeader>
          <DialogTitle className="text-pine">Save to your phone 🎄</DialogTitle>
          <DialogDescription>{name}</DialogDescription>
        </DialogHeader>
        <p className="text-sm">Tap Save to Files, then choose “Save to Files” in your phone’s share menu. For an MP4, you can also choose “Save Video”.</p>
        <p className="text-sm text-muted-foreground">I-save sa Files ng phone. ZIP: buksan sa Files para makita ang 5 photos{blob.type === "application/zip" ? " at ang video kung kasama" : ""}.</p>
        <Button variant="festive" onClick={() => void save()}><FolderDown />Save to Files / Photos</Button>
        <Button asChild variant="outline"><a href={url} download={name}>Download file</a></Button>
        <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer">Open file</a></Button>
        <p className="text-xs text-muted-foreground">Messenger / Facebook / Instagram may block saving. Open this order page in Safari or Chrome if nothing happens.</p>
      </DialogContent>
    </Dialog>
  </>;
}

export function LocalPackageDownload({ photos, video, name = "PaskoPhotoMagic" }: { photos: LocalPhoto[]; video?: LocalPhoto | undefined; name?: string }) {
  const [archive, setArchive] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setArchive(null);
    setError("");
    if (photos.length === 5) void buildLocalPackage(photos, video).then(blob => { if (!cancelled) setArchive(blob); }).catch(() => { if (!cancelled) setError("Could not prepare files. Save each photo and video separately."); });
    return () => { cancelled = true; };
  }, [photos, video]);
  const label = video ? "Download 5 photos + slideshow" : "Download all 5 photos";
  return <div className="space-y-2">
    {archive ? <LocalFileSave blob={archive} name={`${name}.zip`} label={label} /> : <Button variant="outline" disabled><Loader2 className="size-4 animate-spin" />{error ? "Files unavailable" : photos.length !== 5 ? "Waiting for all 5 photos…" : `Preparing ${video ? "photos + video" : "5 photos"}…`}</Button>}
    <p className="text-xs">ZIP file · Saved to Downloads / Files on your phone or computer.</p>
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}