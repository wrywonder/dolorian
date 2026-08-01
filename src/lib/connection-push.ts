import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Registers an Expo push token for relationship notifications. Unsupported
 * environments (including simulators) reject token creation and are handled by
 * the caller without preventing the app from loading.
 */
export async function registerConnectionPushToken(): Promise<void> {
  // Development clients are commonly run in simulators, where APNs token
  // creation is unsupported. TestFlight and App Store builds still register.
  if (__DEV__) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('village', {
      name: 'Your Village',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== Notifications.PermissionStatus.GRANTED) return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID is missing');

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform = Platform.OS === 'android' ? 'android' : 'ios';
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: platform,
    p_device_id: null,
  });
  if (error) throw error;
}
