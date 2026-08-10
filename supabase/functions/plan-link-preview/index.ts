import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlanFields = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  emoji: string | null;
  locationName: string | null;
  locationAddress: string | null;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  allDay: boolean | null;
};

type PageData = {
  html: string;
  finalUrl: URL;
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

async function fetchPage(initial: URL): Promise<PageData> {
  let current = initial;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'VillagePlanPreview/2.0' },
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
    while (size < 700_000) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      if (chunk) {
        chunks.push(chunk);
        size += chunk.byteLength;
      }
    }
    await reader.cancel().catch(() => {});
    const combined = new Uint8Array(Math.min(size, 700_000));
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
  const codePoint = (raw: string, radix: number) => {
    const parsed = Number.parseInt(raw, radix);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0x10ffff
      ? String.fromCodePoint(parsed)
      : '';
  };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => codePoint(hex, 16))
    .replace(/&#(\d+);/g, (_, decimal: string) => codePoint(decimal, 10))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function meta(html: string, property: string): string | null {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = new Map<string, string>();
    for (const attribute of (tag[0] ?? '').matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
      if (attribute[1] && attribute[3]) attributes.set(attribute[1].toLowerCase(), attribute[3]);
    }
    const key = (attributes.get('property') ?? attributes.get('name'))?.toLowerCase();
    if (key === property.toLowerCase()) {
      return decode(attributes.get('content'));
    }
  }
  return null;
}

function publicImageUrl(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    const image = new URL(value, base);
    if (!['http:', 'https:'].includes(image.protocol)) return null;
    if (image.protocol === 'http:') image.protocol = 'https:';
    return image.toString();
  } catch {
    return null;
  }
}

function pageText(html: string): string {
  const withoutCode = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/h[1-6]|\/li|\/section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decode(withoutCode)?.replace(/\s*\n\s*/g, '\n').slice(0, 18_000) ?? '';
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function jsonLdRecords(html: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed: unknown = JSON.parse(match[1] ?? 'null');
      const visit = (value: unknown) => {
        if (Array.isArray(value)) value.forEach(visit);
        else if (record(value)) {
          records.push(value);
          Object.values(value).forEach(visit);
        }
      };
      visit(parsed);
    } catch {
      // Malformed publisher JSON-LD should not prevent metadata fallback.
    }
  }
  return records;
}

function schemaType(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.toLowerCase())
    : typeof value === 'string' ? [value.toLowerCase()] : [];
}

function schemaAddress(value: unknown): string | null {
  if (typeof value === 'string') return decode(value);
  if (!record(value)) return null;
  return [value.streetAddress, value.addressLocality, value.addressRegion, value.postalCode, value.addressCountry]
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .join(', ') || null;
}

function structuredLocation(records: Record<string, unknown>[]): { name: string | null; address: string | null } {
  const preferred = records.find((item) => schemaType(item['@type']).some((type) => ['event', 'place', 'localbusiness', 'organization'].includes(type)) && (item.address || item.location));
  if (!preferred) return { name: null, address: null };
  const location = record(preferred.location) ? preferred.location : preferred;
  return {
    name: typeof location.name === 'string' ? decode(location.name) : null,
    address: schemaAddress(location.address),
  };
}

function relatedPageUrls(html: string, base: URL): URL[] {
  const candidates = new Map<string, { url: URL; score: number }>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(match[1] ?? '', base);
      if (url.origin !== base.origin || url.pathname === base.pathname) continue;
      const clue = `${url.pathname} ${decode((match[2] ?? '').replace(/<[^>]+>/g, ' ')) ?? ''}`.toLowerCase();
      const score = ['camp', 'register', 'schedule', 'session', 'class', 'event'].reduce(
        (total, keyword) => total + (clue.includes(keyword) ? 1 : 0),
        0,
      );
      if (score > 0 && score > (candidates.get(url.toString())?.score ?? -1)) {
        candidates.set(url.toString(), { url, score });
      }
    } catch {
      // Ignore malformed links.
    }
  }
  return [...candidates.values()].sort((a, b) => b.score - a.score).map((item) => item.url);
}

const monthNumbers: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function pageSchedule(text: string): Pick<PlanFields, 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'allDay'> {
  const ranges: { start: string; end: string }[] = [];
  const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(20\d{2})\b/gi;
  for (const match of text.matchAll(datePattern)) {
    const month = monthNumbers[(match[1] ?? '').toLowerCase()];
    if (!month) continue;
    const year = match[4];
    ranges.push({
      start: `${year}-${month}-${String(match[2]).padStart(2, '0')}`,
      end: `${year}-${month}-${String(match[3]).padStart(2, '0')}`,
    });
  }
  ranges.sort((a, b) => a.start.localeCompare(b.start));
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const time = (hourValue: string | undefined, minuteValue: string | undefined, meridiemValue: string | undefined) => {
    if (!hourValue || !meridiemValue) return null;
    let hour = Number(hourValue) % 12;
    if (meridiemValue.toLowerCase() === 'pm') hour += 12;
    return `${String(hour).padStart(2, '0')}:${minuteValue ?? '00'}`;
  };
  return {
    startDate: ranges[0]?.start ?? null,
    startTime: time(timeMatch?.[1], timeMatch?.[2], timeMatch?.[3]),
    endDate: ranges.at(-1)?.end ?? null,
    endTime: time(timeMatch?.[4], timeMatch?.[5], timeMatch?.[6]),
    allDay: ranges.length > 0 ? !timeMatch : null,
  };
}

function emojiFor(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes('camp')) return '🏕️';
  if (normalized.includes('swim')) return '🏊';
  if (normalized.includes('music')) return '🎶';
  if (normalized.includes('soccer') || normalized.includes('football')) return '⚽';
  if (normalized.includes('art')) return '🎨';
  if (normalized.includes('market')) return '🥕';
  return '✨';
}

function cleanString(value: unknown, limit: number): string | null {
  return typeof value === 'string' ? decode(value)?.slice(0, limit) ?? null : null;
}

function validDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function validTime(value: unknown): string | null {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function normalizedAiFields(value: unknown): Partial<PlanFields> | null {
  if (!record(value)) return null;
  return {
    title: cleanString(value.title, 140),
    description: cleanString(value.description, 600),
    emoji: cleanString(value.emoji, 8),
    locationName: cleanString(value.locationName, 160),
    locationAddress: cleanString(value.locationAddress, 240),
    startDate: validDate(value.startDate),
    startTime: validTime(value.startTime),
    endDate: validDate(value.endDate),
    endTime: validTime(value.endTime),
    allDay: typeof value.allDay === 'boolean' ? value.allDay : null,
  };
}

async function aiEnrichment(url: URL, text: string, fallback: PlanFields): Promise<Partial<PlanFields> | null> {
  const apiKey = Deno.env.get('PLAN_IMPORT_API_KEY');
  const configuredBaseUrl = Deno.env.get('PLAN_IMPORT_BASE_URL');
  const model = Deno.env.get('PLAN_IMPORT_MODEL');
  if (!apiKey || !configuredBaseUrl || !model) return null;
  const baseUrl = configuredBaseUrl.replace(/\/?$/, '/');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14_000);
  try {
    const response = await fetch(new URL('chat/completions', baseUrl), {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Extract shared facts for a parent-created plan. Return only JSON. Never invent missing facts. For a multi-session series, use the first and last available dates as the overall range; individual family weeks belong in RSVP notes, not the canonical plan.',
          },
          {
            role: 'user',
            content: `URL: ${url.toString()}\nExisting metadata: ${JSON.stringify(fallback)}\n\nPage text:\n${text}\n\nReturn exactly these keys: title, description, emoji, locationName, locationAddress, startDate (YYYY-MM-DD or null), startTime (HH:MM local time or null), endDate, endTime, allDay (boolean or null). Keep description under 600 characters and summarize only facts useful to parents.`,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload: unknown = await response.json();
    const content = record(payload)
      && Array.isArray(payload.choices)
      && record(payload.choices[0])
      && record(payload.choices[0].message)
      && typeof payload.choices[0].message.content === 'string'
      ? payload.choices[0].message.content
      : null;
    if (!content) return null;
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return normalizedAiFields(JSON.parse(content.slice(start, end + 1)));
  } catch (cause) {
    console.warn('plan import AI fallback', cause instanceof Error ? cause.message : cause);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function importedFields(fields: PlanFields): string[] {
  const entries: [string, unknown][] = [
    ['title', fields.title], ['description', fields.description], ['image', fields.imageUrl],
    ['category', fields.emoji], ['place', fields.locationName], ['address', fields.locationAddress],
    ['start date', fields.startDate], ['start time', fields.startTime], ['end date', fields.endDate],
    ['end time', fields.endTime],
  ];
  return entries.filter(([, value]) => Boolean(value)).map(([label]) => label);
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
    const primary = await fetchPage(requested);
    const pages = [primary];
    const related = relatedPageUrls(primary.html, primary.finalUrl)[0];
    if (related) {
      try {
        pages.push(await fetchPage(await safeUrl(related.toString())));
      } catch (cause) {
        console.warn('plan import related page skipped', cause instanceof Error ? cause.message : cause);
      }
    }

    const records = pages.flatMap((page) => jsonLdRecords(page.html));
    const location = structuredLocation(records);
    const combinedText = pages.map((page) => pageText(page.html)).join('\n\n').slice(0, 24_000);
    const schedule = pageSchedule(combinedText);
    const title = meta(primary.html, 'og:title')
      ?? meta(primary.html, 'twitter:title')
      ?? decode(primary.html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
    const description = meta(primary.html, 'og:description') ?? meta(primary.html, 'description');
    const rawImage = meta(primary.html, 'og:image') ?? meta(primary.html, 'twitter:image');
    const fallback: PlanFields = {
      title: title?.slice(0, 140) ?? null,
      description: description?.slice(0, 600) ?? null,
      imageUrl: publicImageUrl(rawImage, primary.finalUrl),
      emoji: emojiFor(`${title ?? ''} ${description ?? ''} ${combinedText.slice(0, 1_000)}`),
      locationName: location.name,
      locationAddress: location.address,
      ...schedule,
    };
    const ai = await aiEnrichment(primary.finalUrl, combinedText, fallback);
    const merged: PlanFields = {
      title: ai?.title ?? fallback.title,
      description: ai?.description ?? fallback.description,
      imageUrl: fallback.imageUrl,
      emoji: ai?.emoji ?? fallback.emoji,
      locationName: ai?.locationName ?? fallback.locationName,
      locationAddress: ai?.locationAddress ?? fallback.locationAddress,
      startDate: ai?.startDate ?? fallback.startDate,
      startTime: ai?.startTime ?? fallback.startTime,
      endDate: ai?.endDate ?? fallback.endDate,
      endTime: ai?.endTime ?? fallback.endTime,
      allDay: ai?.allDay ?? fallback.allDay,
    };
    const inference = ai ? 'ai' : pages.length > 1 || records.length > 0 || Boolean(schedule.startDate) ? 'structured' : 'metadata';

    return json({
      url: primary.finalUrl.toString(),
      ...merged,
      importedFields: importedFields(merged),
      inference,
    });
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : 'Could not import that link' }, 422);
  }
});
