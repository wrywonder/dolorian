import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import { reactionCountAfter } from '@/lib/post-engagement';
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
  // FlashList recycles rows: keep open sheets, drafts and in-flight writes
  // attached to their post rather than to a reused cell.
  return <PostEngagementControls key={item.post.id} item={item} />;
}

function PostEngagementControls({ item }: PostEngagementRowProps) {
  const emoji = item.post.reaction_emoji ?? DEFAULT_REACTION_EMOJI;

  const [reacted, setReacted] = useState(item.myReacted);
  const [count, setCount] = useState(item.reactionCount);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Resync when the feed refreshes (FlashList reuses card instances).
  useEffect(() => {
    if (!pending.current) {
      setReacted(item.myReacted);
      setCount(item.reactionCount);
    }
    setCommentCount(item.commentCount);
  }, [item.myReacted, item.reactionCount, item.commentCount]);

  const toggle = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    Haptics.selectionAsync().catch(() => {});
    const next = !reacted;
    setReacted(next);
    setCount(reactionCountAfter(count, reacted, next));
    try {
      await data.setPostReaction(item.post.id, emoji, next);
    } catch {
      if (mounted.current) {
        setReacted(reacted);
        setCount(count);
        Alert.alert('reaction didn’t save', 'Please try again when you’re connected.');
      }
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable
        onPress={toggle}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={`${reacted ? 'Remove' : 'Add'} ${emoji} reaction, ${count} reactions`}
        accessibilityState={{ selected: reacted, busy: saving, disabled: saving }}
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
          minHeight: 40,
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
        accessibilityRole="button"
        accessibilityLabel={`Open comments, ${commentCount} comments`}
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
          minHeight: 40,
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
