import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AvatarCircle, Icon, PhotoAvatar, TerracottaButton } from '@/components/ui';
import { colors, fonts, type AvatarTone } from '@/lib/constants';
import { data } from '@/lib/data';
import { useCurrentParentId } from '@/hooks/useCurrentParentId';
import { uploadProfileImage, type PickedImage } from '@/lib/storage';
import type { Kid, UUID } from '@/types';

const TONES: AvatarTone[] = ['peach', 'golden', 'sage', 'mauve', 'slate', 'rose', 'butter'];

type KidDraft = {
  key: string;
  id?: UUID;
  name: string;
  birthYear: string;
  interests: string;
};

function kidDraft(kid?: Kid): KidDraft {
  return {
    key: kid?.id ?? `new-${Date.now()}-${Math.random()}`,
    ...(kid ? { id: kid.id } : {}),
    name: kid?.name ?? '',
    birthYear: kid ? String(kid.birth_year) : '',
    interests: kid?.interests.join(', ') ?? '',
  };
}

export default function SettingsScreen() {
  const myId = useCurrentParentId();
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [tone, setTone] = useState<AvatarTone>('peach');
  const [background, setBackground] = useState<AvatarTone>('peach');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<PickedImage | null>(null);
  const [kids, setKids] = useState<KidDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!myId) return;
    let active = true;
    data.getProfile(myId)
      .then((profile) => {
        if (!active || !profile) return;
        setDisplayName(profile.parent.display_name);
        setNeighborhood(profile.parent.neighborhood ?? '');
        setTone(profile.parent.avatar_color);
        setBackground(profile.parent.profile_background);
        setBio(profile.parent.bio ?? '');
        setPhotoUrl(profile.parent.avatar_url);
        setKids(profile.kids.map((kid) => kidDraft(kid)));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load your profile');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [myId]);

  const updateKid = useCallback((key: string, patch: Partial<KidDraft>) => {
    setKids((current) => current.map((kid) => kid.key === key ? { ...kid, ...patch } : kid));
  }, []);

  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const save = async () => {
    if (!displayName.trim()) {
      setError('add your name first');
      return;
    }
    const parsedKids = kids.map((kid) => ({
      ...(kid.id ? { id: kid.id } : {}),
      name: kid.name,
      birth_year: Number.parseInt(kid.birthYear, 10),
      interests: kid.interests.split(',').map((interest) => interest.trim()).filter(Boolean),
    }));
    if (parsedKids.some((kid) => !Number.isInteger(kid.birth_year))) {
      setError('add a four-digit birth year for each kid');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const uploadedPhotoUrl = pickedPhoto && myId
        ? await uploadProfileImage(myId, pickedPhoto)
        : photoUrl;
      await data.updateMyProfile({
        display_name: displayName,
        neighborhood: neighborhood || null,
        avatar_color: tone,
        avatar_url: uploadedPhotoUrl,
        bio,
        profile_background: background,
      });
      await data.saveMyKids(parsedKids);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    setPickedPhoto({ uri: asset.uri, base64: asset.base64 });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            height: 56,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevron.right" size={22} color={colors.dark} weight={2} />
            </View>
          </Pressable>
          <Text style={{ fontFamily: fonts.sansExtra, fontSize: 14, color: colors.dark }}>
            profile settings
          </Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.terracotta} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.7, color: colors.brownMid }}>
              YOU
            </Text>
            <Text style={{ fontFamily: fonts.serifRegular, fontSize: 34, color: colors.dark, marginTop: 4, marginBottom: 22 }}>
              make it feel like you
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <PhotoAvatar
                tone={tone}
                imageUrl={pickedPhoto?.uri ?? photoUrl}
                size={92}
                ringWidth={4}
                ringColor={colors.surface}
                onPress={choosePhoto}
              />
              <Pressable onPress={choosePhoto} style={{ marginTop: -14, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.terracotta }}>
                <Text style={{ fontFamily: fonts.sansExtra, fontSize: 11, color: colors.white }}>
                  {photoUrl || pickedPhoto ? 'change photo' : '+ add photo'}
                </Text>
              </Pressable>
            </View>
            <Text style={{ fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.6, color: colors.taupe, textAlign: 'center', marginBottom: 8 }}>
              AVATAR COLOR
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 9, marginBottom: 28 }}>
              {TONES.map((item) => (
                <AvatarCircle
                  key={item}
                  initials=""
                  tone={item}
                  size={31}
                  onPress={() => setTone(item)}
                  style={item === tone ? { borderWidth: 2.5, borderColor: colors.dark } : {}}
                />
              ))}
            </View>

            <Field label="YOUR NAME" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
            <Field label="NEIGHBORHOOD" value={neighborhood} onChangeText={setNeighborhood} placeholder="e.g. North Berkeley" />
            <Field label="ABOUT YOU" value={bio} onChangeText={setBio} placeholder="What should your village know about you?" multiline />

            <Text style={{ fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.6, color: colors.taupe, marginBottom: 8 }}>
              PROFILE BACKGROUND
            </Text>
            <View style={{ flexDirection: 'row', gap: 9, marginBottom: 28 }}>
              {TONES.map((item) => (
                <AvatarCircle
                  key={`background-${item}`}
                  initials=""
                  tone={item}
                  size={36}
                  onPress={() => setBackground(item)}
                  style={item === background ? { borderWidth: 2.5, borderColor: colors.dark } : {}}
                />
              ))}
            </View>

            <View style={{ height: 1, backgroundColor: colors.rule, marginVertical: 28 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={{ fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.7, color: colors.brownMid }}>
                  YOUR CREW
                </Text>
                <Text style={{ fontFamily: fonts.serifRegular, fontSize: 27, color: colors.dark, marginTop: 2 }}>
                  kids
                </Text>
              </View>
              <Pressable
                onPress={() => setKids((current) => [...current, kidDraft()])}
                style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.rule }}
              >
                <Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.terracotta }}>+ add kid</Text>
              </Pressable>
            </View>

            {kids.map((kid, index) => (
              <View
                key={kid.key}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.rule,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontFamily: fonts.sansExtra, fontSize: 12, color: colors.dark }}>
                    kid {index + 1}
                  </Text>
                  <Pressable onPress={() => setKids((current) => current.filter((item) => item.key !== kid.key))} hitSlop={10}>
                    <Text style={{ fontFamily: fonts.sansBold, fontSize: 12, color: colors.terracotta }}>remove</Text>
                  </Pressable>
                </View>
                <Field label="NAME" value={kid.name} onChangeText={(value) => updateKid(kid.key, { name: value })} placeholder="Name" compact />
                <Field label="BIRTH YEAR" value={kid.birthYear} onChangeText={(value) => updateKid(kid.key, { birthYear: value })} placeholder="2021" keyboardType="number-pad" compact />
                <Field label="INTERESTS" value={kid.interests} onChangeText={(value) => updateKid(kid.key, { interests: value })} placeholder="dinosaurs, painting, soccer" compact />
              </View>
            ))}

            {kids.length === 0 ? (
              <Text style={{ fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, color: colors.taupe, textAlign: 'center', paddingVertical: 18 }}>
                add kids whenever you’re ready — you control what appears on your profile
              </Text>
            ) : null}

            {error ? (
              <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.terracotta, marginTop: 12 }}>
                {error}
              </Text>
            ) : null}
            {saving ? (
              <ActivityIndicator color={colors.terracotta} style={{ marginTop: 24 }} />
            ) : (
              <TerracottaButton label="save changes →" onPress={save} fullWidth style={{ marginTop: 24 }} />
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  compact = false,
  ...inputProps
}: {
  label: string;
  compact?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: compact ? 14 : 20 }}>
      <Text style={{ fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.6, color: colors.taupe, marginBottom: 5 }}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.taupe}
        style={{
          fontFamily: fonts.sansSemi,
          fontSize: 15,
          color: colors.dark,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.rule,
          paddingVertical: 7,
          minHeight: inputProps.multiline ? 74 : undefined,
          textAlignVertical: inputProps.multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
