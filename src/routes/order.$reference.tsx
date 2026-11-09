import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { deliverFile, needsLongPressSave } from "@/lib/download";
import { LocalPackageDownload } from "@/components/LocalDownloadControls";
import { SaveImageSheet, type SaveTarget } from "@/components/SaveImageSheet";
import { toast } from "sonner";
import { Copy, Download, FileArchive, Hourglass, Loader2, Share2, ShieldCheck, Sparkles, XCircle, Facebook, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slideshow } from "@/components/order/Slideshow";
import { getCustomerOrder, submitPaymentReference } from "@/lib/api/orders.functions";
import { PACKAGES, PAYMENT_METHODS, STATUS_LABEL, STYLES, peso, type OrderStatus } from "@/lib/catalog";

export const Route = createFileRoute("/order/$reference")({
  validateSearch: (s: Record<string, unknown>): { t?: string } => (typeof s["t"] === "string" ? { t: s["t"] } : {}),
  head: () => ({
    meta: [
      { title: "My Christmas Order – Pasko Photo Magic" },
      { name: "description", content: "Your Pasko Photo Magic order status and Christmas photos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "My Christmas Order – Pasko Photo Magic" },
      { property: "og:description", content: "Your Christmas photo order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderPage,
});

const STEPS: OrderStatus[] = ["pending_payment", "payment_verified", "processing", "completed"];

async function fetchBlob(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Download failed");
  const b = await r.blob();
  // Storage may label photos generically; iPhone needs the real image type to save to Photos.
  return b.type.startsWith("image/") ? b : new Blob([b], { type: "image/png" });
}

function OrderPage() {
  const { reference } = Route.useParams();
  const { t } = Route.useSearch();
  const qc = useQueryClient();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", reference, t],
    queryFn: () => { if (!t) throw new Error("Order link is incomplete"); return getCustomerOrder({ data: { reference, token: t } }); },
    enabled: !!t,
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "completed" && q.state.data.status !== "failed" ? 20_000 : false),
  });
  const [payRef, setPayRef] = useState("");
  const [sending, setSending] = useState(false);
  const [saveTarget, setSaveTarget] = useState<SaveTarget>(null);
  // Preload photos so a tap can save instantly — iPhone blocks saves that wait on the network.
  const [blobs, setBlobs] = useState<Record<string, Blob>>({});
  const resultKey = order?.results?.join("|") ?? "";
  const localPhotos = useMemo(() => resultKey.split("|").flatMap((u, i) => { const blob = blobs[u]; return blob ? [{ blob, name: `${reference}-${i + 1}.png` }] : []; }), [resultKey, blobs, reference]);
  useEffect(() => {
    if (!resultKey) return;
    let cancelled = false;
    resultKey.split("|").forEach((u) => {
      fetchBlob(u).then((b) => { if (!cancelled) setBlobs((m) => ({ ...m, [u]: b })); }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [resultKey]);

  if (!t) return <Missing />;
  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order) return <Missing />;

  const link = typeof window !== "undefined" ? window.location.href : "";
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const stepIndex = STEPS.indexOf(order.status as OrderStatus);

  async function sendRef() {
    if (!t) return;
    if (payRef.trim().length < 4) {
      toast.error("Enter the reference number from your payment receipt.");
      return;
    }
    setSending(true);
    try {
      await submitPaymentReference({ data: { reference, token: t, paymentReference: payRef.trim() } });
      toast.success("Thank you! We'll verify your payment shortly.");
      qc.invalidateQueries({ queryKey: ["order", reference, t] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function shareNative() {
    const first = order?.results[0];
    if (!first || !blobs[first]) return;
    try {
      const blob = blobs[first];
      const file = new File([blob], "xmasmagic.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Christmas photo", text: "Made with Pasko Photo Magic 🎄" });
      } else {
        toast.info("Your browser can't share photos directly. Download them and post on Facebook!");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <SaveImageSheet target={saveTarget} onClose={() => setSaveTarget(null)} />
      <div className="rounded-3xl bg-festive p-6 text-pine-foreground shadow-card">
        <p className="text-xs uppercase tracking-widest text-gold">Order reference</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{order.reference}</h1>
          <Button size="sm" variant="snow" onClick={() => { navigator.clipboard.writeText(order.reference); toast.success("Reference copied"); }}>
            <Copy /> Copy
          </Button>
        </div>
        <p className="mt-2 text-sm text-pine-foreground/80">
          {PACKAGES[order.pkg].name} · {peso(order.amount)} · {PAYMENT_METHODS[order.paymentMethod]}
        </p>
        <p className="mt-2 text-sm text-pine-foreground/80">Template: {STYLES.find(s => s.key === order.template)?.name} · All 5 styles included</p>
        {order.status !== "failed" && (
          <ol className="mt-6 grid grid-cols-4 gap-2 text-center text-[11px] sm:text-xs">
            {STEPS.map((s, i) => (
              <li key={s}>
                <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-gold" : "bg-snow/20"}`} />
                <p className={`mt-2 ${i <= stepIndex ? "text-gold" : "text-pine-foreground/60"}`}>{STATUS_LABEL[s]}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {order.status === "pending_payment" && (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_200px]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-xl font-bold text-pine"><Hourglass className="h-5 w-5 text-primary" /> Pending Payment</h2>
            <ol className="mt-4 space-y-3 text-sm">
              <li>1. Open <b>{PAYMENT_METHODS[order.paymentMethod]}</b> and send exactly <b className="text-primary">{peso(order.amount)}</b> to:</li>
              <li className="rounded-2xl bg-secondary px-4 py-3 font-mono text-base font-semibold text-pine">{order.payTo || "Account details will be provided by our team."}</li>
              <li>2. Put <b>{order.reference}</b> in the message / notes.</li>
              <li>3. Enter the reference number from your receipt below.</li>
            </ol>
            {order.paymentReference ? (
              <p className="mt-5 flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">
                <ShieldCheck className="h-4 w-4" /> Payment reference <b>{order.paymentReference}</b> received. Waiting for verification.
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Payment reference no." className="h-12" />
                <Button variant="festive" size="lg" onClick={sendRef} disabled={sending}>{sending ? "Sending…" : "Submit"}</Button>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Your order is not paid until our team verifies the transfer. Bookmark this page to check your status.</p>
          </div>
          {order.originalUrl && <img src={order.originalUrl} alt="Your uploaded photo" className="w-full rounded-3xl object-cover shadow-card" />}
        </div>
      )}

      {(order.status === "payment_verified" || order.status === "processing") && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-8 text-center shadow-card">
          <Sparkles className="mx-auto h-10 w-10 animate-pulse text-gold" />
          <h2 className="mt-3 text-2xl font-bold text-pine">{order.status === "processing" ? "Your Christmas magic is being created" : "Payment verified! 🎉"}</h2>
          <p className="mt-2 text-muted-foreground">We'll show your 5 photos here as soon as they're ready. This page refreshes automatically.</p>
        </div>
      )}

      {order.status === "failed" && (
        <div className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-3 text-2xl font-bold text-pine">We hit a snag</h2>
          <p className="mt-2 text-muted-foreground">Our team has been notified. Please <Link to="/contact" className="text-primary underline">contact us</Link> with your reference.</p>
        </div>
      )}

      {order.status === "completed" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <LocalPackageDownload photos={localPhotos} name={`${reference}-PaskoPhotoMagic`} />
            <Button variant="outline" size="lg" className="rounded-full" onClick={shareNative}><Share2 /> Share photo</Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(site)}`} target="_blank" rel="noreferrer"><Facebook /> Facebook</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <a href={`fb-messenger://share/?link=${encodeURIComponent(site)}`}><MessageCircle /> Messenger</a>
            </Button>
          </div>

          {order.pkg === "premium" && <Slideshow images={order.results} musicUrl={order.musicUrl} musicTitle={order.musicTitle} blobs={blobs} fileName={`${reference}-slideshow`} autoStart />}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {order.results.map((u, i) => (
              <div key={u} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <img src={u} alt={STYLES[i]?.name} loading="lazy" className="aspect-[2/3] w-full select-auto object-cover [-webkit-touch-callout:default]" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="line-clamp-1 text-xs font-semibold text-pine">{STYLES[i]?.name}</p>
                  <Button size="icon" variant="ghost" aria-label="Download" disabled={!blobs[u]} onClick={() => { const name = `${reference}-${i + 1}.png`; const blob = blobs[u]; if (!blob) return; if (needsLongPressSave()) setSaveTarget({ src: u, blob, name }); else void deliverFile(blob, name).catch(() => toast.error("Please try saving again.")); }}>
                    <Download />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Photos are available until {new Date(order.expiresAt).toLocaleDateString("en-PH", { dateStyle: "long" })}. Please download them before then.
          </p>
        </div>
      )}
      <p className="mt-8 text-center text-xs text-muted-foreground">Keep this link private: <button className="underline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}>copy my order link</button></p>
    </div>
  );
}

function Missing() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-2xl font-bold text-pine">Order not found</h1>
      <p className="mt-2 text-muted-foreground">This link is incomplete or expired.</p>
      <Button asChild variant="festive" size="lg" className="mt-6"><Link to="/track">Track my order</Link></Button>
    </div>
  );
}
