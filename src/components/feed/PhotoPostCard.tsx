import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import {
  AvatarCircle,
  Icon,
  PhotoTile,
  Sparkle,
  TimeStampPill,
} from '@/components/ui';
import { useProfileLink } from '@/hooks/useProfileLink';
import { stickerStamp } from '@/lib/format';
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
        <PhotoTile
          tone={tone}
          height={300}
          label={post.body ? post.body.toLowerCase() : 'family moment'}
          radius={2}
        />

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
            {post.body ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fonts.serif,
                  fontSize: 14,
                  color: colors.brownMid,
                  lineHeight: 18,
                }}
              >
                &ldquo;{post.body}&rdquo;
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="heart.fill" size={17} color={colors.terracotta} weight={2} />
              <Text
                style={{
                  fontFamily: fonts.sansExtra,
                  fontSize: 14,
                  color: colors.terracotta,
                }}
              >
                8
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="bubble" size={17} color={colors.taupe} weight={2} />
              <Text
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 14,
                  color: colors.taupe,
                }}
              >
                3
              </Text>
            </View>
          </View>
        </View>
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
