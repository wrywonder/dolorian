import type { CalendarEvent } from '@/types';
import { ACTIVITY_IDS, CALENDAR_EVENT_IDS, PARENT_IDS } from './ids';

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: CALENDAR_EVENT_IDS.drew_spring_concert,
    parent_id: PARENT_IDS.drew,
    source_event_id: 'apple-evt-7b3c-may-28-spring-concert',
    raw_title: 'Sasha Spring Concert @ school',
    parsed_at: '2026-05-18T08:00:00Z',
    extracted_activity_id: ACTIVITY_IDS.spring_concert,
    user_confirmed: null, // awaiting review
  },
];
