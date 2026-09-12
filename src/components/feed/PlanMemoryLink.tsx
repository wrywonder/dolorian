import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/constants';
import type { Activity } from '@/types';

/** The activity embed is null when the viewer cannot access the linked plan. */
export function PlanMemoryLink({ activity }: { activity: Activity | null }) {
  if (!activity) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`View plan: ${activity.name}`} onPress={() => router.push(`/plan/${activity.id}`)} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 18, color: colors.terracotta }}>{activity.emoji ?? '✨'} a memory from {activity.name} →</Text>
    </Pressable>
  );
}
