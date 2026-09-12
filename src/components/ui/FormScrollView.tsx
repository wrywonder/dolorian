import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, ScrollView, TextInput, type ScrollViewProps } from 'react-native';
import { spacing } from '@/lib/constants';

/** Use inside KeyboardFrame. Resizing alone doesn't reveal an input that was
 * focused before the keyboard opened. Measure the actual visible viewport so
 * fixed headers, the Done bar, and sheets need no extra guessed offsets. */
export function FormScrollView({ onFocus, onBlur, onLayout, onScroll, onContentSizeChange, ...props }: ScrollViewProps) {
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const focused = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput> | null>(null);
  const reveal = useCallback(() => {
    const input = focused.current;
    if (props.horizontal || !Keyboard.isVisible() || !input || input !== TextInput.State.currentlyFocusedInput()) return;
    scroll.current?.getNativeScrollRef()?.measureInWindow((_x, top, _width, height) => {
      input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
        if (input !== focused.current || input !== TextInput.State.currentlyFocusedInput() || height <= 0) return;
        const bottom = top + height - spacing.md;
        // Very tall multiline fields align at the top; ordinary fields reveal
        // their bottom. Never move a field that is already comfortably visible.
        const delta = inputHeight > height - spacing.md * 2
          ? inputTop - top - spacing.md
          : inputTop < top ? inputTop - top - spacing.md : Math.max(0, inputTop + inputHeight - bottom);
        if (Math.abs(delta) > 1) scroll.current?.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
      });
    });
  }, [props.horizontal]);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', reveal);
    return () => { subscription.remove(); focused.current = null; };
  }, [reveal]);
  return <ScrollView {...props} ref={scroll}
    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" scrollEventThrottle={16}
    onFocus={(event) => { focused.current = TextInput.State.currentlyFocusedInput(); reveal(); onFocus?.(event); }}
    onBlur={(event) => { focused.current = null; onBlur?.(event); }}
    onLayout={(event) => { reveal(); onLayout?.(event); }}
    onContentSizeChange={(width, height) => { reveal(); onContentSizeChange?.(width, height); }}
    onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}
  />;
}
