import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
}

function isPrivateIpv4(value: string): boolean {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  return parts[0] === 10
    || parts[0] === 127
    || parts[0] === 0
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] >= 224);
}

function isPrivateIpv6(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith('ff');
}

async function safeUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http or https link');
  if (url.username || url.password) throw new Error('That address cannot be imported');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.includes(':')) {
    throw new Error('That address cannot be imported');
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && isPrivateIpv4(hostname)) {
    throw new Error('That address cannot be imported');
  }
  const addresses = await Deno.resolveDns(hostname, 'A').catch(() => [] as string[]);
  if (!addresses.length || addresses.some(isPrivateIpv4)) throw new Error('That address cannot be imported');
  const ipv6Addresses = await Deno.resolveDns(hostname, 'AAAA').catch(() => [] as string[]);
  if (ipv6Addresses.some(isPrivateIpv6)) throw new Error('That address cannot be imported');
  return url;
}

async function fetchPage(initial: URL): Promise<{ html: string; finalUrl: URL }> {
  let current = initial;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'VillagePlanPreview/1.0' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The link redirected without a destination');
      current = await safeUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`The page returned ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) throw new Error('That link is not a web page');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('The page did not return content');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < 300_000) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        size += value.byteLength;
      }
    }
    await reader.cancel().catch(() => {});
    const combined = new Uint8Array(Math.min(size, 300_000));
    let offset = 0;
    for (const chunk of chunks) {
      const available = Math.min(chunk.byteLength, combined.byteLength - offset);
      if (available <= 0) break;
      combined.set(chunk.subarray(0, available), offset);
      offset += available;
    }
    return { html: new TextDecoder().decode(combined), finalUrl: current };
  }
  throw new Error('The link redirected too many times');
}

function decode(value: string | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function meta(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return null;
}

function publicImageUrl(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    const image = new URL(value, base);
    return ['http:', 'https:'].includes(image.protocol) ? image.toString() : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !anonKey) return json({ error: 'Not authenticated' }, 401);
  const scoped = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await scoped.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);

  let value: string | undefined;
  try {
    value = (await request.json() as { url?: string }).url;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!value || value.length > 2_000) return json({ error: 'Add a valid link' }, 400);

  try {
    const requested = await safeUrl(value.trim());
    const { html, finalUrl } = await fetchPage(requested);
    const title = meta(html, 'og:title')
      ?? meta(html, 'twitter:title')
      ?? decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
    const description = meta(html, 'og:description') ?? meta(html, 'description');
    const rawImage = meta(html, 'og:image') ?? meta(html, 'twitter:image');
    const imageUrl = publicImageUrl(rawImage, finalUrl);
    return json({
      url: finalUrl.toString(),
      title: title?.slice(0, 140) ?? null,
      description: description?.slice(0, 600) ?? null,
      imageUrl,
    });
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : 'Could not import that link' }, 422);
  }
});
