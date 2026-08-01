import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radii, type AvatarTone } from '@/lib/constants';
import {
  accountDestination,
  completeOnboardingProfile,
  displayNameFromAuthMetadata,
  friendlyAuthError,
  initialsForName,
  parentProfileExists,
} from '@/lib/auth-flow';
import { AvatarCircle, TerracottaButton, TwinkleSparkle } from '@/components/ui';

const TONES: AvatarTone[] = ['peach', 'golden', 'sage', 'mauve', 'slate', 'rose', 'butter'];

export default function OnboardScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [tone, setTone] = useState<AvatarTone>('peach');
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initials = useMemo(() => initialsForName(displayName), [displayName]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (!active) return;
      if (authError || !user) {
        setError('Your sign-in expired. Go back and request a new code.');
        return;
      }
      const suggestedName = displayNameFromAuthMetadata(user.user_metadata);
      if (suggestedName) setDisplayName((current) => current || suggestedName);
      if (await parentProfileExists(user.id)) {
        router.replace(accountDestination(true, invite) as never);
      }
    }).catch((cause) => {
      if (active) setError(friendlyAuthError(cause, 'Village could not check your account.'));
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [invite]);

  const save = async () => {
    setError(null);
    setLoading(true);
    try {
      await completeOnboardingProfile({ displayName, neighborhood, tone });
      router.replace(accountDestination(true, invite) as never);
    } catch (cause) {
      setError(friendlyAuthError(cause, 'Village could not finish your profile.'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.terracotta} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 34, paddingBottom: 42, gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={styles.eyebrow}>STEP 2 OF 2</Text>
              <TwinkleSparkle size={10} color={colors.amberLight} />
            </View>
            <Text style={styles.title}>make yourself at home</Text>
            <Text style={styles.intro}>Give other parents enough to recognize you. You can add photos, kids, and more from your profile later.</Text>
          </View>

          <View style={styles.card}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <AvatarCircle initials={initials || '?'} tone={tone} size={88} />
              <Text style={styles.eyebrow}>CHOOSE A PROFILE COLOR</Text>
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {TONES.map((item) => (
                  <AvatarCircle
                    key={item}
                    initials=""
                    tone={item}
                    size={34}
                    onPress={() => setTone(item)}
                    style={item === tone ? { borderWidth: 2.5, borderColor: colors.dark } : {}}
                  />
                ))}
              </View>
            </View>

            <Field
              label="YOUR NAME"
              helper="Use the name other parents know you by."
              value={displayName}
              onChangeText={(value) => { setDisplayName(value); if (error) setError(null); }}
              placeholder="e.g. Drew Rowny"
              maxLength={80}
              autoFocus
              returnKeyType="next"
            />
            <Field
              label="NEIGHBORHOOD · OPTIONAL"
              helper="This helps nearby families recognize your part of town."
              value={neighborhood}
              onChangeText={(value) => { setNeighborhood(value); if (error) setError(null); }}
              placeholder="e.g. Noe Valley"
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={save}
            />

            {error ? <Text selectable accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {loading ? <ActivityIndicator color={colors.terracotta} style={{ height: 58 }} /> : (
              <TerracottaButton label="join the village →" onPress={save} disabled={displayName.trim().length < 2} fullWidth />
            )}
          </View>

          <Text style={styles.privacy}>Your profile is shown only according to Village’s connection and plan privacy rules.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, helper, ...inputProps }: {
  label: string;
  helper: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength: number;
  autoFocus?: boolean;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.eyebrow}>{label}</Text>
      <TextInput {...inputProps} autoCapitalize="words" autoCorrect placeholderTextColor={colors.taupe} style={styles.input} />
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = {
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream } as const,
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.7, color: colors.brownMid } as const,
  title: { paddingTop: 5, fontFamily: fonts.serifRegular, fontSize: 37, lineHeight: 40, letterSpacing: -0.6, color: colors.dark } as const,
  intro: { paddingTop: 10, fontFamily: fonts.serifRegular, fontSize: 16.5, lineHeight: 23, color: colors.brownMid } as const,
  card: { padding: 18, gap: 20, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.surface, borderCurve: 'continuous' } as const,
  input: { minHeight: 52, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.rule, backgroundColor: colors.cream, fontFamily: fonts.sansBold, fontSize: 16, color: colors.dark, borderCurve: 'continuous' } as const,
  helper: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.taupe } as const,
  error: { fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 18, color: colors.terracotta } as const,
  privacy: { paddingHorizontal: 12, fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, textAlign: 'center', color: colors.taupe } as const,
};
