import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { formatDay, formatTime } from '../lib/format';
import { space } from '../theme';
import { Chip } from './ui';

const MIN_LEAD_MIN = 30; // scheduled rides at least 30 min ahead
const DAYS_AHEAD = 14;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function slotsFor(day: Date): Date[] {
  const earliest = Date.now() + MIN_LEAD_MIN * 60_000;
  const out: Date[] = [];
  for (let m = 0; m < 24 * 60; m += 15) {
    const t = new Date(day);
    t.setMinutes(m);
    if (t.getTime() >= earliest) out.push(t);
  }
  return out;
}

export function WhenPicker({ value, onChange }: { value: Date | null; onChange: (d: Date | null) => void }) {
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    }).filter((d) => slotsFor(d).length > 0);
  }, []);

  const selectedDay = value ? startOfDay(value) : null;
  const slots = selectedDay ? slotsFor(selectedDay) : [];

  const pickDay = (d: Date) => {
    const s = slotsFor(d);
    // keep the same hour when switching days if possible
    const keep = value && s.find((t) => t.getHours() === value.getHours() && t.getMinutes() === value.getMinutes());
    onChange(keep ?? s[0] ?? null);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip label="Jak najszybciej" icon="flash-outline" selected={!value} onPress={() => onChange(null)} />
        <Chip label="Zaplanuj" icon="calendar-outline" selected={!!value} onPress={() => !value && pickDay(days[0])} />
      </View>
      {value && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.xs }}>
            {days.map((d) => (
              <Chip
                key={d.toISOString()}
                label={formatDay(d)}
                selected={selectedDay?.getTime() === d.getTime()}
                onPress={() => pickDay(d)}
              />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {slots.map((t) => (
              <Chip
                key={t.toISOString()}
                label={formatTime(t)}
                selected={value.getTime() === t.getTime()}
                onPress={() => onChange(t)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}
