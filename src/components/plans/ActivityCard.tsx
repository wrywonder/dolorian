import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radii, spacing, type AvatarTone } from '@/lib/constants';
import { PhotoTile } from '@/components/ui';
import { nextPlanOccurrence, planDateLabel, planScheduleLabel, planTimeLabel } from '@/lib/plan-dates';
import { getPlanKind } from '@/lib/plan-intent';
import { planStateLabel } from '@/lib/plan-rsvp-copy';
import { presentInterestSheet } from './InterestSheet';
import { SocialProofRow } from './SocialProofRow';
import type { ActivitySocialProof, InteractionState } from '@/types';

type ActivityCardProps = {
  proof: ActivitySocialProof;
  /** A small polaroid tilt keeps the existing Village character. */
  rotation?: number;
  onStateChanged?: (next: InteractionState | null) => void;
  onOpen?: () => void;
};

export function ActivityCard({ proof, rotation = 0, onStateChanged, onOpen }: ActivityCardProps) {
  const { activity, venue, shared_by, goingConnections, interestedConnections, myState } = proof;
  const imageUrl = activity.cover_image_url ?? venue?.image_url ?? null;
  const location = activity.location_name ?? venue?.name ?? null;
  const planKind = getPlanKind(activity);
  const next = activity.schedule_kind === 'weekly' ? nextPlanOccurrence(activity, new Date()) : null;
  const nextSchedule = next ? { ...activity, starts_at: next.startsAt, ends_at: next.endsAt, schedule_kind: 'once' as const } : activity;
  const date = activity.starts_at ? activity.schedule_kind === 'weekly' ? `${planDateLabel(nextSchedule)} · ${planTimeLabel(nextSchedule)}` : planScheduleLabel(activity).toUpperCase() : 'DATE TO DECIDE';
  const buttonLabel = activity.cancelled_at ? 'Cancelled' : planStateLabel(myState, planKind);

  return (
    <View style={[styles.card, { transform: [{ rotate: `${rotation}deg` }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${activity.name}`} onPress={onOpen}>
        {imageUrl ? <Image source={{ uri: imageUrl }} contentFit="cover" transition={180} style={styles.image} /> : <PhotoTile tone={toneForActivity(activity.emoji)} height={8} />}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.date}>{date}</Text>
            {activity.emoji ? <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.emoji}>{activity.emoji}</Text> : null}
          </View>
          <Text numberOfLines={2} style={styles.title}>{activity.name}</Text>
          {location ? <Text numberOfLines={1} style={styles.location}>{location}</Text> : null}
          {activity.schedule_kind === 'weekly' ? <Text style={styles.schedule}>{planScheduleLabel(activity)}</Text> : null}
          <View style={styles.metadata}>
            {shared_by ? <Text numberOfLines={1} style={styles.sharedBy}>Shared by {shared_by.display_name}</Text> : null}
            <Text style={styles.audience}>{activity.cancelled_at ? 'CANCELLED' : activity.visibility === 'invited' ? 'CHOSEN FRIENDS' : activity.visibility === 'public' ? 'PUBLIC' : 'MY CONNECTIONS'}</Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.footer}>
        <SocialProofRow goingConnections={goingConnections} interestedConnections={interestedConnections} myState={myState} planKind={planKind} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${buttonLabel.replace(' →', '')}: ${activity.name}`}
          accessibilityState={{ disabled: Boolean(activity.cancelled_at) }}
          disabled={Boolean(activity.cancelled_at)}
          onPress={() => presentInterestSheet({ activityId: activity.id, activityName: activity.name, emoji: activity.emoji, currentState: myState, planKind, onChanged: (nextState) => onStateChanged?.(nextState) })}
          style={[styles.response, activity.cancelled_at && { opacity: 0.5 }]}
        ><Text style={styles.responseText}>{buttonLabel}</Text></Pressable>
      </View>
    </View>
  );
}

function toneForActivity(emoji: string | null): AvatarTone {
  if (emoji === '⚽' || emoji === '☀️') return 'golden';
  if (emoji === '🥾' || emoji === '🌳' || emoji === '🌻') return 'sage';
  if (emoji === '🩰' || emoji === '📚') return 'mauve';
  if (emoji === '🏊') return 'slate';
  if (emoji === '🎂') return 'peach';
  if (emoji === '🎶') return 'rose';
  return 'butter';
}

const styles = {
  card: { marginBottom: spacing.lg, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.surface } as const,
  image: { width: '100%', height: 96 } as const,
  content: { padding: spacing.lg, gap: spacing.sm } as const,
  topRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' } as const,
  date: { flex: 1, fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 15, color: colors.terracotta } as const,
  emoji: { fontSize: 30, transform: [{ rotate: '9deg' }] } as const,
  title: { fontFamily: fonts.serifRegular, fontSize: 28, lineHeight: 30, color: colors.dark } as const,
  location: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.brownMid } as const,
  schedule: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: colors.brownMid } as const,
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', paddingTop: spacing.xs } as const,
  sharedBy: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 11, color: colors.brownMid } as const,
  audience: { fontFamily: fonts.mono, fontSize: 9, color: colors.brownMid } as const,
  footer: { borderTopWidth: 1, borderTopColor: colors.rule, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as const,
  response: { minHeight: 44, maxWidth: '48%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.cream, justifyContent: 'center' } as const,
  responseText: { textAlign: 'center', fontFamily: fonts.sansExtra, fontSize: 11.5, color: colors.terracotta } as const,
};
