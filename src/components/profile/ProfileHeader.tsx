import { Pressable, Text, View } from 'react-native';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { AvatarCircle, FadeOverlay, Icon, PhotoTile } from '@/components/ui';
import type { ConnectionStatus, Parent } from '@/types';

type ProfileHeaderProps = {
  parent: Parent;
  mutualFriendCount: number;
  /** Connected → show FRIEND pill. */
  connectionStatus: ConnectionStatus | 'none';
  /** True when viewing your own profile — flips the top-left tag + right action. */
  isSelf: boolean;
  onSettingsPress?: () => void;
};

/**
 * Full-bleed hero header — striped photo background, top-row chrome
 * (status pill left, settings right), large avatar with white ring,
 * italic-serif display name in two lines, taupe meta subline.
 *
 * The mono caption inside the StripePattern says "<name>'s family ·
 * <neighborhood>" — matching the placeholder labels we use elsewhere.
 */
export function ProfileHeader({
  parent,
  mutualFriendCount,
  connectionStatus,
  isSelf,
  onSettingsPress,
}: ProfileHeaderProps) {
  const tone: AvatarTone = parent.avatar_color;
  const firstName = parent.display_name.split(' ')[0] ?? parent.display_name;
  const lastName = parent.display_name.split(' ').slice(1).join(' ');

  const label = `${firstName}'s family${parent.neighborhood ? ` · ${parent.neighborhood}` : ''}`;

  return (
    <View style={{ position: 'relative', height: 400, overflow: 'hidden' }}>
      <PhotoTile tone={tone} height={400} label={label.toUpperCase()} />
      <FadeOverlay direction="top" intensity={0.75} transparentUntil={0.6} />

      {/* Top-row chrome */}
      <View
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {connectionStatus === 'connected' && !isSelf ? (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.92)',
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 18,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.monoBold,
                fontSize: 11,
                color: colors.brownMid,
                letterSpacing: 0.6,
              }}
            >
              FRIEND
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Pressable
          onPress={onSettingsPress}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(255,255,255,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="gear" size={18} color={colors.dark} weight={1.8} />
        </Pressable>
      </View>

      {/* Avatar + name block */}
      <View style={{ position: 'absolute', left: 22, right: 22, top: 200 }}>
        <AvatarCircle
          initials={parent.avatar_initials}
          tone={tone}
          size={92}
          ring={colors.white}
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
          }}
        />
        <Text
          style={{
            fontFamily: fonts.serif,
            fontSize: 40,
            color: colors.white,
            lineHeight: 42,
            letterSpacing: -0.7,
            marginTop: 14,
          }}
        >
          {firstName}
        </Text>
        {lastName ? (
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 40,
              color: colors.white,
              lineHeight: 42,
              letterSpacing: -0.7,
            }}
          >
            {lastName}.
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
          }}
        >
          {parent.neighborhood ? (
            <Text
              style={{
                fontFamily: fonts.sansBold,
                fontSize: 13,
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              {parent.neighborhood}
            </Text>
          ) : null}
          {parent.neighborhood && mutualFriendCount > 0 ? (
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.white,
                opacity: 0.6,
              }}
            />
          ) : null}
          {mutualFriendCount > 0 ? (
            <Text
              style={{
                fontFamily: fonts.sansBold,
                fontSize: 13,
                color: 'rgba(255,255,255,0.95)',
              }}
            >
              {mutualFriendCount} mutual friend{mutualFriendCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
