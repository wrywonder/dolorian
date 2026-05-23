import { Slot } from 'expo-router';
import { View } from 'react-native';
import { colors } from '@/lib/constants';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <Slot />
    </View>
  );
}
