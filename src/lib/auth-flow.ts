import type { User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import type { AvatarTone } from '@/lib/constants';
import type { Parent } from '@/types';
import {
  REVIEW_EMAIL,
  normalizeEmail,
  normalizeLoginCode,
  prepareOnboardingInput,
  validateEmail,
  validateLoginCode,
} from '@/lib/auth-utils';

export {
  REVIEW_EMAIL,
  accountDestination,
  displayNameFromAuthMetadata,
  friendlyAuthError,
  initialsForName,
  normalizeEmail,
  normalizeLoginCode,
  prepareOnboardingInput,
  validateEmail,
  validateLoginCode,
} from '@/lib/auth-utils';

export async function signInWithApple(): Promise<User> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const credential = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
    state: Crypto.randomUUID(),
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Village could not finish signing you in. Please try again.');

  const fullName = credential.fullName
    ? AppleAuthentication.formatFullName(credential.fullName, 'default').trim()
    : '';
  if (fullName) {
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        given_name: credential.fullName?.givenName,
        family_name: credential.fullName?.familyName,
      },
    });
  }

  return data.user;
}

export async function requestEmailCode(value: string): Promise<string> {
  const email = normalizeEmail(value);
  const validation = validateEmail(email);
  if (validation) throw new Error(validation);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return email;
}

export async function verifyEmailCode(emailValue: string, codeValue: string): Promise<User> {
  const email = normalizeEmail(emailValue);
  const code = email === REVIEW_EMAIL ? codeValue : normalizeLoginCode(codeValue);
  if (email === REVIEW_EMAIL && !code) throw new Error('Enter the review password.');
  if (email !== REVIEW_EMAIL) {
    const validation = validateLoginCode(code);
    if (validation) throw new Error(validation);
  }
  const { data, error } = email === REVIEW_EMAIL
    ? await supabase.auth.signInWithPassword({ email: REVIEW_EMAIL, password: code })
    : await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
  if (!data.user) throw new Error('Village could not finish signing you in. Please try again.');
  return data.user;
}

export async function parentProfileExists(authUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('parents')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function completeOnboardingProfile(input: {
  displayName: string;
  neighborhood: string;
  tone: AvatarTone;
}): Promise<Parent> {
  const prepared = prepareOnboardingInput(input);
  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_display_name: prepared.displayName,
    p_neighborhood: prepared.neighborhood || null,
    p_avatar_color: prepared.tone,
    p_avatar_initials: prepared.initials,
  });
  if (error) throw error;
  if (!data) throw new Error('Village could not finish your profile. Please try again.');
  return data as Parent;
}
