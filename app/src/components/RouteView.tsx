import { Text, View } from 'react-native';
import type { Place } from '../api';
import { colors, space } from '../theme';

// Vertical pickup -> destination line, like a ride ticket.
export function RouteView({ pickup, destination }: { pickup: Place; destination: Place }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ alignItems: 'center', marginRight: space.md, paddingTop: 5 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white }} />
        <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 }} />
        <View style={{ width: 10, height: 10, backgroundColor: colors.accent }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Odbiór</Text>
        <Text style={{ color: colors.text, fontSize: 15, marginBottom: space.md }} numberOfLines={2}>
          {pickup.address}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Cel</Text>
        <Text style={{ color: colors.text, fontSize: 15 }} numberOfLines={2}>
          {destination.address}
        </Text>
      </View>
    </View>
  );
}
