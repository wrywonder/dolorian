import { useState } from 'react';
import { Keyboard, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, radii, spacing } from '@/lib/constants';
import { parsePlanDateTime, planClockTime, planDateKey } from '@/lib/plan-schedule';

/** Keep the picker in the plan's time zone when editing away from home. */
export function PlanDateField({ label, testID, mode, date, time, timezone, onChange }: {
  label: string; testID: string; mode: 'date' | 'time'; date: string; time: string; timezone: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  let value: Date | null;
  // A clock-change gap must not make a date picker silently display today.
  // Dates use local noon; an invalid time stays an explicit empty control.
  try { value = new Date(parsePlanDateTime(date, mode === 'date' ? '12:00' : time, false, timezone)); }
  catch { value = null; }
  const picker = value ? <DateTimePicker
    testID={testID} accessibilityLabel={`Choose ${label.toLowerCase()}`}
    value={value} mode={mode} display={Platform.OS === 'ios' ? 'compact' : 'default'}
    timeZoneName={timezone} minuteInterval={5} accentColor={colors.terracotta}
    onChange={(event, selected) => {
      if (Platform.OS === 'android') setOpen(false);
      if (event.type !== 'set' || !selected) return;
      onChange(mode === 'date' ? planDateKey(selected, timezone) : planClockTime(selected, timezone));
    }}
  /> : null;
  return <View style={{ flex: 1, minWidth: 110, gap: spacing.xs }}>
    <Text style={{ fontFamily: fonts.monoBold, fontSize: 9, color: colors.brownMid }}>{label}</Text>
    <View onTouchStart={Keyboard.dismiss} style={{ minHeight: 46, paddingHorizontal: spacing.xs, borderRadius: radii.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' }}>
      {!value ? <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`} onPress={() => onChange(mode === 'date' ? planDateKey(new Date(), timezone) : '09:00')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: colors.terracotta }}>{mode === 'date' ? 'Choose a day' : time ? 'Choose a valid time' : 'Add time'}</Text></Pressable> : Platform.OS === 'ios' ? picker : <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`} onPress={() => setOpen(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: colors.dark }}>{mode === 'date' ? date : time || 'Choose time'}</Text>
      </Pressable>}
    </View>
    {Platform.OS === 'android' && open ? picker : null}
  </View>;
}
