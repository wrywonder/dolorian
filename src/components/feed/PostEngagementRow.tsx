import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import { Icon } from '@/components/ui';
import { DEFAULT_REACTION_EMOJI } from '@/types';
import type { FeedItem } from '@/types';
import { CommentsSheet } from './CommentsSheet';

type PostEngagementRowProps = {
  item: FeedItem;
};

/**
 * Reaction pill + comments trigger, shared by every post card.
 *
 * The reaction emoji is whatever the post's author chose
 * (posts.reaction_emoji), falling back to ❤️ — so a post can feature
 * 🦖 and every reaction on it shows 🦖. Toggles optimistically and
 * rolls back if the write fails.
 */
export function PostEngagementRow({ item }: PostEngagementRowProps) {
  const emoji = item.post.reaction_emoji ?? DEFAULT_REACTION_EMOJI;

  const [reacted, setReacted] = useState(item.myReacted);
  const [count, setCount] = useState(item.reactionCount);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Resync when the feed refreshes (FlashList reuses card instances).
  useEffect(() => {
    setReacted(item.myReacted);
    setCount(item.reactionCount);
    setCommentCount(item.commentCount);
  }, [item.myReacted, item.reactionCount, item.commentCount]);

  const toggle = async () => {
    Haptics.selectionAsync().catch(() => {});
    const next = !reacted;
    setReacted(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      await data.toggleReaction(item.post.id, emoji);
    } catch {
      setReacted(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable
        onPress={toggle}
        hitSlop={6}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 14,
          backgroundColor: reacted ? 'rgba(201, 100, 66, 0.13)' : colors.surface,
          borderWidth: 1,
          borderColor: reacted ? colors.terracotta : colors.rule,
        }}
      >
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
        {count > 0 ? (
          <Text
            style={{
              fontFamily: fonts.sansExtra,
              fontSize: 13,
              color: reacted ? colors.terracotta : colors.brownMid,
            }}
          >
            {count}
          </Text>
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => setCommentsOpen(true)}
        hitSlop={6}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.rule,
        }}
      >
        <Icon name="bubble" size={15} color={colors.taupe} weight={2} />
        {commentCount > 0 ? (
          <Text
            style={{
              fontFamily: fonts.sansBold,
              fontSize: 13,
              color: colors.brownMid,
            }}
          >
            {commentCount}
          </Text>
        ) : null}
      </Pressable>

      <CommentsSheet
        open={commentsOpen}
        postId={item.post.id}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </View>
  );
}
