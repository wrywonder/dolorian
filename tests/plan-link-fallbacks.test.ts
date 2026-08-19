import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isBlockedOrChallengePage,
  planSourceKey,
  providerFallback,
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
