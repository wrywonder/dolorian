import { Image } from 'expo-image';
import { Text, View, type ViewStyle } from 'react-native';
import { avatarTones, fonts, type AvatarTone } from '@/lib/constants';

type ProfileCoverProps = {
  imageUrl?: string | null;
  tone?: AvatarTone;
  height: number;
  label?: string;
  radius?: number;
  style?: ViewStyle;
};

/**
 * Full-bleed profile cover. A chosen image replaces the old striped texture;
 * profiles without one get a quiet color wash until their owner adds a photo.
 */
export function ProfileCover({
  imageUrl,
  tone = 'peach',
  height,
  label,
  radius = 0,
  style,
}: ProfileCoverProps) {
  const palette = avatarTones[tone];

  return (
    <View
      style={[
        {
          width: '100%',
          height,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: palette.light,
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={180}
          accessibilityLabel="Profile cover photo"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <>
          <View
            style={{
              position: 'absolute',
              width: height * 1.25,
              height: height * 1.25,
              borderRadius: height,
              top: -height * 0.72,
              right: -height * 0.22,
              backgroundColor: palette.dark,
              opacity: 0.42,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: height * 0.9,
              height: height * 0.9,
              borderRadius: height,
              bottom: -height * 0.58,
              left: -height * 0.08,
              backgroundColor: '#FFFDF6',
              opacity: 0.42,
            }}
          />
          {label ? (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.monoBold,
                  fontSize: 10,
                  color: 'rgba(45,36,27,0.58)',
                  letterSpacing: 0.7,
                  textAlign: 'center',
                }}
              >
                {label}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
