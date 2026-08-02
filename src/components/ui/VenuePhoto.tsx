import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { fonts, type AvatarTone } from '@/lib/constants';
import { getVenuePhoto, type VenuePhoto as ResolvedVenuePhoto } from '@/lib/venue-photos';
import type { Venue } from '@/types';
import { PhotoTile } from './PhotoTile';

type VenuePhotoProps = {
  venue: Venue;
  height: number;
  radius?: number;
  fallbackTone?: AvatarTone;
  style?: ViewStyle;
};

export function VenuePhoto({
  venue,
  height,
  radius = 0,
  fallbackTone = 'peach',
  style,
}: VenuePhotoProps) {
  const [photo, setPhoto] = useState<ResolvedVenuePhoto | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setPhoto(null);
    setFailed(false);
    getVenuePhoto(venue)
      .then((next) => { if (active) setPhoto(next); })
      .catch(() => {});
    return () => { active = false; };
  }, [venue]);

  const openAttribution = () => {
    if (!photo?.attributionUrl) return;
    Linking.openURL(photo.attributionUrl).catch(() => {});
  };

  return (
    <View style={[{ width: '100%', height, borderRadius: radius, overflow: 'hidden' }, style]}>
      <PhotoTile tone={fallbackTone} height={height} radius={radius} />
      {photo && !failed ? (
        <Image
          source={{ uri: photo.uri }}
          accessibilityLabel={`Photo of ${venue.name}`}
          contentFit="cover"
          cachePolicy={photo.cachePolicy}
          recyclingKey={venue.id}
          transition={220}
          onError={() => setFailed(true)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {photo?.attribution && !failed ? (
        <Pressable
          onPress={photo.attributionUrl ? openAttribution : undefined}
          hitSlop={6}
          accessibilityRole={photo.attributionUrl ? 'link' : 'text'}
          accessibilityLabel={`Photo credit: ${photo.attribution}`}
          accessibilityHint={photo.attributionUrl ? 'Opens the photo credit' : undefined}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 19,
            height: 19,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(45,36,27,0.5)',
          }}
        >
          <Text
            style={{ fontFamily: fonts.sansExtra, fontSize: 11, lineHeight: 13, color: 'rgba(255,255,255,0.96)' }}
          >
            i
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
