/** Deterministic, fictional listing responses. No request ever leaves loopback. */
const dateKey = (value) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');

function nextWeekday(weekday) {
  const value = new Date();
  value.setDate(value.getDate() + ((weekday - value.getDay() + 7) % 7 || 7));
  value.setHours(9, 0, 0, 0);
  return value;
}

export function planLinkPreview(url) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://example.test') throw new Error('Use an explicit example.test listing fixture for local QA.');
  const listing = parsed.pathname.replace(/\/$/, '');
  const canonical = `https://example.test${listing}`;
  const base = {
    url: canonical, sourceKey: `url:${canonical}/`,
    title: null, description: null, imageUrl: null, emoji: null,
    locationName: null, locationAddress: null,
    startDate: null, startTime: null, endDate: null, endTime: null,
    allDay: null, importedFields: [], inference: 'structured', warnings: [],
  };
  if (listing === '/partial-camp') return {
    ...base, title: 'A little art camp', emoji: '🎨', inference: 'metadata',
    importedFields: ['title', 'emoji'],
    warnings: ['The listing did not include reliable dates or a place. Add the details you know before sharing.'],
  };
  if (listing === '/unavailable') throw new Error('The fictional listing is temporarily unavailable. Add the plan details yourself or try again.');
  if (listing === '/art-club') return {
    ...base, title: 'Art club with friends', description: 'A familiar face for Tuesday art club.', emoji: '🎨',
    importedFields: ['title', 'description', 'emoji'],
  };
  if (listing === '/summer-camp') {
    const start = nextWeekday(1);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    return {
      ...base, title: 'Maple makers summer camp', description: 'Weekday art and outdoor play. Pack lunch and a sun hat.', emoji: '🎨',
      locationName: 'Maple Community Center', locationAddress: '123 Maple Street, Test City',
      startDate: dateKey(start), startTime: '09:00', endDate: dateKey(end), endTime: '15:00', allDay: false,
      importedFields: ['title', 'description', 'emoji', 'locationName', 'locationAddress', 'startDate', 'startTime', 'endDate', 'endTime'],
    };
  }
  if (listing === '/soccer-league') {
    const start = nextWeekday(6);
    const end = new Date(start);
    end.setDate(end.getDate() + 56);
    return {
      ...base, title: 'Little boots soccer league', description: 'Saturday soccer with friends. Bring water and shin guards.', emoji: '⚽',
      locationName: 'Maple Playing Fields', locationAddress: '50 Maple Street, Test City',
      startDate: dateKey(start), startTime: '10:00', endDate: dateKey(end), endTime: '11:00', allDay: false,
      importedFields: ['title', 'description', 'emoji', 'locationName', 'locationAddress', 'startDate', 'startTime', 'endDate', 'endTime'],
    };
  }
  throw new Error(`Unsupported fictional listing: ${listing}`);
}
