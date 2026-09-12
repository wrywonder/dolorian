import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, spacing } from '@/lib/constants';

/** Shared by full-screen forms and modal sheets. Keep the scroll view inside this
 * frame; adding another keyboard inset/avoiding view would count the keyboard twice. */
export function KeyboardFrame({ children, style, accessibilityViewIsModal }: { children: ReactNode; style?: StyleProp<ViewStyle>; accessibilityViewIsModal?: boolean }) {
  const frame = useRef<View>(null);
  const [top, setTop] = useState(0);
  const [visible, setVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return (
    <View accessibilityViewIsModal={accessibilityViewIsModal} ref={frame} collapsable={false} style={{ flex: 1 }} onLayout={() => {
      // RN's avoiding view measures in its parent, but keyboard coordinates are
      // in the window. Account for safe areas and headers, including sheet routes.
      frame.current?.measureInWindow((_x, y) => setTop(y));
    }}>
      <KeyboardAvoidingView style={[{ flex: 1 }, style]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={top}>
        {children}
        {visible ? (
          <View style={{ backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.rule, alignItems: 'flex-end' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Done typing" onPress={Keyboard.dismiss} style={{ minHeight: 44, minWidth: 76, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.terracotta }}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
