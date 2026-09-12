import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FormScrollView as ScrollView } from '@/components/ui/FormScrollView';
import { KeyboardFrame } from '@/components/ui/KeyboardFrame';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing } from '@/lib/constants';
import { data } from '@/lib/data';
import { TerracottaButton } from '@/components/ui';
import type { Venue } from '@/types';

type AddSpotSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Called after the venue is created and added to this parent's hangouts. */
  onCreated: (venue: Venue) => void;
};

const EMOJI_CHOICES = ['🌳', '🛝', '🎨', '🏊', '📚', '☕', '🏫', '✨'] as const;

const TYPE_CHOICES: { key: Venue['venue_type']; label: string }[] = [
  { key: 'park', label: 'park' },
  { key: 'playground', label: 'playground' },
  { key: 'studio', label: 'studio' },
  { key: 'swim', label: 'swim' },
  { key: 'library', label: 'library' },
  { key: 'cafe', label: 'cafe' },
  { key: 'school', label: 'school' },
  { key: 'other', label: 'other' },
];

/**
 * Adds a named hangout at the user's current position. Creating a hangout
 * never writes presence itself. Active geofencing may detect the new region.
 */
export function AddSpotSheet({ open, onClose, onCreated }: AddSpotSheetProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>('🌳');
  const [venueType, setVenueType] = useState<Venue['venue_type']>('park');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setEmoji('🌳');
    setVenueType('park');
    setError(null);
  };

  const save = async () => {
    if (saving) return;
    if (name.trim().length < 2) {
      setError('give the spot a name with at least 2 characters');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('location access is needed to save the hangout where you are');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const venue = await data.createVenue({
        name: name.trim(),
        emoji,
        venue_type: venueType,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      await data.setHangoutSpot(venue.id, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      reset();
      onCreated(venue);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'something went wrong — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => { if (!saving) onClose(); }}>
      <KeyboardFrame accessibilityViewIsModal style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,36,27,0.35)' }}
          disabled={saving}
          onPress={onClose}
        />
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: '88%', backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
          contentContainerStyle={{
            backgroundColor: colors.cream,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 22,
            paddingBottom: 42,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.monoBold,
              fontSize: 10.5,
              color: colors.brownMid,
              letterSpacing: 0.7,
              marginBottom: 4,
            }}
          >
            SAVE WHERE YOU'RE STANDING
          </Text>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 28,
              color: colors.dark,
              letterSpacing: -0.4,
              marginBottom: 18,
            }}
          >
            add a hangout spot
          </Text>

          <Text style={{ fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.brownMid, marginBottom: spacing.md }}>
            Add a public place, like a park or café. Its name and map location are visible in Village’s place directory. Your visits are shared separately with your connections.
          </Text>
          <TextInput
            accessibilityLabel="Public place name"
            maxLength={100}
            editable={!saving}
            value={name}
            onChangeText={setName}
            placeholder="e.g. the good sandbox"
            placeholderTextColor={colors.taupe}
            autoFocus
            style={{
              fontFamily: fonts.sansBold,
              fontSize: 16,
              color: colors.dark,
              borderBottomWidth: 1.5,
              borderBottomColor: colors.rule,
              paddingVertical: 10,
              marginBottom: 18,
            }}
          />

          {/* Emoji picker */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {EMOJI_CHOICES.map((e) => (
              <Pressable
                key={e}
                accessibilityRole="button"
                accessibilityLabel={`Place emoji ${e}`}
                accessibilityState={{ selected: emoji === e }}
                disabled={saving}
                onPress={() => setEmoji(e)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: emoji === e ? colors.sageSoft : colors.surface,
                  borderWidth: emoji === e ? 1.5 : 1,
                  borderColor: emoji === e ? colors.sage : colors.rule,
                }}
              >
                <Text style={{ fontSize: 18 }}>{e}</Text>
              </Pressable>
            ))}
          </View>

          {/* Type chips */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {TYPE_CHOICES.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityState={{ selected: venueType === t.key }}
                disabled={saving}
                onPress={() => setVenueType(t.key)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: venueType === t.key ? colors.terracotta : colors.surface,
                  borderWidth: venueType === t.key ? 0 : 1,
                  borderColor: colors.rule,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.sansBold,
                    fontSize: 12.5,
                    color: venueType === t.key ? colors.white : colors.brownMid,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {error ? (
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 14,
                color: colors.terracotta,
                marginBottom: 12,
              }}
            >
              {error}
            </Text>
          ) : null}

          {saving ? (
            <ActivityIndicator color={colors.terracotta} />
          ) : (
            <TerracottaButton label="save hangout →" onPress={save} />
          )}
        </ScrollView>
      </KeyboardFrame>
    </Modal>
  );
}
