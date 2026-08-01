import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { AvatarCircle, FadeOverlay, Icon, Skeleton } from '@/components/ui';
import { KidsGrid } from '@/components/profile/KidsGrid';
import { ProfileCover } from '@/components/profile/profile-cover';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import type { ConnectionView, HangoutSpot, ProfileView } from '@/types';
import type { IconName } from '@/components/ui';

export default function YouScreen() {
  const myId = useCurrentParentId();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [spots, setSpots] = useState<HangoutSpot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!myId) return;
    try {
      const [nextProfile, nextConnections, nextSpots] = await Promise.all([
        data.getProfile(myId),
        data.getConnectionViews(),
        data.getHangoutSpots(),
      ]);
      setProfile(nextProfile);
      setConnections(nextConnections);
      setSpots(nextSpots.filter((spot) => spot.is_mine));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your profile.');
    }
  }, [myId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!myId || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <Skeleton width="100%" height={300} radius={0} />
      </View>
    );
  }

  const connected = connections.filter((item) => item.connection.status === 'connected');
  const incoming = connections.filter((item) => item.incoming);
  const parent = profile.parent;

  const showError = (cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'That did not work. Please try again.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ height: 300, overflow: 'hidden' }}>
          <ProfileCover
            imageUrl={parent.profile_background_url}
            tone={parent.profile_background}
            height={300}
            label="ADD A COVER PHOTO IN PROFILE SETTINGS"
          />
          <FadeOverlay direction="bottom" intensity={0.68} transparentUntil={0.32} />
          <View style={{ position: 'absolute', top: 14, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.9)' }}>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: colors.brownMid, letterSpacing: 0.6 }}>YOUR PROFILE</Text>
            </View>
            <Pressable onPress={() => router.push('/settings')} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' }}>
              <Icon name="gear" size={19} color={colors.dark} />
            </Pressable>
          </View>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24, flexDirection: 'row', alignItems: 'flex-end', gap: 15 }}>
            <AvatarCircle initials={parent.avatar_initials} tone={parent.avatar_color} imageUrl={parent.avatar_url} size={94} ring={colors.white} />
            <View style={{ flex: 1, paddingBottom: 5 }}>
              <Text style={{ fontFamily: fonts.serifRegular, fontSize: 34, lineHeight: 37, color: colors.white }}>
                {parent.display_name}
              </Text>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.white, paddingTop: 4 }}>
                {parent.neighborhood ?? 'Add your neighborhood'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: -2, paddingHorizontal: 16, paddingTop: 20, gap: 16, backgroundColor: colors.cream, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
          {parent.bio ? (
            <Text selectable style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: colors.brownMid }}>
              {parent.bio}
            </Text>
          ) : (
            <Pressable onPress={() => router.push('/settings')}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 16, color: colors.terracotta }}>+ tell your village a little about you</Text>
            </Pressable>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Stat value={connected.length} label="connections" onPress={() => router.push('/village' as never)} />
            <Stat value={profile.kids.length} label="kids" />
            <Stat value={spots.length} label="hangouts" />
          </View>

          <View style={{ flexDirection: 'row', gap: 9 }}>
            <QuickAction icon="person.2" label="Your village" onPress={() => router.push('/village' as never)} />
            <QuickAction icon="map.pin" label="Hangout spots" onPress={() => router.push('../hangout-spots')} />
          </View>

          {error ? <Text selectable style={{ fontFamily: fonts.sansSemi, fontSize: 12, color: colors.terracotta }}>{error}</Text> : null}

          {incoming.length > 0 ? (
            <Pressable onPress={() => router.push('/village?tab=requests' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: radii.lg, backgroundColor: colors.terracotta }}>
              <Icon name="wave" size={22} color={colors.white} />
              <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.white }}>{incoming.length} connection request{incoming.length === 1 ? '' : 's'}</Text><Text style={{ fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.82)', paddingTop: 2 }}>open Your Village to say hello</Text></View>
              <Icon name="chevron.right" size={18} color={colors.white} />
            </Pressable>
          ) : null}

          <Section title="your connections" eyebrow="YOUR VILLAGE">
            {connected.length > 0 ? connected.slice(0, 4).map((item) => (
              <ConnectionRow
                key={item.connection.id}
                item={item}
                onPress={() => router.push(`/profile/${item.parent.id}`)}
                actions={<Pressable onPress={() => router.push(`/connection-manage/${item.parent.id}` as never)} hitSlop={10}><Icon name="ellipsis" size={20} color={colors.taupe} /></Pressable>}
              />
            )) : (
              <Text style={{ fontFamily: fonts.serif, fontSize: 15, color: colors.taupe, paddingVertical: 8 }}>Your connections will appear here.</Text>
            )}
            <Pressable onPress={() => router.push('/village' as never)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 11.5, color: colors.terracotta }}>{connected.length ? 'manage your whole village →' : 'invite someone →'}</Text></Pressable>
          </Section>

          {profile.kids.length > 0 ? <KidsGrid kids={profile.kids} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}><Text style={{ fontFamily: fonts.serifRegular, fontSize: 24, color: colors.dark, fontVariant: ['tabular-nums'] }}>{value}</Text><Text style={{ fontFamily: fonts.sansBold, fontSize: 9.5, color: colors.taupe }}>{label}</Text></Pressable>;
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}><Icon name={icon} size={17} color={colors.terracotta} /><Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.dark }}>{label}</Text></Pressable>;
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <View style={{ paddingTop: 6 }}><Text style={{ fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.taupe }}>{eyebrow}</Text><Text style={{ fontFamily: fonts.serifRegular, fontSize: 27, color: colors.dark, paddingTop: 2, paddingBottom: 10 }}>{title}</Text><View style={{ overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}>{children}</View></View>;
}

function ConnectionRow({ item, actions, onPress }: { item: ConnectionView; actions: React.ReactNode; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.rule }}><AvatarCircle initials={item.parent.avatar_initials} tone={item.parent.avatar_color} imageUrl={item.parent.avatar_url} size={44} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 13.5, color: colors.dark }}>{item.parent.display_name}</Text><Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.taupe, paddingTop: 2 }}>{item.parent.neighborhood ?? 'Village parent'}</Text></View>{actions}</Pressable>;
}
