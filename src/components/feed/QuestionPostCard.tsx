import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/constants';
import { AvatarCircle } from '@/components/ui';
import { useProfileLink } from '@/hooks/useProfileLink';
import { relativeShort } from '@/lib/format';
import type { FeedItem } from '@/types';

type QuestionPostCardProps = {
  item: FeedItem;
};

/**
 * Speech-bubble card with a tail — used for both `question` and `text`
 * post types. Questions get a "HELP ✋" tag in the byline row.
 */
export function QuestionPostCard({ item }: QuestionPostCardProps) {
  const { post, author } = item;
  const isQuestion = post.type === 'question';
  const openProfile = useProfileLink();

  return (
    <View style={{ marginBottom: 18, position: 'relative' }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 22,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: colors.rule,
          position: 'relative',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <AvatarCircle
            initials={author.avatar_initials}
            tone={author.avatar_color}
            size={28}
            onPress={() => openProfile(author.id)}
          />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={{
                fontFamily: fonts.sansExtra,
                fontSize: 13,
                color: colors.dark,
              }}
            >
              {author.display_name.split(' ')[0]}
              {isQuestion ? ' asks' : ''}
            </Text>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 13,
                color: colors.taupe,
                marginLeft: 4,
              }}
            >
              · {relativeShort(post.created_at)}
            </Text>
          </View>
          {isQuestion ? (
            <View
              style={{
                marginLeft: 'auto',
                backgroundColor: 'rgba(201, 100, 66, 0.13)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sansExtra,
                  fontSize: 10,
                  color: colors.terracotta,
                  letterSpacing: 0.4,
                }}
              >
                HELP ✋
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 19,
            color: colors.dark,
            lineHeight: 24,
          }}
        >
          {post.body}
        </Text>

        {/* speech-bubble tail (cream + 1px border) */}
        <View
          style={{
            position: 'absolute',
            bottom: -10,
            left: 28,
            width: 0,
            height: 0,
            borderLeftWidth: 8,
            borderLeftColor: 'transparent',
            borderRightWidth: 12,
            borderRightColor: 'transparent',
            borderTopWidth: 12,
            borderTopColor: colors.surface,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -11,
            left: 27,
            width: 0,
            height: 0,
            borderLeftWidth: 9,
            borderLeftColor: 'transparent',
            borderRightWidth: 13,
            borderRightColor: 'transparent',
            borderTopWidth: 13,
            borderTopColor: colors.rule,
            zIndex: -1,
          }}
        />
      </View>
    </View>
  );
}
