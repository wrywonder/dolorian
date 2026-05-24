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
import { uploadPostImage } from '@/lib/storage';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import { Icon, TerracottaButton } from '@/components/ui';

type PostKind = 'photo' | 'question' | 'text';

const KINDS: { key: PostKind; label: string; icon: string }[] = [
  { key: 'photo', label: 'photo', icon: '📷' },
  { key: 'text', label: 'thought', icon: '💭' },
  { key: 'question', label: 'question', icon: '✋' },
];

export default function ComposeScreen() {
  const myId = useCurrentParentId();
  const [kind, setKind] = useState<PostKind>('photo');
  const [body, setBody] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!myId) return;
    if (kind === 'photo' && !imageUri && !body.trim()) return;
    if (kind !== 'photo' && !body.trim()) return;

    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    let mediaPath: string | null = null;
    if (imageUri) {
      mediaPath = await uploadPostImage(myId, imageUri);
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
    });

    setSubmitting(false);
    router.back();
  };

  const canSubmit =
    kind === 'photo'
      ? !!(imageUri || body.trim())
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
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
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
