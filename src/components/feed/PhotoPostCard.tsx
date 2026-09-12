import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import {
  AvatarCircle,
  PhotoTile,
  Sparkle,
  TimeStampPill,
} from '@/components/ui';
import { useProfileLink } from '@/hooks/useProfileLink';
import { stickerStamp } from '@/lib/format';
import { captionPreview } from '@/lib/post-engagement';
import { PostEngagementRow } from './PostEngagementRow';
import { PlanMemoryLink } from './PlanMemoryLink';
import type { FeedItem } from '@/types';

type PhotoPostCardProps = {
  item: FeedItem;
};

/**
 * White polaroid card with a striped photo placeholder, byline with
 * avatar + venue, heart/comment counts, and a rotated date sticker
 * over the top-right corner. Stripe tone is keyed by venue type.
 */
export function PhotoPostCard({ item }: PhotoPostCardProps) {
  const { post, author, venue } = item;
  const openProfile = useProfileLink();
  const tone =
    venue?.venue_type === 'studio'
      ? 'mauve'
      : venue?.venue_type === 'swim'
        ? 'slate'
        : 'butter';
  const bylineSuffix = venue
    ? ` · ${venue.name} ${venue.emoji ?? ''}`.trim()
    : '';

  return (
    <View style={{ marginBottom: 24, position: 'relative' }}>
      <View
        style={{
          backgroundColor: colors.white,
          paddingHorizontal: 10,
          paddingTop: 10,
          paddingBottom: 14,
          borderRadius: 6,
          shadowColor: '#2D241B',
          shadowOpacity: 0.12,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 18,
          elevation: 5,
        }}
      >
        {post.media_path ? (
          <Image
            accessible
            accessibilityLabel={`Photo shared by ${author.display_name}`}
            source={{ uri: post.media_path }}
            style={{ width: '100%', height: 300, borderRadius: 2 }}
            resizeMode="cover"
          />
        ) : (
          <PhotoTile
            tone={tone}
            height={140}
            label="a little moment"
            radius={2}
          />
        )}

        <View
          style={{
            paddingTop: 12,
            paddingHorizontal: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AvatarCircle
            initials={author.avatar_initials}
            tone={author.avatar_color}
            imageUrl={author.avatar_url}
            size={30}
            onPress={() => openProfile(author.id)}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.sansExtra,
                fontSize: 13.5,
                color: colors.dark,
              }}
            >
              {author.display_name.split(' ')[0]}
              {bylineSuffix}
            </Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 4 }}><PlanMemoryLink activity={item.activity} /></View>
        {post.body ? <MemoryCaption key={post.id} body={post.body} /> : null}
        <View style={{ paddingHorizontal: 4, marginTop: 12 }}><PostEngagementRow item={item} /></View>
      </View>

      {/* rotated date sticker — sits over the top-right corner of the polaroid */}
      <View style={{ position: 'absolute', top: -10, right: -6, zIndex: 5 }}>
        <TimeStampPill label={stickerStamp(post.created_at)} rotation={8} />
      </View>

      {/* sparkle accent */}
      <View style={{ position: 'absolute', bottom: 36, left: -8 }} pointerEvents="none">
        <Sparkle size={16} color={colors.terracotta} />
      </View>
    </View>
  );
}

function MemoryCaption({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = captionPreview(body);
  return (
    <View style={{ paddingHorizontal: 4, paddingTop: 10 }}>
      <Text selectable style={{ fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, color: colors.brownMid }}>
        {expanded ? body : preview.text}
      </Text>
      {preview.truncated ? (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((current) => !current)} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta }}>{expanded ? 'show less' : 'read the whole memory →'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
