import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FormScrollView as ScrollView } from '@/components/ui/FormScrollView';
import { KeyboardFrame } from '@/components/ui/KeyboardFrame';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radii } from '@/lib/constants';
import { data } from '@/lib/data';
import { uploadPostImage, type PickedImage } from '@/lib/storage';
import { preparePostDraft } from '@/lib/post-draft';
import { Icon, TerracottaButton } from '@/components/ui';
import { DEFAULT_REACTION_EMOJI } from '@/types';
import type { ActivitySocialProof } from '@/types';

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
  const { activityId } = useLocalSearchParams<{ activityId?: string }>();
  const [linkedPlanId, setLinkedPlanId] = useState(activityId ?? null);
  const [plan, setPlan] = useState<ActivitySocialProof | null>(null);
  const [planLoading, setPlanLoading] = useState(Boolean(activityId));
  const [planError, setPlanError] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind>('photo');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [reactionEmoji, setReactionEmoji] = useState<string>(DEFAULT_REACTION_EMOJI);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitPending = useRef(false);
  const planRequest = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { setLinkedPlanId(activityId ?? null); }, [activityId]);

  const loadPlan = useCallback(async () => {
    const version = ++planRequest.current;
    setPlan(null);
    setPlanError(null);
    if (!linkedPlanId) { setPlanLoading(false); return; }
    setPlanLoading(true);
    try {
      const next = await data.getPlan(linkedPlanId);
      if (version !== planRequest.current) return;
      if (!next) throw new Error('This plan is no longer available.');
      setPlan(next);
    } catch {
      if (version === planRequest.current) setPlanError('This plan couldn’t load. Try again or remove it to share a standalone memory.');
    } finally {
      if (version === planRequest.current) setPlanLoading(false);
    }
  }, [linkedPlanId]);

  useEffect(() => {
    void loadPlan();
    return () => { planRequest.current += 1; };
  }, [loadPlan]);

  const pickImage = async () => {
    if (submitPending.current) return;
    setError(null);
    try {
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
      if (asset && mounted.current) {
        setImage({ uri: asset.uri, base64: asset.base64 ?? null });
      }
    } catch {
      if (mounted.current) setError('Your photo couldn’t open. Please choose it again.');
    }
  };

  const submit = async () => {
    if (submitPending.current || planLoading || (linkedPlanId && !plan)) return;

    submitPending.current = true;
    setError(null);
    setSubmitting(true);

    try {
      const draft = preparePostDraft(kind, body, image);
      const parent = await data.getCurrentUser();
      let mediaPath: string | null = null;
      if (draft.image) {
        mediaPath = await uploadPostImage(parent.id, draft.image);
      }

      await data.createPost({
        author_id: parent.id,
        type: draft.type,
        body: draft.body,
        media_path: mediaPath,
        activity_id: plan?.activity.id ?? null,
        story_id: null,
        location_share_mode: 'none',
        venue_id: null,
        reaction_emoji: reactionEmoji === DEFAULT_REACTION_EMOJI ? null : reactionEmoji,
      });

      // System back gestures can leave this screen even while cancel is disabled.
      // A completed write must not pop the screen the parent has since opened.
      if (!mounted.current) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'something went wrong — try again');
    } finally {
      submitPending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const canSubmit =
    kind === 'photo'
      ? !!(image || body.trim())
      : !!body.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardFrame style={{ flex: 1 }}>
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
          <Pressable onPress={() => router.back()} hitSlop={8} disabled={submitting} accessibilityRole="button">
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
            {linkedPlanId ? 'share a memory' : 'new post'}
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.brownMid, marginBottom: 14 }}>Shared with all your connections</Text>
          {linkedPlanId ? (
            <View style={{ padding: 14, marginBottom: 18, gap: 8, borderWidth: 1, borderColor: colors.rule, borderRadius: radii.md, backgroundColor: colors.surface }}>
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, color: colors.taupe }}>A MEMORY FROM</Text>
              {planLoading ? <ActivityIndicator color={colors.terracotta} /> : plan ? <Text style={{ fontFamily: fonts.serifRegular, fontSize: 22, color: colors.dark }}>{plan.activity.emoji ?? '✨'} {plan.activity.name}</Text> : <Text accessibilityRole="alert" style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.brownMid }}>{planError}</Text>}
              <View style={{ flexDirection: 'row', gap: 20 }}>
                {planError ? <Pressable accessibilityRole="button" disabled={submitting} onPress={loadPlan} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta }}>try again</Text></Pressable> : null}
                <Pressable accessibilityRole="button" disabled={submitting} onPress={() => { planRequest.current += 1; setLinkedPlanId(null); setPlan(null); setPlanLoading(false); }} style={{ minHeight: 40, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.brownMid }}>remove plan</Text></Pressable>
              </View>
            </View>
          ) : null}
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
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === k.key, disabled: submitting }}
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
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={image ? 'Change photo' : 'Add photo'}
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
          {kind === 'photo' && image ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => setImage(null)} style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}><Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta }}>remove photo</Text></Pressable> : null}

          {/* Body input */}
          <TextInput
            value={body}
            onChangeText={setBody}
            editable={!submitting}
            accessibilityLabel={kind === 'photo' ? 'Photo caption' : kind === 'question' ? 'Question' : 'Memory or thought'}
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
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${e} as the reaction`}
                  accessibilityState={{ selected: reactionEmoji === e, disabled: submitting }}
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
                disabled={!canSubmit || planLoading || Boolean(linkedPlanId && !plan)}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardFrame>
    </SafeAreaView>
  );
}
