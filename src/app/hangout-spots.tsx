import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { Icon, Skeleton, VenuePhoto } from '@/components/ui';
import { AddSpotSheet } from '@/components/irl/AddSpotSheet';
import { refreshHangoutMonitoring } from '@/lib/hangout-geofencing';
import type { HangoutSpot } from '@/types';

export default function HangoutSpotsScreen() {
  const [spots, setSpots] = useState<HangoutSpot[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setSpots(await data.getHangoutSpots()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load hangouts.'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (spot: HangoutSpot) => {
    try {
      await data.setHangoutSpot(spot.venue.id, !spot.is_mine);
      const next = await data.getHangoutSpots();
      setSpots(next);
      await refreshHangoutMonitoring();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update that hangout.'); }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top','bottom']}>
    <View style={{ height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => router.back()} hitSlop={12}><View style={{ transform: [{ rotate: '180deg' }] }}><Icon name="chevron.right" size={22} color={colors.dark} /></View></Pressable>
      <Text style={{ fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark }}>hangout spots</Text><View style={{ width: 22 }} />
    </View>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40, gap: 12 }}>
      <Text style={{ fontFamily: fonts.serifRegular, fontSize: 32, color: colors.dark }}>places that feel like yours</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.brownMid }}>Auto only activates at enabled places. The three neighborhood favorites start enabled for everyone.</Text>
      <Pressable onPress={() => setAddOpen(true)} style={{ alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.terracotta }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.white }}>+ add where I am</Text></Pressable>
      {error ? <Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, color: colors.terracotta }}>{error}</Text> : null}
      {!spots ? <Skeleton width="100%" height={220} radius={20} /> : spots.map((spot) => (
        <Pressable key={spot.venue.id} onPress={() => toggle(spot)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: spot.is_mine ? colors.sage : colors.rule }}>
          <VenuePhoto venue={spot.venue} fallbackTone={toneForVenue(spot.venue.venue_type)} height={58} radius={14} style={{ width: 58 }} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.dark }}>{spot.venue.emoji ?? '📍'} {spot.venue.name}</Text><Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.taupe, paddingTop: 3 }}>{spot.is_default ? 'neighborhood favorite' : spot.suggested_by.length > 0 ? `used by ${spot.suggested_by.join(' and ')}` : 'your custom spot'}</Text></View><View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: spot.is_mine ? colors.sage : colors.cream }}><Icon name={spot.is_mine ? 'check.circle' : 'plus'} size={16} color={spot.is_mine ? colors.white : colors.brownMid} /></View>
        </Pressable>
      ))}
    </ScrollView>
    <AddSpotSheet open={addOpen} onClose={() => setAddOpen(false)} onCreated={async () => { setAddOpen(false); await load(); await refreshHangoutMonitoring(); }} />
  </SafeAreaView>;
}

function toneForVenue(type: HangoutSpot['venue']['venue_type']) {
  switch (type) {
    case 'park': return 'butter' as const;
    case 'playground': return 'golden' as const;
    case 'studio': return 'mauve' as const;
    case 'swim': return 'slate' as const;
    case 'library': return 'sage' as const;
    default: return 'peach' as const;
  }
}
