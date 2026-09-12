import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { eyebrowDate } from '@/lib/format';
import { useVisibilityStore } from '@/store/visibility';
import {
  EmptyState,
  FloatingCompose,
  PostCardSkeleton,
  ScreenHeader,
  VisibilityChip,
} from '@/components/ui';
import { PromptCard } from '@/components/prompts/PromptCard';
import { PostCard } from '@/components/feed/PostCard';
import type { AvatarTone } from '@/lib/constants';
import type { FeedItem, Parent, ResolvedPrompt } from '@/types';

type RowKind =
  | { kind: 'prompt'; resolved: ResolvedPrompt }
  | { kind: 'post'; item: FeedItem };

export default function BuzzScreen() {
  const visible = useVisibilityStore((s) => s.visible);
  const mode = useVisibilityStore((s) => s.mode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [prompt, setPrompt] = useState<ResolvedPrompt | null>(null);
  const [visibleConnections, setVisibleConnections] = useState<Parent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(
    async (initial: boolean = false) => {
      const version = ++requestVersion.current;
      if (initial) setLoading(true);
      try {
        const [posts, pending, connections] = await Promise.allSettled([
          data.getFeedPosts(),
          data.getPendingPrompt(),
          data.getVisibleConnectionAvatars(),
        ]);
        if (version !== requestVersion.current) return;
        if (posts.status === 'fulfilled') {
          setFeed(posts.value);
          setError(null);
        } else {
          console.warn('buzz feed load failed', posts.reason);
          setError('We couldn’t refresh your village. Check your connection and try again.');
        }
        // A missing prompt or avatar must not hide successfully loaded memories.
        if (pending.status === 'fulfilled') setPrompt(pending.value);
        else console.warn('buzz prompt load failed', pending.reason);
        if (connections.status === 'fulfilled') setVisibleConnections(connections.value);
        else console.warn('buzz avatars load failed', connections.reason);
      } catch (e) {
        console.warn('buzz feed load failed', e);
        if (version === requestVersion.current) setError('We couldn’t load your village. Please try again.');
      } finally {
        if (version === requestVersion.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    load(true);
    return () => { requestVersion.current += 1; };
  }, [load]);

  // Refresh silently when the screen regains focus — e.g. returning
  // from compose, so a fresh post shows up without a manual pull.
  // Skip the first focus; the mount effect above already loaded.
  const hasFocusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }
      load(false);
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
  }, [load]);

  const rows: RowKind[] = useMemo(
    () => [
      ...(prompt ? [{ kind: 'prompt' as const, resolved: prompt }] : []),
      ...feed.map((item) => ({ kind: 'post' as const, item })),
    ],
    [prompt, feed],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader
        eyebrow={eyebrowDate(new Date().toISOString())}
        title="buzz"
        flourish="squiggle"
        right={
          <VisibilityChip
            visible={visible}
            mode={mode}
            visibleParents={
              visible
                ? visibleConnections.slice(0, 3).map((p) => ({
                    initials: '',
                    tone: p.avatar_color as AvatarTone,
                    imageUrl: p.avatar_url,
                  }))
                : []
            }
            onPress={() => router.push('/irl')}
          />
        }
      />

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) =>
            row.kind === 'prompt'
              ? `prompt-${row.resolved.prompt.id}`
              : `post-${row.item.post.id}`
          }
          renderItem={({ item }) =>
            item.kind === 'prompt' ? (
              <PromptCard resolved={item.resolved} onChanged={() => load(false)} />
            ) : (
              <PostCard item={item.item} onDeleted={() => load(false)} />
            )
          }
          ListHeaderComponent={error ? (
            <View style={{ padding: 16, marginBottom: 20, gap: 6, borderRadius: radii.md, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.surface }}>
              <Text accessibilityRole="alert" style={{ fontFamily: fonts.sansSemi, fontSize: 13, lineHeight: 19, color: colors.brownMid }}>{error}</Text>
              {feed.length > 0 ? <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.taupe }}>You can still browse the memories already loaded.</Text> : null}
              <Pressable accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing} onPress={onRefresh} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}>
                <Text style={{ fontFamily: fonts.sansExtra, fontSize: 13, color: colors.terracotta }}>{refreshing ? 'trying again…' : 'try again →'}</Text>
              </Pressable>
            </View>
          ) : null}
          ListEmptyComponent={!error ? (
            <View>
              <EmptyState
                eyebrow="THE LITTLE THINGS"
                title="make a little memory"
                body="park days, tiny wins, big questions. Share a moment with your connections — or invite a friend to get things started."
                flourish="squiggle"
              />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Pressable accessibilityRole="button" onPress={() => router.push('/compose')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 14, color: colors.terracotta }}>share a moment →</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push('/add-to-village')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: colors.brownMid }}>invite a friend</Text></Pressable>
              </View>
            </View>
          ) : null}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 140,
          }}
          showsVerticalScrollIndicator={false}
          // Reveal newly shared memories at the top without moving someone
          // who is already reading farther down the feed.
          maintainVisibleContentPosition={{ autoscrollToTopThreshold: 64 }}
          // Comment modals are descendants of this list in the responder tree.
          // Let their Send button handle the first tap while the keyboard is up.
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.terracotta}
            />
          }
        />
      )}

      <View
        style={{ position: 'absolute', right: 22, bottom: 116 }}
        pointerEvents="box-none"
      >
        <FloatingCompose onPress={() => router.push('/compose' as never)} />
      </View>
    </SafeAreaView>
  );
}
