import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '@/lib/constants';
import { data } from '@/lib/data';
import { uploadPostImage, type PickedImage } from '@/lib/storage';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import { Icon, TerracottaButton } from '@/components/ui';
import { DEFAULT_REACTION_EMOJI } from '@/types';

type PostKind = 'photo' | 'question' | 'text';

const KINDS: { key: PostKind; label: string; icon: string }[] = [
  { key: 'photo', label: 'photo', icon: '📷' },
  { key: 'text', label: 'thought', icon: '💭' },
  { key: 'question', label: 'question', icon: '✋' },
];

/**
 * Reaction emoji the author can feature on this post. A curated set for
 * now — the schema stores plain text, so this can grow into a full
 * picker (or custom uploaded emoji) without any data change.
 */
const REACTION_CHOICES = [DEFAULT_REACTION_EMOJI, '🎉', '😂', '🥹', '✨', '🙌', '🦖'] as const;

export default function ComposeScreen() {
  const myId = useCurrentParentId();
  const [kind, setKind] = useState<PostKind>('photo');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [reactionEmoji, setReactionEmoji] = useState<string>(DEFAULT_REACTION_EMOJI);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
      // base64 feeds the upload — RN's fetch(file://).blob() sends
      // zero bytes to Supabase Storage (see storage.ts).
      base64: true,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) {
      setImage({ uri: asset.uri, base64: asset.base64 ?? null });
    }
  };

  const submit = async () => {
    if (!myId) return;
    if (kind === 'photo' && !image && !body.trim()) return;
    if (kind !== 'photo' && !body.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      let mediaPath: string | null = null;
      if (image) {
        mediaPath = await uploadPostImage(myId, image);
      }

      await data.createPost({
        author_id: myId,
        type: kind,
        body: body.trim() || null,
        media_path: mediaPath,
        activity_id: null,
        story_id: null,
        location_share_mode: 'none',
        venue_id: null,
        reaction_emoji: reactionEmoji === DEFAULT_REACTION_EMOJI ? null : reactionEmoji,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'something went wrong — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    kind === 'photo'
      ? !!(image || body.trim())
      : !!body.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingVertical: 12,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 16,
                color: colors.taupe,
              }}
            >
              cancel
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              color: colors.dark,
              letterSpacing: -0.3,
            }}
          >
            new post
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Kind picker */}
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginBottom: 22,
            }}
          >
            {KINDS.map((k) => (
              <Pressable
                key={k.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setKind(k.key);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: kind === k.key ? colors.terracotta : colors.surface,
                  borderWidth: kind === k.key ? 0 : 1,
                  borderColor: colors.rule,
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 20 }}>{k.icon}</Text>
                <Text
                  style={{
                    fontFamily: fonts.sansExtra,
                    fontSize: 12,
                    color: kind === k.key ? colors.white : colors.brownMid,
                  }}
                >
                  {k.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Photo picker */}
          {kind === 'photo' ? (
            <Pressable
              onPress={pickImage}
              style={{
                height: 220,
                borderRadius: 16,
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: colors.rule,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                overflow: 'hidden',
              }}
            >
              {image ? (
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Icon name="camera" size={32} color={colors.taupe} weight={1.5} />
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: 15,
                      color: colors.taupe,
                    }}
                  >
                    tap to add a photo
                  </Text>
                </View>
              )}
            </Pressable>
          ) : null}

          {/* Body input */}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={
              kind === 'question'
                ? 'ask your village something...'
                : kind === 'photo'
                  ? 'add a caption (optional)'
                  : 'share a thought with your village...'
            }
            placeholderTextColor={colors.taupe}
            multiline
            autoFocus={kind !== 'photo'}
            style={{
              fontFamily: fonts.serif,
              fontSize: 18,
              color: colors.dark,
              lineHeight: 26,
              minHeight: kind === 'photo' ? 60 : 140,
              textAlignVertical: 'top',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.rule,
            }}
          />

          {/* Reaction emoji picker — what friends react with on this post */}
          <View style={{ marginTop: 20 }}>
            <Text
              style={{
                fontFamily: fonts.monoBold,
                fontSize: 10,
                color: colors.taupe,
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              FRIENDS REACT WITH
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {REACTION_CHOICES.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setReactionEmoji(e);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      reactionEmoji === e ? 'rgba(201, 100, 66, 0.13)' : colors.surface,
                    borderWidth: reactionEmoji === e ? 1.5 : 1,
                    borderColor: reactionEmoji === e ? colors.terracotta : colors.rule,
                  }}
                >
                  <Text style={{ fontSize: 17 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {error ? (
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 14,
                color: colors.terracotta,
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          ) : null}

          {/* Submit */}
          <View style={{ marginTop: 24 }}>
            {submitting ? (
              <ActivityIndicator color={colors.terracotta} />
            ) : (
              <TerracottaButton
                label={kind === 'question' ? 'ask away →' : 'share it →'}
                onPress={submit}
                disabled={!canSubmit}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
