import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, type Region } from 'react-native-maps';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { PhotoAvatar } from '@/components/ui';
import { useProfileLink } from '@/hooks/useProfileLink';
import type { NearbyParent, UUID, Venue } from '@/types';

const DOLORES_PARK: Region = {
  latitude: 37.7596,
  longitude: -122.4269,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

type LiveMapProps = {
  pins: NearbyParent[];
  venues: Venue[];
  meId: UUID;
};

type PermissionState = 'checking' | 'granted' | 'denied' | 'error';

export function LiveMap(props: LiveMapProps) {
  return (
    <MapErrorBoundary>
      <LiveMapContent {...props} />
    </MapErrorBoundary>
  );
}

function LiveMapContent({ pins, venues, meId }: LiveMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const openProfile = useProfileLink();
  const [permission, setPermission] = useState<PermissionState>('checking');

  const venueGroups = useMemo(() => {
    const groups = new Map<UUID, NearbyParent[]>();
    for (const pin of pins) {
      if (!pin.venue) continue;
      const group = groups.get(pin.venue.id) ?? [];
      group.push(pin);
      groups.set(pin.venue.id, group);
    }
    return groups;
  }, [pins]);

  const visibleVenues = useMemo(() => {
    const byId = new Map<UUID, Venue>();
    for (const venue of venues) byId.set(venue.id, venue);
    for (const pin of pins) {
      if (pin.venue) byId.set(pin.venue.id, pin.venue);
    }
    return [...byId.values()].filter(
      (venue) => Number.isFinite(venue.lat) && Number.isFinite(venue.lng),
    );
  }, [pins, venues]);

  useEffect(() => {
    let active = true;

    const centerOnUser = async () => {
      try {
        let response = await Location.getForegroundPermissionsAsync();
        if (response.status !== Location.PermissionStatus.GRANTED && response.canAskAgain) {
          response = await Location.requestForegroundPermissionsAsync();
        }
        if (!active) return;
        if (response.status !== Location.PermissionStatus.GRANTED) {
          setPermission('denied');
          return;
        }

        setPermission('granted');
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 1000,
        });
        const current = lastKnown ?? await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active) return;
        mapRef.current?.animateToRegion(
          {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            latitudeDelta: 0.045,
            longitudeDelta: 0.045,
          },
          550,
        );
      } catch (error) {
        console.warn('location lookup failed', error);
        if (active) setPermission('error');
      }
    };

    centerOnUser();
    return () => { active = false; };
  }, []);

  return (
    <View
      style={{
        marginHorizontal: 14,
        flex: 1,
        minHeight: 260,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: colors.sageSoft,
        borderWidth: 1,
        borderColor: colors.rule,
        shadowColor: colors.dark,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 24,
        elevation: 6,
      }}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={DOLORES_PARK}
        showsUserLocation={permission === 'granted'}
        showsMyLocationButton={permission === 'granted'}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {visibleVenues.map((venue) => {
          const parents = venueGroups.get(venue.id) ?? [];
          return (
            <Marker
              key={venue.id}
              coordinate={{ latitude: venue.lat, longitude: venue.lng }}
              title={venue.name}
              description={
                parents.length > 0
                  ? `${parents.length} ${parents.length === 1 ? 'parent' : 'parents'} here now`
                  : venue.venue_type
              }
              onPress={() => {
                const firstOther = parents.find((pin) => pin.parent.id !== meId);
                if (firstOther) openProfile(firstOther.parent.id);
              }}
              tracksViewChanges={parents.length > 0}
            >
              {parents.length > 0 ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {parents.slice(0, 3).map((pin, index) => (
                      <PhotoAvatar
                        key={pin.parent.id}
                        tone={pin.parent.avatar_color as AvatarTone}
                        size={pin.parent.id === meId ? 46 : 42}
                        ringWidth={3}
                        ringColor={pin.parent.id === meId ? colors.terracotta : colors.white}
                        style={{ marginLeft: index === 0 ? 0 : -14 }}
                      />
                    ))}
                  </View>
                  <View
                    style={{
                      marginTop: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.rule,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansExtra, fontSize: 10, color: colors.dark }}>
                      {venue.emoji ?? '📍'} {venue.name}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.rule,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{venue.emoji ?? '📍'}</Text>
                </View>
              )}
            </Marker>
          );
        })}
      </MapView>

      {permission === 'denied' || permission === 'error' ? (
        <MapMessage
          text={permission === 'denied'
            ? 'location is off — showing Dolores Park instead'
            : 'couldn’t find you — showing the neighborhood map'}
          position="top"
        />
      ) : null}
      {pins.length === 0 ? (
        <MapMessage text="no connections are checked in right now" position="bottom" />
      ) : null}
    </View>
  );
}

function MapMessage({ text, position }: { text: string; position: 'top' | 'bottom' }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        [position]: 12,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.rule,
        }}
      >
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 11, color: colors.brownMid }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('native map unavailable', error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View
        style={{
          marginHorizontal: 14,
          flex: 1,
          minHeight: 260,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
          backgroundColor: colors.sageSoft,
          borderWidth: 1,
          borderColor: colors.rule,
        }}
      >
        <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.dark, textAlign: 'center' }}>
          the live map needs a fresh development build
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.brownMid, textAlign: 'center', marginTop: 8 }}>
          venues and check-ins are still safe — rebuild the native app to see them here.
        </Text>
      </View>
    );
  }
}
