// Server-only helpers. Import dynamically inside handlers.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ORDER_BUCKET = "order-photos";
export const MEDIA_BUCKET = "site-media";

export function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; type: string } {
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Invalid file data");
  const bin = atob(m[2]!);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, type: m[1]! };
}

export async function signPaths(bucket: string, paths: string[], seconds = 3600) {
  const clean = paths.filter(Boolean);
  if (!clean.length) return {} as Record<string, string>;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrls(clean, seconds);
  if (error) throw new Error(error.message);
  const map: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  return map;
}

export async function getSettings() {
  const { data } = await supabaseAdmin.from("app_settings").select("key, value");
  const s: Record<string, unknown> = {};
  for (const r of data ?? []) s[r.key] = r.value;
  return {
    pricing: (s["pricing"] as { basic: number; premium: number }) ?? { basic: 99, premium: 149 },
    music: (s["music"] as { url: string | null; title: string | null; path?: string | null }) ?? { url: null, title: null },
    musicExtra: (Array.isArray(s["music_extra"]) ? s["music_extra"] : [{ path: "music/jingle-bells-vocal.mp3", title: "Jingle Bells" }]) as { path: string; title: string }[],
    payment: (s["payment"] as Record<string, string>) ?? {},
    retentionDays: Number(s["retention_days"] ?? 30),
  };
}

/** Deletes expired orders and their stored photos. Returns number removed. */
export async function cleanupExpiredOrders() {
  const { data: expired } = await supabaseAdmin
    .from("orders")
    .select("id, original_path, result_paths")
    .lt("expires_at", new Date().toISOString())
    .limit(200);
  if (!expired?.length) return 0;
  const paths = expired.flatMap((o) => [o.original_path, ...(o.result_paths ?? [])]).filter(Boolean);
  if (paths.length) await supabaseAdmin.storage.from(ORDER_BUCKET).remove(paths);
  await supabaseAdmin.from("orders").delete().in("id", expired.map((o) => o.id));
  return expired.length;
}
