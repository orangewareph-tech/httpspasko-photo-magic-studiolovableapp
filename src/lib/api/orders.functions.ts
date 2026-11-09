import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { templateSchema } from "@/lib/order-process";

const createOrderInput = z.object({
  fullName: z.string().trim().min(2).max(100),
  mobile: z.string().trim().regex(/^\+639\d{9}$/),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  pkg: z.enum(["basic", "premium"]),
  template: templateSchema,
  paymentMethod: z.enum(["gcash", "maya", "bank"]),
  photo: z.string().max(15_000_000), // data URL
});

function makeReference() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => chars[b % chars.length]).join("");
  return `XM-${ymd}-${rand}`;
}

/** Public: creates an order in Pending Payment status. Price is set on the server. */
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createOrderInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decodeDataUrl, getSettings, ORDER_BUCKET } = await import("@/server/storage.server");

    const { bytes, type } = decodeDataUrl(data.photo);
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw new Error("Unsupported photo format");
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Photo is larger than 10MB");

    const settings = await getSettings();
    const amount = settings.pricing[data.pkg];
    const reference = makeReference();
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const path = `originals/${reference}.${ext}`;

    const up = await supabaseAdmin.storage.from(ORDER_BUCKET).upload(path, bytes, { contentType: type });
    if (up.error) throw new Error("Upload failed. Please try again.");

    const expires = new Date(Date.now() + settings.retentionDays * 86400_000).toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        reference,
        full_name: data.fullName,
        mobile: data.mobile,
        email: data.email || null,
        package: data.pkg,
        template: data.template,
        amount,
        payment_method: data.paymentMethod,
        original_path: path,
        expires_at: expires,
      })
      .select("reference, access_token")
      .single();
    if (error || !row) {
      await supabaseAdmin.storage.from(ORDER_BUCKET).remove([path]);
      throw new Error("Could not create your order. Please try again.");
    }
    return { reference: row.reference, token: row.access_token };
  });

const lookupInput = z.object({ reference: z.string().min(5).max(40), token: z.string().uuid() });

/** Public: only returns order data when the secret access token matches. */
export const getCustomerOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => lookupInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signPaths, getSettings, ORDER_BUCKET, MEDIA_BUCKET } = await import("@/server/storage.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("reference, full_name, package, template, amount, payment_method, payment_reference, status, original_path, result_paths, created_at, expires_at, access_token")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!o || o.access_token !== data.token) return null;

    const settings = await getSettings();
    const done = o.status === "completed";
    const signed = await signPaths(ORDER_BUCKET, [o.original_path, ...(done ? o.result_paths : [])]);
    let musicUrl: string | null = null;
    const { pickMusic } = await import("@/server/storage.server");
    const track = pickMusic(settings);
    if (done && o.package === "premium" && track.path) {
      musicUrl = (await signPaths(MEDIA_BUCKET, [track.path], 86400))[track.path] ?? null;
    }
    return {
      reference: o.reference,
      fullName: o.full_name,
      pkg: o.package as "basic" | "premium",
      template: o.template,
      amount: o.amount,
      paymentMethod: o.payment_method as "gcash" | "maya" | "bank",
      paymentReference: o.payment_reference,
      status: o.status,
      createdAt: o.created_at,
      expiresAt: o.expires_at,
      originalUrl: signed[o.original_path] ?? null,
      results: done ? o.result_paths.map((p) => signed[p]).filter((x): x is string => !!x) : [],
      musicUrl,
      musicTitle: track.title,
      payTo: settings.payment[o.payment_method] ?? "",
    };
  });

/** Public: customer submits their GCash/Maya/bank reference. Status stays Pending until an admin verifies. */
export const submitPaymentReference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    lookupInput.extend({ paymentReference: z.string().trim().min(4).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("id, access_token, status")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!o || o.access_token !== data.token) throw new Error("Order not found");
    if (o.status !== "pending_payment") throw new Error("This order is no longer awaiting payment");
    await supabaseAdmin
      .from("orders")
      .update({ payment_reference: data.paymentReference, updated_at: new Date().toISOString() })
      .eq("id", o.id);
    return { ok: true };
  });

/** Public: find an order with its reference AND the mobile number used at checkout. */
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ reference: z.string().trim().toUpperCase().pipe(z.string().min(5).max(40)), mobile: z.string().regex(/^\+639\d{9}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("reference, access_token, mobile")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!o || o.mobile !== data.mobile) return null;
    return { reference: o.reference, token: o.access_token };
  });

/** Public: prices, payment details and sample gallery for the storefront. */
export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getSettings, signPaths, MEDIA_BUCKET } = await import("@/server/storage.server");
  const settings = await getSettings();
  const { data: samples } = await supabaseAdmin.from("samples").select("id, style, image_url").order("created_at");
  const signed = await signPaths(MEDIA_BUCKET, (samples ?? []).map((s) => s.image_url), 86400 * 7);
  return {
    pricing: settings.pricing,
    payment: settings.payment,
    samples: (samples ?? []).map((s) => ({ id: s.id, style: s.style, url: signed[s.image_url] })).filter((s) => s.url),
  };
});
