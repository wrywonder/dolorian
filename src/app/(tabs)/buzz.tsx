import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '@/lib/constants';
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
  const toggle = useVisibilityStore((s) => s.toggle);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [prompt, setPrompt] = useState<ResolvedPrompt | null>(null);
  const [visibleConnections, setVisibleConnections] = useState<Parent[]>([]);

  const load = useCallback(
    async (initial: boolean = false) => {
      if (initial) setLoading(true);
      const [posts, pending, connections] = await Promise.all([
        data.getFeedPosts(),
        data.getPendingPrompt(),
        data.getVisibleConnectionAvatars(),
      ]);
      setFeed(posts);
      setPrompt(pending);
      setVisibleConnections(connections);
      if (initial) setLoading(false);
    },
    [],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const rows: RowKind[] = [
    ...(prompt ? [{ kind: 'prompt' as const, resolved: prompt }] : []),
    ...feed.map((item) => ({ kind: 'post' as const, item })),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top']}>
      <ScreenHeader
        eyebrow={eyebrowDate('2026-05-24T17:38:00Z')}
        title="buzz"
        flourish="squiggle"
        right={
          <VisibilityChip
            visible={visible}
            visibleParents={
              visible
                ? visibleConnections.slice(0, 3).map((p) => ({
                    initials: '',
                    tone: p.avatar_color as AvatarTone,
                  }))
                : []
            }
            onPress={toggle}
          />
        }
      />

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          eyebrow="QUIET HERE"
          title="your village hasn't said hi yet"
          body="when the parents you've connected with post photos, questions, or just little wins — they'll show up here."
          flourish="squiggle"
        />
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
              <PostCard item={item.item} />
            )
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 140,
          }}
          showsVerticalScrollIndicator={false}
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
