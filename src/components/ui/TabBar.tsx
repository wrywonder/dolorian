import { Pressable, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '@/lib/constants';
import { Icon, type IconName } from './Icon';
import { TwinkleSparkle } from './TwinkleSparkle';

export type TabKey = 'buzz' | 'irl' | 'plans' | 'you';

type TabSpec = {
  key: TabKey;
  icon: IconName;
  label: string;
};

const TABS: TabSpec[] = [
  { key: 'buzz', icon: 'feed', label: 'Buzz' },
  { key: 'irl', icon: 'map.pin', label: 'IRL' },
  { key: 'plans', icon: 'calendar', label: 'Plans' },
  { key: 'you', icon: 'person', label: 'You' },
];

type TabBarProps = {
  active: TabKey;
  onChange?: (key: TabKey) => void;
  /** Map of tab key → unread badge count. Omitted tabs render no badge. */
  badges?: Partial<Record<TabKey, number>>;
  style?: ViewStyle;
};

/**
 * Floating pill tab bar — only the active tab shows its label inside a
 * terracotta capsule. Inactive tabs are icon-only in taupe. A twinkling
 * butter sparkle sits in the corner of the active pill.
 *
 * Sits above the home indicator with a 30px bottom safe area pad.
 */
export function TabBar({ active, onChange, badges, style }: TabBarProps) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 30,
          paddingTop: 10,
        },
        style,
      ]}
      pointerEvents="box-none"
    >
      <View
        style={{
          marginHorizontal: 14,
          height: 70,
          backgroundColor: colors.surface,
          borderRadius: 35,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          justifyContent: 'space-around',
          borderWidth: 1,
          borderColor: colors.rule,
          shadowColor: '#2D241B',
          shadowOpacity: 0.09,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 28,
          elevation: 12,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const badgeCount = badges?.[tab.key];

          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (isActive) return;
                Haptics.selectionAsync().catch(() => {});
                onChange?.(tab.key);
              }}
              style={{
                position: 'relative',
                height: 56,
                paddingHorizontal: isActive ? 18 : 14,
                borderRadius: 28,
                backgroundColor: isActive ? colors.terracotta : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                shadowColor: isActive ? '#924328' : 'transparent',
                shadowOpacity: isActive ? 0.4 : 0,
                shadowOffset: { width: 0, height: 3 },
                shadowRadius: 0,
                elevation: isActive ? 6 : 0,
              }}
            >
              <Icon
                name={isActive ? (`${tab.icon}.fill` as IconName) : tab.icon}
                size={28}
                color={isActive ? colors.white : colors.taupe}
                weight={2.1}
              />

              {isActive ? (
                <Text
                  style={{
                    fontFamily: fonts.sansExtra,
                    fontSize: 14.5,
                    color: colors.white,
                    letterSpacing: -0.2,
                  }}
                >
                  {tab.label}
                </Text>
              ) : null}

              {!isActive && badgeCount ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 8,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: colors.terracotta,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2.5,
                    borderColor: colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansExtra,
                      fontSize: 10,
                      color: colors.white,
                    }}
                  >
                    {badgeCount}
                  </Text>
                </View>
              ) : null}

              {isActive ? (
                <View
                  style={{ position: 'absolute', top: 6, right: 12 }}
                  pointerEvents="none"
                >
                  <TwinkleSparkle size={10} color={colors.amberLight} delay={800} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
