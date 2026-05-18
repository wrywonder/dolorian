import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { avatarTones, colors, fonts, type AvatarTone } from '@/lib/constants';
import {
  AvatarCircle,
  DottedUnderline,
  FloatingCompose,
  HandArrow,
  Icon,
  PhotoAvatar,
  PhotoTile,
  PulseDot,
  Sparkle,
  SparkleText,
  Squiggle,
  StripePattern,
  TabBar,
  TerracottaButton,
  TimeStampPill,
  TwinkleSparkle,
  VisibilityChip,
  type TabKey,
} from '@/components/ui';

/**
 * CHECK-IN 1 storybook — every UI primitive in isolation so we can
 * verify visual fidelity before composing real screens in Phase 3+.
 * Replaced in Phase 3 by the (tabs) layout.
 */
export default function DesignSystemStorybook() {
  const [activeTab, setActiveTab] = useState<TabKey>('buzz');
  const tones: AvatarTone[] = Object.keys(avatarTones) as AvatarTone[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Header
          eyebrow="DESIGN SYSTEM · CHECK-IN 1"
          title="storybook"
          flourish="squiggle"
        />

        {/* Typography sample */}
        <Section title="TYPOGRAPHY">
          <Text style={styles.serif}>Hannah Goldberg.</Text>
          <Text style={styles.bodySerif}>both of you say yes · friendships, not follows</Text>
          <Text style={[styles.body, { fontFamily: fonts.sansBold }]}>
            Maya · Cesar Chavez Park · 22m
          </Text>
          <Text style={styles.mono}>A LITTLE NUDGE ↓</Text>
        </Section>

        {/* TabBar — all 4 active states */}
        <Section title="TAB BAR · ALL 4 ACTIVE STATES">
          {(['buzz', 'irl', 'plans', 'you'] as TabKey[]).map((k) => (
            <View key={k} style={styles.tabBarShell}>
              <TabBar
                active={k}
                onChange={() => {}}
                badges={k !== 'buzz' ? { buzz: 4 } : undefined}
              />
            </View>
          ))}
          <Text style={styles.caption}>
            Interactive — tap to switch active tab (haptic on selection):
          </Text>
          <View style={styles.tabBarShell}>
            <TabBar
              active={activeTab}
              onChange={setActiveTab}
              badges={activeTab !== 'buzz' ? { buzz: 4 } : undefined}
            />
          </View>
        </Section>

        {/* StripePattern — all 7 tones */}
        <Section title={`STRIPE PATTERN · ${tones.length} TONES`}>
          <View style={styles.grid}>
            {tones.map((tone) => (
              <View key={tone} style={styles.gridItem}>
                <View style={styles.stripeBox}>
                  <StripePattern tone={tone} radius={14} />
                </View>
                <Text style={styles.swatchLabel}>{tone}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* AvatarCircle */}
        <Section title="AVATAR CIRCLE · INITIALS">
          <View style={styles.row}>
            {tones.map((tone, i) => (
              <View key={tone} style={{ alignItems: 'center', gap: 4 }}>
                <AvatarCircle
                  initials={String.fromCharCode(65 + i)}
                  tone={tone}
                  size={48}
                />
                <Text style={styles.swatchLabel}>{tone}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.row, { marginTop: 14 }]}>
            <AvatarCircle initials="HG" tone="peach" size={92} ring={colors.white} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.bodySerif}>
                Hannah Goldberg's profile hero — 92px, white ring, peach tone.
              </Text>
              <Text style={styles.body}>
                The `ring` prop adds a 2.5px solid white border.
              </Text>
            </View>
          </View>
        </Section>

        {/* PhotoAvatar */}
        <Section title="PHOTO AVATAR · STRIPED">
          <View style={styles.row}>
            {tones.map((tone) => (
              <View key={tone} style={{ alignItems: 'center', gap: 4 }}>
                <PhotoAvatar tone={tone} size={48} />
                <Text style={styles.swatchLabel}>{tone}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.caption}>
            Used for map pins and post images. Terracotta ring + larger size
            indicates "you" on the map:
          </Text>
          <View style={[styles.row, { gap: 18 }]}>
            <PhotoAvatar tone="rose" size={60} ringColor={colors.terracotta} />
            <PhotoAvatar tone="peach" size={58} />
            <View style={{ flexDirection: 'row' }}>
              <PhotoAvatar tone="mauve" size={48} />
              <PhotoAvatar tone="butter" size={48} style={{ marginLeft: -16 }} />
            </View>
          </View>
        </Section>

        {/* PhotoTile */}
        <Section title="PHOTO TILE · POST IMAGES">
          <PhotoTile tone="butter" height={220} label="theo's first goal ⚽" radius={6} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <PhotoTile tone="butter" height={80} label="🌳 Cesar Chavez" radius={14} />
            </View>
            <View style={{ flex: 1 }}>
              <PhotoTile tone="mauve" height={80} label="🩰 Studio Grow" radius={14} />
            </View>
            <View style={{ flex: 1 }}>
              <PhotoTile tone="slate" height={80} label="🏊 Albany Aquatic" radius={14} />
            </View>
          </View>
        </Section>

        {/* Terracotta button */}
        <Section title="TERRACOTTA BUTTON · PRIMARY CTA">
          <TerracottaButton
            label="snap one"
            iconLeft={<Icon name="camera" size={15} color={colors.white} weight={2.2} />}
            iconRight={
              <Text style={{ color: colors.white, fontFamily: fonts.sansExtra, fontSize: 15 }}>
                ✨
              </Text>
            }
            variant="compact"
            onPress={() => {}}
          />
          <View style={{ height: 14 }} />
          <TerracottaButton
            label="I'm in →"
            variant="compact"
            onPress={() => {}}
          />
          <View style={{ height: 18 }} />
          <TerracottaButton
            label="Connect with Hannah"
            fullWidth
            withConfetti
            iconLeft={<Icon name="wave" size={22} color={colors.white} weight={2.4} />}
            onPress={() => {}}
          />
          <Text style={styles.caption}>Press any button for haptic feedback + scale spring.</Text>
        </Section>

        {/* Timestamp pills */}
        <Section title="TIMESTAMP PILL">
          <View style={[styles.row, { gap: 18, alignItems: 'flex-start' }]}>
            <TimeStampPill label="SAT · 22m" rotation={8} />
            <TimeStampPill label="SAT · 24" />
            <TimeStampPill label="10am" variant="dark" />
          </View>
        </Section>

        {/* Visibility chip */}
        <Section title='VISIBILITY CHIP · "OUT & ABOUT"'>
          <VisibilityChip
            visibleParents={[
              { initials: '', tone: 'peach' },
              { initials: '', tone: 'sage' },
              { initials: '', tone: 'mauve' },
            ]}
          />
          <View style={{ height: 12 }} />
          <VisibilityChip />
          <Text style={styles.caption}>
            Pulsing golden dot, twinkling corner sparkle. Lives in Buzz + IRL
            headers; single zustand source of truth.
          </Text>
        </Section>

        {/* Sparkles + flourishes */}
        <Section title="FLOURISHES">
          <Row label="Sparkle (static)">
            <Sparkle size={12} color={colors.amberLight} />
            <Sparkle size={16} color={colors.terracotta} />
            <Sparkle size={20} color={colors.sage} />
          </Row>
          <Row label="Twinkle (animated)">
            <TwinkleSparkle size={14} color={colors.amberLight} />
            <TwinkleSparkle size={14} color={colors.terracotta} delay={800} />
            <TwinkleSparkle size={14} color={colors.sage} delay={1600} />
          </Row>
          <Row label="Pulse dot">
            <PulseDot color={colors.golden} />
            <PulseDot color={colors.terracotta} />
            <PulseDot color={colors.sage} />
          </Row>
          <Row label="Squiggle">
            <Squiggle width={60} color={colors.terracotta} />
            <Squiggle width={80} color={colors.sage} />
          </Row>
          <Row label="Hand arrow">
            <HandArrow size={36} color={colors.terracotta} />
            <HandArrow size={36} color={colors.sage} flip />
          </Row>
          <Row label="SparkleText">
            <SparkleText
              textStyle={[styles.serif, { fontSize: 24 }]}
              color={colors.amberLight}
              size={14}
            >
              IRL
            </SparkleText>
          </Row>
          <Row label="Dotted underline">
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Text style={styles.bodySerif}>share a moment from </Text>
              <DottedUnderline color={colors.sage} textStyle={styles.bodySerif}>
                10:30 ballet
              </DottedUnderline>
              <Text style={styles.bodySerif}>?</Text>
            </View>
          </Row>
        </Section>

        {/* Icon set */}
        <Section title="ICON SET · SF-SYMBOLS STYLE">
          <View style={styles.iconGrid}>
            {(
              [
                'feed',
                'feed.fill',
                'map.pin',
                'map.pin.fill',
                'calendar',
                'calendar.fill',
                'person',
                'person.fill',
                'heart',
                'heart.fill',
                'bubble',
                'camera',
                'wave',
                'sparkle',
                'gear',
                'sun',
                'plus',
                'plus.circle',
                'chevron.right',
                'search',
                'phone',
                'bell',
                'lock',
                'check.circle',
              ] as const
            ).map((n) => (
              <View key={n} style={styles.iconItem}>
                <Icon name={n} size={22} color={colors.dark} />
                <Text style={styles.iconLabel}>{n}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Floating compose */}
        <Section title="FLOATING COMPOSE BUTTON">
          <View style={{ height: 120, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
            <FloatingCompose />
          </View>
          <Text style={styles.caption}>
            Floats 3px on a 3.4s loop, holds -5° tilt, medium haptic on press.
          </Text>
        </Section>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ────── local helpers ──────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function Header({
  eyebrow,
  title,
  flourish = 'squiggle',
}: {
  eyebrow: string;
  title: string;
  flourish?: 'squiggle' | 'sparkle';
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {flourish === 'sparkle' ? (
          <View style={{ marginBottom: 8 }}>
            <TwinkleSparkle size={16} color={colors.amberLight} />
          </View>
        ) : null}
      </View>
      {flourish === 'squiggle' ? (
        <View style={{ marginTop: 4 }}>
          <Squiggle width={60} color={colors.terracotta} />
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.row, { gap: 18, alignItems: 'center' }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  container: { padding: 22, paddingBottom: 80 },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: colors.brownMid,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 38,
    color: colors.dark,
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  section: {
    marginBottom: 28,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
  sectionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: colors.brownMid,
    letterSpacing: 0.9,
    marginBottom: 12,
  },
  serif: {
    fontFamily: fonts.serif,
    fontSize: 38,
    color: colors.dark,
    lineHeight: 42,
    letterSpacing: -0.6,
  },
  bodySerif: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.brownMid,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark,
    lineHeight: 18,
  },
  mono: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.dark,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  caption: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.taupe,
    marginTop: 10,
  },
  swatchLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.brownMid,
  },
  tabBarShell: {
    height: 110,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 22,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: { alignItems: 'center', gap: 4 },
  stripeBox: { width: 76, height: 56, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconItem: {
    width: 76,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  iconLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.brownMid,
    letterSpacing: 0.3,
  },
  rowLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.taupe,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
});
