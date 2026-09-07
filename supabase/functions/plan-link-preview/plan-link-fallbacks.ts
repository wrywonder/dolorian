export type ScheduleFields = {
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  allDay: boolean | null;
};

export type ProviderFields = ScheduleFields & {
  title: string | null;
  emoji: string | null;
  locationName: string | null;
};

type JsonRecord = Record<string, unknown>;

const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
]);

const monthNumbers: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

const knownSawyerOrganizations: Record<string, string> = {
  'golden-gate-childrens-art-and-environmental-explorations': 'Golden Gate Art & Nature',
};

function cleanPath(pathname: string): string {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Keep the encoded path if a publisher supplied malformed escapes.
  }
  decoded = decoded.replace(/\/+/g, '/').replace(/\/$/, '');
  return decoded || '/';
}

function validDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? value
    : null;
}

function time(hourValue: string | undefined, minuteValue: string | undefined, meridiemValue: string | undefined): string | null {
  if (!hourValue || !meridiemValue) return null;
  const rawHour = Number(hourValue);
  const minute = Number(minuteValue ?? '0');
  if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) return null;
  let hour = rawHour % 12;
  if (meridiemValue.toLowerCase() === 'pm') hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function titleCaseSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((word) => word === 'and' ? '&' : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
    .replace(/\bChildrens\b/g, "Children's");
}

function schemaTypes(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.toLowerCase())
    : typeof value === 'string' ? [value.toLowerCase()] : [];
}

function temporal(value: unknown): { date: string; time: string | null } | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(20\d{2}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  const date = validDate(match?.[1]);
  if (!date) return null;
  if (!match?.[2] || !match[3]) return { date, time: null };
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  return hour <= 23 && minute <= 59 ? { date, time: `${match[2]}:${match[3]}` } : null;
}

function genericUrlTitle(url: URL): string {
  const path = cleanPath(url.pathname).split('/').filter(Boolean).at(-1);
  const page = path ? titleCaseSlug(path.replace(/[_]+/g, '-')) : null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return page ? `${page} · ${host}` : host;
}

export function isBlockedOrChallengePage(html: string): boolean {
  const sample = html.slice(0, 25_000).toLowerCase();
  return sample.includes('<title>just a moment...</title>')
    || sample.includes('challenge-platform')
    || sample.includes('enable javascript and cookies to continue')
    || sample.includes('cf-chl-');
}

export function isLikelyAppShell(html: string): boolean {
  if (isBlockedOrChallengePage(html)) return true;
  const visible = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return visible.length < 180;
}

export function planSourceKey(url: URL): string {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = cleanPath(url.pathname);

  if (hostname === 'hisawyer.com') {
    const parts = pathname.split('/').filter(Boolean);
    const organization = parts[0] ?? 'organization';
    const activityIndex = parts.indexOf('activity-set');
    if (activityIndex >= 0 && parts[activityIndex + 1]) {
      const day = validDate(url.searchParams.get('day'));
      return `hisawyer:activity:${organization}:${parts[activityIndex + 1]}${day ? `:${day}` : ''}`;
    }
    if (parts.includes('schedules')) {
      const schedule = url.searchParams.get('schedule_id')?.trim().toLowerCase() || 'semesters';
      const date = validDate(url.searchParams.get('date'));
      return `hisawyer:schedule:${organization}:${schedule}${date ? `:${date}` : ''}`;
    }
  }

  const normalized = new URL(url.toString());
  normalized.protocol = 'https:';
  normalized.hostname = hostname;
  normalized.pathname = pathname;
  normalized.hash = '';
  const entries = [...normalized.searchParams.entries()]
    .filter(([key]) => !key.toLowerCase().startsWith('utm_') && !TRACKING_PARAMETERS.has(key.toLowerCase()))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  normalized.search = '';
  for (const [key, value] of entries) normalized.searchParams.append(key, value);
  return `url:${normalized.toString()}`;
}

export function providerFallback(url: URL): ProviderFields | null {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname !== 'hisawyer.com') {
    return {
      title: genericUrlTitle(url).slice(0, 140),
      emoji: null,
      locationName: null,
      startDate: null,
      startTime: null,
      endDate: null,
      endTime: null,
      allDay: null,
    };
  }
  const parts = cleanPath(url.pathname).split('/').filter(Boolean);
  const organizationSlug = parts[0];
  if (!organizationSlug) return null;
  const organization = knownSawyerOrganizations[organizationSlug] ?? titleCaseSlug(organizationSlug);
  const scheduleId = url.searchParams.get('schedule_id')?.toLowerCase();
  const label = scheduleId === 'drop-ins'
    ? 'Drop-ins'
    : scheduleId === 'camps'
      ? 'Camps & events'
      : parts.includes('schedules')
        ? 'Classes & camps'
        : null;
  const date = validDate(url.searchParams.get('date') ?? url.searchParams.get('day'));
  return {
    title: label ? `${organization} · ${label}` : organization,
    emoji: /art|paint|creative/.test(organizationSlug) ? '🎨' : '✨',
    locationName: organization,
    startDate: date,
    startTime: null,
    endDate: date,
    endTime: null,
    allDay: null,
  };
}

export function hasMultipleScheduleChoices(text: string): boolean {
  const choices = new Set<string>();
  const pattern = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi;
  for (const match of text.matchAll(pattern)) {
    choices.add(`${match[1]?.toLowerCase()}:${match[2]}:${match[3] ?? '00'}:${match[4]?.toLowerCase()}`);
  }
  return choices.size > 1;
}

export function addressFromText(text: string): string | null {
  const match = text.match(/\b\d{1,6}\s+[A-Za-z0-9.' -]{2,80}\s(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Way)\b(?:,?\s+[A-Za-z.' -]{2,50},?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?)?/i);
  return match?.[0]?.replace(/\s+/g, ' ').trim().slice(0, 240) ?? null;
}

export function hasMultipleStructuredEvents(records: JsonRecord[]): boolean {
  return records.filter((item) => schemaTypes(item['@type']).includes('event') && temporal(item.startDate)).length > 1;
}

export function scheduleFromStructuredData(records: JsonRecord[]): ScheduleFields {
  const events = records
    .filter((item) => schemaTypes(item['@type']).includes('event'))
    .map((item) => ({ name: typeof item.name === 'string' ? item.name.trim().toLowerCase() : '', start: temporal(item.startDate), end: temporal(item.endDate) }))
    .filter((item): item is { name: string; start: { date: string; time: string | null }; end: { date: string; time: string | null } | null } => Boolean(item.start))
    .sort((left, right) => `${left.start.date}T${left.start.time ?? '00:00'}`.localeCompare(`${right.start.date}T${right.start.time ?? '00:00'}`));
  if (!events.length) return { startDate: null, startTime: null, endDate: null, endTime: null, allDay: null };
  const namedEvents = new Set(events.map((event) => event.name).filter(Boolean));
  if (events.length > 1 && namedEvents.size > 1) {
    return { startDate: null, startTime: null, endDate: null, endTime: null, allDay: null };
  }
  const first = events[0];
  const last = events.at(-1);
  if (!first || !last) return { startDate: null, startTime: null, endDate: null, endTime: null, allDay: null };
  const finalEnd = last.end ?? last.start;
  return {
    startDate: first.start.date,
    startTime: first.start.time,
    endDate: finalEnd.date,
    endTime: finalEnd.time,
    allDay: first.start.time === null && events.every((event) => (event.end ?? event.start).time === null),
  };
}

export function scheduleFromText(text: string, url?: URL): ScheduleFields {
  const ranges: { start: string; end: string }[] = [];
  const rangePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(20\d{2})\b/gi;
  for (const match of text.matchAll(rangePattern)) {
    const month = monthNumbers[(match[1] ?? '').toLowerCase()];
    const year = match[4];
    if (!month || !year) continue;
    const start = validDate(`${year}-${month}-${String(match[2]).padStart(2, '0')}`);
    const end = validDate(`${year}-${month}-${String(match[3]).padStart(2, '0')}`);
    if (start && end) ranges.push({ start, end });
  }

  const singlePattern = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(20\d{2})\b/gi;
  for (const match of text.matchAll(singlePattern)) {
    const month = monthNumbers[(match[1] ?? '').toLowerCase()];
    const year = match[3];
    if (!month || !year) continue;
    const date = validDate(`${year}-${month}-${String(match[2]).padStart(2, '0')}`);
    if (date) ranges.push({ start: date, end: date });
  }

  const plainDatePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(20\d{2})\b/gi;
  for (const match of text.matchAll(plainDatePattern)) {
    const month = monthNumbers[(match[1] ?? '').toLowerCase()];
    const year = match[3];
    if (!month || !year) continue;
    const date = validDate(`${year}-${month}-${String(match[2]).padStart(2, '0')}`);
    if (date) ranges.push({ start: date, end: date });
  }

  const isoDatePattern = /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g;
  for (const match of text.matchAll(isoDatePattern)) {
    const date = validDate(`${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`);
    if (date) ranges.push({ start: date, end: date });
  }

  if (ranges.length === 0 && url) {
    const date = validDate(url.searchParams.get('date') ?? url.searchParams.get('day'));
    if (date) ranges.push({ start: date, end: date });
  }
  ranges.sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end));

  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const startTime = time(timeMatch?.[1], timeMatch?.[2], timeMatch?.[3]);
  const endTime = time(timeMatch?.[4], timeMatch?.[5], timeMatch?.[6]);
  return {
    startDate: ranges[0]?.start ?? null,
    startTime,
    endDate: ranges.at(-1)?.end ?? null,
    endTime,
    allDay: ranges.length > 0 ? (startTime && endTime ? false : null) : null,
  };
}
