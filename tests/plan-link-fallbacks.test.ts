import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addressFromText,
  hasMultipleScheduleChoices,
  hasMultipleStructuredEvents,
  isBlockedOrChallengePage,
  isLikelyAppShell,
  planSourceKey,
  providerFallback,
  scheduleFromStructuredData,
  scheduleFromText,
} from '../supabase/functions/plan-link-preview/plan-link-fallbacks.ts';

const sawyerScheduleUrl = new URL(
  'https://www.hisawyer.com/golden-gate-childrens-art-and-environmental-explorations/schedules?schedule_id=drop-ins&date=2026-08-20&ageGradeFilterTab=age_ranges%5B%5D',
);

test('recognizes Cloudflare challenge pages instead of importing their metadata', () => {
  assert.equal(isBlockedOrChallengePage('<html><head><title>Just a moment...</title></head><body>Enable JavaScript and cookies to continue</body></html>'), true);
  assert.equal(isBlockedOrChallengePage('<html><head><title>Summer Camp</title></head><body>Camp details</body></html>'), false);
});

test('gives equivalent Sawyer schedule links one stable coordination key', () => {
  assert.equal(
    planSourceKey(sawyerScheduleUrl),
    'hisawyer:schedule:golden-gate-childrens-art-and-environmental-explorations:drop-ins:2026-08-20',
  );
  assert.equal(
    planSourceKey(new URL(
      'https://hisawyer.com/golden-gate-childrens-art-and-environmental-explorations/schedules?date=2026-08-20&utm_source=text&schedule_id=drop-ins',
    )),
    planSourceKey(sawyerScheduleUrl),
  );
});

test('falls back to honest, editable Sawyer fields when the full page is blocked', () => {
  assert.deepEqual(providerFallback(sawyerScheduleUrl), {
    title: 'Golden Gate Art & Nature · Drop-ins',
    emoji: '🎨',
    locationName: 'Golden Gate Art & Nature',
    startDate: '2026-08-20',
    startTime: null,
    endDate: '2026-08-20',
    endTime: null,
    allDay: null,
  });
});

test('extracts the visible Sawyer day and hours after browser rendering', () => {
  const visibleSchedule = `
    Golden Gate Art & Nature
    AUGUST 20, TOMORROW
    ButterFly (4 - 5 yrs old)*
    Summer Camp 2026
    Thursday, August 20, 2026
    8:45am - 3:00pm PDT
    Art Studio, 3429 Sacramento St
    Coyotes (7 - 10 yrs old)*
    Thursday, August 20, 2026
    8:45am - 3:00pm PDT
  `;
  assert.deepEqual(scheduleFromText(visibleSchedule, sawyerScheduleUrl), {
    startDate: '2026-08-20',
    startTime: '08:45',
    endDate: '2026-08-20',
    endTime: '15:00',
    allDay: false,
  });
});

test('normalizes ordinary listing links by removing tracking and sorting filters', () => {
  assert.equal(
    planSourceKey(new URL('http://Example.com/camp/?week=2&utm_campaign=summer&age=5#signup')),
    'url:https://example.com/camp?age=5&week=2',
  );
});

test('bootstraps a stable editable plan from a generic studio booking page', () => {
  const rabbitHole = new URL('https://www.therabbitholetheater.com/studio#book');
  assert.equal(planSourceKey(rabbitHole), 'url:https://therabbitholetheater.com/studio');
  assert.deepEqual(providerFallback(rabbitHole), {
    title: 'Studio · therabbitholetheater.com',
    emoji: null,
    locationName: null,
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    allDay: null,
  });
});

test('recognizes a recurring page with several Rabbit Hole class choices as undated', () => {
  const choices = `
    Monday 10:00am · Between the Trees · ages 1 to 4
    Monday 4:00pm · Dress Up and Dance · ages 4 to 6
    Tuesday 10:00am · Dress Up and Imagine · ages 2 to 4
    Thursday 3:30pm · Club Make Believe · ages 4 to 7
  `;
  assert.equal(hasMultipleScheduleChoices(choices), true);
  assert.deepEqual(scheduleFromText(choices), {
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    allDay: null,
  });
});

test('extracts a generic venue address from visible page copy', () => {
  assert.equal(
    addressFromText('The Rabbit Hole Theater 800 Diamond St San Francisco, CA 94114 (415) 525-4085'),
    '800 Diamond St San Francisco, CA 94114',
  );
});

test('uses standard Event JSON-LD dates without AI inference', () => {
  assert.deepEqual(scheduleFromStructuredData([{
    '@type': 'Event',
    name: 'Family workshop',
    startDate: '2026-09-12T10:30:00-07:00',
    endDate: '2026-09-12T12:00:00-07:00',
  }]), {
    startDate: '2026-09-12',
    startTime: '10:30',
    endDate: '2026-09-12',
    endTime: '12:00',
    allDay: false,
  });
});

test('does not merge unrelated structured events into one invented plan range', () => {
  const events = [
    { '@type': 'Event', name: 'Puppet show', startDate: '2026-09-12T10:30:00-07:00' },
    { '@type': 'Event', name: 'Parents night out', startDate: '2026-09-18T18:00:00-07:00' },
  ];
  assert.equal(hasMultipleStructuredEvents(events), true);
  assert.deepEqual(scheduleFromStructuredData(events), {
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    allDay: null,
  });
});

test('sends thin JavaScript app shells to browser rendering', () => {
  assert.equal(isLikelyAppShell('<html><body><div id="root"></div><script src="app.js"></script></body></html>'), true);
  assert.equal(isLikelyAppShell('<html><head><meta name="description" content="A useful class page"></head><body><div id="root"></div></body></html>'), true);
  assert.equal(isLikelyAppShell(`<html><body><main>${'Useful class details '.repeat(20)}</main></body></html>`), false);
});
