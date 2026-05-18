import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/lib/constants';
import { Icon } from '@/components/ui';
import { ProfileBody } from '@/components/profile/ProfileBody';

/**
 * Other-parent profile route — `/profile/<uuid>`. Renders the same
 * ProfileBody as the You tab but always shows the Connect CTA + phone
 * swap row, and adds a back affordance in the top-left.
 */
export default function OtherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  if (!id) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={[]}>
      <ProfileBody parentId={id} />
      <View
        style={{
          position: 'absolute',
          top: 60,
          left: 14,
          zIndex: 30,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(255,255,255,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevron.right" size={18} color={colors.dark} weight={1.8} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
