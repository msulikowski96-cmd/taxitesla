import { Text, View } from 'react-native';
import type { RideStatus } from '../api';
import { STATUS_LABEL } from '../lib/format';
import { colors, radius } from '../theme';

const TONE: Record<RideStatus, { fg: string; bg: string }> = {
  pending: { fg: colors.warning, bg: colors.warningSoft },
  confirmed: { fg: colors.success, bg: colors.successSoft },
  driver_on_way: { fg: colors.success, bg: colors.successSoft },
  in_progress: { fg: colors.silver, bg: colors.surfaceAlt },
  completed: { fg: colors.textMuted, bg: colors.surfaceAlt },
  cancelled: { fg: colors.danger, bg: colors.accentSoft },
};

export function StatusBadge({ status }: { status: RideStatus }) {
  const t = TONE[status];
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}
